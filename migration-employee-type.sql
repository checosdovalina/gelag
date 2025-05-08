-- Agregar columna employee_type a la tabla de empleados
ALTER TABLE employees ADD COLUMN employee_type text DEFAULT 'operativo' NOT NULL;

-- Actualizar los empleados existentes con valores predeterminados según el caso
UPDATE employees SET employee_type = 'calidad' WHERE position ILIKE '%calidad%';
UPDATE employees SET employee_type = 'produccion' WHERE position ILIKE '%produccion%';
UPDATE employees SET employee_type = 'administrativo' WHERE position ILIKE '%administrativo%';