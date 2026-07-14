"""
使用 MinerU 解析本地 PDF/图片/Office 文档为 Markdown。

自动选择 API:
- ≤10MB 且 ≤20 页  → 轻量 API（无需 Token，IP 限频）
- 更大或指定 --token → 精准 API（需 Token，支持 vlm/pipeline/MinerU-HTML，多格式输出）

用法:
    # 默认走轻量
    python parse_pdf_with_mineru.py file.pdf

    # 强制走精准 API（需先 setx MINERU_TOKEN <your-token>）
    python parse_pdf_with_mineru.py big.pdf --token $MINERU_TOKEN

    # 指定模型
    python parse_pdf_with_mineru.py file.pdf --model vlm

    # 输出多种格式（仅精准 API）
    python parse_pdf_with_mineru.py file.pdf --token $MINERU_TOKEN --extra-formats docx html
"""
import argparse
import os
import sys
import time
from pathlib import Path


def _load_env_file(env_path: Path) -> None:
    """加载 .env 文件到 os.environ（不覆盖已有值）。"""
    if not env_path.exists():
        return
    try:
        for raw in env_path.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k = k.strip()
            v = v.strip().strip('"').strip("'")
            os.environ.setdefault(k, v)
    except OSError:
        pass


# 启动时加载 .env.local / .env（项目根优先，再找当前工作目录）
_HERE = Path(__file__).resolve().parent
for _candidate in (
    _HERE.parent.parent.parent / ".env.local",  # e:\workspace2\english-three\.env.local
    _HERE.parent.parent / ".env.local",
    Path.cwd() / ".env.local",
    _HERE.parent.parent.parent / ".env",
    Path.cwd() / ".env",
):
    _load_env_file(_candidate)

# 默认代理（httpx 会自动读取 HTTP_PROXY / HTTPS_PROXY / ALL_PROXY）
_DEFAULT_PROXY = "http://127.0.0.1:7890"
os.environ.setdefault("HTTP_PROXY", _DEFAULT_PROXY)
os.environ.setdefault("HTTPS_PROXY", _DEFAULT_PROXY)
os.environ.setdefault("ALL_PROXY", _DEFAULT_PROXY)

# 轻量 API 限制
FLASH_MAX_SIZE_MB = 10
FLASH_MAX_PAGES = 20


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Parse a PDF/doc using MinerU (auto-select Flash/Precision API)")
    parser.add_argument("pdf_path", type=Path, help="Path to the file to parse")
    parser.add_argument("--language", default="ch", help="Document language, default: ch")
    parser.add_argument("--proxy", default=os.environ.get("MINERU_PROXY", _DEFAULT_PROXY),
                        help="HTTP/HTTPS proxy, e.g. http://127.0.0.1:7890 (empty string to disable)")
    parser.add_argument("--is-ocr", action="store_true", help="Enable OCR (default off)")
    parser.add_argument("--no-formula", action="store_true", help="Disable formula recognition")
    parser.add_argument("--no-table", action="store_true", help="Disable table recognition")
    parser.add_argument("--pages", default=None, help='Page range, e.g. "1-10" or "1,3-5"')

    # 精准 API 专用
    parser.add_argument("--token", default=os.environ.get("MINERU_TOKEN", ""),
                        help="MinerU API token (or set MINERU_TOKEN env). 留空则尝试从 .env.local 读取。")
    parser.add_argument("--flash", action="store_true",
                        help="强制走轻量（Flash）API，覆盖 token 决策")
    parser.add_argument("--model", default="vlm", choices=["vlm", "pipeline", "MinerU-HTML"],
                        help="Model version (precision API), default: vlm")
    parser.add_argument("--extra-formats", nargs="*", default=[],
                        choices=["docx", "html", "latex"],
                        help="Additional export formats (precision API only)")
    parser.add_argument("--no-cache", action="store_true", help="Bypass URL cache (precision API)")
    parser.add_argument("--retry", type=int, default=2, help="Retry count on failure, default: 2")
    parser.add_argument("--retry-delay", type=float, default=5.0, help="Base retry delay in seconds, default: 5")
    return parser.parse_args()


def _apply_proxy(proxy: str) -> None:
    if proxy:
        os.environ["HTTP_PROXY"] = proxy
        os.environ["HTTPS_PROXY"] = proxy
        os.environ["ALL_PROXY"] = proxy
    else:
        for k in ("HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY"):
            os.environ.pop(k, None)


def _count_pdf_pages(pdf: Path) -> int | None:
    """尽量轻量地读 PDF 页数；非 PDF 或失败返回 None。"""
    if pdf.suffix.lower() != ".pdf":
        return None
    try:
        # 优先用 pypdf（轻量），否则回退 pymupdf
        try:
            from pypdf import PdfReader
            return len(PdfReader(str(pdf)).pages)
        except ImportError:
            import fitz  # type: ignore
            with fitz.open(str(pdf)) as doc:
                return doc.page_count
    except Exception as e:
        print(f"[warn] cannot read page count: {e}", file=sys.stderr)
        return None


def _run_with_retry(fn, *, retries: int, base_delay: float, what: str) -> str:
    last_err: Exception | None = None
    for attempt in range(retries + 1):
        try:
            return fn()
        except Exception as e:  # noqa: BLE001
            last_err = e
            msg = str(e)
            # 限频：长等
            wait = base_delay * (2 ** attempt)
            if "RATE_LIMITED" in msg or "429" in msg:
                wait = max(wait, 30.0)
            if attempt < retries:
                print(f"[warn] {what} failed (attempt {attempt+1}/{retries+1}): {e}. "
                      f"retry in {wait:.0f}s", file=sys.stderr)
                time.sleep(wait)
    raise RuntimeError(f"{what} failed after {retries+1} attempts: {last_err}")


def _flash_parse(client, args, pdf: Path) -> str:
    def _do() -> str:
        result = client.flash_extract(
            str(pdf),
            language=args.language,
            is_ocr=args.is_ocr,
            enable_formula=not args.no_formula,
            enable_table=not args.no_table,
            page_range=args.pages,
        )
        return result.markdown
    return _run_with_retry(_do, retries=args.retry, base_delay=args.retry_delay, what="flash")


def _precision_parse(client, args, pdf: Path) -> tuple[str, dict]:
    def _do() -> dict:
        result = client.extract(
            str(pdf),
            model=args.model,
            is_ocr=args.is_ocr,
            formula=not args.no_formula,
            table=not args.no_table,
            language=args.language,
            pages=args.pages,
            extra_formats=args.extra_formats or None,
            no_cache=args.no_cache,
        )
        return result
    out = _run_with_retry(_do, retries=args.retry, base_delay=args.retry_delay, what="precision")
    return out["markdown"], out


def main() -> int:
    args = _parse_args()
    _apply_proxy(args.proxy)

    pdf: Path = args.pdf_path
    if not pdf.exists():
        print(f"File not found: {pdf}", file=sys.stderr)
        return 1

    size_mb = pdf.stat().st_size / (1024 * 1024)
    print(f"[info] file: {pdf}")
    print(f"[info] size: {size_mb:.2f} MB")

    # 决定 API 模式
    if args.flash:
        use_precision = False
    else:
        use_precision = bool(args.token)
    if not use_precision:
        if size_mb > FLASH_MAX_SIZE_MB:
            print(f"[error] file is {size_mb:.2f}MB > {FLASH_MAX_SIZE_MB}MB. "
                  f"Pass --token or set MINERU_TOKEN to use precision API.", file=sys.stderr)
            return 1
        pages = _count_pdf_pages(pdf)
        if pages is not None:
            print(f"[info] pages: {pages} (flash limit {FLASH_MAX_PAGES})")
            if pages > FLASH_MAX_PAGES:
                print(f"[error] {pages} pages > {FLASH_MAX_PAGES}. "
                      f"Pass --token to use precision API.", file=sys.stderr)
                return 1
        mode = "flash"
    else:
        mode = "precision"
    print(f"[info] mode: {mode}")

    from mineru import MinerU  # 需 pip install mineru-open-sdk

    if mode == "flash":
        client = MinerU()
        md = _flash_parse(client, args, pdf)
        out_path = pdf.with_suffix(".md")
        out_path.write_text(md, encoding="utf-8")
        print(f"[ok] markdown length: {len(md)} chars")
        print(f"[ok] saved to: {out_path}")
    else:
        client = MinerU(args.token)
        md, full = _precision_parse(client, args, pdf)
        out_path = pdf.with_suffix(".md")
        out_path.write_text(md, encoding="utf-8")
        print(f"[ok] markdown length: {len(md)} chars")
        print(f"[ok] saved to: {out_path}")
        # 额外格式
        for fmt in args.extra_formats:
            data = full.get(fmt)
            if not data:
                continue
            extra_path = pdf.with_suffix(f".{fmt}")
            if isinstance(data, str):
                extra_path.write_text(data, encoding="utf-8")
            else:
                extra_path.write_bytes(data)
            print(f"[ok] extra format {fmt} -> {extra_path}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n[abort] interrupted", file=sys.stderr)
        sys.exit(130)
    except Exception as e:
        print(f"[fatal] {e}", file=sys.stderr)
        sys.exit(2)
