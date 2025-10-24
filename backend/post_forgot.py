import requests
resp = requests.post('http://127.0.0.1:5000/api/auth/forgot-password', json={'email':'admin@smartattend.com'})
print('STATUS', resp.status_code)
print(resp.text)
