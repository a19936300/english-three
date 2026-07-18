import sys, os, subprocess, time, json, urllib.request, traceback

LOG = "e:/workspace2/english-three/agent/_df5.log"
AGENT = "e:/workspace2/english-three/agent"
PYTHON = "e:/workspace2/english-three/agent/.venv/Scripts/python.exe"

def log(m):
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(f"[{time.strftime('%H:%M:%S')}] {m}\n")

log("="*60)
log("DeerFlow v5")
log(f"exe={sys.executable}")

# --- Step 0: port check ---
log("--- Step 0: port 8765 ---")
try:
    out = subprocess.check_output(["netstat","-ano"], text=True, timeout=10)
    for line in out.splitlines():
        if "8765" in line and "LISTENING" in line:
            pid = line.strip().split()[-1]
            log(f"Kill PID {pid}")
            subprocess.run(["taskkill","/F","/PID",pid], capture_output=True)
            time.sleep(1)
            break
    else:
        log("Port 8765 free")
except Exception as e:
    log(f"Port check err: {e}")

# --- Step 1: DeerFlow direct ---
log("--- Step 1: DeerFlow direct ---")
sys.path.insert(0, AGENT)
try:
    from deerflow.client import DeerFlowClient
    c = DeerFlowClient(config_path=f"{AGENT}/config.yaml")
    r = c.chat("Say hello in one sentence.")
    log(f"DF reply: {r}")
    log("DF OK")
except Exception as e:
    log(f"DF FAIL: {e}")
    log(traceback.format_exc())
    # HTTP direct test
    for ep in ["http://127.0.0.1:15721/health", "http://127.0.0.1:15721/v1/models"]:
        try:
            r = urllib.request.urlopen(ep, timeout=5)
            log(f"{ep} -> {r.status}")
            log(r.read().decode()[:500])
        except Exception as e2:
            log(f"{ep} -> {e2}")

# --- Step 2: Start Tutor API ---
log("--- Step 2: Start Tutor API ---")
env = os.environ.copy()
env["TUTOR_PORT"] = "8765"
env["PYTHONIOENCODING"] = "utf-8"

proc = subprocess.Popen(
    [PYTHON, "-m", "agent_english.tutor.api"],
    cwd=AGENT, env=env,
    stdout=open("e:/workspace2/english-three/agent/_tutor_o5.log","w",encoding="utf-8"),
    stderr=open("e:/workspace2/english-three/agent/_tutor_e5.log","w",encoding="utf-8"),
)
log(f"Tutor PID={proc.pid}")

# --- Step 3: Wait and test ---
log("--- Step 3: Wait and test ---")
ready = False
for i in range(30):
    time.sleep(2)
    try:
        r = urllib.request.urlopen("http://127.0.0.1:8765/health", timeout=3)
        if r.status == 200:
            log(f"Ready (try {i+1})")
            ready = True
            break
    except:
        pass
    if proc.poll() is not None:
        log(f"Exited code={proc.returncode}")
        break
    log(f"Waiting ({i+1}/30)")

if ready:
    log("--- POST /tutor/chat ---")
    payload = {
        "user_id": "debug-u1",
        "session_id": "s-test-1",
        "message": "用一句话自我介绍",
        "discussion": {
            "bind": "set",
            "scene": {
                "type": "greeting",
                "can_reveal_answer": True,
                "title": "初次见面",
                "description": "学生初次进入学习界面",
            },
        },
    }
    log(f"Payload: {json.dumps(payload, ensure_ascii=False)}")
    try:
        req = urllib.request.Request(
            "http://127.0.0.1:8765/tutor/chat",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        resp = urllib.request.urlopen(req, timeout=30)
        d = json.loads(resp.read().decode("utf-8"))
        log(f"Status: {resp.status}")
        log(f"Response: {json.dumps(d, ensure_ascii=False)}")
        log(f"\n★★ Reply: {d.get('reply', '(none)')}")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        log(f"HTTP {e.code}: {body}")
    except Exception as e:
        log(f"API call err: {e}")
        log(traceback.format_exc())
else:
    for fn in ["e:/workspace2/english-three/agent/_tutor_e5.log"]:
        try:
            with open(fn, encoding="utf-8") as f:
                log(f"stderr:\n{f.read()[:3000]}")
        except:
            pass

log("="*60)
if ready:
    log("RESULT: PASSED")
else:
    log("RESULT: FAILED")
if proc and proc.poll() is None:
    log(f"Tutor PID {proc.pid} still running")
log(f"Log: {LOG}")
