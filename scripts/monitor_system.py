#!/usr/bin/env python3
"""
Sistema de Monitoramento Salada Soul
Monitora health checks, métricas e envia alertas
"""

import asyncio
import aiohttp
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Optional
import logging

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configurações
CONFIG = {
    'api_url': os.environ.get('API_URL', 'http://localhost:8000'),
    'check_interval': int(os.environ.get('CHECK_INTERVAL', '60')),  # segundos
    'alert_threshold': int(os.environ.get('ALERT_THRESHOLD', '3')),  # falhas consecutivas
    'webhook_url': os.environ.get('ALERT_WEBHOOK_URL'),
    'data_file': Path(__file__).parent / 'monitor_data.json',
}


class SystemMonitor:
    """Monitora a saúde do sistema Salada Soul"""
    
    def __init__(self):
        self.consecutive_failures = 0
        self.last_alert_time = 0
        self.alert_cooldown = 300  # 5 minutos entre alertas
        self.metrics_history = []
        self.max_history = 100
        
    def load_state(self):
        """Carrega estado anterior do monitor"""
        if CONFIG['data_file'].exists():
            try:
                with open(CONFIG['data_file'], 'r') as f:
                    data = json.load(f)
                    self.consecutive_failures = data.get('failures', 0)
                    self.last_alert_time = data.get('last_alert', 0)
                    self.metrics_history = data.get('history', [])
            except Exception as e:
                logger.error(f"Erro ao carregar estado: {e}")
    
    def save_state(self):
        """Salva estado atual do monitor"""
        try:
            with open(CONFIG['data_file'], 'w') as f:
                json.dump({
                    'failures': self.consecutive_failures,
                    'last_alert': self.last_alert_time,
                    'history': self.metrics_history[-self.max_history:],
                }, f)
        except Exception as e:
            logger.error(f"Erro ao salvar estado: {e}")
    
    async def check_health(self) -> Dict:
        """Verifica saúde da API"""
        start_time = time.time()
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{CONFIG['api_url']}/health",
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    response_time = (time.time() - start_time) * 1000  # ms
                    
                    if response.status == 200:
                        data = await response.json()
                        return {
                            'status': 'healthy',
                            'response_time': response_time,
                            'api_status': data.get('status', 'unknown'),
                            'database': data.get('database', 'unknown'),
                            'timestamp': datetime.now(timezone.utc).isoformat(),
                        }
                    else:
                        return {
                            'status': 'unhealthy',
                            'response_time': response_time,
                            'error': f'HTTP {response.status}',
                            'timestamp': datetime.now(timezone.utc).isoformat(),
                        }
                        
        except asyncio.TimeoutError:
            return {
                'status': 'timeout',
                'response_time': (time.time() - start_time) * 1000,
                'error': 'Request timeout',
                'timestamp': datetime.now(timezone.utc).isoformat(),
            }
        except Exception as e:
            return {
                'status': 'error',
                'response_time': (time.time() - start_time) * 1000,
                'error': str(e),
                'timestamp': datetime.now(timezone.utc).isoformat(),
            }
    
    async def check_endpoints(self) -> Dict:
        """Verifica endpoints críticos"""
        endpoints = {
            'categories': '/api/categories',
            'products': '/api/products',
            'menus': '/api/menus',
        }
        
        results = {}
        async with aiohttp.ClientSession() as session:
            for name, path in endpoints.items():
                try:
                    async with session.get(
                        f"{CONFIG['api_url']}{path}",
                        timeout=aiohttp.ClientTimeout(total=5)
                    ) as response:
                        results[name] = {
                            'status': 'ok' if response.status == 200 else 'error',
                            'http_status': response.status,
                        }
                except Exception as e:
                    results[name] = {
                        'status': 'error',
                        'error': str(e),
                    }
        
        return results
    
    async def send_alert(self, health_data: Dict, endpoints: Dict):
        """Envia alerta via webhook"""
        if not CONFIG['webhook_url']:
            logger.warning("Webhook URL não configurado")
            return
        
        current_time = time.time()
        if current_time - self.last_alert_time < self.alert_cooldown:
            logger.info("Alerta em cooldown, ignorando")
            return
        
        message = {
            'text': '🚨 *ALERTA: Salada Soul*',
            'blocks': [
                {
                    'type': 'header',
                    'text': {
                        'type': 'plain_text',
                        'text': '⚠️ Sistema Indisponível',
                    }
                },
                {
                    'type': 'section',
                    'fields': [
                        {
                            'type': 'mrkdwn',
                            'text': f"*Status:*\n{health_data.get('status', 'unknown')}"
                        },
                        {
                            'type': 'mrkdwn',
                            'text': f"*Erro:*\n{health_data.get('error', 'N/A')}"
                        },
                        {
                            'type': 'mrkdwn',
                            'text': f"*Response Time:*\n{health_data.get('response_time', 0):.0f}ms"
                        },
                        {
                            'type': 'mrkdwn',
                            'text': f"*Falhas Consecutivas:*\n{self.consecutive_failures}"
                        },
                    ]
                },
                {
                    'type': 'context',
                    'elements': [
                        {
                            'type': 'mrkdwn',
                            'text': f"Timestamp: {health_data.get('timestamp')}"
                        }
                    ]
                }
            ]
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    CONFIG['webhook_url'],
                    json=message,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status == 200:
                        self.last_alert_time = current_time
                        logger.info("Alerta enviado com sucesso")
                    else:
                        logger.error(f"Erro ao enviar alerta: HTTP {response.status}")
        except Exception as e:
            logger.error(f"Erro ao enviar alerta: {e}")
    
    def get_stats(self) -> Dict:
        """Retorna estatísticas do monitoramento"""
        if not self.metrics_history:
            return {'message': 'Sem dados históricos'}
        
        recent = self.metrics_history[-24:]  # últimas 24 verificações
        healthy_count = sum(1 for m in recent if m.get('status') == 'healthy')
        avg_response_time = sum(m.get('response_time', 0) for m in recent) / len(recent)
        
        return {
            'total_checks': len(self.metrics_history),
            'recent_checks': len(recent),
            'healthy_ratio': healthy_count / len(recent) if recent else 0,
            'avg_response_time': avg_response_time,
            'current_failures': self.consecutive_failures,
            'uptime_24h': f"{(healthy_count / len(recent) * 100):.1f}%" if recent else "N/A",
        }
    
    async def run_check(self):
        """Executa uma verificação completa"""
        logger.info("Executando verificação de saúde...")
        
        # Verifica health endpoint
        health = await self.check_health()
        
        # Verifica endpoints críticos
        endpoints = await self.check_endpoints()
        
        # Armazena métricas
        self.metrics_history.append({
            **health,
            'endpoints': endpoints,
        })
        
        # Mantém histórico limitado
        if len(self.metrics_history) > self.max_history:
            self.metrics_history = self.metrics_history[-self.max_history:]
        
        # Atualiza contador de falhas
        if health['status'] != 'healthy':
            self.consecutive_failures += 1
            logger.warning(f"Falha detectada: {health.get('error')} (falha #{self.consecutive_failures})")
            
            # Envia alerta se atingir threshold
            if self.consecutive_failures >= CONFIG['alert_threshold']:
                await self.send_alert(health, endpoints)
        else:
            # Reset contador em sucesso
            if self.consecutive_failures > 0:
                logger.info(f"Sistema recuperado após {self.consecutive_failures} falhas")
            self.consecutive_failures = 0
        
        # Salva estado
        self.save_state()
        
        # Log resultado
        logger.info(
            f"Status: {health['status']} | "
            f"Response: {health['response_time']:.0f}ms | "
            f"API: {health.get('api_status', 'N/A')}"
        )
        
        return health, endpoints
    
    async def run(self):
        """Loop principal de monitoramento"""
        logger.info(f"Iniciando monitoramento de {CONFIG['api_url']}")
        logger.info(f"Intervalo: {CONFIG['check_interval']}s | "
                   f"Threshold: {CONFIG['alert_threshold']} falhas")
        
        self.load_state()
        
        while True:
            try:
                await self.run_check()
            except Exception as e:
                logger.error(f"Erro na verificação: {e}")
            
            await asyncio.sleep(CONFIG['check_interval'])


def print_stats():
    """Imprime estatísticas e sai"""
    monitor = SystemMonitor()
    monitor.load_state()
    stats = monitor.get_stats()
    print(json.dumps(stats, indent=2))


def run_once():
    """Executa verificação única"""
    monitor = SystemMonitor()
    
    async def check():
        health, endpoints = await monitor.run_check()
        print(json.dumps({
            'health': health,
            'endpoints': endpoints,
            'stats': monitor.get_stats(),
        }, indent=2))
    
    asyncio.run(check())


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Monitor Salada Soul')
    parser.add_argument('--stats', action='store_true', help='Mostra estatísticas')
    parser.add_argument('--once', action='store_true', help='Executa uma vez')
    
    args = parser.parse_args()
    
    if args.stats:
        print_stats()
    elif args.once:
        run_once()
    else:
        # Modo contínuo
        monitor = SystemMonitor()
        try:
            asyncio.run(monitor.run())
        except KeyboardInterrupt:
            logger.info("Monitoramento encerrado")
