-- Script para corregir la tabla production_forms en producción
-- Verifica y crea la tabla si no existe, o la actualiza si es necesario

-- Primero, eliminar la tabla si existe para recrearla completamente
DROP TABLE IF EXISTS production_forms CASCADE;

-- Crear la tabla production_forms con la estructura completa
CREATE TABLE production_forms (
  id SERIAL PRIMARY KEY,
  product_id TEXT NOT NULL,
  liters INTEGER NOT NULL,
  date TEXT NOT NULL,
  responsible TEXT NOT NULL,
  folio TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft',
  lot_number TEXT,
  ingredients JSON,
  ingredient_times JSON,
  
  -- Sección de seguimiento de proceso
  start_time TEXT,
  end_time TEXT,
  temperature JSON,
  pressure JSON,
  hour_tracking JSON,
  
  -- Sección de verificación de calidad
  quality_times JSON,
  brix JSON,
  quality_temp JSON,
  texture JSON,
  color JSON,
  viscosity JSON,
  smell JSON,
  taste JSON,
  foreign_material JSON,
  status_check JSON,
  
  -- Sección de destino de producto
  destination_type JSON,
  destination_kilos JSON,
  destination_product JSON,
  destination_estimation JSON,
  total_kilos TEXT,
  
  -- Sección de datos de liberación
  liberation_folio TEXT,
  c_p TEXT,
  cm_consistometer TEXT,
  final_brix TEXT,
  yield TEXT,
  start_state TEXT,
  end_state TEXT,
  signature_url TEXT,
  
  -- Campos de control
  created_by INTEGER NOT NULL,
  updated_by INTEGER,
  last_updated_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX idx_production_forms_product_id ON production_forms(product_id);
CREATE INDEX idx_production_forms_date ON production_forms(date);
CREATE INDEX idx_production_forms_status ON production_forms(status);
CREATE INDEX idx_production_forms_created_by ON production_forms(created_by);
CREATE INDEX idx_production_forms_folio ON production_forms(folio);

-- Verificar que la tabla se creó correctamente
SELECT 'Tabla production_forms creada exitosamente' as resultado;