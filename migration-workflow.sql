-- Agregar columnas para el flujo de trabajo secuencial
ALTER TABLE form_entries ADD COLUMN IF NOT EXISTS workflow_status TEXT DEFAULT 'initiated';
ALTER TABLE form_entries ADD COLUMN IF NOT EXISTS last_updated_by INTEGER;
ALTER TABLE form_entries ADD COLUMN IF NOT EXISTS lot_number TEXT;
ALTER TABLE form_entries ADD COLUMN IF NOT EXISTS role_specific_data JSONB;