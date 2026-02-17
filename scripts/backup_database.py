#!/usr/bin/env python3
"""
Salada Soul - Database Backup Script
Realiza backup completo do banco PostgreSQL
"""

import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# Configuration
DB_HOST = os.environ.get('DB_HOST', 'localhost')
DB_NAME = os.environ.get('DB_NAME', 'saladasoul')
DB_USER = os.environ.get('DB_USER', 'postgres')
DB_PASSWORD = os.environ.get('DB_PASSWORD', 'postgres')
DB_PORT = os.environ.get('DB_PORT', '5432')

BACKUP_DIR = Path(__file__).parent.parent / 'backups'
BACKUP_RETENTION_DAYS = int(os.environ.get('BACKUP_RETENTION_DAYS', '30'))


def ensure_backup_dir():
    """Ensure backup directory exists"""
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    return BACKUP_DIR


def create_backup():
    """Create a new database backup"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_file = BACKUP_DIR / f'saladasoul_backup_{timestamp}.sql'
    
    # Set password environment variable
    env = os.environ.copy()
    env['PGPASSWORD'] = DB_PASSWORD
    
    cmd = [
        'pg_dump',
        '-h', DB_HOST,
        '-p', DB_PORT,
        '-U', DB_USER,
        '-d', DB_NAME,
        '-F', 'p',  # Plain text format
        '-f', str(backup_file),
        '--verbose',
        '--no-owner',  # Don't include ownership commands
        '--no-privileges',  # Don't include privilege commands
    ]
    
    print(f"Creating backup: {backup_file.name}")
    
    try:
        result = subprocess.run(
            cmd,
            env=env,
            capture_output=True,
            text=True,
            check=True
        )
        print(f"Backup created successfully: {backup_file}")
        
        # Compress the backup
        compressed_file = Path(str(backup_file) + '.gz')
        subprocess.run(
            ['gzip', '-f', str(backup_file)],
            check=True
        )
        print(f"Backup compressed: {compressed_file}")
        
        return compressed_file
        
    except subprocess.CalledProcessError as e:
        print(f"Backup failed: {e}")
        print(f"stderr: {e.stderr}")
        sys.exit(1)
    except FileNotFoundError:
        print("Error: pg_dump not found. Please ensure PostgreSQL client tools are installed.")
        sys.exit(1)


def cleanup_old_backups():
    """Remove backups older than retention period"""
    print(f"Cleaning up backups older than {BACKUP_RETENTION_DAYS} days...")
    
    cutoff_date = datetime.now().timestamp() - (BACKUP_RETENTION_DAYS * 24 * 60 * 60)
    removed_count = 0
    
    for backup_file in BACKUP_DIR.glob('saladasoul_backup_*.sql.gz'):
        if backup_file.stat().st_mtime < cutoff_date:
            backup_file.unlink()
            removed_count += 1
            print(f"Removed old backup: {backup_file.name}")
    
    print(f"Cleanup complete. Removed {removed_count} old backups.")


def list_backups():
    """List all available backups"""
    print("\nAvailable backups:")
    print("-" * 60)
    
    backups = sorted(BACKUP_DIR.glob('saladasoul_backup_*.sql.gz'), reverse=True)
    
    if not backups:
        print("No backups found.")
        return
    
    for backup in backups:
        size_mb = backup.stat().st_size / (1024 * 1024)
        modified = datetime.fromtimestamp(backup.stat().st_mtime)
        print(f"{backup.name:40} {size_mb:8.2f} MB  {modified:%Y-%m-%d %H:%M:%S}")
    
    print(f"\nTotal: {len(backups)} backups")


def restore_backup(backup_file: str):
    """Restore database from backup file"""
    backup_path = Path(backup_file)
    
    if not backup_path.exists():
        # Try in backup directory
        backup_path = BACKUP_DIR / backup_file
        if not backup_path.exists():
            print(f"Backup file not found: {backup_file}")
            sys.exit(1)
    
    # Check if compressed
    if backup_path.suffix == '.gz':
        print(f"Decompressing {backup_path.name}...")
        subprocess.run(['gunzip', '-k', str(backup_path)], check=True)
        sql_file = backup_path.with_suffix('')
    else:
        sql_file = backup_path
    
    print(f"WARNING: This will overwrite the database '{DB_NAME}'")
    confirm = input("Are you sure? Type 'yes' to continue: ")
    
    if confirm.lower() != 'yes':
        print("Restore cancelled.")
        return
    
    env = os.environ.copy()
    env['PGPASSWORD'] = DB_PASSWORD
    
    cmd = [
        'psql',
        '-h', DB_HOST,
        '-p', DB_PORT,
        '-U', DB_USER,
        '-d', DB_NAME,
        '-f', str(sql_file),
        '--quiet'
    ]
    
    print(f"Restoring from {sql_file.name}...")
    
    try:
        subprocess.run(cmd, env=env, check=True)
        print("Restore completed successfully!")
    except subprocess.CalledProcessError as e:
        print(f"Restore failed: {e}")
        sys.exit(1)
    finally:
        # Clean up decompressed file if it was compressed
        if backup_path.suffix == '.gz' and sql_file.exists():
            sql_file.unlink()


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Salada Soul Database Backup Tool',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python backup_database.py backup        # Create new backup
  python backup_database.py list          # List all backups
  python backup_database.py cleanup       # Remove old backups
  python backup_database.py restore FILE  # Restore from backup
        """
    )
    
    parser.add_argument(
        'command',
        choices=['backup', 'list', 'cleanup', 'restore'],
        help='Command to execute'
    )
    parser.add_argument(
        'file',
        nargs='?',
        help='Backup file for restore command'
    )
    
    args = parser.parse_args()
    
    ensure_backup_dir()
    
    if args.command == 'backup':
        create_backup()
        cleanup_old_backups()
    elif args.command == 'list':
        list_backups()
    elif args.command == 'cleanup':
        cleanup_old_backups()
    elif args.command == 'restore':
        if not args.file:
            print("Error: Please specify a backup file to restore.")
            sys.exit(1)
        restore_backup(args.file)


if __name__ == '__main__':
    main()
