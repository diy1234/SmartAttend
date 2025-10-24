import importlib, sys, json, requests
sys.path.append('.')
mod = importlib.import_module('backend.app')
app = getattr(mod, 'app')
print('\n--- direct call to app.home() under app context ---')
with app.app_context():
	# call home() and convert Flask response to JSON-compatible dict
	resp = mod.home()
	# resp is a Flask Response object; get its JSON
	try:
		data = resp.get_json()
	except Exception:
		data = str(resp)
	print(json.dumps(data, indent=2))

print('\n--- HTTP GET to server root ---')
resp = requests.get('http://127.0.0.1:5000/')
print(resp.status_code)
print(resp.text)
