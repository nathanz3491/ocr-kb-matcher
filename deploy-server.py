import zipfile, os, subprocess, sys

os.chdir("/home/nathan/ocr-kb-matcher")
print("Extracting frontend-next.zip...")
with zipfile.ZipFile("frontend-next.zip", "r") as z:
    z.extractall("frontend/")
print("Unzip done. Removing zip...")
os.remove("frontend-next.zip")
print("Restarting PM2...")
result = subprocess.run(
    ["/home/nathan/.nvm/versions/node/v20.20.2/lib/node_modules/pm2/bin/pm2", "restart", "backend", "frontend"],
    capture_output=True, text=True
)
print(result.stdout)
print(result.stderr)
