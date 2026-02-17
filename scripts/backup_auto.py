#!/usr/bin/env python3
"""
Sistema de Backup Automático Salada Soul
Realiza backups diários com retenção configurável
"""

import os
import subprocess
import gzip
import shutil
from datetime import datetime, timedelta
from pathlib import Path
import logging
import json
import argparse

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configurações
CONFIG = {
    'db_host': os.environ.get('DB_HOST', 'localhost'),
    'db_port': os.environ.get('DB_PORT', '5432'),
    'db_name': os.environ.get('DB_NAME', 'saladasoul'),
    'db_user': os.environ.get('DB_USER', 'postgres'),
    'db_password': os.environ.get('DB_PASSWORD', ''),
    'backup_dir': Path(os.environ.get('BACKUP_DIR', '/opt/saladasoul/backups')),
    'retention_days': int(os.environ.get('BACKUP_RETENTION_DAYS', '30')),
    'uploads_dir': Path(os.environ.get('UPLOADS_DIR', '/opt/saladasoul/backend/uploads')),
    's3_bucket': os.environ.get('S3_BACKUP_BUCKET'),
    'aws_access_key': os.environ.get('AWS_ACCESS_KEY_ID'),
    'aws_secret_key': os.environ.get('AWS_SECRET_ACCESS_KEY'),
}


class BackupManager:
    """Gerencia backups do banco de dados e uploads"""
    
    def __init__(self):
        self.backup_dir = CONFIG['backup_dir']
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        self.metadata_file = self.backup_dir / 'backups_metadata.json'
        self.metadata = self.load_metadata()
    
    def load_metadata(self) -> dict:
        """Carrega metadados dos backups"""
        if self.metadata_file.exists():
            try:
                with open(self.metadata_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Erro ao carregar metadados: {e}")
        return {'backups': []}
    
    def save_metadata(self):
        """Salva metadados dos backups"""
        try:
            with open(self.metadata_file, 'w') as f:
                json.dump(self.metadata, f, indent=2)
        except Exception as e:
            logger.error(f"Erro ao salvar metadados: {e}")
    
    def create_database_backup(self) -> Path:
        """Cria backup do banco de dados PostgreSQL"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = self.backup_dir / f'saladasoul_db_{timestamp}.sql'
        compressed_file = Path(f'{backup_file}.gz')
        
        logger.info(f"Iniciando backup do banco de dados: {backup_file.name}")
        
        # Configura variáveis de ambiente para pg_dump
        env = os.environ.copy()
        if CONFIG['db_password']:
            env['PGPASSWORD'] = CONFIG['db_password']
        
        try:
            # Executa pg_dump
            cmd = [
                'pg_dump',
                '-h', CONFIG['db_host'],
                '-p', CONFIG['db_port'],
                '-U', CONFIG['db_user'],
                '-d', CONFIG['db_name'],
                '-F', 'p',  # Plain text format
                '-v',  # Verbose
                '-f', str(backup_file),
            ]
            
            result = subprocess.run(
                cmd,
                env=env,
                capture_output=True,
                text=True,
                check=True
            )
            
            # Comprime o arquivo
            logger.info(f"Comprimindo backup...")
            with open(backup_file, 'rb') as f_in:
                with gzip.open(compressed_file, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
            
            # Remove arquivo não comprimido
            backup_file.unlink()
            
            # Calcula checksum
            import hashlib
            sha256_hash = hashlib.sha256()
            with open(compressed_file, 'rb') as f:
                for chunk in iter(lambda: f.read(4096), b''):
                    sha256_hash.update(chunk)
            checksum = sha256_hash.hexdigest()
            
            # Registra metadados
            backup_info = {
                'id': timestamp,
                'type': 'database',
                'file': compressed_file.name,
                'path': str(compressed_file),
                'size': compressed_file.stat().st_size,
                'created_at': datetime.now().isoformat(),
                'checksum': checksum,
            }
            self.metadata['backups'].append(backup_info)
            self.save_metadata()
            
            logger.info(f"Backup criado com sucesso: {compressed_file.name} ({compressed_file.stat().st_size / 1024 / 1024:.2f} MB)")
            
            return compressed_file
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Erro ao criar backup: {e.stderr}")
            if backup_file.exists():
                backup_file.unlink()
            if compressed_file.exists():
                compressed_file.unlink()
            raise
        except Exception as e:
            logger.error(f"Erro inesperado: {e}")
            if backup_file.exists():
                backup_file.unlink()
            if compressed_file.exists():
                compressed_file.unlink()
            raise
    
    def create_uploads_backup(self) -> Path:
        """Cria backup dos arquivos de upload"""
        if not CONFIG['uploads_dir'].exists():
            logger.warning(f"Diretório de uploads não encontrado: {CONFIG['uploads_dir']}")
            return None
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = self.backup_dir / f'saladasoul_uploads_{timestamp}.tar.gz'
        
        logger.info(f"Iniciando backup dos uploads: {backup_file.name}")
        
        try:
            # Cria tar.gz do diretório de uploads
            shutil.make_archive(
                str(backup_file).replace('.tar.gz', ''),
                'gztar',
                CONFIG['uploads_dir']
            )
            
            # Calcula checksum
            import hashlib
            sha256_hash = hashlib.sha256()
            with open(backup_file, 'rb') as f:
                for chunk in iter(lambda: f.read(4096), b''):
                    sha256_hash.update(chunk)
            checksum = sha256_hash.hexdigest()
            
            # Registra metadados
            backup_info = {
                'id': timestamp,
                'type': 'uploads',
                'file': backup_file.name,
                'path': str(backup_file),
                'size': backup_file.stat().st_size,
                'created_at': datetime.now().isoformat(),
                'checksum': checksum,
            }
            self.metadata['backups'].append(backup_info)
            self.save_metadata()
            
            logger.info(f"Backup de uploads criado: {backup_file.name} ({backup_file.stat().st_size / 1024 / 1024:.2f} MB)")
            
            return backup_file
            
        except Exception as e:
            logger.error(f"Erro ao criar backup de uploads: {e}")
            if backup_file.exists():
                backup_file.unlink()
            raise
    
    def upload_to_s3(self, file_path: Path) -> bool:
        """Faz upload do backup para S3"""
        if not CONFIG['s3_bucket']:
            logger.info("S3 bucket não configurado, pulando upload")
            return False
        
        try:
            import boto3
            
            s3 = boto3.client(
                's3',
                aws_access_key_id=CONFIG['aws_access_key'],
                aws_secret_access_key=CONFIG['aws_secret_key']
            )
            
            s3_key = f"saladasoul/backups/{file_path.name}"
            
            logger.info(f"Enviando {file_path.name} para S3...")
            s3.upload_file(
                str(file_path),
                CONFIG['s3_bucket'],
                s3_key,
                ExtraArgs={'StorageClass': 'STANDARD_IA'}
            )
            
            logger.info(f"Upload para S3 concluído: {s3_key}")
            return True
            
        except ImportError:
            logger.warning("boto3 não instalado, pulando upload S3")
            return False
        except Exception as e:
            logger.error(f"Erro ao fazer upload para S3: {e}")
            return False
    
    def cleanup_old_backups(self):
        """Remove backups antigos baseado na política de retenção"""
        cutoff_date = datetime.now() - timedelta(days=CONFIG['retention_days'])
        
        logger.info(f"Limpando backups anteriores a {cutoff_date.date()}")
        
        removed_count = 0
        remaining_backups = []
        
        for backup in self.metadata['backups']:
            backup_date = datetime.fromisoformat(backup['created_at'])
            file_path = Path(backup['path'])
            
            if backup_date < cutoff_date:
                # Remove arquivo
                if file_path.exists():
                    try:
                        file_path.unlink()
                        logger.info(f"Removido: {backup['file']}")
                        removed_count += 1
                    except Exception as e:
                        logger.error(f"Erro ao remover {backup['file']}: {e}")
                        remaining_backups.append(backup)
                else:
                    logger.warning(f"Arquivo não encontrado: {backup['file']}")
            else:
                remaining_backups.append(backup)
        
        # Atualiza metadados
        self.metadata['backups'] = remaining_backups
        self.save_metadata()
        
        logger.info(f"Limpeza concluída: {removed_count} backups removidos")
    
    def list_backups(self):
        """Lista todos os backups disponíveis"""
        print("\n" + "="*80)
        print("BACKUPS DISPONÍVEIS")
        print("="*80)
        
        if not self.metadata['backups']:
            print("Nenhum backup encontrado.")
            return
        
        # Agrupa por tipo
        db_backups = [b for b in self.metadata['backups'] if b['type'] == 'database']
        uploads_backups = [b for b in self.metadata['backups'] if b['type'] == 'uploads']
        
        print(f"\n📊 Estatísticas:")
        print(f"   Total de backups: {len(self.metadata['backups'])}")
        print(f"   Backups de banco: {len(db_backups)}")
        print(f"   Backups de uploads: {len(uploads_backups)}")
        
        total_size = sum(b['size'] for b in self.metadata['backups'])
        print(f"   Espaço utilizado: {total_size / 1024 / 1024:.2f} MB")
        
        print(f"\n🗄️  Backups de Banco de Dados:")
        for backup in sorted(db_backups, key=lambda x: x['created_at'], reverse=True)[:10]:
            size_mb = backup['size'] / 1024 / 1024
            print(f"   📁 {backup['file']}")
            print(f"      Data: {backup['created_at']}")
            print(f"      Tamanho: {size_mb:.2f} MB")
            print(f"      Checksum: {backup['checksum'][:16]}...")
        
        if len(db_backups) > 10:
            print(f"   ... e mais {len(db_backups) - 10} backups")
    
    def run_backup(self, full: bool = False):
        """Executa rotina completa de backup"""
        logger.info("="*60)
        logger.info("INICIANDO ROTINA DE BACKUP")
        logger.info("="*60)
        
        try:
            # Backup do banco
            db_backup = self.create_database_backup()
            
            # Upload para S3 se configurado
            self.upload_to_s3(db_backup)
            
            # Backup completo inclui uploads
            if full:
                uploads_backup = self.create_uploads_backup()
                if uploads_backup:
                    self.upload_to_s3(uploads_backup)
            
            # Limpa backups antigos
            self.cleanup_old_backups()
            
            logger.info("="*60)
            logger.info("BACKUP CONCLUÍDO COM SUCESSO")
            logger.info("="*60)
            
        except Exception as e:
            logger.error("="*60)
            logger.error(f"BACKUP FALHOU: {e}")
            logger.error("="*60)
            raise


def main():
    parser = argparse.ArgumentParser(description='Backup Automático Salada Soul')
    parser.add_argument('--full', action='store_true', help='Inclui uploads no backup')
    parser.add_argument('--list', action='store_true', help='Lista backups disponíveis')
    parser.add_argument('--cleanup', action='store_true', help='Apenas limpa backups antigos')
    
    args = parser.parse_args()
    
    manager = BackupManager()
    
    if args.list:
        manager.list_backups()
    elif args.cleanup:
        manager.cleanup_old_backups()
    else:
        manager.run_backup(full=args.full)


if __name__ == '__main__':
    main()
