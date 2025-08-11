#!/bin/bash

# GELAG Sistema - Configuración de Seguridad
# Versión: 1.0.0

set -e

echo "🔒 CONFIGURACIÓN DE SEGURIDAD GELAG"
echo "==================================="

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Verificar root
if [[ $EUID -ne 0 ]]; then
   error "Este script debe ejecutarse como root (usa sudo)"
fi

# Configurar UFW Firewall
setup_firewall() {
    log "Configurando firewall UFW..."
    
    # Instalar UFW si no está instalado
    apt update
    apt install -y ufw
    
    # Configurar reglas básicas
    ufw --force reset
    
    # Políticas por defecto
    ufw default deny incoming
    ufw default allow outgoing
    
    # Permitir SSH (cambiar puerto si es necesario)
    read -p "Puerto SSH [22]: " SSH_PORT
    SSH_PORT=${SSH_PORT:-22}
    ufw allow $SSH_PORT/tcp comment 'SSH'
    
    # Permitir HTTP y HTTPS
    ufw allow 80/tcp comment 'HTTP'
    ufw allow 443/tcp comment 'HTTPS'
    
    # Permitir PostgreSQL solo desde localhost
    ufw allow from 127.0.0.1 to any port 5432 comment 'PostgreSQL localhost'
    
    # Habilitar UFW
    ufw --force enable
    
    log "Firewall configurado ✅"
    ufw status verbose
}

# Configurar fail2ban
setup_fail2ban() {
    log "Configurando fail2ban..."
    
    apt install -y fail2ban
    
    # Configuración personalizada
    cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5
backend = systemd

[sshd]
enabled = true
port = $SSH_PORT
logpath = %(sshd_log)s
backend = %(sshd_backend)s

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10

[nginx-botsearch]
enabled = true
filter = nginx-botsearch
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
EOF
    
    # Crear filtro personalizado para aplicación
    cat > /etc/fail2ban/filter.d/gelag-app.conf << EOF
[Definition]
failregex = ^.*"POST /api/login.*" 401 .*$
            ^.*"POST /api/register.*" 400 .*$
ignoreregex =
EOF
    
    # Jail para la aplicación
    cat >> /etc/fail2ban/jail.local << EOF

[gelag-app]
enabled = true
filter = gelag-app
port = http,https
logpath = /opt/gelag-system/logs/out.log
maxretry = 3
bantime = 2h
EOF
    
    systemctl enable fail2ban
    systemctl start fail2ban
    
    log "fail2ban configurado ✅"
}

# Configurar PostgreSQL Security
secure_postgresql() {
    log "Asegurando PostgreSQL..."
    
    # Encontrar versión de PostgreSQL
    PG_VERSION=$(sudo -u postgres psql -t -c "SELECT version();" | grep -o '[0-9]\+\.[0-9]\+' | head -1)
    PG_CONF_DIR="/etc/postgresql/$PG_VERSION/main"
    
    # Backup de configuraciones originales
    cp "$PG_CONF_DIR/postgresql.conf" "$PG_CONF_DIR/postgresql.conf.backup"
    cp "$PG_CONF_DIR/pg_hba.conf" "$PG_CONF_DIR/pg_hba.conf.backup"
    
    # Configurar postgresql.conf
    cat >> "$PG_CONF_DIR/postgresql.conf" << EOF

# Configuraciones de seguridad GELAG
listen_addresses = 'localhost'
port = 5432
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# Logging
log_destination = 'stderr'
logging_collector = on
log_directory = 'pg_log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_file_mode = 0600
log_rotation_age = 1d
log_rotation_size = 100MB
log_min_duration_statement = 1000
log_connections = on
log_disconnections = on
log_lock_waits = on
log_statement = 'ddl'

# Security
ssl = on
password_encryption = scram-sha-256
EOF
    
    # Configurar pg_hba.conf - solo conexiones locales seguras
    cat > "$PG_CONF_DIR/pg_hba.conf" << EOF
# PostgreSQL Client Authentication Configuration File
# Solo conexiones locales para máxima seguridad

# TYPE  DATABASE        USER            ADDRESS                 METHOD

# Local connections
local   all             postgres                                peer
local   all             all                                     md5

# IPv4 local connections only
host    gelag_db        gelag_user      127.0.0.1/32           scram-sha-256
host    all             postgres        127.0.0.1/32           md5

# IPv6 local connections
host    all             all             ::1/128                 md5
EOF
    
    systemctl restart postgresql
    
    log "PostgreSQL asegurado ✅"
}

# Configurar límites del sistema
setup_system_limits() {
    log "Configurando límites del sistema..."
    
    # Limits para usuario de aplicación
    cat >> /etc/security/limits.conf << EOF

# Límites para GELAG sistema
* soft nproc 65535
* hard nproc 65535
* soft nofile 65535
* hard nofile 65535
EOF
    
    # Configurar sysctl
    cat >> /etc/sysctl.conf << EOF

# Configuraciones de red para GELAG
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_keepalive_time = 600
net.ipv4.tcp_keepalive_intvl = 60
net.ipv4.tcp_keepalive_probes = 10
EOF
    
    sysctl -p
    
    log "Límites del sistema configurados ✅"
}

# Configurar SSL con Let's Encrypt (opcional)
setup_ssl() {
    read -p "¿Configurar SSL con Let's Encrypt? (y/N): " SETUP_SSL
    if [[ "$SETUP_SSL" =~ ^[Yy]$ ]]; then
        log "Configurando SSL..."
        
        apt install -y certbot python3-certbot-nginx
        
        read -p "Dominio para SSL: " DOMAIN
        read -p "Email para Let's Encrypt: " EMAIL
        
        # Obtener certificado
        certbot --nginx -d "$DOMAIN" --email "$EMAIL" --agree-tos --non-interactive
        
        # Auto-renovación
        cat > /etc/cron.d/certbot << EOF
# Auto-renovar certificados SSL
0 12 * * * /usr/bin/certbot renew --quiet --post-hook "systemctl reload nginx"
EOF
        
        log "SSL configurado ✅"
    fi
}

# Configurar monitoreo básico
setup_monitoring() {
    log "Configurando monitoreo básico..."
    
    # Script de monitoreo
    cat > /usr/local/bin/gelag-monitor << 'EOF'
#!/bin/bash

# GELAG Sistema - Monitor básico
LOG_FILE="/var/log/gelag-monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] Iniciando verificación..." >> $LOG_FILE

# Verificar aplicación
if ! pm2 list | grep -q "gelag-system.*online"; then
    echo "[$DATE] ERROR: Aplicación no está ejecutándose" >> $LOG_FILE
    pm2 restart gelag-system
fi

# Verificar PostgreSQL
if ! systemctl is-active --quiet postgresql; then
    echo "[$DATE] ERROR: PostgreSQL no está ejecutándose" >> $LOG_FILE
    systemctl start postgresql
fi

# Verificar Nginx
if ! systemctl is-active --quiet nginx; then
    echo "[$DATE] ERROR: Nginx no está ejecutándose" >> $LOG_FILE
    systemctl start nginx
fi

# Verificar espacio en disco
DISK_USAGE=$(df /opt/gelag-system | tail -1 | awk '{print $5}' | cut -d'%' -f1)
if [ $DISK_USAGE -gt 85 ]; then
    echo "[$DATE] WARNING: Espacio en disco al ${DISK_USAGE}%" >> $LOG_FILE
fi

# Verificar memoria
MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
if [ $MEM_USAGE -gt 90 ]; then
    echo "[$DATE] WARNING: Uso de memoria al ${MEM_USAGE}%" >> $LOG_FILE
fi

echo "[$DATE] Verificación completada" >> $LOG_FILE
EOF
    
    chmod +x /usr/local/bin/gelag-monitor
    
    # Cron job para monitoreo cada 5 minutos
    cat > /etc/cron.d/gelag-monitor << EOF
# Monitor GELAG cada 5 minutos
*/5 * * * * root /usr/local/bin/gelag-monitor
EOF
    
    log "Monitoreo configurado ✅"
}

# Crear reporte de seguridad
create_security_report() {
    log "Generando reporte de seguridad..."
    
    REPORT_FILE="/root/gelag-security-report.txt"
    
    cat > $REPORT_FILE << EOF
GELAG SISTEMA - REPORTE DE SEGURIDAD
===================================
Fecha: $(date)

FIREWALL (UFW):
$(ufw status verbose)

FAIL2BAN STATUS:
$(fail2ban-client status)

POSTGRESQL STATUS:
$(systemctl status postgresql --no-pager -l)

NGINX STATUS:
$(systemctl status nginx --no-pager -l)

SERVICIOS ACTIVOS:
$(systemctl list-units --type=service --state=active | grep -E "(nginx|postgresql|fail2ban)")

PUERTOS ABIERTOS:
$(ss -tlnp)

CONEXIONES ACTUALES:
$(ss -s)

USUARIOS CONECTADOS:
$(who)

PROCESOS CRÍTICOS:
$(ps aux | grep -E "(nginx|postgres|pm2|node)" | grep -v grep)

ESPACIO EN DISCO:
$(df -h)

MEMORIA:
$(free -h)

LOGS RECIENTES DE SEGURIDAD:
$(tail -20 /var/log/auth.log 2>/dev/null || echo "No disponible")

CONFIGURACIÓN COMPLETADA:
✅ Firewall UFW configurado
✅ fail2ban instalado y configurado
✅ PostgreSQL asegurado
✅ Límites del sistema configurados
✅ Monitoreo básico configurado

RECOMENDACIONES ADICIONALES:
1. Cambiar puerto SSH por defecto
2. Configurar VPN para acceso administrativo
3. Implementar backup automático offsite
4. Configurar alertas por email/SMS
5. Revisar logs regularmente
6. Mantener sistema actualizado

ARCHIVOS DE CONFIGURACIÓN IMPORTANTES:
- /etc/ufw/user.rules
- /etc/fail2ban/jail.local
- /etc/postgresql/$PG_VERSION/main/postgresql.conf
- /etc/postgresql/$PG_VERSION/main/pg_hba.conf
- /etc/nginx/sites-available/gelag
- /opt/gelag-system/.env

EOF
    
    log "Reporte de seguridad creado en: $REPORT_FILE"
}

# Función principal
main() {
    echo "Iniciando configuración de seguridad..."
    echo ""
    
    read -p "¿Continuar con la configuración de seguridad? (y/N): " CONFIRM
    if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
        echo "Configuración cancelada."
        exit 0
    fi
    
    setup_firewall
    setup_fail2ban
    secure_postgresql
    setup_system_limits
    setup_ssl
    setup_monitoring
    create_security_report
    
    echo ""
    echo "🔒 CONFIGURACIÓN DE SEGURIDAD COMPLETADA"
    echo "======================================="
    echo ""
    echo "✅ Firewall UFW configurado"
    echo "✅ fail2ban instalado y configurado"
    echo "✅ PostgreSQL asegurado"
    echo "✅ Límites del sistema configurados"
    echo "✅ Monitoreo básico configurado"
    echo ""
    echo "📄 Reporte completo en: /root/gelag-security-report.txt"
    echo ""
    warning "IMPORTANTE: Revisar y probar todas las configuraciones"
    warning "IMPORTANTE: Cambiar contraseñas por defecto"
    warning "IMPORTANTE: Configurar backups seguros"
}

# Ejecutar
main "$@"