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
  const titleRow = data[0] || [];
  const companyRow = data[1] || [];
  
  // Revisa si es un formulario de Buenas Prácticas de Manufactura
  const isBuenasPracticas = 
    titleRow.some((cell: string) => typeof cell === 'string' && cell.includes('BUENAS PRACTICAS DE PERSONAL')) ||
    titleRow.some((cell: string) => typeof cell === 'string' && cell.includes('CARE-01-01'));
  
  if (isBuenasPracticas) {
    return FormTemplateType.BUENAS_PRACTICAS;
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
    employeeNames.push(data[currentRow][0]);
    currentRow++;
    
    // Si encontramos una fila vacía o un nuevo encabezado, detenemos la extracción
    if (!data[currentRow] || !data[currentRow][0] || 
        data[currentRow][0].includes("1.") || 
        data[currentRow][0].includes("2.") ||
        data[currentRow][0].includes("APROBADO")) {
      break;
    }
  }
  
  return employeeNames;
}

/**
 * Extrae los criterios de evaluación del formulario de buenas prácticas
 */
export function extractEvaluationCriteria(data: any[]): string[] {
  const criteria: string[] = [];
  
  // Buscar filas que contienen criterios numerados (1., 2., etc.)
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
    
    // Campo para seleccionar empleados (usando los nombres extraídos)
    if (employeeNames.length > 0) {
      formStructure.fields.push({
        id: "empleados",
        type: "multiselect" as FieldType,
        label: "Empleados a evaluar",
        required: true,
        options: employeeNames.map(name => ({
          value: name.trim(),
          label: name.trim()
        }))
      });
    }
    
    // Extraer criterios de evaluación
    const criteria = extractEvaluationCriteria(sheetData);
    
    // Crear campos para cada criterio
    criteria.forEach((criterion, index) => {
      formStructure.fields.push({
        id: `criterio_${index + 1}`,
        type: "checkbox" as FieldType,
        label: criterion,
        required: true
      });
    });
    
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
  // Por ahora, solo procesar la primera hoja
  const sheetData = sheetsData[0].data;
  
  // Detectar el tipo de formulario
  const formType = detectFormType(sheetData);
  
  // Extraer metadatos
  const metadata = extractFormMetadata(sheetData);
  
  // Extraer nombres de empleados para formularios de buenas prácticas
  const employeeNames = formType === FormTemplateType.BUENAS_PRACTICAS 
    ? extractEmployeeNames(sheetData) 
    : [];
  
  // Por ahora, devolvemos una estructura básica
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
  // Procesar datos para extraer metadatos y detectar el tipo
  const firstSheet = excelData[0].data;
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
}