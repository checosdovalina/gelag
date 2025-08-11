# GUÍA DE MIGRACIÓN - GELAG Sistema de Gestión de Formularios

## 📋 Resumen del Sistema
**GELAG** es una aplicación completa de gestión de formularios industriales con:
- Frontend: React 18 + TypeScript + Tailwind CSS
- Backend: Node.js + Express + TypeScript  
- Base de Datos: PostgreSQL con Drizzle ORM
- Autenticación: Session-based con Passport.js
- Características: Roles, formularios dinámicos, firmas digitales, exportación PDF

---

## 🛠️ Requisitos del Servidor Local

### Software Base Requerido:
1. **Node.js** v18.0.0 o superior
2. **PostgreSQL** v14 o superior
3. **Git** para clonar el repositorio
4. **PM2** (opcional, para producción)

### Verificar versiones:
```bash
node --version
npm --version
psql --version
```

---

## 📦 Dependencias del Proyecto

### Dependencias principales:
```json
{
  "@neondatabase/serverless": "^0.10.4",
  "drizzle-orm": "^0.39.1",
  "drizzle-kit": "^0.30.4",
  "express": "^4.21.2",
  "passport": "^0.7.0",
  "passport-local": "^1.0.0",
  "express-session": "^1.18.1",
  "multer": "^1.4.5-lts.2",
  "puppeteer": "^24.7.2",
  "pdfkit": "^0.17.1",
  "react": "^18.3.1",
  "typescript": "5.6.3"
}
```

---

## 🗄️ Configuración de Base de Datos PostgreSQL

### OPCIÓN 1: Clonar Base de Datos desde Neon
**Recomendado para independencia total**

```bash
# Ejecutar script de migración automática
chmod +x database-migration.sh
./database-migration.sh
```

Este script te permite:
- Exportar todos los datos desde tu base de datos Neon actual
- Crear una base de datos PostgreSQL local idéntica
- Migrar todos los usuarios, formularios, y datos existentes
- Mantener total independencia de servicios externos

### OPCIÓN 2: Usar la Misma Base de Datos Neon
**Para mantener datos centralizados**

```bash
# Usar el mismo script pero seleccionar opción 2
./database-migration.sh
```

Esto configura tu servidor local para conectarse directamente a tu base de datos Neon existente.

### OPCIÓN 3: Crear Base de Datos Nueva (Manual):
```sql
-- Solo si quieres empezar desde cero
sudo -u postgres psql

-- Crear usuario y base de datos
CREATE USER gelag_user WITH PASSWORD 'tu_password_seguro';
CREATE DATABASE gelag_db OWNER gelag_user;
GRANT ALL PRIVILEGES ON DATABASE gelag_db TO gelag_user;

-- Conectar a la nueva base de datos
\c gelag_db

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### 2. Estructura de la Base de Datos:
La aplicación utiliza **Drizzle ORM** con las siguientes tablas principales:

```sql
-- Tablas principales del sistema:
- users (usuarios y roles)
- form_templates (plantillas de formularios) 
- form_entries (entradas de formularios)
- activity_logs (registro de actividades)
- saved_reports (reportes guardados)
- employees (empleados)
- materials (materiales)
- packaging (empaques)
- products (productos)
- product_recipes (recetas de productos)
- recipe_ingredients (ingredientes de recetas)
- production_forms (formularios de producción)
- workflow_steps (pasos de workflow)
```

---

## 🔧 Configuración del Proyecto

### 1. Variables de Entorno (.env):

#### Para Base de Datos Local (después de clonar):
```env
# Base de Datos Local
DATABASE_URL=postgresql://gelag_user:tu_password_seguro@localhost:5432/gelag_db
PGHOST=localhost
PGPORT=5432
PGUSER=gelag_user
PGPASSWORD=tu_password_seguro
PGDATABASE=gelag_db

# Sesiones
SESSION_SECRET=tu_session_secret_muy_largo_y_seguro_aqui

# Entorno
NODE_ENV=production
PORT=5000
```

#### Para Conexión Directa a Neon:
```env
# Base de Datos Neon (usar tus credenciales existentes)
DATABASE_URL=postgresql://usuario:password@host.neon.tech:5432/database
PGHOST=ep-xxx.us-east-1.aws.neon.tech
PGPORT=5432
PGUSER=tu_usuario_neon
PGPASSWORD=tu_password_neon
PGDATABASE=tu_database_neon

# Sesiones
SESSION_SECRET=tu_session_secret_muy_largo_y_seguro_aqui

# Entorno
NODE_ENV=production
PORT=5000
```

**Nota**: El script `database-migration.sh` configura automáticamente estas variables.

### 2. Scripts de package.json:
```json
{
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "db:push": "drizzle-kit push"
  }
}
```

---

## 📥 Pasos de Instalación

### 1. Clonar y preparar el proyecto:
```bash
# Clonar el repositorio
git clone [URL_DEL_REPOSITORIO] gelag-system
cd gelag-system

# Instalar dependencias
npm install

# Copiar archivo de entorno
cp .env.example .env
# Editar .env con tus configuraciones
```

### 2. Configurar Base de Datos:

#### Si clonaste desde Neon:
```bash
# Los datos ya están migrados, solo verifica la conexión
npm run dev
# La aplicación debería iniciar con todos tus datos existentes
```

#### Si usas la misma base de datos Neon:
```bash
# Solo verificar conexión remota
npm run dev
# La aplicación se conectará directamente a Neon
```

#### Si creaste una base de datos nueva:
```bash
# Aplicar esquema a la base de datos
npm run db:push

# Crear usuario administrador inicial
node create-admin.js
```

### 3. Crear Usuario Administrativo Inicial:
```bash
# Ejecutar script de inicialización (crear uno si no existe)
node scripts/create-admin.js
```

Script ejemplo (`scripts/create-admin.js`):
```javascript
import { hash } from 'bcrypt';
import { db } from '../server/db.js';
import { users } from '../shared/schema.js';

async function createAdmin() {
  const hashedPassword = await hash('admin123', 10);
  
  await db.insert(users).values({
    username: 'admin',
    password: hashedPassword,
    name: 'Administrador',
    email: 'admin@empresa.com',
    role: 'superadmin',
    department: 'Sistemas'
  });
  
  console.log('Usuario admin creado exitosamente');
}

createAdmin().catch(console.error);
```

### 4. Construir y ejecutar:
```bash
# Desarrollo
npm run dev

# Producción
npm run build
npm start
```

---

## 🚀 Configuración de Producción

### 1. Usando PM2:
```bash
# Instalar PM2 globalmente
npm install -g pm2

# Crear archivo ecosystem.config.js
```

Archivo `ecosystem.config.js`:
```javascript
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
    time: true
  }]
}
```

```bash
# Iniciar con PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 2. Nginx como Proxy Reverso:
```nginx
# /etc/nginx/sites-available/gelag
server {
    listen 80;
    server_name tu-dominio.com;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🔐 Configuración de Seguridad

### 1. Firewall (ufw):
```bash
sudo ufw allow 22      # SSH
sudo ufw allow 80      # HTTP
sudo ufw allow 443     # HTTPS
sudo ufw allow 5432    # PostgreSQL (solo localhost)
sudo ufw enable
```

### 2. PostgreSQL Security:
```bash
# Editar postgresql.conf
sudo nano /etc/postgresql/14/main/postgresql.conf

# Configurar:
listen_addresses = 'localhost'
port = 5432
max_connections = 100
```

```bash
# Editar pg_hba.conf
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Agregar:
local   gelag_db    gelag_user                  md5
host    gelag_db    gelag_user    127.0.0.1/32  md5
```

---

## 📂 Estructura de Archivos en Servidor

```
/opt/gelag-system/
├── dist/                   # Aplicación construida
├── server/                 # Código del servidor
├── client/                 # Código del frontend
├── shared/                 # Esquemas compartidos
├── logs/                   # Logs de la aplicación
├── uploads/                # Archivos subidos
├── .env                    # Variables de entorno
├── package.json
└── ecosystem.config.js
```

---

## 🔄 Backup y Mantenimiento

### 1. Backup de Base de Datos:
```bash
# Script de backup diario
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U gelag_user gelag_db > /backups/gelag_backup_$DATE.sql
```

### 2. Logs y Monitoreo:
```bash
# Ver logs de PM2
pm2 logs gelag-system

# Ver status
pm2 status

# Reiniciar aplicación
pm2 restart gelag-system
```

---

## 🌐 Acceso a la Aplicación

Una vez instalado:
- **URL local**: http://localhost:5000
- **Usuario inicial**: admin / admin123
- **Panel administrativo**: /admin
- **Dashboard**: /dashboard

---

## ❗ Puntos Importantes

1. **Seguridad**: Cambiar todas las contraseñas por defecto
2. **SSL**: Configurar HTTPS en producción con Let's Encrypt
3. **Backups**: Configurar backups automáticos diarios
4. **Monitoring**: Instalar herramientas de monitoreo (opcional)
5. **Updates**: Mantener dependencias actualizadas

---

## 📞 Soporte

- **Logs de errores**: `./logs/err.log`
- **Logs generales**: `./logs/combined.log`
- **Base de datos**: Verificar conexión con `psql -h localhost -U gelag_user gelag_db`

---

*Documentación generada para GELAG v1.0 - Sistema de Gestión de Formularios Industriales*