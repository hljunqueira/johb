import os
import paramiko

def check():
    k = paramiko.Ed25519Key.from_private_key_file(os.path.expanduser('~/.ssh/id_ed25519'))
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect('23.80.89.116', username='root', pkey=k, timeout=15)

    print("--- 1. RUNNING DOCKER CONTAINERS ---")
    stdin, stdout, stderr = c.exec_command('docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"')
    print(stdout.read().decode())

    print("--- 2. BACKEND ENV FILE ---")
    stdin, stdout, stderr = c.exec_command('cat /srv/johb/env/backend.env')
    print(stdout.read().decode())

    c.close()

if __name__ == '__main__':
    check()
