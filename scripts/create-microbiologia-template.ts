import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Script para crear una plantilla JSON de tabla avanzada para microbiología
 * Esta plantilla se puede importar en el sistema para usarla en el constructor de formularios
 */
async function createMicrobiologiaTemplate() {
  console.log('Creando plantilla de tabla microbiológica horizontal...');

  // Estructura de la plantilla de tabla avanzada con formato horizontal
  const template = {
    name: 'Análisis Microbiológico Horizontal',
    description: 'Tabla con parámetros microbiológicos en formato horizontal',
    advancedTableConfig: {
      rows: 3,
      dynamicRows: true,
      sections: [
        {
          title: 'Análisis Microbiológico',
          columns: [
            {
              id: uuidv4(),
              header: 'Fecha',
              type: 'date',
              width: '120px'
            },
            {
              id: uuidv4(),
              header: 'Producto',
              type: 'product',
              width: '150px'
            },
            {
              id: uuidv4(),
              header: 'Lote',
              type: 'text',
              width: '100px'
            },
            {
              id: uuidv4(),
              header: 'Fecha de caducidad',
              type: 'date',
              width: '150px'
            },
            {
              id: uuidv4(),
              header: 'Hongos y Levaduras',
              type: 'select',
              width: '120px',
              options: [
                { label: 'Si', value: 'Si' },
                { label: 'No', value: 'No' },
                { label: 'NA', value: 'NA' }
              ]
            },
            {
              id: uuidv4(),
              header: 'Coliformes',
              type: 'select',
              width: '120px',
              options: [
                { label: 'Si', value: 'Si' },
                { label: 'No', value: 'No' },
                { label: 'NA', value: 'NA' }
              ]
            },
            {
              id: uuidv4(),
              header: 'Staphylococos',
              type: 'select',
              width: '120px',
              options: [
                { label: 'Si', value: 'Si' },
                { label: 'No', value: 'No' },
                { label: 'NA', value: 'NA' }
              ]
            },
            {
              id: uuidv4(),
              header: 'Mesofilicos',
              type: 'select',
              width: '120px',
              options: [
                { label: 'Si', value: 'Si' },
                { label: 'No', value: 'No' },
                { label: 'NA', value: 'NA' }
              ]
            },
            {
              id: uuidv4(),
              header: 'Salmonella',
              type: 'select',
              width: '120px',
              options: [
                { label: 'Si', value: 'Si' },
                { label: 'No', value: 'No' },
                { label: 'NA', value: 'NA' }
              ]
            }
          ]
        }
      ]
    }
  };

  // Guardar la plantilla en un archivo JSON
  const filePath = path.join(process.cwd(), 'microbiologia_template.json');
  fs.writeFileSync(filePath, JSON.stringify(template, null, 2));

  console.log(`Plantilla creada exitosamente en: ${filePath}`);
  console.log('Puedes importar esta plantilla en el constructor de formularios como una tabla avanzada');
}

// Ejecutar la función
createMicrobiologiaTemplate().catch(console.error);