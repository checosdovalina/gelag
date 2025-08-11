#!/bin/bash

# GELAG Sistema - Script de Instalación Automatizada
# Versión: 1.0.0
# Compatible con: Ubuntu 20.04+, Debian 11+, CentOS 8+

set -e  # Salir si hay errores

echo "🚀 INSTALACIÓN GELAG SISTEMA DE GESTIÓN DE FORMULARIOS"
echo "======================================================"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
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

# Detectar sistema operativo
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if [ -f /etc/debian_version ]; then
            OS="debian"
            PACKAGE_MANAGER="apt"
        elif [ -f /etc/redhat-release ]; then
            OS="redhat"
            PACKAGE_MANAGER="yum"
        else
            error "Sistema Linux no soportado"
        fi
    else
        error "Sistema operativo no soportado. Solo Linux es compatible."
    fi
    
    log "Sistema detectado: $OS ($PACKAGE_MANAGER)"
}

# Verificar si se ejecuta como root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "No ejecutes este script como root. Usa sudo cuando sea necesario."
    fi
}

# Instalar dependencias del sistema
install_system_deps() {
    log "Instalando dependencias del sistema..."
    
    if [ "$PACKAGE_MANAGER" = "apt" ]; then
        sudo apt update
        sudo apt install -y curl wget git build-essential postgresql postgresql-contrib nginx
    elif [ "$PACKAGE_MANAGER" = "yum" ]; then
        sudo yum update -y
        sudo yum install -y curl wget git gcc gcc-c++ make postgresql-server postgresql-contrib nginx
        sudo postgresql-setup initdb
    fi
    
    log "Dependencias del sistema instaladas ✅"
}

# Instalar Node.js
install_nodejs() {
    log "Instalando Node.js v18..."
    
    # Verificar si ya está instalado
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        info "Node.js ya instalado: $NODE_VERSION"
        return
    fi
    
    # Instalar Node.js usando NodeSource
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    
    if [ "$PACKAGE_MANAGER" = "apt" ]; then
        sudo apt install -y nodejs
    elif [ "$PACKAGE_MANAGER" = "yum" ]; then
        sudo yum install -y nodejs npm
    fi
    
    # Verificar instalación
    node --version || error "Error instalando Node.js"
    npm --version || error "Error instalando NPM"
    
    log "Node.js instalado ✅"
}

# Instalar PM2
install_pm2() {
    log "Instalando PM2..."
    sudo npm install -g pm2
    pm2 --version || error "Error instalando PM2"
    log "PM2 instalado ✅"
}

# Configurar PostgreSQL
setup_postgresql() {
    log "Configurando PostgreSQL..."
    
    # Iniciar PostgreSQL
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    
    # Obtener credenciales del usuario
    echo ""
    echo "🔐 CONFIGURACIÓN DE BASE DE DATOS"
    echo "================================="
    read -p "Nombre de usuario para la base de datos [gelag_user]: " DB_USER
    DB_USER=${DB_USER:-gelag_user}
    
    read -s -p "Contraseña para la base de datos: " DB_PASSWORD
    echo ""
    
    read -p "Nombre de la base de datos [gelag_db]: " DB_NAME
    DB_NAME=${DB_NAME:-gelag_db}
    
    # Crear usuario y base de datos
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" || warning "Usuario ya existe"
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" || warning "Base de datos ya existe"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
    
    # Configurar pg_hba.conf para permitir conexiones locales
    PG_VERSION=$(sudo -u postgres psql -t -c "SELECT version();" | grep -o '[0-9]\+\.[0-9]\+' | head -1)
    PG_HBA_FILE="/etc/postgresql/$PG_VERSION/main/pg_hba.conf"
    
    if [ -f "$PG_HBA_FILE" ]; then
        sudo cp "$PG_HBA_FILE" "$PG_HBA_FILE.backup"
        echo "local   $DB_NAME    $DB_USER                    md5" | sudo tee -a "$PG_HBA_FILE"
        echo "host    $DB_NAME    $DB_USER    127.0.0.1/32   md5" | sudo tee -a "$PG_HBA_FILE"
        sudo systemctl restart postgresql
    fi
    
    log "PostgreSQL configurado ✅"
    
    # Guardar credenciales
    DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"
}

# Crear directorio del proyecto
setup_project_directory() {
    log "Configurando directorio del proyecto..."
    
    PROJECT_DIR="/opt/gelag-system"
    
    read -p "Directorio de instalación [$PROJECT_DIR]: " USER_DIR
    PROJECT_DIR=${USER_DIR:-$PROJECT_DIR}
    
    sudo mkdir -p "$PROJECT_DIR"
    sudo chown $USER:$USER "$PROJECT_DIR"
    
    log "Directorio creado: $PROJECT_DIR"
}

# Configurar variables de entorno
setup_environment() {
    log "Configurando variables de entorno..."
    
    # Generar SESSION_SECRET
    SESSION_SECRET=$(openssl rand -base64 32)
    
    # Crear archivo .env
    cat > "$PROJECT_DIR/.env" << EOF
# Base de Datos
DATABASE_URL=$DATABASE_URL
PGHOST=localhost
PGPORT=5432
PGUSER=$DB_USER
PGPASSWORD=$DB_PASSWORD
PGDATABASE=$DB_NAME

# Sesiones
SESSION_SECRET=$SESSION_SECRET

# Entorno
NODE_ENV=production
PORT=5000

# Opcional - Stripe (descomentar si usas pagos)
# STRIPE_SECRET_KEY=sk_live_...
# VITE_STRIPE_PUBLIC_KEY=pk_live_...
EOF
    
    log "Archivo .env creado ✅"
}

# Crear archivo de configuración PM2
setup_pm2_config() {
    log "Configurando PM2..."
    
    cat > "$PROJECT_DIR/ecosystem.config.js" << EOF
module.exports = {
  apps: [{
    name: 'gelag-system',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G'
  }]
}
EOF
    
    # Crear directorio de logs
    mkdir -p "$PROJECT_DIR/logs"
    
    log "Configuración PM2 creada ✅"
}

# Configurar Nginx
setup_nginx() {
    log "Configurando Nginx..."
    
    read -p "Dominio para la aplicación [localhost]: " DOMAIN
    DOMAIN=${DOMAIN:-localhost}
    
    sudo tee /etc/nginx/sites-available/gelag << EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    client_max_body_size 50M;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }
}
EOF
    
    # Habilitar sitio
    sudo ln -sf /etc/nginx/sites-available/gelag /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Verificar configuración
    sudo nginx -t
    sudo systemctl restart nginx
    sudo systemctl enable nginx
    
    log "Nginx configurado ✅"
}

# Crear script de backup
create_backup_script() {
    log "Creando script de backup..."
    
    sudo tee /usr/local/bin/gelag-backup << EOF
#!/bin/bash
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/gelag"
mkdir -p \$BACKUP_DIR

# Backup de base de datos
pg_dump -h localhost -U $DB_USER $DB_NAME > \$BACKUP_DIR/gelag_db_\$DATE.sql

# Backup de archivos (uploads, etc.)
tar -czf \$BACKUP_DIR/gelag_files_\$DATE.tar.gz -C $PROJECT_DIR uploads logs

# Mantener solo los últimos 7 días
find \$BACKUP_DIR -name "gelag_*" -mtime +7 -delete

echo "Backup completado: \$DATE"
EOF
    
    sudo chmod +x /usr/local/bin/gelag-backup
    
    # Crear cron job para backup diario
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/gelag-backup") | crontab -
    
    log "Script de backup configurado ✅"
}

# Crear usuario administrador inicial
create_admin_user() {
    log "Configurando usuario administrador inicial..."
    
    cat > "$PROJECT_DIR/create-admin.js" << 'EOF'
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import { db } from './server/db.js';
import { users } from './shared/schema.js';

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

async function createAdmin() {
  const hashedPassword = await hashPassword('admin123');
  
  await db.insert(users).values({
    username: 'admin',
    password: hashedPassword,
    name: 'Administrador del Sistema',
    email: 'admin@empresa.com',
    role: 'superadmin',
    department: 'Sistemas'
  }).onConflictDoNothing();
  
  console.log('✅ Usuario administrador creado:');
  console.log('   Usuario: admin');
  console.log('   Contraseña: admin123');
  console.log('   ⚠️  CAMBIAR CONTRASEÑA DESPUÉS DEL PRIMER LOGIN');
}

createAdmin().catch(console.error).finally(() => process.exit(0));
EOF
    
    log "Script de usuario admin creado ✅"
}

# Mostrar información final
show_final_info() {
    echo ""
    echo "🎉 INSTALACIÓN COMPLETADA"
    echo "========================="
    echo ""
    echo "📁 Directorio del proyecto: $PROJECT_DIR"
    echo "🌐 URL de acceso: http://$DOMAIN"
    echo "🗄️  Base de datos: $DB_NAME"
    echo "👤 Usuario DB: $DB_USER"
    echo ""
    echo "📋 PRÓXIMOS PASOS:"
    echo "1. Copiar tu código fuente a: $PROJECT_DIR"
    echo "2. Ejecutar: cd $PROJECT_DIR && npm install"
    echo "3. MIGRAR BASE DE DATOS:"
    echo "   - Opción A: ./neon-connection-test.sh (verificar conexión)"
    echo "   - Opción B: ./database-migration.sh (migrar datos)"
    echo "4. Compilar: npm run build"
    echo "5. Iniciar: pm2 start ecosystem.config.js"
    echo ""
    echo "🔐 CREDENCIALES INICIALES:"
    echo "   Usuario: admin"
    echo "   Contraseña: admin123"
    echo "   ⚠️  CAMBIAR DESPUÉS DEL PRIMER LOGIN"
    echo ""
    echo "🛠️  COMANDOS ÚTILES:"
    echo "   Ver logs: pm2 logs gelag-system"
    echo "   Reiniciar: pm2 restart gelag-system"
    echo "   Backup: /usr/local/bin/gelag-backup"
    echo ""
    warning "RECUERDA: Configurar SSL/HTTPS en producción"
    warning "RECUERDA: Cambiar todas las contraseñas por defecto"
}

# Función principal
main() {
    echo "Iniciando instalación de GELAG Sistema..."
    echo ""
    
    check_root
    detect_os
    
    # Confirmar instalación
    read -p "¿Continuar con la instalación? (y/N): " CONFIRM
    if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
        echo "Instalación cancelada."
        exit 0
    fi
    
    install_system_deps
    install_nodejs
    install_pm2
    setup_postgresql
    setup_project_directory
    setup_environment
    setup_pm2_config
    setup_nginx
    create_backup_script
    create_admin_user
    
    show_final_info
}

# Ejecutar script principal
main "$@"