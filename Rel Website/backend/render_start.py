"""
Render.com start script — hard-coded port 10000.
Port 9999 is permanently reserved by Render's internal metrics agent.
We ignore the PORT env var entirely since the dashboard overrides it to 9999.
"""
import sys
import traceback

PORT = 10000
print(f"==> Starting RELDMS backend on port {PORT}...")
sys.stdout.flush()

# Pre-import server so module-level errors appear clearly in logs
print("==> Importing server module...")
sys.stdout.flush()
try:
    import server  # noqa: F401
    print("==> Server module imported successfully.")
    sys.stdout.flush()
except Exception:
    print("==> FATAL: Failed to import server module:")
    traceback.print_exc()
    sys.stdout.flush()
    sys.exit(1)

import uvicorn
try:
    uvicorn.run("server:app", host="0.0.0.0", port=PORT, log_level="info")
except Exception:
    print("==> FATAL: uvicorn.run raised an exception:")
    traceback.print_exc()
    sys.stdout.flush()
    sys.exit(1)
