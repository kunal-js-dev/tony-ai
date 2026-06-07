@echo off
echo ============================================
echo   TONY AI — React + Flask (100%% Offline)
echo ============================================
echo.

echo [1/3] Installing Python packages...
pip install -r backend\requirements.txt --quiet

echo [2/3] Installing Node packages...
cd frontend
call npm install --silent
cd ..

echo [3/3] Checking Ollama...
where ollama >nul 2>nul
if %ERRORLEVEL%==0 (
    echo   Ollama found — ensure a model is pulled:
    echo   ollama pull llama3.2
) else (
    echo   Ollama not found — AI will use fallback mode.
    echo   Install: https://ollama.com/download
)

echo.
echo   Backend 1 (System) -^> http://localhost:5000
echo   Backend 2 (Analyzer) -^> http://localhost:8000
echo   Frontend -^> http://localhost:3000
echo.

start "TONY AI - Flask Backend (5000)" cmd /k "python backend\app.py"
timeout /t 2 /nobreak >nul
start "TONY AI - FastAPI Backend (8000)" cmd /k "python backend\main.py"
timeout /t 3 /nobreak >nul
start "TONY AI - Frontend" cmd /k "cd frontend && npm run dev"
timeout /t 4 /nobreak >nul
start http://localhost:3000
echo  Both servers launched! Browser opening...
pause
