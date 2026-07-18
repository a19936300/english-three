# -*- coding: utf-8 -*-
"""Call tutor API and print result to a log file."""
import sys, os, json, urllib.request as req, traceback as tb

LOG = r"e:\workspace2\english-three\agent\test_api_output.log"

body = json.dumps({
    "user_id": "debug-u1",
    "session_id": "s-test-1",
    "message": "intro yourself in one sentence",
    "discussion": {"bind": "set", "scene": {
        "phase": "learn", "can_reveal_answer": True,
        "content": {"type": "word", "en": "hello"}
    }},
}).encode()

try:
    r = req.urlopen(req.Request("http://127.0.0.1:8765/tutor/chat", data=body,
                                headers={"Content-Type": "application/json"}), timeout=120)
    data = json.loads(r.read())
    with open(LOG, "w", encoding="utf-8") as f:
        f.write("reply: " + data.get("reply","")[:800] + "\n")
        f.write("session_id: " + str(data.get("session_id","")) + "\n")
except Exception as e:
    with open(LOG, "w", encoding="utf-8") as f:
        f.write("ERROR: " + str(e) + "\n")
        tb.print_exc(file=f)

print("DONE ->", LOG)
