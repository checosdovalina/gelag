#!/bin/bash

# GELAG Sistema - Migración de Base de Datos desde Neon
# Versión: 1.0.0

set -e

echo "🗄️ MIGRACIÓN DE BASE DE DATOS GELAG DESDE NEON"
echo "============================================="

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

# Verificar dependencias
check_dependencies() {
    log "Verificando dependencias..."
    
    if ! command -v pg_dump &> /dev/null; then
        error "pg_dump no encontrado. Instala postgresql-client: apt install postgresql-client"
    fi
    
    if ! command -v psql &> /dev/null; then
        error "psql no encontrado. Instala postgresql-client: apt install postgresql-client"
    fi
    
    log "Dependencias verificadas ✅"
}

# Obtener credenciales de Neon
get_neon_credentials() {
    echo ""
    echo "🔗 CONFIGURACIÓN DE CONEXIÓN A NEON"
    echo "==================================="
    echo ""
    echo "Necesito las credenciales de tu base de datos Neon actual."
    echo "Las puedes encontrar en el dashboard de Neon en la sección 'Connection Details'."
    echo ""
    
    read -p "Host de Neon (ejemplo: ep-xxx.us-east-1.aws.neon.tech): " NEON_HOST
    read -p "Puerto [5432]: " NEON_PORT
    NEON_PORT=${NEON_PORT:-5432}
    read -p "Base de datos: " NEON_DB
    read -p "Usuario: " NEON_USER
    read -s -p "Contraseña: " NEON_PASSWORD
    echo ""
    
    # Construir URL de conexión
    NEON_URL="postgresql://$NEON_USER:$NEON_PASSWORD@$NEON_HOST:$NEON_PORT/$NEON_DB"
    
    info "Credenciales de Neon configuradas"
}

# Configurar base de datos local
setup_local_database() {
    echo ""
    echo "💾 CONFIGURACIÓN DE BASE DE DATOS LOCAL"
    echo "======================================"
    
    read -p "Nombre de usuario local [gelag_user]: " LOCAL_USER
    LOCAL_USER=${LOCAL_USER:-gelag_user}
    
    read -s -p "Contraseña para usuario local: " LOCAL_PASSWORD
    echo ""
    
    read -p "Nombre de base de datos local [gelag_db]: " LOCAL_DB
    LOCAL_DB=${LOCAL_DB:-gelag_db}
    
    # Crear usuario y base de datos local
    log "Creando base de datos local..."
    
    sudo -u postgres psql -c "DROP DATABASE IF EXISTS $LOCAL_DB;" || true
    sudo -u postgres psql -c "DROP USER IF EXISTS $LOCAL_USER;" || true
    
    sudo -u postgres psql -c "CREATE USER $LOCAL_USER WITH PASSWORD '$LOCAL_PASSWORD';"
    sudo -u postgres psql -c "CREATE DATABASE $LOCAL_DB OWNER $LOCAL_USER;"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $LOCAL_DB TO $LOCAL_USER;"
    
    # Construir URL local
    LOCAL_URL="postgresql://$LOCAL_USER:$LOCAL_PASSWORD@localhost:5432/$LOCAL_DB"
    
    log "Base de datos local creada ✅"
}

# Opción 1: Clonar completamente la base de datos
clone_database() {
    log "Clonando base de datos desde Neon..."
    
    # Crear archivo temporal para el dump
    DUMP_FILE="/tmp/gelag_neon_dump_$(date +%Y%m%d_%H%M%S).sql"
    
    # Hacer dump de la base de datos Neon
    log "Exportando datos desde Neon..."
    PGPASSWORD="$NEON_PASSWORD" pg_dump -h "$NEON_HOST" -p "$NEON_PORT" -U "$NEON_USER" -d "$NEON_DB" \
        --verbose --clean --no-owner --no-privileges > "$DUMP_FILE"
    
    if [ $? -ne 0 ]; then
        error "Error al exportar desde Neon. Verifica las credenciales."
    fi
    
    log "Datos exportados correctamente"
    
    # Importar a la base de datos local
    log "Importando datos a la base de datos local..."
    PGPASSWORD="$LOCAL_PASSWORD" psql -h localhost -p 5432 -U "$LOCAL_USER" -d "$LOCAL_DB" < "$DUMP_FILE"
    
    if [ $? -ne 0 ]; then
        error "Error al importar a la base de datos local"
    fi
    
    # Limpiar archivo temporal
    rm -f "$DUMP_FILE"
    
    log "Base de datos clonada exitosamente ✅"
    
    # Actualizar archivo .env
    update_env_file_local
}

# Opción 2: Usar la misma base de datos Neon
use_same_database() {
    log "Configurando para usar la misma base de datos Neon..."
    
    warning "IMPORTANTE: Esta opción mantendrá los datos en Neon"
    warning "Tu servidor local se conectará directamente a Neon"
    
    read -p "¿Estás seguro de continuar? (y/N): " CONFIRM
    if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
        echo "Operación cancelada."
        exit 0
    fi
    
    # Actualizar archivo .env para usar Neon
    update_env_file_neon
    
    log "Configuración para usar Neon completada ✅"
}

# Actualizar archivo .env para base de datos local
update_env_file_local() {
    log "Actualizando archivo .env para base de datos local..."
    
    ENV_FILE="/opt/gelag-system/.env"
    
    if [ ! -f "$ENV_FILE" ]; then
        ENV_FILE=".env"
    fi
    
    # Crear backup del .env actual
    cp "$ENV_FILE" "${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Actualizar variables de base de datos
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=$LOCAL_URL|" "$ENV_FILE"
    sed -i "s|^PGHOST=.*|PGHOST=localhost|" "$ENV_FILE"
    sed -i "s|^PGPORT=.*|PGPORT=5432|" "$ENV_FILE"
    sed -i "s|^PGUSER=.*|PGUSER=$LOCAL_USER|" "$ENV_FILE"
    sed -i "s|^PGPASSWORD=.*|PGPASSWORD=$LOCAL_PASSWORD|" "$ENV_FILE"
    sed -i "s|^PGDATABASE=.*|PGDATABASE=$LOCAL_DB|" "$ENV_FILE"
    
    log "Archivo .env actualizado para base de datos local ✅"
}

# Actualizar archivo .env para usar Neon
update_env_file_neon() {
    log "Actualizando archivo .env para usar Neon..."
    
    ENV_FILE="/opt/gelag-system/.env"
    
    if [ ! -f "$ENV_FILE" ]; then
        ENV_FILE=".env"
    fi
    
    # Crear backup del .env actual
    cp "$ENV_FILE" "${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Actualizar variables de base de datos
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=$NEON_URL|" "$ENV_FILE"
    sed -i "s|^PGHOST=.*|PGHOST=$NEON_HOST|" "$ENV_FILE"
    sed -i "s|^PGPORT=.*|PGPORT=$NEON_PORT|" "$ENV_FILE"
    sed -i "s|^PGUSER=.*|PGUSER=$NEON_USER|" "$ENV_FILE"
    sed -i "s|^PGPASSWORD=.*|PGPASSWORD=$NEON_PASSWORD|" "$ENV_FILE"
    sed -i "s|^PGDATABASE=.*|PGDATABASE=$NEON_DB|" "$ENV_FILE"
    
    log "Archivo .env actualizado para usar Neon ✅"
}

# Verificar conexión
test_connection() {
    log "Verificando conexión a la base de datos..."
    
    if [ "$MIGRATION_TYPE" = "clone" ]; then
        # Probar conexión local
        PGPASSWORD="$LOCAL_PASSWORD" psql -h localhost -p 5432 -U "$LOCAL_USER" -d "$LOCAL_DB" -c "SELECT version();" > /dev/null
        if [ $? -eq 0 ]; then
            log "Conexión a base de datos local exitosa ✅"
        else
            error "Error de conexión a base de datos local"
        fi
    else
        # Probar conexión a Neon
        PGPASSWORD="$NEON_PASSWORD" psql -h "$NEON_HOST" -p "$NEON_PORT" -U "$NEON_USER" -d "$NEON_DB" -c "SELECT version();" > /dev/null
        if [ $? -eq 0 ]; then
            log "Conexión a Neon exitosa ✅"
        else
            error "Error de conexión a Neon"
        fi
    fi
}

# Verificar datos migrados
verify_data() {
    if [ "$MIGRATION_TYPE" = "clone" ]; then
        log "Verificando datos migrados..."
        
        # Contar tablas y registros
        TABLES_COUNT=$(PGPASSWORD="$LOCAL_PASSWORD" psql -h localhost -p 5432 -U "$LOCAL_USER" -d "$LOCAL_DB" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")
        USERS_COUNT=$(PGPASSWORD="$LOCAL_PASSWORD" psql -h localhost -p 5432 -U "$LOCAL_USER" -d "$LOCAL_DB" -t -c "SELECT count(*) FROM users;" 2>/dev/null || echo "0")
        TEMPLATES_COUNT=$(PGPASSWORD="$LOCAL_PASSWORD" psql -h localhost -p 5432 -U "$LOCAL_USER" -d "$LOCAL_DB" -t -c "SELECT count(*) FROM form_templates;" 2>/dev/null || echo "0")
        
        info "Tablas encontradas: $TABLES_COUNT"
        info "Usuarios migrados: $USERS_COUNT"
        info "Plantillas migradas: $TEMPLATES_COUNT"
        
        if [ "$TABLES_COUNT" -gt 0 ]; then
            log "Datos verificados correctamente ✅"
        else
            warning "No se encontraron tablas en la base de datos"
        fi
    fi
}

# Crear script de backup para migración
create_backup_script() {
    log "Creando script de backup específico..."
    
    if [ "$MIGRATION_TYPE" = "clone" ]; then
        # Script para backup local
        cat > /usr/local/bin/gelag-backup-local << EOF
#!/bin/bash
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/gelag"
mkdir -p \$BACKUP_DIR

# Backup de base de datos local
PGPASSWORD="$LOCAL_PASSWORD" pg_dump -h localhost -U $LOCAL_USER $LOCAL_DB > \$BACKUP_DIR/gelag_local_\$DATE.sql

# Backup de archivos
tar -czf \$BACKUP_DIR/gelag_files_\$DATE.tar.gz -C /opt/gelag-system uploads logs

# Mantener solo los últimos 7 días
find \$BACKUP_DIR -name "gelag_*" -mtime +7 -delete

echo "Backup local completado: \$DATE"
EOF
        chmod +x /usr/local/bin/gelag-backup-local
        
    else
        # Script para backup desde Neon
        cat > /usr/local/bin/gelag-backup-neon << EOF
#!/bin/bash
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/gelag"
mkdir -p \$BACKUP_DIR

# Backup de base de datos Neon
PGPASSWORD="$NEON_PASSWORD" pg_dump -h $NEON_HOST -p $NEON_PORT -U $NEON_USER $NEON_DB > \$BACKUP_DIR/gelag_neon_\$DATE.sql

# Backup de archivos
tar -czf \$BACKUP_DIR/gelag_files_\$DATE.tar.gz -C /opt/gelag-system uploads logs

# Mantener solo los últimos 7 días
find \$BACKUP_DIR -name "gelag_*" -mtime +7 -delete

echo "Backup desde Neon completado: \$DATE"
EOF
        chmod +x /usr/local/bin/gelag-backup-neon
    fi
    
    log "Script de backup creado ✅"
}

# Mostrar información final
show_final_info() {
    echo ""
    echo "🎉 MIGRACIÓN DE BASE DE DATOS COMPLETADA"
    echo "======================================="
    echo ""
    
    if [ "$MIGRATION_TYPE" = "clone" ]; then
        echo "✅ Base de datos clonada desde Neon a PostgreSQL local"
        echo "🗄️  Base de datos local: $LOCAL_DB"
        echo "👤 Usuario local: $LOCAL_USER"
        echo "🔗 Conexión: localhost:5432"
        echo ""
        echo "📋 PRÓXIMOS PASOS:"
        echo "1. Reiniciar la aplicación: pm2 restart gelag-system"
        echo "2. Verificar funcionamiento: curl http://localhost:5000/api/user"
        echo "3. Hacer login con tus credenciales existentes"
        echo ""
        echo "💾 BACKUP:"
        echo "   Script: /usr/local/bin/gelag-backup-local"
        echo "   Ejecutar: sudo /usr/local/bin/gelag-backup-local"
        
    else
        echo "✅ Configuración para usar la misma base de datos Neon"
        echo "🔗 Conexión: $NEON_HOST:$NEON_PORT"
        echo "🗄️  Base de datos: $NEON_DB"
        echo ""
        echo "📋 PRÓXIMOS PASOS:"
        echo "1. Reiniciar la aplicación: pm2 restart gelag-system"
        echo "2. Verificar conexión: curl http://localhost:5000/api/user"
        echo "3. Todos tus datos siguen en Neon"
        echo ""
        echo "💾 BACKUP:"
        echo "   Script: /usr/local/bin/gelag-backup-neon"
        echo "   Ejecutar: sudo /usr/local/bin/gelag-backup-neon"
    fi
    
    echo ""
    echo "⚠️  IMPORTANTE:"
    echo "   - Archivo .env respaldado con timestamp"
    echo "   - Verifica que la aplicación inicie correctamente"
    echo "   - Realiza un backup inmediatamente"
}

# Función principal
main() {
    echo "Iniciando migración de base de datos..."
    echo ""
    
    check_dependencies
    
    echo "OPCIONES DE MIGRACIÓN:"
    echo "1. Clonar base de datos de Neon a PostgreSQL local"
    echo "2. Usar la misma base de datos Neon (conexión remota)"
    echo ""
    
    read -p "Selecciona una opción (1 o 2): " OPTION
    
    case $OPTION in
        1)
            MIGRATION_TYPE="clone"
            echo "Has seleccionado: Clonar base de datos a local"
            ;;
        2)
            MIGRATION_TYPE="remote"
            echo "Has seleccionado: Usar misma base de datos Neon"
            ;;
        *)
            error "Opción inválida. Selecciona 1 o 2."
            ;;
    esac
    
    echo ""
    read -p "¿Continuar con la migración? (y/N): " CONFIRM
    if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
        echo "Migración cancelada."
        exit 0
    fi
    
    get_neon_credentials
    
    if [ "$MIGRATION_TYPE" = "clone" ]; then
        setup_local_database
        clone_database
        verify_data
    else
        use_same_database
    fi
    
    test_connection
    create_backup_script
    show_final_info
}

# Verificar si se ejecuta como root
if [[ $EUID -eq 0 ]]; then
    error "No ejecutes este script como root. Usa sudo cuando sea necesario."
fi

# Ejecutar
main "$@"