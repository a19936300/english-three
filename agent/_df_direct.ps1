$ErrorActionPreference = "Stop"
$logFile = "e:\workspace2\english-three\agent\_df_direct.log"
function log { param($m) "$(Get-Date -Format 'HH:mm:ss') $m" | Out-File -Append -Encoding utf8 $logFile; Write-Host $m }

log "=== DeerFlow Real Test ==="

# 检查 python
$py = "e:\workspace2\english-three\agent\.venv\Scripts\python.exe"
if (-not (Test-Path $py)) { log "ERROR: python not found at $py"; exit 1 }
log "Python: $py"

# 测试 python 是否工作
$testFile = "e:\workspace2\english-three\agent\_pycan.txt"
& $py -c "open('$testFile','w').write('ok')" 2>&1 | Out-Null
if (Test-Path $testFile) { log "Python works!"; Remove-Item $testFile }
else { log "Python does NOT work (no output)"; log "尝试系统python..."; $py = "python" }

# 检查端口
$listening = netstat -ano | Select-String ":8765"
if ($listening) {
    log "Port 8765 in use"
    $listening -match '\d+$' | Out-Null
    $pid = $Matches[0]
    if ($pid) { taskkill /F /PID $pid 2>&1 | Out-Null; log "Killed PID $pid" }
} else { log "Port 8765 free" }

# 启动服务
$env:TUTOR_PORT = "8765"
$env:PYTHONIOENCODING = "utf-8"
$agentDir = "e:\workspace2\english-three\agent"
$outFile = "e:\workspace2\english-three\agent\_tutor_stdout.log"
$errFile = "e:\workspace2\english-three\agent\_tutor_stderr.log"

# 使用 Start-Process 后台启动
log "Starting Tutor API..."
$p = Start-Process -FilePath $py -ArgumentList "-m", "agent_english.tutor.api" -WorkingDirectory $agentDir -PassThru -RedirectStandardOutput $outFile -RedirectStandardError $errFile -NoNewWindow
log "PID: $($p.Id)"
Start-Sleep -Seconds 5

if (-not (Get-Process -Id $p.Id -ErrorAction SilentlyContinue)) {
    log "Process exited! stderr:"
    if (Test-Path $errFile) { Get-Content $errFile -Tail 30 | ForEach-Object { log "  $_" } }
    if (Test-Path $outFile) { Get-Content $outFile -Tail 10 | ForEach-Object { log "  $_" } }
    exit 1
}
log "Service PID $($p.Id) running"

# 等待就绪
for ($i=0; $i -lt 20; $i++) {
    Start-Sleep -Seconds 2
    try {
        $r = Invoke-WebRequest "http://127.0.0.1:8765/health" -UseBasicParsing -TimeoutSec 3
        if ($r.StatusCode -eq 200) { log "Health OK (try $($i+1))"; break }
    } catch { log "Waiting... ($($i+1)/20)" }
    if ($i -eq 19) { log "Service NOT ready"; exit 1 }
}

# 调用 API
$body = '{"user_id":"debug-u1","session_id":"s-test-1","message":"用一句话自我介绍","discussion":{"bind":"set","scene":{"type":"greeting","can_reveal_answer":true,"title":"初次见面","description":"学生初次进入学习界面"}}}'
log "POST /tutor/chat ..."
try {
    $r = Invoke-WebRequest "http://127.0.0.1:8765/tutor/chat" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing -TimeoutSec 30
    log "Status: $($r.StatusCode)"
    $text = [System.Text.Encoding]::UTF8.GetString($r.Content)
    log "Response: $text"
    $obj = $text | ConvertFrom-Json
    log "★★ Reply: $($obj.reply)"
} catch {
    log "API call failed: $_"
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        log "Error body: $($reader.ReadToEnd())"
        $reader.Close()
    }
}

log "=== Done ==="
