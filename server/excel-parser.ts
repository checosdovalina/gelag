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
  
  // Si sheetsData es un array de objetos con propiedad 'data'
  if (sheetsData[0] && sheetsData[0].data) {
    sheetData = sheetsData[0].data;
    console.log("Usando formato: sheetsData[0].data");
  } 
  // Si sheetsData es directamente un array de arrays (filas)
  else if (Array.isArray(sheetsData[0])) {
    sheetData = sheetsData;
    console.log("Usando formato: sheetsData");
  }
  // Si sheetsData es un objeto con nombres de hojas como claves
  else if (typeof sheetsData === 'object' && !Array.isArray(sheetsData)) {
    // Obtener la primera clave (nombre de hoja)
    const firstSheetName = Object.keys(sheetsData)[0];
    if (firstSheetName && sheetsData[firstSheetName]) {
      sheetData = sheetsData[firstSheetName];
      console.log("Usando formato: sheetsData[sheetName]");
    }
  }
  
  // Si no pudimos obtener datos, devolver una estructura vacía
  if (!sheetData || !Array.isArray(sheetData) || sheetData.length === 0) {
    console.error("No se pudieron extraer datos de la hoja:", sheetsData);
    return {
      title: "Error al procesar formulario",
      formFields: [],
      formType: FormTemplateType.GENERIC,
      rawData: []
    };
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
  let firstSheet: any[] = [];
  
  try {
    // Si es un array de objetos con propiedad 'data'
    if (excelData[0] && excelData[0].data) {
      firstSheet = excelData[0].data;
      console.log("Usando formato para plantilla: excelData[0].data");
    } 
    // Si es directamente un array de arrays (filas)
    else if (Array.isArray(excelData[0])) {
      firstSheet = excelData;
      console.log("Usando formato para plantilla: excelData");
    }
    // Si es un objeto con nombres de hojas como claves
    else if (typeof excelData === 'object' && !Array.isArray(excelData)) {
      // Obtener la primera clave (nombre de hoja)
      const firstSheetName = Object.keys(excelData)[0];
      if (firstSheetName && excelData[firstSheetName]) {
        firstSheet = excelData[firstSheetName];
        console.log("Usando formato para plantilla: excelData[sheetName]");
      }
    }
    
    if (!firstSheet || !Array.isArray(firstSheet) || firstSheet.length === 0) {
      throw new Error("No se pudieron extraer datos de la hoja para crear la plantilla");
    }
    
    // Procesar datos para extraer metadatos y detectar el tipo
    const formType = detectFormType(firstSheet);
    const metadata = extractFormMetadata(firstSheet);
    
    // Crear estructura del formulario
    const formStructure = convertExcelToFormStructure(firstSheet);
    
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
      description: "Ocurrió un error al crear la plantilla del formulario",
      department,
      structure: {
        title: "Error",
        fields: []
      }
    };
  }
}