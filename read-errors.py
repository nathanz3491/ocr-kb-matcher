import subprocess, os

key = os.path.expanduser("~/.ssh/id_ed25519")
server = "nathan@139.199.220.244"
node_path = "/home/nathan/.nvm/versions/node/v20.20.2/bin"

def ssh(cmd):
    full = f"export PATH={node_path}:$PATH && {cmd}"
    r = subprocess.run(
        ["ssh", "-i", key, "-o", "StrictHostKeyChecking=no", "-p", "6000",
         server, full],
        capture_output=True, text=True
    )
    return r.stdout + r.stderr

f = open("/home/nathan/.pm2/logs/ocr-backend-error.log")
lines = f.readlines()
f.close()
print("Last 40 error lines:")
for l in lines[-40:]:
    print(repr(l))
