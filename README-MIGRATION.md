# 🚀 MIGRACIÓN GELAG A SERVIDOR LOCAL

## Resumen Rápido

Este paquete de migración te permite mover tu aplicación GELAG desde Replit a un servidor local con **todas tus bases de datos y configuraciones intactas**.

## 📦 Archivos Incluidos

| Archivo | Propósito |
|---------|-----------|
| `install.sh` | Instalación automática completa del servidor |
| `database-migration.sh` | Migración de datos desde Neon |
| `neon-connection-test.sh` | Verificar conexión a Neon antes de migrar |
| `security-setup.sh` | Configuración de seguridad avanzada |
| `MIGRATION_GUIDE.md` | Guía técnica completa |
| `validation-checklist.md` | Lista de verificación (80+ puntos) |

## ⚡ Migración Express (5 pasos)

### 1. Preparar Servidor
```bash
# En tu servidor Linux (Ubuntu/Debian)
chmod +x *.sh
sudo ./install.sh
```

### 2. Migrar Base de Datos
```bash
# Opción A: Verificar conexión primero
./neon-connection-test.sh

# Opción B: Migrar datos
./database-migration.sh
```
**Elige:**
- **Opción 1**: Clonar todo a PostgreSQL local (recomendado)
- **Opción 2**: Usar la misma base de datos Neon

### 3. Instalar Aplicación
```bash
cd /opt/gelag-system
# Copiar tu código aquí
npm install
npm run build
```

### 4. Iniciar Producción
```bash
pm2 start ecosystem.config.js
```

### 5. Verificar
```bash
curl http://tu-servidor.com
# Login con tus credenciales existentes
```

## 🎯 Opciones de Base de Datos

### Opción 1: Clonar desde Neon (Recomendado)
**✅ Ventajas:**
- Independencia total de servicios externos
- Mejor rendimiento (sin latencia de red)
- Control completo de backups
- Sin costos adicionales de Neon

**📋 Resultado:**
- Base de datos PostgreSQL local idéntica
- Todos tus usuarios, formularios y datos migrados
- Mismo funcionamiento, mejor velocidad

### Opción 2: Usar Misma Base Neon
**✅ Ventajas:**
- Sin migración de datos necesaria
- Funciona inmediatamente
- Datos centralizados

**⚠️ Consideraciones:**
- Dependencia de conectividad a internet
- Posible latencia en operaciones
- Costos continuos de Neon

## 🔧 Requisitos Mínimos

- **SO**: Linux (Ubuntu 20.04+, Debian 11+, CentOS 8+)
- **RAM**: 2GB mínimo, 4GB recomendado
- **Disco**: 20GB mínimo
- **CPU**: 2 cores mínimo
- **Red**: Conexión estable a internet

## 🔐 Seguridad Incluida

El proceso de instalación configura automáticamente:
- Firewall UFW con reglas específicas
- PostgreSQL asegurado (solo localhost)
- Nginx con configuración segura
- Sesiones encriptadas
- fail2ban (opcional)
- Backups automáticos

## 📊 Dashboard Post-Migración

Después de la migración tendrás acceso a:
- **Dashboard administrativo**: Todos tus datos intactos
- **Formularios existentes**: Funcionando normalmente
- **Usuarios y roles**: Sin cambios
- **Recetas de producción**: Todas migradas
- **Reportes y exportaciones**: Disponibles

## 🆘 Solución Rápida de Problemas

### Aplicación no inicia
```bash
pm2 logs gelag-system
# Revisar errores en logs
```

### Base de datos no conecta
```bash
./neon-connection-test.sh  # Si usas Neon
psql -h localhost -U gelag_user -d gelag_db  # Si es local
```

### Nginx no responde
```bash
sudo nginx -t
sudo systemctl restart nginx
```

## 📞 Credenciales Iniciales

### Si migraste desde Neon:
- **Usuarios**: Los mismos que tenías en Replit
- **Contraseñas**: Las mismas que tenías

### Si creaste base nueva:
- **Usuario**: admin
- **Contraseña**: admin123
- **⚠️ Cambiar después del primer login**

## 🔄 Comandos Útiles

```bash
# Ver estado de la aplicación
pm2 status

# Ver logs en tiempo real
pm2 logs gelag-system --lines 50

# Reiniciar aplicación
pm2 restart gelag-system

# Backup manual
sudo /usr/local/bin/gelag-backup-local  # o gelag-backup-neon

# Ver estado del servidor
systemctl status nginx postgresql
```

## 📈 Monitoreo

El sistema incluye monitoreo automático que verifica cada 5 minutos:
- Estado de la aplicación (PM2)
- PostgreSQL funcionando
- Nginx respondiendo
- Espacio en disco
- Uso de memoria

Logs en: `/var/log/gelag-monitor.log`

## 🎉 ¿Qué Obtienes?

✅ **Aplicación GELAG completa en tu servidor**  
✅ **Todos tus datos migrados o conectados**  
✅ **Seguridad de nivel empresarial**  
✅ **Backups automáticos configurados**  
✅ **Monitoreo básico incluido**  
✅ **SSL/HTTPS listo para configurar**  
✅ **Escalabilidad para crecimiento futuro**

---

**🏁 Tiempo total de migración: 30-60 minutos**

**💡 ¿Necesitas ayuda?** Revisa `validation-checklist.md` para verificar que todo funcione correctamente.