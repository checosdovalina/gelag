#!/bin/bash

# GELAG Sistema - Test de Conexión a Neon
# Útil para verificar credenciales antes de migrar

echo "🔍 TEST DE CONEXIÓN A NEON DATABASE"
echo "=================================="

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Solicitar credenciales
echo ""
echo "Ingresa las credenciales de tu base de datos Neon:"
echo "Las encuentras en: Dashboard Neon > Tu proyecto > Connection Details"
echo ""

read -p "Host (ej: ep-xxx.us-east-1.aws.neon.tech): " NEON_HOST
read -p "Puerto [5432]: " NEON_PORT
NEON_PORT=${NEON_PORT:-5432}
read -p "Base de datos: " NEON_DB  
read -p "Usuario: " NEON_USER
read -s -p "Contraseña: " NEON_PASSWORD
echo ""

# Construir URL
NEON_URL="postgresql://$NEON_USER:$NEON_PASSWORD@$NEON_HOST:$NEON_PORT/$NEON_DB"

echo ""
echo "🔗 Probando conexión..."

# Test básico de conexión
if PGPASSWORD="$NEON_PASSWORD" psql -h "$NEON_HOST" -p "$NEON_PORT" -U "$NEON_USER" -d "$NEON_DB" -c "SELECT version();" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Conexión exitosa${NC}"
else
    echo -e "${RED}❌ Error de conexión${NC}"
    echo "Verifica las credenciales y que la base de datos esté activa"
    exit 1
fi

# Obtener información de la base de datos
echo ""
echo "📊 INFORMACIÓN DE LA BASE DE DATOS:"
echo "=================================="

# Versión de PostgreSQL
PG_VERSION=$(PGPASSWORD="$NEON_PASSWORD" psql -h "$NEON_HOST" -p "$NEON_PORT" -U "$NEON_USER" -d "$NEON_DB" -t -c "SELECT version();" | head -1 | xargs)
echo "Versión PostgreSQL: $PG_VERSION"

# Número de tablas
TABLES_COUNT=$(PGPASSWORD="$NEON_PASSWORD" psql -h "$NEON_HOST" -p "$NEON_PORT" -U "$NEON_USER" -d "$NEON_DB" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
echo "Tablas en schema público: $TABLES_COUNT"

# Tamaño de la base de datos
DB_SIZE=$(PGPASSWORD="$NEON_PASSWORD" psql -h "$NEON_HOST" -p "$NEON_PORT" -U "$NEON_USER" -d "$NEON_DB" -t -c "SELECT pg_size_pretty(pg_database_size('$NEON_DB'));" | xargs)
echo "Tamaño de la base de datos: $DB_SIZE"

# Verificar tablas específicas de GELAG
echo ""
echo "🔍 VERIFICANDO TABLAS GELAG:"
echo "============================"

check_table() {
    local table_name=$1
    local count=$(PGPASSWORD="$NEON_PASSWORD" psql -h "$NEON_HOST" -p "$NEON_PORT" -U "$NEON_USER" -d "$NEON_DB" -t -c "SELECT count(*) FROM $table_name;" 2>/dev/null | xargs)
    if [ $? -eq 0 ]; then
        echo -e "✅ $table_name: $count registros"
    else
        echo -e "${YELLOW}⚠️  $table_name: no encontrada${NC}"
    fi
}

# Verificar tablas principales
check_table "users"
check_table "form_templates"
check_table "form_entries"
check_table "products"
check_table "production_forms"
check_table "product_recipes"
check_table "recipe_ingredients"

echo ""
echo "💾 ESTIMACIÓN DE MIGRACIÓN:"
echo "=========================="

# Calcular tiempo estimado de migración
if [ "$TABLES_COUNT" -gt 0 ]; then
    echo "Tiempo estimado de migración: 2-5 minutos"
    echo "Tamaño de backup estimado: $DB_SIZE"
    echo ""
    echo -e "${GREEN}✅ La base de datos está lista para migrar${NC}"
else
    echo -e "${YELLOW}⚠️  Base de datos parece estar vacía${NC}"
fi

# Mostrar URL de conexión (sin contraseña)
echo ""
echo "🔗 URL DE CONEXIÓN (para referencia):"
echo "postgresql://$NEON_USER:***@$NEON_HOST:$NEON_PORT/$NEON_DB"

echo ""
echo "📋 PRÓXIMOS PASOS:"
echo "1. Si todo se ve bien, ejecuta: ./database-migration.sh"
echo "2. Selecciona opción 1 para clonar o opción 2 para usar la misma DB"
echo "3. Usa estas mismas credenciales cuando el script las solicite"