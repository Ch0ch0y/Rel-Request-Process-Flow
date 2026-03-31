"""
Render.com start script — pre-binds socket with SO_REUSEADDR/SO_REUSEPORT
then passes it to uvicorn to avoid Errno 98 port conflicts.
"""
import os
import socket
import uvicorn

port = int(os.environ.get("PORT", "10000"))

print(f"==> Creating socket on port {port} with SO_REUSEADDR...")

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
try:
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEPORT, 1)
    print("==> SO_REUSEPORT enabled")
except (AttributeError, OSError) as e:
    print(f"==> SO_REUSEPORT not available: {e}")

sock.bind(("0.0.0.0", port))
sock.listen(128)
sock.setblocking(False)

print(f"==> Socket bound successfully to 0.0.0.0:{port}")

config = uvicorn.Config("server:app", log_level="info")
server = uvicorn.Server(config)
server.run(sockets=[sock])
