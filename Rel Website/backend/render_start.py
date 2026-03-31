"""
Render.com start script — direct uvicorn start, no socket pre-binding.
Port 9999 is reserved by Render infrastructure and cannot be used.
PORT env var is forced to 10000 via render.yaml.
"""
import os
import uvicorn

port = int(os.environ.get("PORT", "10000"))
print(f"==> Starting server on port {port}...")
uvicorn.run("server:app", host="0.0.0.0", port=port, log_level="info")
