@echo off
cd /d "%~dp0backend"
call "%~dp0.venv\Scripts\activate.bat"
python -m uvicorn server:app --reload --host 0.0.0.0 --port 8000
