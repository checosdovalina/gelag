import PDFDocument from 'pdfkit';
import { FormEntry, FormTemplate } from '@shared/schema';
import { User } from '@shared/schema';
import fs from 'fs';
import path from 'path';

// Función para generar un PDF utilizando PDFKit como fallback cuando Puppeteer no funciona
export async function generatePDFFallback(
  entry: FormEntry, 
  template: FormTemplate, 
  creator?: User
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      console.log("Generando PDF para formulario (usando fallback):", template.name);
      
      // Crear un buffer para almacenar el PDF
      const chunks: Buffer[] = [];
      
      // Crear un nuevo documento PDF
      const doc = new PDFDocument({
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        size: 'A4'
      });
      
      // Capturar trozos de datos del documento
      doc.on('data', (chunk) => chunks.push(chunk));
      
      // Resolver la promesa cuando el documento esté finalizado
      doc.on('end', () => {
        const result = Buffer.concat(chunks);
        console.log("PDF generado correctamente (usando fallback)");
        resolve(result);
      });
      
      // Capturar errores
      doc.on('error', (err) => {
        console.error("Error al generar PDF (usando fallback):", err);
        reject(err);
      });
      
      // Iniciar a generar el PDF
      generatePDFContent(doc, entry, template, creator);
      
      // Finalizar el documento
      doc.end();
    } catch (error) {
      console.error("Error al generar PDF (usando fallback):", error);
      reject(error);
    }
  });
}

// Función para generar el contenido del PDF
function generatePDFContent(
  doc: any, // Usar any en lugar de PDFKit.PDFDocument para evitar errores de tipado
  entry: FormEntry, 
  template: FormTemplate, 
  creator?: User
): void {
  // Fecha de creación formateada
  const createdAt = new Date(entry.createdAt).toLocaleDateString('es-MX');
  
  // Nombre del creador (si está disponible)
  const creatorName = creator?.name || `Usuario ID: ${entry.createdBy}`;
  
  // Departamento
  const department = entry.department || 'N/A';
  
  // Encabezado con el logo
  try {
    const logoPath = path.join(process.cwd(), 'public', 'images', 'gelag_logo.svg');
    if (fs.existsSync(logoPath)) {
      // Añadir el logo al PDF (centrado)
      doc.image(logoPath, {
        fit: [200, 60],
        align: 'center'
      });
      doc.moveDown(1);
    }
  } catch (error) {
    console.error("Error al cargar el logo:", error);
  }

  doc.fontSize(16).font('Helvetica-Bold').text(template.name, { align: 'center' });
  doc.fontSize(10).font('Helvetica').text('GELAG S.A DE C.V. BLVD. SANTA RITA #842, PARQUE INDUSTRIAL SANTA RITA, GOMEZ PALACIO, DGO.', { align: 'center' });
  doc.moveDown(2);
  
  // Información meta
  doc.fontSize(11).font('Helvetica-Bold');
  doc.text(`Folio: ${entry.id}`, { continued: true });
  doc.text(`          Fecha: ${createdAt}`, { align: 'left' });
  doc.text(`Creado por: ${creatorName}`, { continued: true });
  doc.text(`          Departamento: ${department}`, { align: 'left' });
  doc.text(`Estado: ${getStatusLabel(entry.status)}`, { align: 'left' });
  doc.moveDown(2);
  
  // Contenido del formulario
  if (template.structure && template.structure.fields) {
    const fields = template.structure.fields;
    
    // Agrupar campos por sección si existe la propiedad section
    const sections: Record<string, any[]> = {};
    
    fields.forEach(field => {
      const sectionName = field.section || 'General';
      if (!sections[sectionName]) {
        sections[sectionName] = [];
      }
      sections[sectionName].push(field);
    });
    
    // Imprimir cada sección
    Object.keys(sections).forEach(sectionName => {
      doc.fontSize(12).font('Helvetica-Bold').text(sectionName);
      doc.moveDown(0.5);
      
      // Iterar sobre los campos
      sections[sectionName].forEach(field => {
        const fieldId = field.id;
        const fieldLabel = field.displayName || field.label;
        let fieldValue = entry.data[fieldId];
        
        // Convertir el valor según el tipo de campo
        if (field.type === 'select' || field.type === 'radio') {
          // Si es un select o radio, puede ser un objeto con value y label
          if (fieldValue && typeof fieldValue === 'object' && 'label' in fieldValue) {
            fieldValue = fieldValue.label;
          }
        } else if (field.type === 'checkbox') {
          // Si es un checkbox, convertir booleano a Sí/No
          fieldValue = fieldValue ? 'Sí' : 'No';
        } else if (field.type === 'date') {
          // Formatear fechas
          if (fieldValue) {
            try {
              fieldValue = new Date(fieldValue).toLocaleDateString('es-MX');
            } catch (e) {
              console.error("Error al formatear fecha:", e);
            }
          }
        } else if (Array.isArray(fieldValue)) {
          // Si es un array (por ejemplo, multiselect)
          fieldValue = fieldValue.join(', ');
        } else if (fieldValue === null || fieldValue === undefined) {
          fieldValue = '';
        }
        
        doc.fontSize(10).font('Helvetica-Bold').text(`${fieldLabel}:`, { continued: true });
        doc.font('Helvetica').text(` ${fieldValue}`);
      });
      
      doc.moveDown(1);
    });
  } else {
    // Si no tiene estructura definida, mostrar los datos crudos
    doc.fontSize(12).font('Helvetica-Bold').text('Datos del formulario');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(JSON.stringify(entry.data, null, 2));
    doc.moveDown(1);
  }
  
  // Firma si existe
  if (entry.signature) {
    doc.moveDown(1);
    doc.fontSize(12).font('Helvetica-Bold').text('Firma', { align: 'center' });
    
    try {
      // Intentar añadir la imagen de firma
      if (entry.signature && entry.signature.startsWith('data:image')) {
        // Extraer la parte de base64 de la data URL
        const base64Data = entry.signature.split(',')[1];
        if (base64Data) {
          // Convertir a buffer
          const signatureBuffer = Buffer.from(base64Data, 'base64');
          
          // Añadir la firma al PDF
          doc.image(signatureBuffer, {
            fit: [200, 100],
            align: 'center'
          });
          doc.moveDown(0.5);
        }
      }
    } catch (error) {
      console.error("Error al mostrar la firma:", error);
      // Si falla, mostramos texto alternativo
      doc.fontSize(10).font('Helvetica').text('Documento firmado electrónicamente', { align: 'center' });
    }
    
    doc.fontSize(10).font('Helvetica').text(`Firmado por: ${entry.signedBy ? `Usuario ID: ${entry.signedBy}` : creatorName}`, { align: 'center' });
    
    if (entry.signedAt) {
      doc.text(`Fecha de firma: ${new Date(entry.signedAt).toLocaleDateString('es-MX')}`, { align: 'center' });
    }
  }
  
  // Pie de página
  doc.moveDown(2);
  const bottomPos = doc.page.height - 50;
  const currentPos = doc.y;
  
  // Solo si hay espacio en la página actual
  if (currentPos < bottomPos - 30) {
    doc.fontSize(8).font('Helvetica').text(
      `Documento generado automáticamente por el sistema de captura de formularios.\n© ${new Date().getFullYear()} GELAG S.A DE C.V. - Todos los derechos reservados`,
      { align: 'center' }
    );
  }
}

// Función para obtener la etiqueta del estado en español
function getStatusLabel(status: string): string {
  switch (status) {
    case 'draft':
      return 'Borrador';
    case 'signed':
      return 'Firmado';
    case 'approved':
      return 'Aprobado';
    case 'rejected':
      return 'Rechazado';
    default:
      return status;
  }
}