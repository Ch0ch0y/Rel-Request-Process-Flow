#!/usr/bin/env bash
# start.sh — Render.com start script
# Starts the FastAPI backend on port 10000.
# Port 9999 is permanently reserved by Render's internal agent — do NOT use it.
set -e

echo "==> Starting RELDMS backend on port 10000..."
cd backend
exec python render_start.py
