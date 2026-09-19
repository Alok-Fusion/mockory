@echo off
echo ===================================================
echo       Launching Rory Mock Interview Platform
echo ===================================================

echo [1/3] Checking Python Virtual Environment...
if not exist ".venv\Scripts\activate" (
    echo Creating virtual environment...
    python -m venv .venv
    call .venv\Scripts\activate
    pip install -r backend\requirements.txt
) else (
    echo Virtual environment detected.
)

echo [2/3] Launching FastAPI Backend on http://127.0.0.1:8000 ...
start "Rory Backend Server" cmd /k "call .venv\Scripts\activate && python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [3/3] Launching React Frontend on http://localhost:5173 ...
cd frontend
start "Rory Frontend Dev" cmd /k "npm run dev"
cd ..

echo ===================================================
echo Rory Mock Interview is starting!
echo Backend:  http://127.0.0.1:8000
echo Frontend: http://localhost:5173
echo ===================================================
timeout /t 5
start http://localhost:5173
