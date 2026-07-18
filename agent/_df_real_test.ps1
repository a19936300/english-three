# 用写日志方式执行所有 DeerFlow 联调测试
$logFile = "e:\workspace2\english-three\agent\_df_real.log"

function Write-Log {
    param($msg)
    $line = "[$(Get-Date -Format 'HH:mm:ss')] $msg"
    Add-Content -Path $logFile -Value $line
    Write-Host $line
}

Write-Log "===== DeerFlow 真实联调测试 ====="
Write-Log "OS: $([Environment]::OSVersion)"
Write-Log "PowerShell: $($PSVersionTable.PSVersion)"

# Step 0: 检查端口 8765
$portInUse = netstat -ano | Select-String ":8765"
if ($portInUse) {
    Write-Log "端口 8765 已被占用: $($portInUse.Line)"
    # extract PID and kill
    $portInUse.Line -match '(\d+)$' | Out-Null
    $pid = $matches[1]
    if ($pid) {
        Write-Log "Kill PID $pid ..."
        taskkill /F /PID $pid 2>&1 | Out-Null
        Start-Sleep -Seconds 2
    }
} else {
    Write-Log "端口 8765 未被占用"
}

# Step 1: 启动 Tutor API 后台服务
$pythonPath = "e:\workspace2\english-three\agent\.venv\Scripts\python.exe"
$agentDir = "e:\workspace2\english-three\agent"
$env:TUTOR_PORT = "8765"
$env:PYTHONIOENCODING = "utf-8"

# 验证 python 存在
if (Test-Path $pythonPath) {
    Write-Log "Python 虚拟环境存在: $pythonPath"
} else {
    Write-Log "Python 虚拟环境不存在！"
    $pythonPath = "python"
}

Write-Log "启动 Tutor API（后台）..."
$stdoutLog = "e:\workspace2\english-three\agent\_tutor_stdout.log"
$stderrLog = "e:\workspace2\english-three\agent\_tutor_stderr.log"

$proc = Start-Process -NoNewWindow -FilePath $pythonPath -ArgumentList "-m", "agent_english.tutor.api" -WorkingDirectory $agentDir -PassThru -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog
Write-Log "PID: $($proc.Id)"

Start-Sleep -Seconds 5
$running = Get-Process -Id $proc.Id -ErrorAction SilentlyContinue
if ($running) {
    Write-Log "进程 $($proc.Id) 运行中"
} else {
    Write-Log "进程已退出！检查日志..."
    if (Test-Path $stderrLog) { Write-Log "=== stderr ==="; Get-Content $stderrLog -Tail 30 | ForEach-Object { Write-Log $_ } }
    if (Test-Path $stdoutLog) { Write-Log "=== stdout ==="; Get-Content $stdoutLog -Tail 10 | ForEach-Object { Write-Log $_ } }
}

# Step 2: 测试 health
Write-Log "--- 等待服务就绪 ---"
$ready = $false
for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Seconds 2
    try {
        $resp = Invoke-WebRequest -Uri "http://127.0.0.1:8765/health" -UseBasicParsing -TimeoutSec 3
        if ($resp.StatusCode -eq 200) {
            Write-Log "健康检查通过（第$($i+1)次）"
            $ready = $true
            break
        }
    } catch {
        Write-Log "等待中... ($($i+1)/15)"
    }
}
if (-not $ready) {
    Write-Log "服务未就绪，检查日志..."
    if (Test-Path $stderrLog) { Write-Log "=== stderr ==="; Get-Content $stderrLog -Tail 50 | ForEach-Object { Write-Log $_ } }
    if (Test-Path $stdoutLog) { Write-Log "=== stdout ==="; Get-Content $stdoutLog -Tail 20 | ForEach-Object { Write-Log $_ } }
}

# Step 3: 调用 POST /tutor/chat
Write-Log "--- 调用 /tutor/chat ---"
$body = @{
    user_id = "debug-u1"
    session_id = "s-test-1"
    message = "用一句话自我介绍"
    discussion = @{
        bind = "set"
        scene = @{
            type = "greeting"
            can_reveal_answer = $true
            title = "初次见面"
            description = "学生初次进入学习界面"
        }
    }
} | ConvertTo-Json -Depth 10 -Compress

Write-Log "请求体: $body"

try {
    $resp = Invoke-WebRequest -Uri "http://127.0.0.1:8765/tutor/chat" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing -TimeoutSec 30
    Write-Log "状态码: $($resp.StatusCode)"
    $respText = [System.Text.Encoding]::UTF8.GetString($resp.Content)
    Write-Log "响应: $respText"
    try {
        $respObj = $respText | ConvertFrom-Json
        Write-Log "★★ 回复内容: $($respObj.reply)"
    } catch {
        Write-Log "JSON 解析失败"
    }
} catch {
    Write-Log "请求失败: $_"
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $errBody = $reader.ReadToEnd()
        $reader.Close()
        Write-Log "错误体: $errBody"
    }
    
    # 如果 502，测试 DeerFlow 直连
    Write-Log "--- 测试 DeerFlow 直连 ---"
    try {
        $dfBody = @{
            model = "deepseek-v4-flash"
            messages = @(@{role="user"; content="Say hello in one sentence"})
            max_tokens = 50
        } | ConvertTo-Json -Compress
        $dfResp = Invoke-WebRequest -Uri "http://127.0.0.1:15721/v1/chat/completions" -Method POST -Body $dfBody -ContentType "application/json" -UseBasicParsing -TimeoutSec 15 -Headers @{
            "Authorization" = "Bearer sk-xkhb8oIDiFDYA70zKSCz7Gwc3LpQ7RSaBmjBAKLltYyqs7a1EB0rwa81PKGgOilh"
        }
        Write-Log "DeerFlow 直连状态: $($dfResp.StatusCode)"
        Write-Log "DeerFlow 直连响应: $([System.Text.Encoding]::UTF8.GetString($dfResp.Content))"
    } catch {
        Write-Log "DeerFlow 直连失败: $_"
        # 测试 /health
        try {
            $hResp = Invoke-WebRequest -Uri "http://127.0.0.1:15721/health" -UseBasicParsing -TimeoutSec 5
            Write-Log "DeerFlow /health: $($hResp.StatusCode)"
        } catch {
            Write-Log "DeerFlow /health 不可达: $_"
            Write-Log "结论: DeerFlow 模型网关 127.0.0.1:15721 不可达（模型不可用）"
        }
    }
}

Write-Log "===== 测试完成 ====="
Write-Log "日志文件: $logFile"
