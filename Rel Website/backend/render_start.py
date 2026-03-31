"""
Render.com start script — hard-coded port 10000.
Port 9999 is permanently reserved by Render's internal metrics agent.
We ignore the PORT env var entirely since the dashboard overrides it to 9999.
"""
import uvicorn

PORT = 10000
print(f"==> Starting server on port {PORT}...")
uvicorn.run("server:app", host="0.0.0.0", port=PORT, log_level="info")
