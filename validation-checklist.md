# CHECKLIST DE VALIDACIÓN POST-INSTALACIÓN
# GELAG Sistema de Gestión de Formularios

## ✅ Verificaciones del Sistema Base

### 1. Software Requerido
- [ ] Node.js v18+ instalado (`node --version`)
- [ ] NPM funcionando (`npm --version`)
- [ ] PostgreSQL v14+ ejecutándose (`sudo systemctl status postgresql`)
- [ ] Nginx ejecutándose (`sudo systemctl status nginx`)
- [ ] PM2 instalado globalmente (`pm2 --version`)

### 2. Base de Datos

#### Opción A: Base de Datos Clonada desde Neon
- [ ] Script `database-migration.sh` ejecutado exitosamente
- [ ] Base de datos local creada con datos migrados
- [ ] Conexión local funcionando: `psql -h localhost -U gelag_user -d gelag_db`
- [ ] Datos verificados (usuarios, formularios, productos)
- [ ] Archivo `.env` actualizado automáticamente

#### Opción B: Conexión Directa a Neon
- [ ] Script `neon-connection-test.sh` ejecutado sin errores
- [ ] Credenciales de Neon verificadas
- [ ] Conexión remota funcionando
- [ ] Archivo `.env` configurado para Neon
- [ ] Latencia de conexión aceptable

#### Opción C: Base de Datos Nueva Local
- [ ] PostgreSQL iniciado y habilitado
- [ ] Usuario `gelag_user` creado
- [ ] Base de datos `gelag_db` creada
- [ ] Conexión funcionando: `psql -h localhost -U gelag_user -d gelag_db`
- [ ] Esquema aplicado con `npm run db:push`

### 3. Archivos del Proyecto
- [ ] Código fuente copiado a `/opt/gelag-system/`
- [ ] Archivo `.env` configurado correctamente
- [ ] Dependencias instaladas (`npm install`)
- [ ] Proyecto compilado (`npm run build`)

## ✅ Verificaciones de Funcionamiento

### 4. Aplicación Backend
- [ ] Servidor inicia sin errores (`npm run dev`)
- [ ] Puerto 5000 escuchando (`netstat -tlnp | grep :5000`)
- [ ] Logs sin errores críticos
- [ ] API responde: `curl http://localhost:5000/api/user`

### 5. Base de Datos Conectada

#### Si migraste desde Neon:
- [ ] Todas las tablas migradas correctamente
- [ ] Usuarios existentes funcionan
- [ ] Formularios existentes accesibles
- [ ] Datos de producción intactos

#### Si usas Neon directamente:
- [ ] Conexión remota estable
- [ ] Latencia aceptable (<500ms)
- [ ] Todos los datos accesibles
- [ ] Sin problemas de timeout

#### Si creaste base nueva:
- [ ] Tablas creadas correctamente
- [ ] Usuario admin creado (`node create-admin.js`)
- [ ] Login admin funciona (usuario: admin, contraseña: admin123)

### 6. Frontend
- [ ] Assets estáticos servidos
- [ ] React app carga sin errores
- [ ] Formularios de login/registro funcionan
- [ ] Dashboard accesible

## ✅ Verificaciones de Producción

### 7. PM2 Configuración
- [ ] Aplicación inicia con PM2: `pm2 start ecosystem.config.js`
- [ ] Estado "online": `pm2 list`
- [ ] Logs funcionando: `pm2 logs gelag-system`
- [ ] Auto-restart en caso de error

### 8. Nginx Configuración
- [ ] Configuración de sitio creada
- [ ] Proxy reverso funcionando
- [ ] Acceso externo: `curl http://tu-dominio.com`
- [ ] Headers correctos configurados

### 9. Seguridad Básica
- [ ] Firewall UFW activado y configurado
- [ ] Solo puertos necesarios abiertos (22, 80, 443)
- [ ] PostgreSQL solo escucha localhost
- [ ] fail2ban instalado y activo (opcional)

## ✅ Verificaciones de Seguridad Avanzada

### 10. SSL/HTTPS (Producción)
- [ ] Certificado SSL instalado
- [ ] Redirección HTTP → HTTPS configurada
- [ ] Certificado válido: `curl -I https://tu-dominio.com`
- [ ] Auto-renovación configurada

### 11. Monitoreo
- [ ] Logs de aplicación funcionando
- [ ] Logs de Nginx funcionando
- [ ] Script de monitoreo configurado
- [ ] Alertas básicas configuradas

### 12. Backup

#### Para Base de Datos Local:
- [ ] Script `/usr/local/bin/gelag-backup-local` creado
- [ ] Backup manual funcionando
- [ ] Cron job configurado para backups automáticos
- [ ] Restauración de backup probada

#### Para Conexión a Neon:
- [ ] Script `/usr/local/bin/gelag-backup-neon` creado
- [ ] Backup remoto funcionando
- [ ] Backups regulares desde Neon
- [ ] Plan de contingencia en caso de problemas con Neon

## ✅ Verificaciones Funcionales

### 13. Funcionalidades Core
- [ ] Registro de usuarios nuevo
- [ ] Login/logout funciona
- [ ] Creación de formularios
- [ ] Llenado de formularios
- [ ] Exportación PDF
- [ ] Subida de archivos

### 14. Roles y Permisos
- [ ] SuperAdmin tiene acceso completo
- [ ] Admin puede gestionar usuarios
- [ ] Usuarios de producción acceden a sus formularios
- [ ] Usuarios de calidad acceden a sus formularios
- [ ] Permisos restrictivos funcionan

### 15. Módulos Específicos
- [ ] Formularios de producción
- [ ] Registro de recetas
- [ ] Automatización de lotes (66L)
- [ ] Firmas digitales
- [ ] Exportación de reportes

## ✅ Pruebas de Carga (Opcional)

### 16. Performance
- [ ] Aplicación responde bajo carga normal
- [ ] Base de datos maneja consultas concurrentes
- [ ] Memoria y CPU dentro de límites normales
- [ ] Tiempo de respuesta aceptable (<2s)

## 🚨 Comandos de Verificación Rápida

```bash
# Estado general del sistema
sudo systemctl status postgresql nginx
pm2 list
pm2 logs gelag-system --lines 50

# Verificar puertos
sudo netstat -tlnp | grep -E ':(22|80|443|5000|5432)'

# Verificar procesos
ps aux | grep -E '(nginx|postgres|pm2|node)' | grep -v grep

# Verificar logs
tail -f /opt/gelag-system/logs/out.log
tail -f /var/log/nginx/error.log

# Test de conectividad
curl -I http://localhost:5000/api/user
curl -I http://tu-dominio.com

# Verificar base de datos local
sudo -u postgres psql -c "\l" | grep gelag_db
psql -h localhost -U gelag_user -d gelag_db -c "\dt"

# Verificar conexión a Neon (si aplica)
./neon-connection-test.sh

# Test de migración
./database-migration.sh --test-only

# Verificar SSL (si aplica)
openssl s_client -connect tu-dominio.com:443 -servername tu-dominio.com

# Estado de seguridad
sudo ufw status
sudo fail2ban-client status (si está instalado)
```

## 🔧 Solución de Problemas Comunes

### Aplicación no inicia:
```bash
# Verificar logs
pm2 logs gelag-system
# Verificar .env
cat /opt/gelag-system/.env
# Verificar dependencias
cd /opt/gelag-system && npm install
```

### Base de datos no conecta:
```bash
# Verificar PostgreSQL
sudo systemctl status postgresql
# Verificar conexión
psql -h localhost -U gelag_user -d gelag_db
# Verificar configuración
sudo cat /etc/postgresql/*/main/pg_hba.conf
```

### Nginx no sirve la aplicación:
```bash
# Verificar configuración
sudo nginx -t
# Verificar logs
sudo tail -f /var/log/nginx/error.log
# Verificar proxy
curl -I http://localhost:5000
```

### SSL no funciona:
```bash
# Verificar certificado
sudo certbot certificates
# Renovar certificado
sudo certbot renew --dry-run
# Verificar configuración Nginx
sudo nginx -t
```

## 📞 Información de Soporte

- **Logs de aplicación**: `/opt/gelag-system/logs/`
- **Logs de sistema**: `/var/log/`
- **Configuración**: `/opt/gelag-system/.env`
- **Backup**: `/backups/gelag/`

---

**✅ Total de verificaciones: 80+**

*Una vez completadas todas las verificaciones, el sistema GELAG estará listo para uso en producción.*