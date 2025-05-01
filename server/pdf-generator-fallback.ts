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
  
  // Encabezado con el logo estilizado como texto
  // Usamos un rojo similar al logo de GELAG
  const pageWidth = doc.page.width;
  const pageCenter = pageWidth / 2;
  
  // Logo GELAG posicionado a la izquierda del centro para dejar espacio para "S.A. DE C.V."
  doc.fontSize(34).font('Helvetica-Bold').fillColor('#e3014f')
     .text('gelag', pageCenter - 60, 50, { align: 'center' });
  
  // Añadimos un círculo pequeño (®) como en el logo, ajustado a la posición correcta
  doc.fontSize(10).fillColor('#e3014f')
     .text('®', pageCenter + 10, 50);
  
  // S.A. DE C.V. a la derecha del logotipo
  doc.fontSize(11).font('Helvetica').fillColor('#333333')
     .text('S.A. DE C.V.', pageCenter + 30, 65);
  
  // Línea separadora completa
  const startX = 50;
  const endX = doc.page.width - 50;
  const lineY = 85;
  doc.moveTo(startX, lineY)
     .lineTo(endX, lineY)
     .lineWidth(1)
     .stroke();
  
  doc.moveDown(1);
  
  // Título del formulario (centrado y con mayor tamaño)
  doc.fillColor('#000000').fontSize(18).font('Helvetica-Bold').text(template.name, { align: 'center' });
  doc.moveDown(0.5);
  
  // Dirección de la empresa (formato más compacto y reducido)
  doc.fontSize(8).font('Helvetica').text('GELAG S.A DE C.V. BLVD. SANTA RITA #842, PARQUE INDUSTRIAL SANTA RITA, GOMEZ PALACIO, DGO.', { align: 'center' });
  doc.moveDown(1);
  
  // Organización de la información en un formato más tabular
  const currentY = doc.y; // Guardamos la posición actual
  
  // Lado izquierdo - Información básica
  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('Folio:', 50, currentY);
  doc.font('Helvetica').text(`${entry.id}`, 90, currentY);
  
  doc.font('Helvetica-Bold').text('Fecha:', 50, currentY + 15);
  doc.font('Helvetica').text(`${createdAt}`, 90, currentY + 15);
  
  // Lado derecho - Información adicional
  const rightColumnX = pageWidth / 2 + 20;
  
  doc.font('Helvetica-Bold').text('Creado por:', rightColumnX, currentY);
  doc.font('Helvetica').text(`${creatorName}`, rightColumnX + 80, currentY);
  
  doc.font('Helvetica-Bold').text('Departamento:', rightColumnX, currentY + 15);
  doc.font('Helvetica').text(`${department}`, rightColumnX + 80, currentY + 15);
  
  // Estado - centrado y con formato distintivo
  doc.y = currentY + 40;
  doc.font('Helvetica-Bold').text('Estado:', 50, doc.y);
  
  // Resaltar el estado con un color según el valor
  let statusColor = '#000000';
  switch(entry.status) {
    case 'draft': statusColor = '#888888'; break;      // Gris para borrador
    case 'signed': statusColor = '#0066cc'; break;     // Azul para firmado
    case 'approved': statusColor = '#008800'; break;   // Verde para aprobado
    case 'rejected': statusColor = '#cc0000'; break;   // Rojo para rechazado
  }
  
  doc.fillColor(statusColor).font('Helvetica-Bold')
     .text(`${getStatusLabel(entry.status)}`, 100, doc.y);
  
  // Restaurar color por defecto
  doc.fillColor('#000000');
  
  // Avanzar para el contenido principal
  doc.moveDown(3);
  
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
    
    // Imprimir cada sección con formato mejorado
    Object.keys(sections).forEach((sectionName, sectionIndex) => {
      // Añadir un espacio extra entre secciones, excepto la primera
      if (sectionIndex > 0) {
        doc.moveDown(0.5);
      }
      
      // Encabezado de sección con un estilo distintivo
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#e3014f')
         .text(sectionName.toUpperCase(), { align: 'left' });
      
      // Línea separadora para la sección
      const sectionLineY = doc.y + 2;
      doc.moveTo(50, sectionLineY)
         .lineTo(doc.page.width/2, sectionLineY)
         .lineWidth(0.5)
         .stroke();
      
      doc.moveDown(1);
      doc.fillColor('#000000'); // Restaurar color
      
      // Definir tamaño de columnas para formato de tabla
      const leftColumnWidth = 150;
      const rightColumnWidth = doc.page.width - 250;
      const startX = 60;
      
      // Iterar sobre los campos
      sections[sectionName].forEach((field, fieldIndex) => {
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
        
        // Usar fondo alternado para mejorar legibilidad (efecto cebra)
        const useGrayBg = fieldIndex % 2 === 1;
        if (useGrayBg) {
          const fieldY = doc.y;
          doc.rect(startX - 10, fieldY - 2, doc.page.width - 100, 16)
             .fillOpacity(0.05)
             .fillAndStroke('#f0f0f0', '#f0f0f0');
          doc.fillOpacity(1);
        }
        
        // Formato mejorado para campos y valores (en dos columnas)
        doc.fontSize(9).font('Helvetica-Bold')
           .text(`${fieldLabel}:`, startX, doc.y, { 
              width: leftColumnWidth, 
              continued: false
           });
        
        // Valor en la misma línea pero en segunda columna
        doc.fontSize(9).font('Helvetica')
           .text(`${fieldValue}`, startX + leftColumnWidth, doc.y - 12, { 
              width: rightColumnWidth
           });
      });
      
      doc.moveDown(1.5);
    });
  } else {
    // Si no tiene estructura definida, mostrar los datos crudos
    doc.fontSize(12).font('Helvetica-Bold').text('Datos del formulario');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(JSON.stringify(entry.data, null, 2));
    doc.moveDown(1);
  }
  
  // Sección de firma (con diseño mejorado)
  if (entry.signature) {
    doc.moveDown(2);
    
    // Crear una sección centrada para la firma con área distintiva
    const pageWidth = doc.page.width;
    const pageCenter = pageWidth / 2;
    
    // Encabezado de firma con estilo distintivo
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#444444')
       .text('FIRMA DEL DOCUMENTO', { align: 'center' });
    doc.moveDown(0.5);
    
    // Dibujar un recuadro para la firma
    const signatureBoxWidth = 300;
    const signatureBoxHeight = 120;
    const signatureBoxX = pageCenter - (signatureBoxWidth / 2);
    const signatureBoxY = doc.y;
    
    // Fondo ligero para el área de firma
    doc.rect(signatureBoxX, signatureBoxY, signatureBoxWidth, signatureBoxHeight)
       .fillOpacity(0.05)
       .fillAndStroke('#e3014f', '#cccccc');
    
    // Restaurar opacidad
    doc.fillOpacity(1);
    
    try {
      // Intentar añadir la imagen de firma
      if (entry.signature && entry.signature.startsWith('data:image')) {
        // Extraer la parte de base64 de la data URL
        const base64Data = entry.signature.split(',')[1];
        if (base64Data) {
          // Convertir a buffer
          const signatureBuffer = Buffer.from(base64Data, 'base64');
          
          // Dimensiones óptimas para la firma
          const signatureWidth = 200;
          const signatureX = pageCenter - (signatureWidth / 2);
          const signatureY = signatureBoxY + 10; // Ajuste para centrar verticalmente
          
          // Añadir la firma al PDF, centrada dentro del recuadro
          doc.image(signatureBuffer, signatureX, signatureY, {
            width: signatureWidth
          });
        }
      }
    } catch (error) {
      console.error("Error al mostrar la firma:", error);
      // Si falla, mostramos texto alternativo
      doc.fontSize(10).font('Helvetica').text('Documento firmado electrónicamente', 
        signatureBoxX + 40, signatureBoxY + 50, { 
          width: signatureBoxWidth - 80,
          align: 'center' 
        });
    }
    
    // Movernos al final del recuadro
    doc.y = signatureBoxY + signatureBoxHeight + 10;
    
    // Información sobre la firma
    doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold')
       .text('Firmado por:', { continued: true, align: 'center' })
       .font('Helvetica')
       .text(` ${entry.signedBy ? creator?.name || `Usuario ID: ${entry.signedBy}` : creatorName}`, { align: 'center' });
    
    if (entry.signedAt) {
      doc.fontSize(10).font('Helvetica-Bold')
         .text('Fecha de firma:', { continued: true, align: 'center' })
         .font('Helvetica')
         .text(` ${new Date(entry.signedAt).toLocaleDateString('es-MX')}`, { align: 'center' });
    }
  }
  
  // Pie de página mejorado
  // Siempre colocamos el pie de página en la parte inferior de la página actual
  doc.moveDown(2);
  const bottomPos = doc.page.height - 40;
  
  // Guardar la posición actual del cursor
  const currentPos = doc.y;
  
  // Dibujar una línea separadora en la parte inferior
  const footerLineY = bottomPos - 20;
  doc.moveTo(50, footerLineY)
     .lineTo(doc.page.width - 50, footerLineY)
     .lineWidth(0.5)
     .strokeColor('#cccccc')
     .stroke();
     
  // Restaurar el color original
  doc.fillColor('#666666');
  
  // Texto del pie de página
  doc.fontSize(7).font('Helvetica')
     .text(
       `Documento generado por el sistema de gestión de formularios`,
       50, footerLineY + 5, 
       { align: 'center', width: doc.page.width - 100 }
     );
     
  doc.fontSize(7).font('Helvetica')
     .text(
       `© ${new Date().getFullYear()} GELAG S.A DE C.V. - Todos los derechos reservados`,
       50, footerLineY + 15, 
       { align: 'center', width: doc.page.width - 100 }
     );
     
  // Restaurar la posición del cursor solo si no hemos avanzado demasiado
  if (currentPos < footerLineY - 50) {
    doc.y = currentPos;
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