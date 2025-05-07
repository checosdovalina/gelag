-- Script para crear las tablas de la base de datos GELAG

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS "users" (
  "id" SERIAL PRIMARY KEY,
  "username" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'viewer',
  "department" TEXT,
  "created_at" TIMESTAMP DEFAULT NOW()
);

-- Tabla de plantillas de formularios
CREATE TABLE IF NOT EXISTS "form_templates" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "department" TEXT,
  "structure" JSONB NOT NULL,
  "created_by" INTEGER NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW(),
  "is_active" BOOLEAN DEFAULT TRUE
);

-- Tabla de reportes guardados
CREATE TABLE IF NOT EXISTS "saved_reports" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "configuration" JSONB NOT NULL,
  "created_by" INTEGER NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW(),
  "is_public" BOOLEAN DEFAULT FALSE
);

-- Tabla de entradas de formularios
CREATE TABLE IF NOT EXISTS "form_entries" (
  "id" SERIAL PRIMARY KEY,
  "form_template_id" INTEGER NOT NULL,
  "data" JSONB NOT NULL,
  "created_by" INTEGER NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW(),
  "department" TEXT,
  "status" TEXT DEFAULT 'draft',
  "signature" TEXT,
  "signed_by" INTEGER,
  "signed_at" TIMESTAMP,
  "approved_by" INTEGER,
  "approved_at" TIMESTAMP,
  "folio_number" INTEGER
);

-- Tabla de contadores de folios
CREATE TABLE IF NOT EXISTS "folio_counters" (
  "id" SERIAL PRIMARY KEY,
  "form_template_id" INTEGER NOT NULL UNIQUE,
  "last_folio_number" INTEGER NOT NULL DEFAULT 0,
  "prefix" TEXT,
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Tabla de registros de actividad
CREATE TABLE IF NOT EXISTS "activity_logs" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "action" TEXT NOT NULL,
  "resource_type" TEXT NOT NULL,
  "resource_id" INTEGER NOT NULL,
  "details" JSONB,
  "timestamp" TIMESTAMP DEFAULT NOW()
);

-- Tabla para sesiones
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);

-- Crear un primer usuario SuperAdmin para poder ingresar al sistema
INSERT INTO "users" ("username", "password", "name", "email", "role")
VALUES ('superadmin', '$2b$10$Uc7Lx5ZSfgINZNnx90CzwOxcDr1pYM5F8v9Pj.bXxNdPz1EBDc77W', 'Super Admin', 'admin@gelag.com', 'superadmin')
ON CONFLICT (username) DO NOTHING;