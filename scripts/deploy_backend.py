import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import os
import time
import paramiko
from pathlib import Path

HOST = "23.80.89.116"
USER = "root"
KEY_PATH = os.path.expanduser("~/.ssh/id_ed25519")
LOCAL_BACKEND_DIR = Path(r"c:\Users\Henrique - PC\Desktop\Projetos Dev\johb\backend")
REMOTE_SRV_DIR = "/srv/johb"
REMOTE_BACKEND_DIR = f"{REMOTE_SRV_DIR}/backend"

def deploy():
    print("=" * 60)
    print(f"🚀 INICIANDO DEPLOY DO BACKEND NA VPS ({HOST})")
    print("=" * 60)

    # 1. Conexão SSH
    print("[1/5] Conectando via SSH com chave Ed25519...")
    k = paramiko.Ed25519Key.from_private_key_file(KEY_PATH)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, pkey=k, timeout=15)
    print("✅ Conectado com sucesso!")

    sftp = client.open_sftp()

    # 2. Backup do server.py atual
    print("[2/5] Criando backup do server.py atual na VPS...")
    backup_cmd = f"cp {REMOTE_BACKEND_DIR}/server.py {REMOTE_BACKEND_DIR}/server.py.bak_$(date +%Y%m%d_%H%M%S)"
    stdin, stdout, stderr = client.exec_command(backup_cmd)
    stdin.close()
    stdout.channel.recv_exit_status()
    print("✅ Backup criado.")

    # 3. Upload dos arquivos atualizados
    print("[3/5] Enviando server.py atualizado via SFTP...")
    local_server_file = LOCAL_BACKEND_DIR / "server.py"
    remote_server_file = f"{REMOTE_BACKEND_DIR}/server.py"
    sftp.put(str(local_server_file), remote_server_file)
    print(f"✅ Arquivo {local_server_file.name} enviado ({local_server_file.stat().st_size} bytes).")

    # Upload requirements.txt se existir
    local_req = LOCAL_BACKEND_DIR / "requirements.txt"
    if local_req.exists():
        sftp.put(str(local_req), f"{REMOTE_BACKEND_DIR}/requirements.txt")

    sftp.close()

    # 4. Reiniciar Container johb-api
    print("[4/5] Reiniciando container Docker 'johb-api'...")
    restart_cmd = "docker restart johb-api"
    stdin, stdout, stderr = client.exec_command(restart_cmd)
    stdin.close()
    exit_code = stdout.channel.recv_exit_status()
    if exit_code == 0:
        print("✅ Container johb-api reiniciado com sucesso!")
    else:
        err_msg = stderr.read().decode()
        print(f"⚠️ Erro ao reiniciar container: {err_msg}")

    # Aguardar 3 segundos para inicialização
    time.sleep(3)

    # 5. Verificação de Saúde e Logs
    print("[5/5] Verificando logs e integridade da API...")
    check_cmd = "docker logs --tail 25 johb-api; echo '---'; curl -s http://127.0.0.1:8060/api/health || curl -s http://127.0.0.1:8060/docs"
    stdin, stdout, stderr = client.exec_command(check_cmd)
    stdin.close()
    logs_output = stdout.read().decode('utf-8', errors='replace')
    stdout.channel.recv_exit_status()
    
    print("\n📋 LOGS DO CONTAINER johb-api:")
    print(logs_output)

    client.close()
    print("=" * 60)
    print("🎉 DEPLOY DO BACKEND CONCLUÍDO COM SUCESSO!")
    print("=" * 60)

if __name__ == "__main__":
    deploy()
