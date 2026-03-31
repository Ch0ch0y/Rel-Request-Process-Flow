#!/bin/bash
# Start script for Render deployment
# Uses Python to pre-bind socket with SO_REUSEADDR to avoid Errno 98

cd backend
exec python render_start.py
