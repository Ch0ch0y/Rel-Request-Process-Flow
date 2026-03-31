#!/bin/bash
# Start script for Render deployment
# Kills any zombie process holding the port before starting gunicorn

PORT="${PORT:-10000}"

echo "==> Checking for processes on port $PORT..."
# Kill any process using the target port
fuser -k "$PORT/tcp" 2>/dev/null || true
sleep 1

echo "==> Starting gunicorn on port $PORT..."
cd backend
exec gunicorn server:app \
  -w 1 \
  -k uvicorn.workers.UvicornWorker \
  --bind "0.0.0.0:$PORT" \
  --timeout 120 \
  --graceful-timeout 30
