import os
import sys
import paramiko
from pathlib import Path

HOST = "23.80.89.116"
USER = "root"
KEY_PATH = os.path.expanduser("~/.ssh/id_ed25519")

def get_ssh_client():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    # Carregar chave Ed25519
    key = paramiko.Ed25519Key.from_private_key_file(KEY_PATH)
    client.connect(hostname=HOST, username=USER, pkey=key, timeout=15)
    return client

def run_cmd(cmd: str):
    client = get_ssh_client()
    try:
        print(f"[*] Executando na VPS ({HOST}): {cmd}")
        stdin, stdout, stderr = client.exec_command(cmd, timeout=120)
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        exit_code = stdout.channel.recv_exit_status()
        
        if out:
            print(out)
        if err:
            print(err, file=sys.stderr)
        return exit_code, out, err
    finally:
        client.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: py scripts/vps_manager.py '<comando>'")
        sys.exit(1)
    
    cmd = sys.argv[1]
    code, _, _ = run_cmd(cmd)
    sys.exit(code)
