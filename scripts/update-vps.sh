#!/usr/bin/env bash
# Actualización de GELAG en la VPS. No ejecutar con sudo ni dentro de Replit.
set -Eeuo pipefail
umask 077

log() { printf '\n[GELAG] %s\n' "$*"; }
die() { printf '\n[GELAG] ERROR: %s\n' "$*" >&2; exit 1; }

cleanup() {
  if [[ -n "${stage:-}" && -d "$stage" ]]; then rm -rf -- "$stage"; fi
}

recover() {
  local exit_code="${1:-$?}"
  trap - ERR INT TERM
  set +e
  log "La actualización falló. No se harán más cambios."
  if [[ "${swap_started:-no}" == yes ]]; then
    local restore_failed=no
    if [[ "$registered" == yes ]] || pm2 describe "$app" >/dev/null 2>&1; then
      if ! pm2 stop "$app" >/dev/null 2>&1; then
        log "No se pudo detener PM2 para recuperar los archivos. Respaldo: $backup"
        log "No se intentará una recuperación mientras la aplicación siga activa."
        exit "$exit_code"
      fi
    fi
    if [[ "${installed_dist:-no}" == yes ]]; then
      if ! rm -rf -- "$root/dist" || [[ -e "$root/dist" || -L "$root/dist" ]]; then restore_failed=yes; fi
    fi
    if [[ "${installed_modules:-no}" == yes ]]; then
      if ! rm -rf -- "$root/node_modules" || [[ -e "$root/node_modules" || -L "$root/node_modules" ]]; then restore_failed=yes; fi
    fi
    if [[ "$restore_failed" == no && "${saved_dist:-no}" == yes ]]; then
      if [[ -e "$root/dist" || -L "$root/dist" ]] || ! mv -T -- "$backup/dist" "$root/dist"; then
        restore_failed=yes
      fi
    fi
    if [[ "$restore_failed" == no && "${saved_modules:-no}" == yes ]]; then
      if [[ -e "$root/node_modules" || -L "$root/node_modules" ]] || ! mv -T -- "$backup/node_modules" "$root/node_modules"; then
        restore_failed=yes
      fi
    fi
    if [[ "$restore_failed" == yes ]]; then
      log "La recuperación de archivos no terminó. PM2 permanecerá detenido."
      log "Conserve el respaldo $backup y revise los archivos de $root antes de reiniciar."
      exit "$exit_code"
    fi
    if [[ "$registered" == yes ]]; then
      if pm2 restart "$app"; then
        log "Se recuperaron los archivos anteriores y se solicitó su reinicio. Revise pm2 logs."
      else
        log "El reinicio anterior también falló. Revise pm2 logs y el respaldo: $backup"
      fi
    else
      pm2 delete "$app" >/dev/null 2>&1
    fi
  else
    log "La versión instalada no fue reemplazada."
  fi
  log "Las migraciones de base de datos NO se revierten automáticamente."
  exit "${exit_code:-1}"
}

main() {
  local yes_migrations=no
  case "${1:-}" in
    --help|-h)
      printf 'Uso: bash scripts/update-vps.sh [--yes-migrations]\n\n'
      printf 'Actualiza Git, instala dependencias, compila, aplica migraciones con respaldo y reinicia PM2.\n'
      printf 'Por defecto pide confirmar el destino si hay migraciones pendientes.\n'
      return 0 ;;
    --yes-migrations) yes_migrations=yes; shift ;;
    "") ;;
    *) die "Opción desconocida. Consulte --help." ;;
  esac
  [[ $# -eq 0 ]] || die "Hay argumentos desconocidos."
  [[ -z "${REPLIT_DEV_DOMAIN:-}" ]] || die "Este script es para la VPS, no para el entorno de desarrollo de Replit."

  root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
  app="${GELAG_PM2_APP:-gelag}"
  local branch="${GELAG_BRANCH:-main}"
  local remote="${GELAG_REMOTE:-origin}"
  local config="${GELAG_PM2_CONFIG:-$root/ecosystem.config.cjs}"
  local health_url="${GELAG_HEALTH_URL:-http://127.0.0.1:5000/}"
  local backup_root="${GELAG_BACKUP_DIR:-$(dirname -- "$root")/gelag-backups/$(basename -- "$root")}"
  stage=""
  swap_started=no
  installed_dist=no
  installed_modules=no
  saved_dist=no
  saved_modules=no
  registered=no

  cd -- "$root"
  for command in git npm node pm2 curl tar mktemp flock stat; do
    command -v "$command" >/dev/null 2>&1 || die "Falta $command. Instálelo en la VPS antes de continuar."
  done
  [[ -f .env ]] || die "Falta el archivo .env de la VPS. No copie las credenciales de desarrollo."
  if git ls-files --error-unmatch .env >/dev/null 2>&1; then
    die ".env está registrado en Git. Sáquelo del repositorio antes de actualizar."
  fi
  [[ "$(git branch --show-current)" == "$branch" ]] || die "La carpeta debe estar en la rama $branch."
  git diff --quiet && git diff --cached --quiet || die "Hay cambios locales en archivos registrados. Revise git status; no se borrarán."

  mkdir -p -- "$backup_root"
  backup_root="$(cd -- "$backup_root" && pwd -P)"
  [[ "$backup_root" != "$root" && "$backup_root" != "$root/"* ]] || die "Los respaldos deben quedar fuera de la carpeta del proyecto."
  [[ "$(stat -c %d "$root")" == "$(stat -c %d "$backup_root")" ]] || die "La carpeta de respaldos debe estar en el mismo sistema de archivos que GELAG para reemplazar archivos con seguridad."
  chmod 700 -- "$backup_root"
  exec 9>"$backup_root/update.lock"
  flock -n 9 || die "Ya hay otra actualización en curso."
  trap cleanup EXIT
  trap recover ERR
  trap 'recover 130' INT
  trap 'recover 143' TERM

  local previous_commit
  previous_commit="$(git rev-parse HEAD)"
  log "Descargando cambios de $remote/$branch..."
  git pull --ff-only "$remote" "$branch"
  if git ls-files --error-unmatch .env >/dev/null 2>&1; then
    die "La actualización incluye un .env registrado. No se continuará."
  fi

  stage="$(mktemp -d "$backup_root/.build-XXXXXXXX")"
  git archive HEAD | tar -x -C "$stage"
  [[ -f "$stage/package-lock.json" ]] || die "Falta package-lock.json; no se instalarán versiones sin fijar."
  [[ -f "$stage/scripts/vps-migrate.mjs" ]] || die "La versión descargada no contiene el ejecutor de migraciones."
  log "Instalando dependencias y compilando en una carpeta temporal..."
  (
    cd -- "$stage"
    npm ci --include=dev
    npm run build
    [[ -f dist/index.js ]]
  )

  if pm2 describe "$app" >/dev/null 2>&1; then
    registered=yes
  else
    [[ -f "$config" ]] || die "PM2 no tiene $app y falta $config."
  fi
  backup="$(mktemp -d "$backup_root/release-$(date +%Y%m%d-%H%M%S)-XXXXXXXX")"
  printf '%s\n' "$previous_commit" >"$backup/previous-commit.txt"
  git rev-parse HEAD >"$backup/new-commit.txt"

  log "Revisando migraciones pendientes; si hay alguna, se respaldará la base antes de aplicarla..."
  local migration_args=(--apply --env-file "$root/.env" --backup-dir "$backup/database")
  if [[ "$yes_migrations" == yes ]]; then migration_args+=(--yes); fi
  node "$stage/scripts/vps-migrate.mjs" "${migration_args[@]}"

  log "Instalando la versión compilada..."
  # A partir de aquí la recuperación restaura los artefactos anteriores si falla el reinicio.
  swap_started=yes
  if [[ "$registered" == yes ]]; then pm2 stop "$app"; fi
  if [[ -d "$root/dist" ]]; then
    mv -T -- "$root/dist" "$backup/dist"
    saved_dist=yes
  fi
  if [[ -d "$root/node_modules" ]]; then
    mv -T -- "$root/node_modules" "$backup/node_modules"
    saved_modules=yes
  fi
  mv -T -- "$stage/dist" "$root/dist"
  installed_dist=yes
  mv -T -- "$stage/node_modules" "$root/node_modules"
  installed_modules=yes
  if [[ "$registered" == yes ]]; then
    pm2 restart "$app"
  else
    pm2 start "$config" --only "$app"
    pm2 describe "$app" >/dev/null
  fi

  log "Comprobando que la página responde..."
  local healthy=no
  for attempt in {1..20}; do
    if curl --fail --silent --output /dev/null --max-time 3 "$health_url"; then
      healthy=yes
      break
    fi
    sleep 1
  done
  [[ "$healthy" == yes ]]
  pm2 save
  pm2 status
  swap_started=no
  log "Actualización completada. Respaldo de la versión anterior: $backup"
  log "Conserve los respaldos y revise periódicamente el espacio disponible."
}

# main se carga antes de git pull, para que actualizar este mismo archivo no altere la ejecución.
main "$@"