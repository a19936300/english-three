@echo off
echo Starting Tutor API...
cd /d e:\workspace2\english-three\agent
set TUTOR_PORT=8765
set PYTHONIOENCODING=utf-8
"e:\workspace2\english-three\agent\.venv\Scripts\python.exe" -m agent_english.tutor.api
pause
