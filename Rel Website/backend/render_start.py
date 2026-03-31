"""
Render.com start script — retries port binding with backoff
to handle port stuck from crash loops.
"""
import os
import sys
import time
import socket
import uvicorn

port = int(os.environ.get("PORT", "10000"))
MAX_RETRIES = 30  # 30 retries × 2s = 60 seconds max wait

for attempt in range(1, MAX_RETRIES + 1):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEPORT, 1)
    except (AttributeError, OSError):
        pass

    try:
        sock.bind(("0.0.0.0", port))
        sock.listen(128)
        sock.setblocking(False)
        print(f"==> Socket bound on port {port} (attempt {attempt})")
        break
    except OSError as e:
        sock.close()
        if attempt == MAX_RETRIES:
            print(f"==> FATAL: Could not bind port {port} after {MAX_RETRIES} attempts: {e}")
            sys.exit(1)
        print(f"==> Port {port} busy, retrying in 2s (attempt {attempt}/{MAX_RETRIES})...")
        time.sleep(2)

print(f"==> Starting uvicorn with pre-bound socket on port {port}...")
config = uvicorn.Config("server:app", log_level="info")
server = uvicorn.Server(config)
server.run(sockets=[sock])
