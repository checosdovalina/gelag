/**
 * Define mapeos específicos para los encabezados de tablas de microbiología
 * Basados en los IDs exactos que aparecen en el reporte
 */
export const microbiologyHeaders: Record<string, string> = {
  "28e24f6f": "Mesófilo",
  "3084603": "Coliformes", 
  "39c28f8": "E. Coli",
  "a2a4db54": "Producto",
  "a3e4f9fa": "Fecha",
  "a4ca5ad": "Salmonella",
  "a835a31b": "Listeria", 
  "c0a838ef": "Lote",
  "ff43d9d4": "Resultado"
};

/**
 * Función de ayuda para obtener un nombre legible para un ID de columna
 * @param columnId ID de columna que puede ser un UUID completo o parcial
 * @returns Nombre legible o el ID original si no hay mapeo
 */
export function getMicrobiologyHeaderName(columnId: string): string {
  // 1. Verificar coincidencia exacta
  if (microbiologyHeaders[columnId]) {
    return microbiologyHeaders[columnId];
  }
  
  // 2. Buscar por la primera parte del ID (antes del guión)
  const shortId = columnId.split('-')[0];
  if (microbiologyHeaders[shortId]) {
    return microbiologyHeaders[shortId];
  }
  
  // 3. Buscar coincidencias parciales
  for (const [id, name] of Object.entries(microbiologyHeaders)) {
    if (columnId.includes(id)) {
      return name;
    }
  }
  
  // Si no hay coincidencia, devolver el ID original
  return columnId;
}