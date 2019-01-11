import subprocess
import os

def custom():
    """CUSTOM SCRIPT"""
    file = [os.path.join(".", "wal.sh")]
    subprocess.call(file)

custom()
