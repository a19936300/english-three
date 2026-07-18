import subprocess, sys, os, json, time, urllib.request, traceback

LOG = r"e:\workspace2\english-three\agent\_df3.log"
AGENT = r"e:\workspace2\english-three\agent"

def log(m):
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(f"[{time.strftime('%H:%M:%S')}] {m}\n")
    print(m)

log("=== DeerFlow v4 ===")
log(f"sys.executable={sys.executable}")

# 0. Port check
log("--- Step 0: Port 8765 ---")
try:
    o = subprocess.check_output(["netstat","-ano"],text=True,timeout=10)
    for l in o.splitlines():
        if "8765" in l and "LISTENING" in l:
            pid = l.strip().split()[-1]
            log(f"Kill PID {pid}")
            subprocess.run(["taskkill","/F","/PID",pid],capture_output=True)
            time.sleep(1)
            break
    else:
        log("Port 8765 free")
except:
    log("Port check skipped")

# 1. DeerFlow
log("--- Step 1: DeerFlow ---")
sys.path.insert(0, AGENT)
try:
    from deerflow.client import DeerFlowClient
    c = DeerFlowClient(config_path=os.path.join(AGENT,"config.yaml"))
    r = c.chat("Say hello in one sentence")
    log(f"DF reply: {r}")
    log("DF OK")
except Exception as e:
    log(f"DF FAIL: {e}")
    log(traceback.format_exc())
    for ep in ["http://127.0.0.1:15721/health","http://127.0.0.1:15721/v1/models"]:
        try:
            r = urllib.request.urlopen(ep,timeout=5)
            log(f"{ep} -> {r.status} {r.read().decode()[:300]}")
        except Exception as e2:
            log(f"{ep} -> {e2}")

# 2. Start Tutor API
log("--- Step 2: Start Tutor API ---")
env = os.environ.copy()
env["TUTOR_PORT"]="8765"
env["PYTHONIOENCODING"]="utf-8"
python = r"e:\workspace2\english-three\agent\.venv\Scripts\python.exe"

proc = subprocess.Popen(
    [python, "-m", "agent_english.tutor.api"],
    cwd=AGENT, env=env,
    stdout=open(r"e:\workspace2\english-three\agent\_tutor_o.log","w",encoding="utf-8"),
    stderr=open(r"e:\workspace2\english-three\agent\_tutor_e.log","w",encoding="utf-8"),
)
log(f"PID={proc.pid}")

# 3. Wait & Test
log("--- Step 3: Wait & Test ---")
ready = False
for i in range(30):
    time.sleep(2)
    try:
        r = urllib.request.urlopen("http://127.0.0.1:8765/health",timeout=3)
        if r.status==200:
            log(f"Ready ({i+1})")
            ready=True
            break
    except:
        pass
    if proc.poll() is not None:
        log(f"Exited code={proc.returncode}")
        break
    log(f"Waiting ({i+1})")

if ready:
    payload = {"user_id":"debug-u1","session_id":"s-test-1","message":"用一句话自我介绍","discussion":{"bind":"set","scene":{"type":"greeting","can_reveal_answer":True,"title":"初次见面","description":"学生初次进入学习界面"}}}
    try:
        req = urllib.request.Request(
            "http://127.0.0.1:8765/tutor/chat",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type":"application/json"},
        )
        resp = urllib.request.urlopen(req,timeout=30)
        d = json.loads(resp.read().decode("utf-8"))
        log(f"Status: {resp.status}")
        log(f"Reply: {json.dumps(d, ensure_ascii=False)}")
    except Exception as e:
        log(f"API FAIL: {e}")
        log(traceback.format_exc())
else:
    for fn in [r"e:\workspace2\english-three\agent\_tutor_e.log"]:
        try:
            with open(fn) as f: log(f"{fn}:\n{f.read()[:3000]}")
        except: pass

log("Done")
