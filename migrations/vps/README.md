# Migraciones PostgreSQL para el VPS externo

Este directorio contiene migraciones explícitas para la base PostgreSQL del VPS administrado externamente. La producción conocida se ejecuta en un VPS con PostgreSQL local; **no es la base de datos de producción administrada por Replit**. El flujo de publicación de Replit no actualiza este esquema.

Toda modificación nueva de esquema debe incluir aquí una migración SQL revisada y versionada, por ejemplo `0001_descripcion_breve.sql`. Los números deben ser únicos y determinan el orden de ejecución. No se deduce el esquema desde el código, no se generan cambios automáticamente y no se incluyen scripts SQL sueltos de la raíz del repositorio. No usar `db:push` para actualizar el VPS.

El validador solo acepta operaciones aditivas limitadas: `CREATE TABLE` (opcionalmente `IF NOT EXISTS`), `CREATE INDEX` y `ALTER TABLE ... ADD COLUMN`. No admite cambios de datos, sentencias transaccionales, eliminaciones ni otros tipos de DDL. Cada migración debe estar revisada antes de ejecutarse.

Desde el repositorio:

```sh
node scripts/vps-migrate.mjs --plan
node scripts/vps-migrate.mjs --apply \
  --env-file /ruta/absoluta/al/.env \
  --backup-dir /ruta/privada/fuera/del/repositorio
```

`--plan` es el modo predeterminado, valida y muestra las migraciones sin conectarse a PostgreSQL. `--apply` requiere `DATABASE_URL` en el archivo indicado; las variables ya presentes en el entorno conservan precedencia sobre ese archivo. Antes de modificar la base, el comando muestra únicamente el nombre de la base y el host y solicita confirmación en una terminal interactiva. `--yes` omite esa confirmación explícita.

El directorio predeterminado es `migrations/vps` junto al script. `--directory` permite seleccionar otro directorio (también se usa para pruebas). Para evitar que `pg` y `pg_dump` resuelvan destinos distintos, solo se aceptan parámetros SSL limitados en la consulta de `DATABASE_URL`; no se permiten reemplazos de host, puerto, base, usuario, contraseña, servicio u opciones.

Antes de cualquier DDL, `--apply` obtiene un respaldo completo mediante `pg_dump` (debe estar instalado), con permisos privados en el directorio de respaldo indicado. La herramienta toma un bloqueo asesor de PostgreSQL, vuelve a consultar el registro bajo el bloqueo y aplica todas las migraciones pendientes en una sola transacción. El registro `public.gelag_vps_migrations` guarda el nombre y SHA-256 de cada archivo; un archivo aplicado que haya cambiado detiene el proceso. Si falla una migración, la transacción se revierte. No se ejecutan reversiones automáticas ni tareas de carga/siembra de datos.

No ejecutar este procedimiento contra el entorno de desarrollo de Replit. Las migraciones son una operación manual y deliberada para la base externa del VPS.