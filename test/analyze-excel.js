import XLSX from 'xlsx';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get the current file path and directory for ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the Excel file
const excelPath = path.join(__dirname, '../attached_assets/CA-RE-01-01 Buenas Practicas de Manufactura.xlsx');

try {
  console.log('Analizando archivo Excel:', excelPath);
  
  // Read the Excel file
  const workbook = XLSX.readFile(excelPath);
  
  // Get sheet names
  const sheetNames = workbook.SheetNames;
  console.log('\nHojas en el archivo:', sheetNames);
  
  // Analyze each sheet
  sheetNames.forEach(sheetName => {
    console.log(`\n\n--- Hoja: ${sheetName} ---`);
    
    const worksheet = workbook.Sheets[sheetName];
    
    // Get the range
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    console.log('Rango:', worksheet['!ref']);
    console.log(`Filas: ${range.e.r - range.s.r + 1}, Columnas: ${range.e.c - range.s.c + 1}`);
    
    // Convert to JSON with headers to see the data structure
    const dataWithHeaders = XLSX.utils.sheet_to_json(worksheet);
    const dataAsArray = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Print some sample rows from the array format
    console.log('\nMuestra de datos (formato Array):');
    // Show rows 6 to 15 to see the form structure
    console.log('\n--- Filas 6-15 (Encabezados y primeras filas de datos) ---');
    dataAsArray.slice(6, 16).forEach((row, index) => {
      console.log(`Fila ${index + 6}:`, JSON.stringify(row));
    });
    
    // Show some rows from the middle to see data structure
    console.log('\n--- Filas del medio del formulario (25-30) ---');
    dataAsArray.slice(25, 31).forEach((row, index) => {
      console.log(`Fila ${index + 25}:`, JSON.stringify(row));
    });
    
    // Show bottom part of the form
    console.log('\n--- Últimas filas del formulario (55-62) ---');
    dataAsArray.slice(55).forEach((row, index) => {
      console.log(`Fila ${index + 55}:`, JSON.stringify(row));
    });
    
    // Print some samples from the object format (with headers)
    console.log('\nMuestra de datos (formato Objeto):');
    if (dataWithHeaders.length > 0) {
      console.log('Ejemplo de campos disponibles:', Object.keys(dataWithHeaders[0]).join(', '));
      console.log('Primeros 3 registros:');
      dataWithHeaders.slice(0, 3).forEach((record, index) => {
        console.log(`Registro ${index}:`, JSON.stringify(record));
      });
    } else {
      console.log('No se encontraron datos en formato objeto');
    }
    
    // Check for merged cells
    if (worksheet['!merges']) {
      console.log('\nCeldas combinadas:', worksheet['!merges'].length);
    }
  });
  
} catch (error) {
  console.error('Error al analizar el archivo Excel:', error);
}