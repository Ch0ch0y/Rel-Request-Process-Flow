import requests
import json

payload = {
    "username": "Debug Test",
    "email": "debug_test@example.com",
    "password": "TestPass123!",
    "role": "Reliability Engineer"
}

r = requests.post('http://localhost:8000/api/auth/register', json=payload)
print('Status:', r.status_code)
try:
    print('JSON:', r.json())
except Exception:
    print('Text:', r.text)
