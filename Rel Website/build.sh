#!/usr/bin/env bash
# build.sh — Render.com build script
# Installs Python dependencies and builds the React frontend.
set -e

echo "==> Installing Python dependencies..."
pip install --upgrade pip
pip install -r backend/requirements.txt

echo "==> Installing Node dependencies..."
cd frontend
npm ci
echo "==> Building React frontend..."
npm run build
cd ..

echo "==> Ensuring uploads directory exists..."
mkdir -p backend/uploads

echo "==> Build complete."
