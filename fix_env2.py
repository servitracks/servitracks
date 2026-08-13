import re

path = '/data/coolify/services/r3b7rx4f7zb4kp9t6o13vgrs/.env'
with open(path, 'r') as f:
    content = f.read()

content = re.sub(r'SMTP_ADMIN_EMAIL=.*', 'SMTP_ADMIN_EMAIL=info@no-responder.servitracks.com', content)

with open(path, 'w') as f:
    f.write(content)
