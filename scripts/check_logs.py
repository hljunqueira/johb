import os
import paramiko

def check():
    k = paramiko.Ed25519Key.from_private_key_file(os.path.expanduser('~/.ssh/id_ed25519'))
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect('23.80.89.116', username='root', pkey=k, timeout=15)

    print("--- DOCKER LOGS (LAST 100 LINES) ---")
    stdin, stdout, stderr = c.exec_command('docker logs --tail 100 johb-api')
    print(stdout.read().decode())
    print(stderr.read().decode())

    c.close()

if __name__ == '__main__':
    check()
