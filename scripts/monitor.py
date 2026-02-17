#!/usr/bin/env python3
"""
Salada Soul - Monitoring Script
Monitora a saúde da aplicação e envia alertas
"""

import os
import sys
import time
import json
import logging
import requests
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional

# Configuration
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001')
HEALTH_ENDPOINT = f"{BACKEND_URL}/health"
ALERT_WEBHOOK = os.environ.get('ALERT_WEBHOOK', '')  # Slack/Discord webhook
LOG_FILE = Path(__file__).parent.parent / 'logs' / 'monitor.log'

# Ensure log directory exists
LOG_FILE.parent.mkdir(parents=True, exist_ok=True)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


class HealthMonitor:
    def __init__(self):
        self.consecutive_failures = 0
        self.max_failures = 3
        self.last_alert_time = None
        self.alert_cooldown = 300  # 5 minutes between alerts
        
    def check_health(self) -> Dict:
        """Check application health"""
        try:
            response = requests.get(
                HEALTH_ENDPOINT,
                timeout=10,
                headers={'Accept': 'application/json'}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.consecutive_failures = 0
                return {
                    'status': 'healthy',
                    'data': data,
                    'response_time': response.elapsed.total_seconds()
                }
            else:
                self.consecutive_failures += 1
                return {
                    'status': 'unhealthy',
                    'error': f'HTTP {response.status_code}',
                    'response_time': response.elapsed.total_seconds()
                }
                
        except requests.exceptions.Timeout:
            self.consecutive_failures += 1
            return {
                'status': 'unhealthy',
                'error': 'Connection timeout'
            }
        except requests.exceptions.ConnectionError:
            self.consecutive_failures += 1
            return {
                'status': 'unhealthy',
                'error': 'Connection refused'
            }
        except Exception as e:
            self.consecutive_failures += 1
            return {
                'status': 'error',
                'error': str(e)
            }
    
    def should_alert(self) -> bool:
        """Determine if we should send an alert"""
        if self.consecutive_failures < self.max_failures:
            return False
            
        if self.last_alert_time is None:
            return True
            
        time_since_last = (datetime.now() - self.last_alert_time).total_seconds()
        return time_since_last >= self.alert_cooldown
    
    def send_alert(self, health_data: Dict):
        """Send alert notification"""
        if not ALERT_WEBHOOK:
            logger.warning("No alert webhook configured")
            return
            
        message = {
            "text": f"🚨 Salada Soul Alert",
            "attachments": [{
                "color": "danger",
                "fields": [
                    {
                        "title": "Status",
                        "value": health_data['status'],
                        "short": True
                    },
                    {
                        "title": "Error",
                        "value": health_data.get('error', 'Unknown'),
                        "short": True
                    },
                    {
                        "title": "Time",
                        "value": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                        "short": True
                    },
                    {
                        "title": "Consecutive Failures",
                        "value": str(self.consecutive_failures),
                        "short": True
                    }
                ]
            }]
        }
        
        try:
            response = requests.post(
                ALERT_WEBHOOK,
                json=message,
                timeout=10
            )
            if response.status_code == 200:
                self.last_alert_time = datetime.now()
                logger.info("Alert sent successfully")
            else:
                logger.error(f"Failed to send alert: HTTP {response.status_code}")
        except Exception as e:
            logger.error(f"Failed to send alert: {e}")
    
    def log_status(self, health_data: Dict):
        """Log health check status"""
        if health_data['status'] == 'healthy':
            logger.info(
                f"Health check passed - Response time: {health_data.get('response_time', 'N/A'):.3f}s"
            )
        else:
            logger.error(
                f"Health check failed - Error: {health_data.get('error', 'Unknown')} "
                f"(Failure {self.consecutive_failures}/{self.max_failures})"
            )
    
    def run_check(self):
        """Run a single health check"""
        health_data = self.check_health()
        self.log_status(health_data)
        
        if health_data['status'] != 'healthy' and self.should_alert():
            self.send_alert(health_data)
            
        return health_data['status'] == 'healthy'


def run_continuous_monitoring(interval: int = 60):
    """Run continuous monitoring"""
    monitor = HealthMonitor()
    logger.info(f"Starting continuous monitoring (interval: {interval}s)")
    logger.info(f"Health endpoint: {HEALTH_ENDPOINT}")
    
    try:
        while True:
            monitor.run_check()
            time.sleep(interval)
    except KeyboardInterrupt:
        logger.info("Monitoring stopped by user")
        sys.exit(0)


def run_single_check():
    """Run a single health check and exit"""
    monitor = HealthMonitor()
    is_healthy = monitor.run_check()
    sys.exit(0 if is_healthy else 1)


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Salada Soul Health Monitor',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python monitor.py check           # Single health check
  python monitor.py watch           # Continuous monitoring
  python monitor.py watch --interval 30  # Check every 30 seconds
        """
    )
    
    parser.add_argument(
        'command',
        choices=['check', 'watch'],
        help='Command to execute'
    )
    parser.add_argument(
        '--interval',
        type=int,
        default=60,
        help='Check interval in seconds (for watch mode)'
    )
    
    args = parser.parse_args()
    
    if args.command == 'check':
        run_single_check()
    elif args.command == 'watch':
        run_continuous_monitoring(args.interval)


if __name__ == '__main__':
    main()
