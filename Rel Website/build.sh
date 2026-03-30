#!/usr/bin/env bash
# Build script for Render.com deployment
# This builds the React frontend and installs backend dependencies

set -o errexit  # Exit on error

# Limit Node.js memory to avoid OOM on Render free tier (512 MB)
export NODE_OPTIONS="--max-old-space-size=400"

echo "=== Installing backend dependencies ==="
pip install --upgrade pip
pip install -r backend/requirements.txt

echo "=== Installing frontend dependencies ==="
cd frontend
npm install --production=false

echo "=== Building frontend ==="
npm run build
cd ..

echo "=== Build complete ==="
echo "Frontend built to frontend/dist/"
