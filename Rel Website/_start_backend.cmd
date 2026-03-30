@echo off
cd /d "C:\Users\168056\OneDrive - Amkor Technology\Documents\GitHub\Rel Request Process Flow\Rel Website\backend"
call "C:\Users\168056\OneDrive - Amkor Technology\Documents\GitHub\Rel Request Process Flow\Rel Website\backend\.venv\Scripts\activate.bat"
"C:\Users\168056\OneDrive - Amkor Technology\Documents\GitHub\Rel Request Process Flow\Rel Website\backend\.venv\Scripts\python.exe" -m uvicorn server:app --reload --host 0.0.0.0 --port 8000
