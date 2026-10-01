# Actualizar GELAG en la VPS

Este procedimiento es para la VPS propia con PostgreSQL y PM2. No es para la base de datos administrada de Replit.

## Primera vez

Suba los cambios al repositorio desde este proyecto:

```bash
git push origin main
```

En la VPS, dentro de la carpeta de GELAG, descargue el script y ejecútelo:

```bash
git pull --ff-only origin main && bash scripts/update-vps.sh
```

En futuras actualizaciones basta con:

```bash
bash scripts/update-vps.sh
```

Ejecute como el mismo usuario que administra PM2, **sin `sudo`**. Node, npm, Git, PM2, curl, tar, flock y las herramientas GNU habituales deben estar instalados. Cuando haya migraciones, también se necesita `pg_dump`, compatible con la versión del servidor PostgreSQL (la VPS documentada usa PostgreSQL 17). El script no instala ni actualiza paquetes del sistema operativo.

## Qué hace

1. Comprueba la rama `main`, que no haya cambios locales registrados y que exista `.env` sin estar registrado en Git.
2. Descarga con `git pull --ff-only`, sin forzar ni borrar modificaciones locales.
3. Instala con `npm ci --include=dev` y compila en una carpeta temporal. Esto instala también las herramientas necesarias para compilar, como Vite y esbuild.
4. Busca las migraciones SQL incluidas en `migrations/vps/`. Si no existen, no se conecta ni modifica la base.
5. Si hay migraciones pendientes, pide confirmar el destino, hace un respaldo completo con `pg_dump` y aplica las migraciones en una transacción. No continúa si falla el respaldo o una migración.
6. Detiene brevemente GELAG, reemplaza `dist` y `node_modules`, y reinicia la aplicación registrada. Si no está registrada, usa `ecosystem.config.cjs` con el nombre `gelag`.
7. Comprueba que `http://127.0.0.1:5000/` responde y guarda la configuración de PM2.

No sustituye `.env`, archivos subidos ni los datos de producción. Mantiene respaldos de los artefactos anteriores fuera de la carpeta del proyecto. **Los respaldos de la base contienen información sensible: proteja el directorio y no los suba a Git.**

Si falla la compilación o la migración, no reemplaza los artefactos instalados. Los cambios descargados por Git permanecen en el repositorio. Si falla después del reemplazo, intenta restaurar los artefactos anteriores y reiniciar PM2; si no puede recuperar todos los archivos, deja PM2 detenido e indica dónde están los respaldos, sin afirmar que la recuperación terminó. Las migraciones no se revierten automáticamente: revisar sus efectos y restaurar datos requiere una intervención explícita. La comprobación HTTP solo confirma el arranque, no sustituye revisar el inicio de sesión y los formularios.

## Nuevas tablas o columnas

Cada cambio de esquema debe venir con una migración revisada en `migrations/vps/`; el script la detecta y aplica una sola vez. **No adivina el esquema a partir de un error ni sincroniza ciegamente `shared/schema.ts`.** Actualizar solamente el esquema TypeScript sin una migración no crea las tablas en la VPS.

El ejecutor acepta cambios aditivos limitados y rechaza instrucciones destructivas o no admitidas. Consulte [migrations/vps/README.md](migrations/vps/README.md). Una columna obligatoria nueva debe tener un valor predeterminado compatible con los registros y la versión anterior. Pruebe la migración en una copia de la base antes de incorporarla.

Los cambios de Pasta y glucosa usan el campo JSON existente y **no requieren ninguna migración nueva**.

No ejecute `npm run db:push`, `setup-db.sh`, `fix-production-forms-table.sql` ni los scripts antiguos de instalación/migración para actualizar una VPS con datos.

## Configuración opcional

Por defecto se usa la configuración documentada de GELAG. Si la VPS utiliza otros valores, pueden cambiarse para esta ejecución:

```bash
GELAG_PM2_APP=otro-nombre GELAG_PM2_CONFIG=/ruta/ecosystem.config.cjs bash scripts/update-vps.sh
```

También se admiten `GELAG_BRANCH`, `GELAG_REMOTE`, `GELAG_BACKUP_DIR` (preferentemente ruta absoluta) y `GELAG_HEALTH_URL`. Asegúrese de que `DATABASE_URL` utilizado por la aplicación coincida con el del ejecutor de migraciones: este carga el `.env` de la VPS y, como la aplicación, conserva cualquier variable ya definida en el entorno.

Para una ejecución desatendida, solo después de verificar y autorizar el destino y las migraciones:

```bash
bash scripts/update-vps.sh --yes-migrations
```

## Revisar el resultado

```bash
pm2 status
pm2 logs gelag --lines 30
```

Los respaldos quedan por defecto en `../gelag-backups/<carpeta-del-proyecto>/`, fuera del proyecto y en el mismo sistema de archivos para que los reemplazos sean seguros. Incluyen versiones anteriores de `dist` y `node_modules`, por lo que pueden ocupar bastante espacio. Conserve los respaldos necesarios y gestione su retención de forma explícita.