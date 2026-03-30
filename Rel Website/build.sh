#!/usr/bin/env bash
# Build script for Render.com deployment
# This builds the React frontend and installs backend dependencies

set -o errexit  # Exit on error

echo "=== Installing backend dependencies ==="
pip install --upgrade pip
pip install -r backend/requirements.txt

echo "=== Installing frontend dependencies ==="
cd frontend

# Remove any cached Windows-specific esbuild binaries
rm -rf node_modules/.cache
rm -rf node_modules/@esbuild

npm install --force

echo "=== Building frontend ==="
NODE_OPTIONS="--max-old-space-size=450" npx vite build
cd ..

echo "=== Build complete ==="
echo "Frontend built to frontend/dist/"
