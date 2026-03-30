import http.server
import socketserver
import json
import uuid
from urllib.parse import urlparse, parse_qs
from datetime import datetime, timezone

PORT = 8000

DEFAULT_STEPS = [
    {"step_number": i+1, "step_name": name, "status": "pending", "completed_at": None}
    for i, name in enumerate([
        "Incoming Inspection","Visual","Serialize Samples","O/S","Sat","Bake","Reflow",
        "SAT","O/S","Visual","HTS","SAT","O/S","Visual"
    ])
]

USERS = {}
REQUESTS = {}

class Handler(http.server.BaseHTTPRequestHandler):
    def _send(self, code=200, data=None):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        if data is None:
            data = {}
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def _read_json(self):
        length = int(self.headers.get('Content-Length', 0))
        if length == 0:
            return {}
        return json.loads(self.rfile.read(length))

    def _authenticate(self):
        auth = self.headers.get('Authorization')
        if not auth or not auth.startswith('Bearer '):
            return None
        token = auth.split(' ', 1)[1]
        # token format: token-{user_id}
        if not token.startswith('token-'):
            return None
        user_id = token.split('-', 1)[1]
        return USERS.get(user_id)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        if path == '/api/' or path == '/api':
            return self._send(200, {"message": "Rel Request Process Flow API (mock)"})

        if path.startswith('/api/auth/me'):
            user = self._authenticate()
            if not user:
                return self._send(401, {"detail": "Unauthorized"})
            return self._send(200, user)

        if path.startswith('/api/requests'):
            user = self._authenticate()
            if not user:
                return self._send(401, {"detail": "Unauthorized"})
            parts = path.split('/')
            if len(parts) == 3 and parts[2] == 'requests':
                # list requests
                if user['role'] == 'Requestor':
                    lst = [r for r in REQUESTS.values() if r['created_by'] == user['id']]
                else:
                    lst = list(REQUESTS.values())
                return self._send(200, lst)
            elif len(parts) == 4:
                req_id = parts[3]
                req = REQUESTS.get(req_id)
                if not req:
                    return self._send(404, {"detail": "Request not found"})
                # Requestor access control
                if user['role'] == 'Requestor' and req['created_by'] != user['id']:
                    return self._send(403, {"detail": "Access denied"})
                return self._send(200, req)

        if path.startswith('/api/dashboard/stats'):
            user = self._authenticate()
            if not user:
                return self._send(401, {"detail": "Unauthorized"})
            total = len(REQUESTS)
            active = sum(1 for r in REQUESTS.values() if r['status'] == 'in_progress')
            completed = sum(1 for r in REQUESTS.values() if r['status'] == 'completed')
            pending = sum(1 for r in REQUESTS.values() if r['status'] == 'pending')
            recent = list(REQUESTS.values())[-10:]
            data = {
                "total_requests": total,
                "active_requests": active,
                "completed_requests": completed,
                "pending_requests": pending,
                "ongoing_requests": active,
                "delayed_requests": 0,
                "upcoming_deadline_requests": 0,
                "recent_activity": recent,
                "delayed_requests_list": []
            }
            return self._send(200, data)

        if path.startswith('/api/users'):
            user = self._authenticate()
            if not user:
                return self._send(401, {"detail": "Unauthorized"})
            if user['role'] not in ['Admin', 'Reliability Engineer']:
                return self._send(403, {"detail": "Insufficient permissions"})
            lst = list(USERS.values())
            return self._send(200, lst)

        return self._send(404, {"detail": "Not found"})

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        if path.startswith('/api/auth/register'):
            body = self._read_json()
            uid = str(uuid.uuid4())
            user = {
                'id': uid,
                'email': body.get('email'),
                'username': body.get('username'),
                'password': body.get('password'),
                'role': body.get('role'),
                'created_at': datetime.now(timezone.utc).isoformat()
            }
            USERS[uid] = user
            return self._send(200, {**user})

        if path.startswith('/api/auth/login'):
            body = self._read_json()
            email = body.get('email')
            password = body.get('password')
            for u in USERS.values():
                if u['email'] == email and u['password'] == password:
                    token = f"token-{u['id']}"
                    return self._send(200, {"access_token": token, "user": {"username": u['username']}})
            return self._send(401, {"detail": "Invalid email or password"})

        if path.startswith('/api/requests'):
            user = self._authenticate()
            if not user:
                return self._send(401, {"detail": "Unauthorized"})
            if user['role'] not in ['Admin', 'Reliability Engineer']:
                return self._send(403, {"detail": "Insufficient permissions"})
            body = self._read_json()
            rid = str(uuid.uuid4())
            req = {
                'id': rid,
                'request_number': f"REL-{len(REQUESTS)+1:06d}",
                'created_by': user['id'],
                'created_by_username': user['username'],
                'created_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat(),
                'status': 'pending',
                'current_step': 1,
                'steps': [dict(s) for s in DEFAULT_STEPS]
            }
            REQUESTS[rid] = req
            return self._send(200, req)

        return self._send(404, {"detail": "Not found"})

    def do_PATCH(self):
        parsed = urlparse(self.path)
        path = parsed.path
        if '/api/requests/' in path and '/steps/' in path:
            user = self._authenticate()
            if not user:
                return self._send(401, {"detail": "Unauthorized"})
            parts = path.split('/')
            # /api/requests/{id}/steps/{n}
            try:
                req_id = parts[3]
                step_number = int(parts[5])
            except Exception:
                return self._send(400, {"detail": "Bad request"})
            req = REQUESTS.get(req_id)
            if not req:
                return self._send(404, {"detail": "Request not found"})
            body = self._read_json()
            idx = step_number - 1
            if idx < 0 or idx >= len(req['steps']):
                return self._send(400, {"detail": "Invalid step number"})
            for k, v in body.items():
                req['steps'][idx][k] = v
            if body.get('status') == 'completed':
                req['steps'][idx]['completed_at'] = datetime.now(timezone.utc).isoformat()
            # update current_step and status
            completed = sum(1 for s in req['steps'] if s['status'] == 'completed')
            req['current_step'] = completed + 1
            if completed == len(req['steps']):
                req['status'] = 'completed'
            elif completed > 0:
                req['status'] = 'in_progress'
            req['updated_at'] = datetime.now(timezone.utc).isoformat()
            REQUESTS[req_id] = req
            return self._send(200, {"message": "Step updated successfully", "request": req})

        if path.startswith('/api/settings'):
            user = self._authenticate()
            if not user:
                return self._send(401, {"detail": "Unauthorized"})
            return self._send(200, {"message": "Settings updated"})

        return self._send(404, {"detail": "Not found"})

    def do_DELETE(self):
        parsed = urlparse(self.path)
        path = parsed.path
        if path.startswith('/api/requests/'):
            user = self._authenticate()
            if not user:
                return self._send(401, {"detail": "Unauthorized"})
            rid = path.split('/')[-1]
            if rid in REQUESTS:
                del REQUESTS[rid]
                return self._send(200, {"message": "Request deleted successfully"})
            return self._send(404, {"detail": "Request not found"})

        if path.startswith('/api/users/'):
            user = self._authenticate()
            if not user:
                return self._send(401, {"detail": "Unauthorized"})
            if user['role'] not in ['Admin', 'Reliability Engineer']:
                return self._send(403, {"detail": "Insufficient permissions"})
            uid = path.split('/')[-1]
            if uid in USERS:
                del USERS[uid]
                return self._send(200, {"message": "User deleted successfully"})
            return self._send(404, {"detail": "User not found"})

        return self._send(404, {"detail": "Not found"})


if __name__ == '__main__':
    print(f"Starting mock server on http://localhost:{PORT}")
    with socketserver.TCPServer(('0.0.0.0', PORT), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('Shutting down')
            httpd.server_close()
