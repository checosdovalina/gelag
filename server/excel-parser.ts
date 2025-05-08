import { FormStructure, FormField, FieldType } from "@shared/schema";

// Tipos de formularios que podemos identificar automáticamente
export enum FormTemplateType {
  BUENAS_PRACTICAS = "buenas_practicas",
  GENERIC = "generic"
}

// Interfaz para los datos extraídos del Excel
export interface ExcelFormData {
  title: string;
  company?: string;
  address?: string;
  date?: string;
  department?: string;
  documentType?: string;
  version?: string;
  code?: string;
  employeeNames?: string[];
  formFields: {
    [key: string]: any;
  }[];
  formType: FormTemplateType;
  rawData: any;
}

/**
 * Detecta el tipo de formulario basado en patrones del contenido
 */
export function detectFormType(data: any[]): FormTemplateType {
  // Buscar patrones específicos en los datos
  const titleRow = Array.isArray(data[0]) ? data[0] : [];
  const companyRow = Array.isArray(data[1]) ? data[1] : [];
  
  // En caso de que los datos procesados por XLSX vengan en formato de objetos
  if (!Array.isArray(titleRow) && typeof titleRow === 'object') {
    // Asumimos genérico para datos en formato de objeto
    console.log("Formato objeto detectado:", titleRow);
    return FormTemplateType.GENERIC;
  }
  
  // Si el primer elemento es un objeto con propiedades y no un array
  if (data.length > 0 && !Array.isArray(data[0]) && typeof data[0] === 'object') {
    // Convertir claves del objeto a un arreglo de strings para buscar
    const keys = Object.keys(data[0]);
    const values = Object.values(data[0]).map(v => String(v));
    
    // Buscar patrones específicos en las claves y valores
    const hasBuenasPracticasKey = keys.some(key => key.includes('BUENAS PRACTICAS') || key.includes('CARE-01-01'));
    const hasBuenasPracticasValue = values.some(val => val.includes('BUENAS PRACTICAS') || val.includes('CARE-01-01'));
    
    if (hasBuenasPracticasKey || hasBuenasPracticasValue) {
      return FormTemplateType.BUENAS_PRACTICAS;
    }
    
    // Si no se reconoce un tipo específico, asume genérico
    return FormTemplateType.GENERIC;
  }
  
  // Si es un array, continúa con la lógica original
  try {
    // Revisa si es un formulario de Buenas Prácticas de Manufactura
    const isBuenasPracticas = 
      Array.isArray(titleRow) && 
      (titleRow.some((cell: any) => typeof cell === 'string' && cell.includes('BUENAS PRACTICAS DE PERSONAL')) ||
       titleRow.some((cell: any) => typeof cell === 'string' && cell.includes('CARE-01-01')));
    
    if (isBuenasPracticas) {
      return FormTemplateType.BUENAS_PRACTICAS;
    }
  } catch (error) {
    console.error("Error al detectar tipo de formulario:", error);
  }
  
  // Si no se reconoce un tipo específico, asume genérico
  return FormTemplateType.GENERIC;
}

/**
 * Extrae metadatos del formulario (título, empresa, etc.)
 */
export function extractFormMetadata(data: any[]): Partial<ExcelFormData> {
  const metadata: Partial<ExcelFormData> = {
    title: "",
    company: "",
    address: "",
    date: "",
    department: "",
    documentType: "",
    version: "",
    code: "",
  };

  // Extraer título
  if (data[0] && data[0][1]) {
    metadata.title = data[0][1];
  }
  
  // Buscar código del documento
  if (data[0] && data[0][30]) {
    metadata.code = data[0][30];
  }

  // Extraer nombre de la empresa
  if (data[1] && data[1][1]) {
    metadata.company = data[1][1];
  }
  
  // Extraer versión
  if (data[1] && data[1][30]) {
    metadata.version = data[1][30];
  }

  // Extraer dirección
  if (data[2] && data[2][1]) {
    metadata.address = data[2][1];
  }

  // Extraer fecha
  if (data[3] && data[3][1]) {
    metadata.date = data[3][1];
  }

  // Extraer departamento emisor
  if (data[4] && data[4][1]) {
    metadata.department = data[4][1];
  }
  
  // Extraer tipo de documento
  if (data[4] && data[4][19]) {
    metadata.documentType = data[4][19];
  }

  return metadata;
}

/**
 * Extrae los nombres de los empleados del formulario de buenas prácticas
 * Mantiene la estructura exacta como en el Excel original
 */
export function extractEmployeeNames(data: any[]): string[] {
  const employeeNames: string[] = [];
  
  // Buscar fila que contiene "NOMBRE DE PERSONAL:"
  const nameHeaderRowIndex = data.findIndex(row => 
    row && row[0] && row[0] === "NOMBRE DE PERSONAL:");
  
  if (nameHeaderRowIndex === -1) return employeeNames;
  
  // Extraer nombres de empleados (las filas después del encabezado)
  let currentRow = nameHeaderRowIndex + 1;
  while (currentRow < data.length && data[currentRow] && data[currentRow][0]) {
    // Solo agregamos el nombre si no está vacío
    if (data[currentRow][0] && typeof data[currentRow][0] === 'string' && data[currentRow][0].trim() !== '') {
      employeeNames.push(data[currentRow][0]);
    }
    currentRow++;
    
    // Si encontramos un nuevo encabezado, detenemos la extracción
    if (!data[currentRow] || !data[currentRow][0] || 
        (typeof data[currentRow][0] === 'string' && (
          data[currentRow][0].includes("ASPECTOS DE INSPECCIÓN") || 
          data[currentRow][0].includes("1.") || 
          data[currentRow][0].includes("APROBADO")
        ))) {
      break;
    }
  }
  
  return employeeNames;
}

/**
 * Extrae los criterios de evaluación del formulario de buenas prácticas
 * Y preserva la estructura exacta como en el Excel original
 */
export function extractEvaluationCriteria(data: any[]): string[] {
  const criteria: string[] = [];
  
  // Buscar sección que contiene "ASPECTOS DE INSPECCIÓN"
  const aspectosIndex = data.findIndex(row => 
    row && row[0] && typeof row[0] === 'string' && 
    row[0].includes("ASPECTOS DE INSPECCIÓN"));

  if (aspectosIndex === -1) {
    // Si no encontramos la sección específica, usamos el método anterior
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (row && row[0] && typeof row[0] === 'string') {
        if (row[0].match(/^\d+\.\s/) || row[0].includes("zapatos")) {
          criteria.push(row[0]);
          
          // Si el criterio continúa en la siguiente fila (sin número)
          if (data[i+1] && data[i+1][0] && !data[i+1][0].match(/^\d+\.\s/) && 
              !data[i+1][0].includes("APROBADO")) {
            criteria[criteria.length - 1] += " " + data[i+1][0];
          }
        }
      }
    }
    return criteria;
  }

  // Extraer criterios a partir de la sección encontrada
  let currentRow = aspectosIndex + 1;
  while (currentRow < data.length) {
    const row = data[currentRow];
    if (row && row[0] && typeof row[0] === 'string') {
      // Si encontramos "APROBADO", hemos llegado al final de los criterios
      if (row[0].includes("APROBADO")) {
        break;
      }
      
      // Si es un punto numerado (1., 2., etc.) o contiene palabras clave de criterios
      if (row[0].match(/^\d+\.\s/) || 
          row[0].includes("Uniforme") || 
          row[0].includes("joyería") || 
          row[0].includes("Barba") || 
          row[0].includes("Uñas") || 
          row[0].includes("maquillaje") || 
          row[0].includes("equipo de protección")) {
        
        let criterio = row[0];
        currentRow++;
        
        // Verificar si el criterio continúa en la siguiente línea
        while (currentRow < data.length && 
               data[currentRow] && 
               data[currentRow][0] && 
               typeof data[currentRow][0] === 'string' && 
               !data[currentRow][0].match(/^\d+\.\s/) && 
               !data[currentRow][0].includes("APROBADO")) {
          criterio += " " + data[currentRow][0];
          currentRow++;
        }
        
        criteria.push(criterio);
        continue; // Continuamos desde el nuevo currentRow
      }
    }
    currentRow++;
  }
  
  return criteria;
}

/**
 * Convierte datos de Excel en una estructura de formulario para la aplicación
 */
export function convertExcelToFormStructure(sheetData: any[]): FormStructure {
  // Detectar el tipo de formulario
  const formType = detectFormType(sheetData);
  
  // Extraer metadatos
  const metadata = extractFormMetadata(sheetData);
  
  // Crear estructura base del formulario
  const formStructure: FormStructure = {
    title: metadata.title || "Formulario Importado",
    fields: []
  };
  
  if (formType === FormTemplateType.BUENAS_PRACTICAS) {
    // Extraer nombres de empleados
    const employeeNames = extractEmployeeNames(sheetData);
    
    // Extraer criterios de evaluación
    const criteria = extractEvaluationCriteria(sheetData);
    
    // Metadatos del formulario
    formStructure.fields.push({
      id: "codigo",
      type: "text" as FieldType,
      label: "Código",
      required: true,
      defaultValue: metadata.code || "CARE-01-01"
    });
    
    formStructure.fields.push({
      id: "version",
      type: "text" as FieldType,
      label: "Versión",
      required: true,
      defaultValue: metadata.version || "1"
    });
    
    // Campo para seleccionar semana
    formStructure.fields.push({
      id: "semana",
      type: "text" as FieldType,
      label: "Semana",
      required: true,
      placeholder: "Ej: 1-7 Enero 2023"
    });
    
    // Campo para seleccionar departamento
    formStructure.fields.push({
      id: "departamento",
      type: "select" as FieldType,
      label: "Departamento",
      required: true,
      options: [
        { value: "Producción", label: "Producción" },
        { value: "Calidad", label: "Calidad" },
        { value: "Almacén", label: "Almacén" },
        { value: "Mantenimiento", label: "Mantenimiento" },
        { value: "Administración", label: "Administración" }
      ]
    });
    
    // Matriz de evaluación (esta será la parte principal del formulario)
    if (employeeNames.length > 0 && criteria.length > 0) {
      formStructure.fields.push({
        id: "evaluationMatrix",
        type: "evaluationMatrix" as FieldType,
        label: "Matriz de Evaluación de Buenas Prácticas",
        required: true,
        // Datos específicos para la matriz de evaluación
        employeeNames: employeeNames,
        criteria: criteria,
        // Las opciones por defecto para cada celda de la matriz
        options: [
          { value: "C", label: "Cumple" },
          { value: "NC", label: "No Cumple" },
          { value: "NA", label: "No Aplica" }
        ]
      });
    }
    
    // Campo para comentarios adicionales
    formStructure.fields.push({
      id: "comentarios",
      type: "textarea" as FieldType,
      label: "Comentarios Adicionales",
      required: false,
      placeholder: "Ingrese cualquier observación o comentario relevante"
    });
    
    // Campo para firma del supervisor
    formStructure.fields.push({
      id: "supervisor",
      type: "text" as FieldType,
      label: "Supervisor que realiza la evaluación",
      required: true,
      placeholder: "Nombre completo"
    });
  } else {
    // Para formularios genéricos, crear campos básicos
    // En este caso, simplemente creamos algunos campos de texto genéricos
    formStructure.fields.push({
      id: "campo1",
      type: "text" as FieldType,
      label: "Campo 1",
      required: true
    });
    
    formStructure.fields.push({
      id: "campo2",
      type: "text" as FieldType,
      label: "Campo 2",
      required: false
    });
    
    formStructure.fields.push({
      id: "campo3",
      type: "textarea" as FieldType,
      label: "Comentarios",
      required: false
    });
  }
  
  return formStructure;
}

/**
 * Procesa los datos Excel y devuelve una estructura completa con datos y metadatos
 */
export function processExcelData(sheetsData: any[]): ExcelFormData {
  if (!sheetsData || !Array.isArray(sheetsData) || sheetsData.length === 0) {
    console.error("Datos Excel inválidos:", sheetsData);
    return {
      title: "Error al procesar formulario",
      formFields: [],
      formType: FormTemplateType.GENERIC,
      rawData: []
    };
  }
  
  // Procesar la primera hoja
  // La estructura puede venir en diferentes formatos según la biblioteca XLSX
  let sheetData: any[] = [];
  let rawData: any[] = [];
  
  try {
    // Nuevo formato mejorado con múltiples representaciones
    if (sheetsData[0] && typeof sheetsData[0] === 'object') {
      // Si tiene propiedad data y raw (nuevo formato)
      if (sheetsData[0].data && sheetsData[0].raw) {
        sheetData = sheetsData[0].data;  // Datos como objetos
        rawData = sheetsData[0].raw;     // Datos como arrays
        console.log(`Procesando hoja '${sheetsData[0].sheetName}' con formato mejorado`);
      }
      // Si solo tiene data (formato anterior)
      else if (sheetsData[0].data) {
        sheetData = sheetsData[0].data;
        // Intenta convertir data a formato de array si es posible
        rawData = Array.isArray(sheetData) ? sheetData.map(row => {
          return typeof row === 'object' ? Object.values(row) : [row];
        }) : [];
        console.log("Usando formato anterior: sheetsData[0].data");
      }
      // Si es directamente un array de arrays (filas)
      else if (Array.isArray(sheetsData[0])) {
        rawData = sheetsData;
        
        // Convertir a formato de objetos si la primera fila puede ser encabezado
        if (sheetsData[0].length > 0) {
          const headers = sheetsData[0];
          sheetData = sheetsData.slice(1).map(row => {
            const obj: {[key: string]: any} = {};
            headers.forEach((header: string, index: number) => {
              if (header) obj[header] = row[index] || "";
            });
            return obj;
          });
        } else {
          sheetData = []; // No hay datos que procesar
        }
        console.log("Usando formato: arrays de arrays");
      }
    }
  } catch (error) {
    console.error("Error al procesar formato de datos Excel:", error);
    // Fallback: intentar extraer algún dato útil
    if (Array.isArray(sheetsData[0])) {
      sheetData = sheetsData[0];
    } else if (sheetsData[0] && sheetsData[0].data) {
      sheetData = sheetsData[0].data;
    }
  }
  
  // Si no pudimos obtener datos, devolver una estructura vacía
  if ((!sheetData || !Array.isArray(sheetData) || sheetData.length === 0) &&
      (!rawData || !Array.isArray(rawData) || rawData.length === 0)) {
    console.error("No se pudieron extraer datos de la hoja:", sheetsData);
    return {
      title: "Error al procesar formulario",
      formFields: [],
      formType: FormTemplateType.GENERIC,
      rawData: []
    };
  }
  
  // Si rawData tiene contenido pero sheetData está vacío, usamos rawData
  if ((!sheetData || sheetData.length === 0) && rawData && rawData.length > 0) {
    // Intenta extraer algo útil si hay al menos 2 filas (encabezado + datos)
    if (rawData.length >= 2) {
      const headers = rawData[0];
      sheetData = rawData.slice(1).map(row => {
        const obj: {[key: string]: any} = {};
        headers.forEach((header: string, index: number) => {
          if (header) obj[header] = row[index] || "";
        });
        return obj;
      });
    } else {
      // Si solo hay una fila, usarla como un objeto simple
      sheetData = [{ row0: rawData[0] }];
    }
  }
  
  try {
    // Detectar el tipo de formulario
    const formType = detectFormType(sheetData);
    
    // Extraer metadatos
    const metadata = extractFormMetadata(sheetData);
    
    // Extraer nombres de empleados para formularios de buenas prácticas
    const employeeNames = formType === FormTemplateType.BUENAS_PRACTICAS 
      ? extractEmployeeNames(sheetData) 
      : [];
    
    // Devolver estructura con datos procesados
    return {
      title: metadata.title || "Formulario sin título",
      company: metadata.company,
      address: metadata.address,
      date: metadata.date,
      department: metadata.department,
      documentType: metadata.documentType,
      version: metadata.version,
      code: metadata.code,
      employeeNames,
      formFields: [], // Aquí podríamos extraer datos específicos si fuera necesario
      formType,
      rawData: sheetData
    };
  } catch (error) {
    console.error("Error al procesar datos Excel:", error);
    return {
      title: "Error al procesar formulario",
      formFields: [],
      formType: FormTemplateType.GENERIC,
      rawData: sheetData || []
    };
  }
}

/**
 * Intenta detectar y extraer una estructura de formulario a partir de los datos de Excel
 * examinando patrones en las filas y columnas
 */
function detectFormStructure(sheetData: any[], rawData?: any[]): FormStructure | null {
  // Si no hay datos, no podemos detectar nada
  if (!sheetData || !Array.isArray(sheetData) || sheetData.length === 0) {
    return null;
  }
  
  // Estructura base del formulario
  const formStructure: FormStructure = {
    title: "Formulario Detectado",
    fields: []
  };
  
  try {
    // Si tenemos datos como array de objetos (columnas como claves)
    if (typeof sheetData[0] === 'object' && !Array.isArray(sheetData[0])) {
      // Obtener todas las claves en los objetos
      const allKeys = new Set<string>();
      sheetData.forEach(row => {
        Object.keys(row).forEach(key => allKeys.add(key));
      });
      
      // Para cada clave en los datos, crear un campo en el formulario
      Array.from(allKeys).forEach((key, index) => {
        if (key && key !== '__EMPTY' && !key.startsWith('__EMPTY')) {
          let fieldType: FieldType = 'text';
          const keyLower = key.toLowerCase().trim();
          
          // Intentar determinar el tipo basado en el nombre de la clave
          if (keyLower.includes('fecha') || 
              keyLower.includes('date') || 
              keyLower.includes('vencimiento') || 
              keyLower.includes('caducidad')) {
            fieldType = 'date';
          }
          else if (keyLower.includes('cantidad') || 
                  keyLower.includes('monto') || 
                  keyLower.includes('peso') || 
                  keyLower.includes('litros') || 
                  keyLower.includes('kilos') || 
                  keyLower.includes('total') || 
                  keyLower.includes('valor') || 
                  keyLower.includes('number')) {
            fieldType = 'number';
          }
          else if (keyLower.includes('empleado') || 
                  keyLower.includes('employee') || 
                  keyLower.includes('personal') || 
                  keyLower.includes('responsable') ||
                  keyLower.includes('trabajador')) {
            fieldType = 'employee';
          }
          else if (keyLower.includes('producto') || 
                  keyLower.includes('product') || 
                  keyLower.includes('material') || 
                  keyLower.includes('materia prima') ||
                  keyLower.includes('insumo')) {
            fieldType = 'product';
          }
          else if (keyLower.includes('comentario') || 
                  keyLower.includes('comment') || 
                  keyLower.includes('observación') || 
                  keyLower.includes('descripción') ||
                  keyLower.includes('notes') ||
                  keyLower.includes('notas')) {
            fieldType = 'textarea';
          }
          else if (keyLower.includes('si/no') || 
                  keyLower.includes('yes/no') || 
                  keyLower.includes('acepta') || 
                  keyLower.includes('aprobado') ||
                  keyLower.includes('conforme') ||
                  keyLower.includes('check')) {
            fieldType = 'checkbox';
          }
          
          // Determinar el tipo de campo analizando los valores si no lo hemos determinado por nombre
          const values = sheetData.map(row => row[key]).filter(Boolean);
          
          // Si hay valores y aún no hemos determinado un tipo especial, intentar determinar el tipo
          if (values.length > 0 && fieldType === 'text') {
            // Si todos los valores son numéricos
            if (values.every(v => typeof v === 'number' || (!isNaN(Number(v)) && v !== ''))) {
              fieldType = 'number';
            }
            // Si hay pocos valores únicos (posible select)
            else if (new Set(values).size <= Math.min(5, values.length / 2) && new Set(values).size > 1) {
              fieldType = 'select';
            }
            // Si hay valores que parecen fechas
            else if (values.some(v => 
              typeof v === 'string' && 
              (v.match(/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/) || 
               v.match(/^\d{4}[\/\-]\d{2}[\/\-]\d{2}$/) ||
               /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(v))
            )) {
              fieldType = 'date';
            }
          }
          
          // Crear el campo
          const field: FormField = {
            id: `campo_${index}`,
            type: fieldType,
            label: key,
            required: index < 3, // Los primeros campos son requeridos por defecto
          };
          
          // Si es un campo select, añadir opciones
          if (fieldType === 'select') {
            const uniqueValues = Array.from(new Set(values));
            field.options = uniqueValues.map(val => ({
              value: String(val),
              label: String(val)
            }));
          }
          
          formStructure.fields.push(field);
        }
      });
    }
    // Si tenemos datos como array de arrays (rawData)
    else if (rawData && Array.isArray(rawData) && rawData.length > 1) {
      // Asumimos que la primera fila son los encabezados
      const headers = rawData[0];
      
      // Para cada columna, crear un campo en el formulario
      headers.forEach((header: any, colIndex: number) => {
        if (header && String(header).trim() !== '') {
          // Extraer todos los valores de esta columna
          const values = rawData.slice(1).map(row => row[colIndex]).filter(Boolean);
          
          let fieldType: FieldType = 'text';
          const headerText = String(header).toLowerCase().trim();
          
          // Primero intentar determinar el tipo basado en el encabezado
          if (headerText.includes('fecha') || 
              headerText.includes('date') || 
              headerText.includes('vencimiento') || 
              headerText.includes('caducidad')) {
            fieldType = 'date';
          }
          else if (headerText.includes('cantidad') || 
                  headerText.includes('monto') || 
                  headerText.includes('peso') || 
                  headerText.includes('litros') || 
                  headerText.includes('kilos') || 
                  headerText.includes('total') || 
                  headerText.includes('valor') || 
                  headerText.includes('number')) {
            fieldType = 'number';
          }
          else if (headerText.includes('empleado') || 
                  headerText.includes('employee') || 
                  headerText.includes('personal') || 
                  headerText.includes('responsable') ||
                  headerText.includes('trabajador')) {
            fieldType = 'employee';
          }
          else if (headerText.includes('producto') || 
                  headerText.includes('product') || 
                  headerText.includes('material') || 
                  headerText.includes('materia prima') ||
                  headerText.includes('insumo')) {
            fieldType = 'product';
          }
          else if (headerText.includes('comentario') || 
                  headerText.includes('comment') || 
                  headerText.includes('observación') || 
                  headerText.includes('descripción') ||
                  headerText.includes('notes') ||
                  headerText.includes('notas')) {
            fieldType = 'textarea';
          }
          else if (headerText.includes('si/no') || 
                  headerText.includes('yes/no') || 
                  headerText.includes('acepta') || 
                  headerText.includes('aprobado') ||
                  headerText.includes('conforme') ||
                  headerText.includes('check')) {
            fieldType = 'checkbox';
          }
          else if (values.length > 0) {
            // Si todos los valores son numéricos
            if (values.every(v => typeof v === 'number' || (!isNaN(Number(v)) && v !== ''))) {
              fieldType = 'number';
            }
            // Si hay pocos valores únicos (posible select)
            else if (new Set(values).size <= Math.min(5, values.length / 2) && new Set(values).size > 1) {
              fieldType = 'select';
            }
            // Si hay valores que parecen fechas
            else if (values.some(v => 
              typeof v === 'string' && 
              (v.match(/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/) || 
               v.match(/^\d{4}[\/\-]\d{2}[\/\-]\d{2}$/) ||
               /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(v))
            )) {
              fieldType = 'date';
            }
          }
          
          // Crear el campo
          const field: FormField = {
            id: `campo_${colIndex}`,
            type: fieldType,
            label: String(header),
            required: colIndex < 3, // Los primeros campos son requeridos por defecto
          };
          
          // Si es un campo select, añadir opciones
          if (fieldType === 'select') {
            const uniqueValues = Array.from(new Set(values));
            field.options = uniqueValues.map(val => ({
              value: String(val),
              label: String(val)
            }));
          }
          
          formStructure.fields.push(field);
        }
      });
    }
    
    // Verificar que se detectaron campos
    if (formStructure.fields.length === 0) {
      console.log("No se detectaron campos automáticamente, intentando extraer campos de propiedades");
      
      // Intentar extraer de las primeras filas del Excel para hojas de datos complejas
      if (rawData && rawData.length > 0) {
        let headers: any[] = [];
        let dataFound = false;
        
        // Buscar entre las primeras 10 filas para encontrar una fila con datos estructurados
        // Esta estrategia es mejor para formularios como el de producción
        for (let rowIndex = 0; rowIndex < Math.min(10, rawData.length); rowIndex++) {
          if (Array.isArray(rawData[rowIndex]) && rawData[rowIndex].filter(Boolean).length >= 3) {
            // Esta puede ser una fila de encabezados o datos
            headers = rawData[rowIndex];
            dataFound = true;
            break;
          }
        }
        
        if (dataFound && headers.length > 0) {
          // Para cada posible columna, crear un campo
          headers.forEach((header, colIndex) => {
            if (header && String(header).trim() !== '') {
              // Obtener columnas de datos para esta posición
              const columnValues = [];
              for (let i = 0; i < rawData.length; i++) {
                if (Array.isArray(rawData[i]) && rawData[i][colIndex] !== undefined) {
                  columnValues.push(rawData[i][colIndex]);
                }
              }
              
              // Determinar el tipo de campo
              let fieldType: FieldType = 'text';
              const headerText = String(header).toLowerCase().trim();
              
              // Detectar tipo por encabezado
              if (headerText.includes('fecha') || headerText.includes('date')) {
                fieldType = 'date';
              } else if (headerText.includes('cantidad') || headerText.includes('litros') || 
                         headerText.includes('kilos') || headerText.includes('total') ||
                         headerText.includes('monto') || headerText.includes('valor')) {
                fieldType = 'number';
              } else if (headerText.includes('comentario') || headerText.includes('observación') ||
                         headerText.includes('descripción') || headerText.includes('notas')) {
                fieldType = 'textarea';
              } else if (headerText.includes('folio') || headerText.includes('codigo') || 
                         headerText.includes('no.') || headerText.includes('número')) {
                fieldType = 'text';
              } else if (headerText.includes('empleado') || headerText.includes('personal') ||
                         headerText.includes('responsable') || headerText.includes('operador')) {
                fieldType = 'employee';
              } else if (headerText.includes('producto') || headerText.includes('materia prima') ||
                         headerText.includes('material') || headerText.includes('insumo')) {
                fieldType = 'product';
              }
              
              // Crear el campo
              formStructure.fields.push({
                id: `field_${colIndex}`,
                type: fieldType,
                label: String(header),
                required: colIndex < 3 || headerText.includes('folio') || headerText.includes('fecha')
              });
            }
          });
        }
      }
      
      // Si aún no hemos encontrado campos, intentar con el enfoque de objetos
      if (formStructure.fields.length === 0 && sheetData && sheetData.length > 0) {
        // Obtener todas las claves únicas en los objetos
        const allKeys = new Set<string>();
        sheetData.forEach(row => {
          if (row && typeof row === 'object') {
            Object.keys(row).forEach(key => {
              if (key && !key.startsWith('__EMPTY')) {
                allKeys.add(key);
              }
            });
          }
        });
        
        // Crear un campo para cada clave importante
        Array.from(allKeys).forEach((key, index) => {
          if (key && !key.startsWith('__EMPTY')) {
            formStructure.fields.push({
              id: `field_${index}`,
              type: 'text',
              label: key,
              required: index < 3
            });
          }
        });
      }
      
      // Si aún no hay campos, agregar campos genéricos como fallback
      if (formStructure.fields.length === 0) {
        console.log("Usando campos genéricos como último recurso");
        formStructure.fields.push({
          id: "campo1",
          type: "text",
          label: "Campo 1",
          required: true
        });
        
        formStructure.fields.push({
          id: "campo2",
          type: "text",
          label: "Campo 2",
          required: false
        });
        
        formStructure.fields.push({
          id: "comentarios",
          type: "textarea",
          label: "Comentarios",
          required: false
        });
      }
    }
    
    return formStructure;
  } catch (error) {
    console.error("Error al detectar estructura del formulario:", error);
    return null;
  }
}

/**
 * Detecta si el archivo Excel contiene una ficha técnica de producción
 * @param rawData Los datos en formato de array de arrays
 * @returns true si el archivo parece ser una ficha técnica de producción
 */
function detectFichaTecnicaProduccion(rawData: any[]): boolean {
  if (!rawData || !Array.isArray(rawData) || rawData.length === 0) return false;
  
  // Buscar patrones específicos de fichas técnicas de producción
  for (let i = 0; i < Math.min(20, rawData.length); i++) {
    const row = rawData[i];
    if (!row || !Array.isArray(row)) continue;
    
    const rowStr = row.join(' ').toLowerCase();
    
    // Patrones comunes en fichas técnicas de producción
    if (rowStr.includes('ficha técnica') || 
        rowStr.includes('producto') || 
        rowStr.includes('pr-pr') ||
        rowStr.includes('producción') ||
        rowStr.includes('elaboración') ||
        rowStr.includes('ingredientes')) {
      return true;
    }
  }
  
  return false;
}

/**
 * Extrae campos para una ficha técnica de producción
 * @param rawData Los datos en formato de array de arrays
 * @returns Estructura de formulario con campos específicos para fichas técnicas
 */
function extractFichaTecnicaFields(rawData: any[]): FormStructure {
  const formStructure: FormStructure = {
    title: "Ficha Técnica de Producción",
    fields: []
  };
  
  // Mapa para rastrear los ID de campo y evitar duplicados
  const fieldIds = new Set<string>();
  
  console.log("Extrayendo campos para ficha técnica de producción");
  
  // Primero buscamos posibles nombres de campo en las primeras filas
  const possibleFieldLabels: {label: string, row: number, col: number}[] = [];
  
  // Recorrer las primeras 30 filas para buscar posibles etiquetas de campo
  for (let i = 0; i < Math.min(30, rawData.length); i++) {
    const row = rawData[i];
    if (!row || !Array.isArray(row)) continue;
    
    // Buscar posibles etiquetas de campo (generalmente en primeras columnas)
    for (let j = 0; j < Math.min(10, row.length); j++) {
      const cell = row[j];
      if (!cell || typeof cell !== 'string') continue;
      
      const cellStr = cell.trim();
      
      // Si la celda termina con ":" o tiene patrones comunes de etiquetas
      if (cellStr.endsWith(':') || 
          /^[A-Z\s]+:?$/i.test(cellStr) || 
          cellStr.length > 3 && cellStr.length < 40) {
        possibleFieldLabels.push({
          label: cellStr.replace(/:$/, ''), // Remover ":" final si existe
          row: i,
          col: j
        });
      }
    }
  }
  
  // Procesar las etiquetas encontradas y crear campos
  for (const fieldInfo of possibleFieldLabels) {
    // Si el valor está en la columna siguiente
    const valueCol = fieldInfo.col + 1;
    const valueRow = fieldInfo.row;
    
    if (rawData[valueRow] && rawData[valueRow][valueCol] !== undefined) {
      // Normalizar etiqueta para generar ID único
      const normalizedLabel = fieldInfo.label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
      
      let fieldId = normalizedLabel;
      let counter = 1;
      
      // Asegurar ID único
      while (fieldIds.has(fieldId)) {
        fieldId = `${normalizedLabel}_${counter}`;
        counter++;
      }
      
      fieldIds.add(fieldId);
      
      // Determinar tipo de campo basado en la etiqueta y valor
      let fieldType: FieldType = 'text';
      const labelLower = fieldInfo.label.toLowerCase();
      const valueExample = rawData[valueRow][valueCol];
      
      if (labelLower.includes('fecha') || labelLower.includes('date')) {
        fieldType = 'date';
      } else if (labelLower.includes('cantidad') || 
                 labelLower.includes('peso') || 
                 labelLower.includes('volumen') || 
                 labelLower.includes('porcentaje') ||
                 labelLower.includes('total') ||
                 labelLower.includes('kilo') ||
                 labelLower.includes('gramo') ||
                 labelLower.includes('unidad')) {
        fieldType = 'number';
      } else if (labelLower.includes('ingrediente') || 
                 labelLower.includes('materia prima') || 
                 labelLower.includes('material') ||
                 labelLower.includes('insumo')) {
        fieldType = 'product';
      } else if (labelLower.includes('responsable') || 
                 labelLower.includes('elaborado por') || 
                 labelLower.includes('revisado por') ||
                 labelLower.includes('operador') ||
                 labelLower.includes('supervisor')) {
        fieldType = 'employee';
      } else if (labelLower.includes('descripción') || 
                 labelLower.includes('procedimiento') || 
                 labelLower.includes('notas') ||
                 labelLower.includes('instrucciones') ||
                 labelLower.includes('observaciones')) {
        fieldType = 'textarea';
      }
      
      // Crear el campo con propiedad editable
      formStructure.fields.push({
        id: fieldId,
        type: fieldType,
        label: fieldInfo.label.trim(),
        required: isRequiredField(fieldInfo.label),
        defaultValue: String(valueExample || ''),
        placeholder: `Ingrese ${fieldInfo.label.trim().toLowerCase()}`,
        displayName: fieldInfo.label.trim(), // Añadir displayName
        displayOrder: formStructure.fields.length, // Asignar orden por defecto
        editable: true // Asegurarse de que el campo sea editable
      });
    }
  }
  
  // Si no se encontraron suficientes campos, agregar algunos genéricos basados en patrones de ficha técnica
  if (formStructure.fields.length < 3) {
    formStructure.fields = [
      {
        id: "codigo_producto",
        type: "text",
        label: "Código de Producto",
        required: true,
        editable: true,
        placeholder: "Ej: PR-01",
        displayName: "Código de Producto",
        displayOrder: 0
      },
      {
        id: "nombre_producto",
        type: "text",
        label: "Nombre del Producto",
        required: true,
        placeholder: "Ej: Cerveza IPA",
        displayName: "Nombre del Producto",
        displayOrder: 1,
        editable: true
      },
      {
        id: "fecha_elaboracion",
        type: "date",
        label: "Fecha de Elaboración",
        required: true,
        displayName: "Fecha de Elaboración",
        displayOrder: 2,
        editable: true
      },
      {
        id: "responsable",
        type: "employee",
        label: "Responsable",
        required: true,
        displayName: "Responsable",
        displayOrder: 3,
        editable: true
      },
      {
        id: "ingredientes",
        type: "textarea",
        label: "Ingredientes",
        required: true,
        placeholder: "Liste los ingredientes",
        displayName: "Ingredientes",
        displayOrder: 4,
        editable: true
      },
      {
        id: "cantidad",
        type: "number",
        label: "Cantidad (kg)",
        required: true,
        displayName: "Cantidad (kg)",
        displayOrder: 5,
        editable: true
      },
      {
        id: "notas",
        type: "textarea",
        label: "Notas de Producción",
        required: false,
        placeholder: "Observaciones adicionales",
        displayName: "Notas de Producción",
        displayOrder: 6,
        editable: true
      }
    ];
  }
  
  // Asegurar que al menos tengamos un campo de fecha y uno de responsable
  const tieneResponsable = formStructure.fields.some(f => f.type === 'employee');
  const tieneFecha = formStructure.fields.some(f => f.type === 'date');
  
  if (!tieneResponsable) {
    formStructure.fields.push({
      id: "responsable",
      type: "employee",
      label: "Responsable",
      required: true,
      displayName: "Responsable",
      displayOrder: formStructure.fields.length,
      editable: true
    });
  }
  
  if (!tieneFecha) {
    formStructure.fields.push({
      id: "fecha",
      type: "date",
      label: "Fecha",
      required: true,
      displayName: "Fecha",
      displayOrder: formStructure.fields.length,
      editable: true
    });
  }
  
  return formStructure;
}

/**
 * Determina si un campo debe ser requerido basado en su etiqueta
 */
function isRequiredField(label: string): boolean {
  const lowLabel = label.toLowerCase();
  
  // Campos que generalmente son requeridos
  const requiredPatterns = [
    'código', 'codigo', 'folio', 'nombre', 'fecha', 'responsable', 
    'producto', 'cantidad', 'total', 'elaborado', 'revisado'
  ];
  
  return requiredPatterns.some(pattern => lowLabel.includes(pattern));
}

/**
 * Crea una plantilla de formulario a partir de datos de Excel
 */
export function createFormTemplateFromExcel(excelData: any[], department: string): {
  name: string;
  description: string;
  department: string;
  structure: FormStructure;
} {
  if (!excelData || !Array.isArray(excelData) || excelData.length === 0) {
    console.error("Datos Excel inválidos al crear plantilla:", excelData);
    return {
      name: "Error al procesar formulario",
      description: "No se pudieron procesar los datos del archivo Excel",
      department,
      structure: {
        title: "Error",
        fields: []
      }
    };
  }
  
  // Determinar la estructura de los datos de la primera hoja
  let sheetData: any[] = [];
  let rawData: any[] = [];
  let sheetName: string = "Hoja1";
  
  try {
    // Nuevo formato mejorado con múltiples representaciones
    if (excelData[0] && typeof excelData[0] === 'object') {
      // Si tiene propiedad data, raw y sheetName (nuevo formato)
      if (excelData[0].data && excelData[0].raw) {
        sheetData = excelData[0].data;  // Datos como objetos
        rawData = excelData[0].raw;     // Datos como arrays
        sheetName = excelData[0].sheetName || "Hoja1";
        console.log(`Extrayendo datos de la hoja '${sheetName}' con formato mejorado`);
      }
      // Si solo tiene data (formato anterior)
      else if (excelData[0].data) {
        sheetData = excelData[0].data;
        sheetName = excelData[0].sheetName || "Hoja1";
        console.log("Usando formato para plantilla: excelData[0].data");
      } 
      // Si es directamente un array de arrays (filas)
      else if (Array.isArray(excelData[0])) {
        rawData = excelData[0];
        sheetData = []; // Se intentará procesar rawData directamente
        console.log("Usando formato para plantilla: excelData[0] (raw arrays)");
      }
    }
    
    // Verificar que tengamos datos utilizables
    if (sheetData.length === 0 && rawData.length === 0) {
      throw new Error("No se pudieron extraer datos de la hoja para crear la plantilla");
    }
    
    // Procesar datos para extraer metadatos
    const metadata = sheetData.length > 0 
      ? extractFormMetadata(sheetData) 
      : rawData.length > 0 
        ? extractFormMetadata(rawData) 
        : {};
    
    // Intentar determinar el tipo de formulario
    const formType = sheetData.length > 0 
      ? detectFormType(sheetData) 
      : rawData.length > 0 
        ? detectFormType(rawData) 
        : FormTemplateType.GENERIC;
    
    // Verificar si es una ficha técnica de producción
    if (rawData.length > 0 && detectFichaTecnicaProduccion(rawData)) {
      console.log("Detectado tipo de formulario: Ficha Técnica de Producción");
      
      // Usar extractor especializado para fichas técnicas
      const fichaTecnicaStructure = extractFichaTecnicaFields(rawData);
      
      return {
        name: metadata.title || "Ficha Técnica de Producción",
        description: `${metadata.code || ""} ${metadata.version || ""} - Ficha técnica importada desde Excel`,
        department,
        structure: fichaTecnicaStructure
      };
    }
    
    // En otros casos, usamos el detector genérico
    let formStructure = detectFormStructure(sheetData, rawData);
    
    // Si no se pudo detectar una estructura, usar el convertidor tradicional
    if (!formStructure) {
      console.log("Utilizando método tradicional para convertir estructura");
      formStructure = sheetData.length > 0 
        ? convertExcelToFormStructure(sheetData) 
        : rawData.length > 0 
          ? convertExcelToFormStructure(rawData) 
          : {
              title: "Formulario Importado",
              fields: []
            };
    }
    
    return {
      name: metadata.title || "Formulario importado",
      description: `${metadata.code || ""} ${metadata.version || ""} - Formulario importado desde Excel`,
      department,
      structure: formStructure
    };
  } catch (error) {
    console.error("Error al crear plantilla de formulario:", error);
    return {
      name: "Error al procesar formulario",
      description: `Ocurrió un error al crear la plantilla del formulario: ${(error as Error).message || 'Error desconocido'}`,
      department,
      structure: {
        title: "Error",
        fields: []
      }
    };
  }
}