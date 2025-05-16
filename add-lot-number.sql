-- Añadir columna lot_number a la tabla production_forms si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'production_forms' AND column_name = 'lot_number'
    ) THEN
        ALTER TABLE production_forms ADD COLUMN lot_number TEXT;
    END IF;
END $$;