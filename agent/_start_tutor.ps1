# 启动 Tutor API 后台服务
$logFile = "e:\workspace2\english-three\agent\_tutor_start.log"
$python = "e:\workspace2\english-three\agent\.venv\Scripts\python.exe"
$workDir = "e:\workspace2\english-three\agent"

$env:PYTHONIOENCODING = "utf-8"
$env:TUTOR_PORT = "8765"

# 测试 python 是否可用
$testFile = "e:\workspace2\english-three\agent\_py_test.log"
& $python -c "import sys; open('$testFile','w').write('python OK: '+sys.executable)" 2>&1 | Out-Null

if (Test-Path $testFile) {
    $content = Get-Content $testFile -Raw
    Write-Output "Python 测试: $content"
    Remove-Item $testFile
} else {
    Write-Output "Python 不可用，尝试系统 python"
    $python = "python"
    & $python -c "import sys; open('$testFile','w').write('sys python OK: '+sys.executable)" 2>&1 | Out-Null
    if (Test-Path $testFile) {
        $content = Get-Content $testFile -Raw
        Write-Output "系统 Python 测试: $content"
        Remove-Item $testFile
    } else {
        Write-Output "Python 完全不可用"
        exit 1
    }
}

Write-Output "启动 Tutor API..."
$p = Start-Process -NoNewWindow -FilePath $python -ArgumentList "-m", "agent_english.tutor.api" -WorkingDirectory $workDir -PassThru -RedirectStandardOutput "e:\workspace2\english-three\agent\_tutor_stdout.log" -RedirectStandardError "e:\workspace2\english-three\agent\_tutor_stderr.log"
Write-Output "PID: $($p.Id)"
Write-Output "等待 3 秒..."
Start-Sleep -Seconds 3

# 检查进程是否还在运行
$running = Get-Process -Id $p.Id -ErrorAction SilentlyContinue
if ($running) {
    Write-Output "进程 $($p.Id) 运行中"
} else {
    Write-Output "进程已退出"
    if (Test-Path "e:\workspace2\english-three\agent\_tutor_stderr.log") {
        Write-Output "=== stderr ==="
        Get-Content "e:\workspace2\english-three\agent\_tutor_stderr.log" -Tail 20
    }
    if (Test-Path "e:\workspace2\english-three\agent\_tutor_stdout.log") {
        Write-Output "=== stdout ==="
        Get-Content "e:\workspace2\english-three\agent\_tutor_stdout.log" -Tail 20
    }
}
