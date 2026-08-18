import os
import sys
import paramiko

def run_vps(cmd: str):
    key_path = os.path.expanduser("~/.ssh/id_ed25519")
    k = paramiko.Ed25519Key.from_private_key_file(key_path)
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect("23.80.89.116", username="root", pkey=k, timeout=10)
    
    stdin, stdout, stderr = client.exec_command(cmd)
    stdin.close()
    
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    exit_code = stdout.channel.recv_exit_status()
    
    client.close()
    return exit_code, out, err

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
    code, out, err = run_vps(cmd)
    if out:
        print(out)
    if err:
        print(err, file=sys.stderr)
    sys.exit(code)
