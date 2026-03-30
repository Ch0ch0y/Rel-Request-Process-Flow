import urllib.request

url = 'http://127.0.0.1:9000/api/requests/next-number'
print('GET', url)
resp = urllib.request.urlopen(url, timeout=5)
print('status', resp.status)
print(resp.read().decode())
