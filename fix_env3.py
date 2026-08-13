import re

path = '/data/coolify/services/r3b7rx4f7zb4kp9t6o13vgrs/.env'
with open(path, 'r') as f:
    content = f.read()

content = re.sub(r'^ADDITIONAL_REDIRECT_URLS=.*', 'ADDITIONAL_REDIRECT_URLS=https://www.servitracks.com/*,https://servitracks.com/*,http://localhost:3000/*', content, flags=re.MULTILINE)

with open(path, 'w') as f:
    f.write(content)
