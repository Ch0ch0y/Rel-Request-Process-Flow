#!/bin/bash
# Start script for Render deployment

PORT="${PORT:-10000}"

echo "==> Diagnosing port $PORT..."
ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null || echo "No ss/netstat available"
echo "==> Killing ALL processes on port $PORT..."
fuser -k "$PORT/tcp" 2>/dev/null || true
kill -9 $(lsof -t -i:"$PORT" 2>/dev/null) 2>/dev/null || true
# Also kill any leftover python/gunicorn/uvicorn processes
pkill -9 -f gunicorn 2>/dev/null || true
pkill -9 -f uvicorn 2>/dev/null || true
pkill -9 -f "python.*server" 2>/dev/null || true
sleep 2
echo "==> Port check after kill:"
ss -tlnp 2>/dev/null | grep "$PORT" || echo "Port $PORT is free"

echo "==> Starting gunicorn on port $PORT..."
cd backend
exec gunicorn server:app \
  -w 1 \
  -k uvicorn.workers.UvicornWorker \
  --bind "0.0.0.0:$PORT" \
  --timeout 120 \
  --graceful-timeout 30
