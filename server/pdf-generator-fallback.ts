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
  
  // Título del formulario (alineado a la derecha como en la imagen de referencia)
  doc.fillColor('#000000').fontSize(16).font('Helvetica-Bold')
     .text(template.name, pageCenter + 60, 100, { 
       align: 'right',
       width: pageWidth / 2 - 60
     });
     
  // Número 2 (si existe en el título)
  if (template.name.includes('2')) {
    const titleWithoutNumber = template.name.replace('2', '').trim();
    
    doc.fillColor('#000000').fontSize(16).font('Helvetica-Bold')
      .text(titleWithoutNumber, pageCenter + 60, 100, { 
        align: 'right',
        width: pageWidth / 2 - 60,
        continued: false
      });
      
    doc.fillColor('#000000').fontSize(16).font('Helvetica-Bold')
      .text('2', pageCenter + pageWidth/2 - 70, 100);
  }
  
  // Dirección de la empresa (formato más compacto y reducido, alineado a la derecha)
  doc.fontSize(7).font('Helvetica')
     .text('GELAG S.A DE C.V. BLVD. SANTA RITA #842,\nPARQUE INDUSTRIAL SANTA RITA, GOMEZ PALACIO, DGO.', 
       pageCenter + 60, 120, { 
         align: 'right',
         width: pageWidth / 2 - 60
       });
       
  doc.moveDown(1.5);
  
  // Organización de la información como en la imagen de referencia
  const currentY = doc.y; // Guardamos la posición actual
  
  // Lado izquierdo - Información básica en formato doble columna
  const leftLabelColumn = 50;
  const leftValueColumn = 90;
  
  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('Folio:', leftLabelColumn, currentY);
  doc.font('Helvetica').text(`${entry.id}`, leftValueColumn, currentY);
  
  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('Fecha:', leftLabelColumn, currentY + 20);
  doc.font('Helvetica').text(`${createdAt}`, leftValueColumn, currentY + 20);
  
  // Información adicional (lado derecho) 
  const rightLabelColumn = pageWidth / 2;
  const rightValueColumn = rightLabelColumn + 110;
  
  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('Creado por:', rightLabelColumn, currentY);
  doc.font('Helvetica').text(`${creatorName}`, rightValueColumn, currentY);
  
  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('Departamento:', rightLabelColumn, currentY + 20);
  doc.font('Helvetica').text(`${department}`, rightValueColumn, currentY + 20);
  
  // Estado - en su propia fila, con el estilo adecuado al estado (debajo)
  doc.y = currentY + 40; 
  
  // Etiqueta "Estado:" en negrita
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000')
     .text('Estado:', leftLabelColumn, doc.y);
  
  // El valor del estado con el color correspondiente
  let statusColor = '#000000';
  switch(entry.status) {
    case 'draft': statusColor = '#666666'; break;      // Gris para borrador
    case 'signed': statusColor = '#0066cc'; break;     // Azul para firmado
    case 'approved': statusColor = '#009933'; break;   // Verde para aprobado
    case 'rejected': statusColor = '#cc0000'; break;   // Rojo para rechazado
  }
  
  // Aplicar el color adecuado pero mantener la negrita
  doc.fillColor(statusColor).font('Helvetica-Bold')
     .text(`${getStatusLabel(entry.status)}`, leftValueColumn, doc.y);
  
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
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#000')
         .text(sectionName, { align: 'left' });
         
      doc.moveDown(0.5);
      doc.fillColor('#000000'); // Restaurar color
      
      // Definir columnas y márgenes para imitar el diseño de la imagen
      const colWidth = (doc.page.width - 120) / 2;
      const colPadding = 15;
      const col1X = 60;
      const col2X = col1X + colWidth + colPadding;
      
      // Iterar sobre los campos - aquí hacemos la distribución en 2 columnas
      const fieldsInSection = sections[sectionName];
      const middleIndex = Math.ceil(fieldsInSection.length / 2);
      
      // Primera columna
      let currentY = doc.y;
      fieldsInSection.slice(0, middleIndex).forEach((field, fieldIndex) => {
        const fieldId = field.id;
        const fieldLabel = field.displayName || field.label;
        let fieldValue = entry.data[fieldId];
        
        // Convertir el valor según el tipo de campo
        if (field.type === 'select' || field.type === 'radio') {
          if (fieldValue && typeof fieldValue === 'object' && 'label' in fieldValue) {
            fieldValue = fieldValue.label;
          }
        } else if (field.type === 'checkbox') {
          fieldValue = fieldValue ? 'Sí' : 'No';
        } else if (field.type === 'date') {
          if (fieldValue) {
            try {
              fieldValue = new Date(fieldValue).toLocaleDateString('es-MX');
            } catch (e) {
              console.error("Error al formatear fecha:", e);
            }
          }
        } else if (Array.isArray(fieldValue)) {
          fieldValue = fieldValue.join(', ');
        } else if (fieldValue === null || fieldValue === undefined) {
          fieldValue = '';
        }
        
        // Determinar posición Y para cada campo
        const fieldY = currentY + (fieldIndex * 15); 
        
        // Etiqueta en negrita
        doc.fontSize(9).font('Helvetica-Bold')
          .text(`${fieldLabel}:`, col1X, fieldY, { continued: true });
          
        // Valor a continuación
        doc.font('Helvetica')
          .text(` ${fieldValue}`);
          
        // Actualizar posición Y para próximo campo si es el último elemento
        if (fieldIndex === middleIndex - 1) {
          currentY = doc.y;
        }
      });
      
      // Reiniciar la posición Y para la segunda columna
      doc.y = currentY - ((middleIndex - 1) * 15);
      
      // Segunda columna (si hay campos suficientes)
      if (fieldsInSection.length > middleIndex) {
        const startY = doc.y;
        
        fieldsInSection.slice(middleIndex).forEach((field, fieldIndex) => {
          const fieldId = field.id;
          const fieldLabel = field.displayName || field.label;
          let fieldValue = entry.data[fieldId];
          
          // Convertir el valor según el tipo de campo
          if (field.type === 'select' || field.type === 'radio') {
            if (fieldValue && typeof fieldValue === 'object' && 'label' in fieldValue) {
              fieldValue = fieldValue.label;
            }
          } else if (field.type === 'checkbox') {
            fieldValue = fieldValue ? 'Sí' : 'No';
          } else if (field.type === 'date') {
            if (fieldValue) {
              try {
                fieldValue = new Date(fieldValue).toLocaleDateString('es-MX');
              } catch (e) {
                console.error("Error al formatear fecha:", e);
              }
            }
          } else if (Array.isArray(fieldValue)) {
            fieldValue = fieldValue.join(', ');
          } else if (fieldValue === null || fieldValue === undefined) {
            fieldValue = '';
          }
          
          // Calcular posición Y basada en el índice
          const fieldY = startY + (fieldIndex * 15);
          
          // Etiqueta en negrita
          doc.fontSize(9).font('Helvetica-Bold')
            .text(`${fieldLabel}:`, col2X, fieldY, { continued: true });
            
          // Valor a continuación
          doc.font('Helvetica')
            .text(` ${fieldValue}`);
        });
      }
      
      // Avanzar a la siguiente sección
      doc.y = Math.max(doc.y, currentY) + 10;
      
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
    
    // Encabezado de firma con estilo simple (como en la imagen de referencia)
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000')
       .text('Firma', { align: 'center' });
    doc.moveDown(0.5);
    
    // Dibujar un recuadro para la firma - estilo más sencillo
    const signatureBoxWidth = 250;
    const signatureBoxHeight = 80;
    const signatureBoxX = pageCenter - (signatureBoxWidth / 2);
    const signatureBoxY = doc.y;
    
    // Dibujar un recuadro simple para la firma
    doc.rect(signatureBoxX, signatureBoxY, signatureBoxWidth, signatureBoxHeight)
       .lineWidth(0.5)
       .stroke();
       
    try {
      // Intentar añadir la imagen de firma
      if (entry.signature && entry.signature.startsWith('data:image')) {
        // Extraer la parte de base64 de la data URL
        const base64Data = entry.signature.split(',')[1];
        if (base64Data) {
          // Convertir a buffer
          const signatureBuffer = Buffer.from(base64Data, 'base64');
          
          // Dimensiones óptimas para la firma
          const signatureWidth = 160;
          const signatureX = pageCenter - (signatureWidth / 2);
          const signatureY = signatureBoxY + 5; // Ajuste para centrar verticalmente
          
          // Añadir la firma al PDF, centrada dentro del recuadro
          doc.image(signatureBuffer, signatureX, signatureY, {
            width: signatureWidth,
            height: signatureBoxHeight - 10,
            align: 'center',
            valign: 'center'
          });
        }
      }
    } catch (error) {
      console.error("Error al mostrar la firma:", error);
      // Si falla, mostramos texto alternativo
      doc.fontSize(9).font('Helvetica').text('Firmado', 
        signatureBoxX + 30, signatureBoxY + 30, { 
          width: signatureBoxWidth - 60,
          align: 'center' 
        });
    }
    
    // Movernos al final del recuadro
    doc.y = signatureBoxY + signatureBoxHeight + 15;
    
    // Información sobre la firma - en formato "firmado por: nombre" como en la imagen
    doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold')
       .text('Firmado por: ', { continued: true, align: 'center' })
       .font('Helvetica')
       .text(`${entry.signedBy ? creator?.name || `Usuario ID: ${entry.signedBy}` : creatorName}`, { align: 'center' });
    
    if (entry.signedAt) {
      doc.fontSize(9).font('Helvetica-Bold')
         .text('Fecha de firma: ', { continued: true, align: 'center' })
         .font('Helvetica')
         .text(`${new Date(entry.signedAt).toLocaleDateString('es-MX')}`, { align: 'center' });
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