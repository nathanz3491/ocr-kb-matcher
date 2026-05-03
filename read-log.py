import subprocess, os

log_path = "/home/nathan/.pm2/logs/ocr-backend-error.log"
if os.path.exists(log_path):
    with open(log_path) as f:
        lines = f.readlines()
    print(f"Total lines: {len(lines)}")
    for line in lines[-30:]:
        print(repr(line))
