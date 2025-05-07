#!/bin/bash
# Script para migrar el esquema de base de datos con Drizzle

echo "Iniciando migración de base de datos..."
yes "Yes, truncate the table" | npm run db:push