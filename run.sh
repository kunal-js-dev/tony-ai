#!/bin/bash
echo ""
echo "  TONY AI — React + Flask Full-Stack"
echo "  ==================================="
echo ""

echo "[1/4] Installing Python packages..."
pip install -r backend/requirements.txt --quiet

echo "[2/4] Installing Node packages..."
cd frontend && npm install --silent && cd ..

echo "[3/4] Checking Ollama..."
if command -v ollama &>/dev/null; then
    echo "  Ollama found — starting..."
    ollama serve &>/dev/null &
    sleep 2
else
    echo "  Ollama not found — fallback mode."
    echo "  Install: https://ollama.com/download"
fi

echo "[4/4] Starting servers..."
echo ""
echo "  Backend 1 (System) → http://localhost:5000"
echo "  Backend 2 (Analyzer) → http://localhost:8000"
echo "  Frontend → http://localhost:3000"
echo ""

python backend/app.py &
python backend/main.py &
sleep 2
cd frontend && npm run dev &
sleep 3
(open http://localhost:3000 || xdg-open http://localhost:3000) 2>/dev/null &

echo " Both servers running. Press Ctrl+C to stop all."
wait
