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
      // Depuración para ver qué valores tienen los campos
      console.log("Datos del formulario para depuración:", JSON.stringify(entry.data, null, 2));
      
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
      try {
        // Agregar logo de GELAG
        const logoPath = path.resolve('./public/assets/gelag-logo.png');
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, {
            fit: [120, 60],
            align: 'center'
          });
          doc.moveDown();
        }
      } catch (logoError) {
        console.error('Error al añadir logo:', logoError);
      }
      
      // Generar el contenido del PDF
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
  
  // Encabezado simple como en la nueva imagen de referencia
  const pageWidth = doc.page.width;
  const pageCenter = pageWidth / 2;
  
  // Obtener estado para mostrar en el título
  const statusLabel = getStatusLabel(entry.status).toUpperCase();
  
  // Título del documento centrado en la parte superior con estado al lado si aplica
  doc.fillColor('#000000').fontSize(18).font('Helvetica-Bold');
  
  // Título original y manejo especial para formularios con "PRODUCTO TERMINADO"
  let formTitle = template.name.toUpperCase();
  let isProductoTerminado = false;
  
  // Verificar si es un formulario de inspección de producto terminado
  if (formTitle.includes("PRODUCTO TERMINADO")) {
    isProductoTerminado = true;
  }
  
  // Para formularios genéricos que contienen "TERMINADO" pero no son de producto
  // Verificar si el título incluye la palabra "TERMINADO" y no es de "PRODUCTO TERMINADO"
  if (!isProductoTerminado && formTitle.includes("TERMINADO")) {
    formTitle = formTitle.replace(" TERMINADO", "");
  }
  
  // Establecer posición Y inicial para el título
  const titleY = 35;
  
  // Dibujar título completo (incluido PRODUCTO TERMINADO)
  doc.text(formTitle, 50, titleY, { 
    align: 'center',
    width: pageWidth - 100
  });
  
  // Determinar si necesitamos mostrar un estado adicional bajo el título
  let showStatus = false;
  let headerStatusColor = '#000000';
  let statusText = "";
  
  // Si el formulario tiene estado firmado o aprobado, siempre mostrar ese estado
  // (ignorando cualquier "TERMINADO" en el título)
  if (entry.status === 'signed' || entry.status === 'approved') {
    showStatus = true;
    
    if (entry.status === 'signed') {
      headerStatusColor = '#0066cc';
      statusText = "FIRMADO";
    } else {
      headerStatusColor = '#009933';
      statusText = "APROBADO";
    }
  } 
  // Si NO está firmado/aprobado, entonces considerar si necesitamos mostrar "TERMINADO"
  else if ((formTitle.includes("INSPECCION") || formTitle.includes("INSPECCIÓN")) && 
             !isProductoTerminado && 
             !formTitle.includes("TERMINADO")) {
    // Solo agregar "TERMINADO" como estado si el formulario es de inspección,
    // no es de producto terminado, y no tiene ya "TERMINADO" en el título
    showStatus = true;
    statusText = "TERMINADO";
  }
  
  // El título ya ha sido dibujado, ahora añadimos un espacio vertical mayor
  // independientemente de si hay estado o no
  const directionY = titleY + 40; // Posición de la dirección con una línea más de separación
  
  // Insertar la dirección de la empresa con margen superior
  doc.fontSize(10).font('Helvetica').fillColor('#000000')
    .text('GELAG S.A DE C.V. BLVD. SANTA RITA #842, PARQUE INDUSTRIAL SANTA RITA, GOMEZ PALACIO, DGO.', 
      50, directionY, {
        align: 'center',
        width: pageWidth - 100
      });
  
  // Si hay estado para mostrar, añadirlo DEBAJO de la dirección
  if (showStatus) {
    // Posición del estado 2 espacios más abajo
    const statusY = directionY + 45; // Mayor separación después de la dirección
    
    // Dibujar estado con su color correspondiente
    doc.fontSize(14).font('Helvetica-Bold').fillColor(headerStatusColor);
    doc.text(statusText, 50, statusY, { 
      align: 'center',
      width: pageWidth - 100
    });
    
    // Restablecer color por defecto
    doc.fillColor('#000000');
  }
  
  // Espacio después del título y dirección (ajustado según el formato)
  let lineY = 100;
  
  // Si es un formulario firmado o aprobado, ajustar el espacio por el título con estado
  if (entry.status === 'signed' || entry.status === 'approved') {
    lineY = 120; // Más espacio para acomodar el estado adicional
  }
  
  // Información principal: columnas para folio, fecha, creado por, etc.
  const infoY = lineY + 20;
       
  doc.moveDown(1.5);
  
  // Organización de la información como en la imagen de referencia
  const currentY = doc.y; // Guardamos la posición actual
  
  // Lado izquierdo - Información básica en formato doble columna
  const leftLabelColumn = 50;
  const leftValueColumn = 90;
  
  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('Folio:', leftLabelColumn, currentY);
  doc.font('Helvetica').text(`${entry.folioNumber || entry.id}`, leftValueColumn, currentY);
  
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
    
    // Guardar los campos de tablas avanzadas para procesarlos después
    const advancedTables: any[] = [];
    
    fields.forEach(field => {
      // Si es un campo de tabla avanzada, lo guardamos para procesarlo después
      if (field.type === 'advancedTable' && entry.data[field.id]) {
        advancedTables.push({
          field,
          data: entry.data[field.id]
        });
      }
      
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
      
      // Encabezado de sección con un estilo distintivo - como en la imagen de referencia (texto central con líneas a los lados)
      // Dibujar línea separadora antes del título de sección
      const sectionY = doc.y + 10;
      const sectionLineWidth = 400;
      const sectionTitleWidth = 120;
      const sectionTitleX = pageWidth / 2 - sectionTitleWidth / 2;
      
      doc.moveTo(60, sectionY)
         .lineTo(sectionTitleX - 10, sectionY)
         .stroke();
         
      doc.moveTo(sectionTitleX + sectionTitleWidth + 10, sectionY)
         .lineTo(pageWidth - 60, sectionY)
         .stroke();
      
      // Título de sección en mayúsculas centrado
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#000')
         .text(sectionName.toUpperCase(), sectionTitleX, sectionY - 6, { width: sectionTitleWidth, align: 'center' });
         
      doc.moveDown(1);
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
        
        // Identificar campos específicos de buenas prácticas por su ID
        const bpFieldIds = [
          "3d02e27f-a5e8-4b6b-a8fa-82ee600cf12e",
          "5bb73f01-5300-42be-985d-06a471027ef8",
          "03364956-5d2c-4f31-8ad1-302cd9815ecf",
          "421ff0d4-353f-40a8-a276-7d58d9c7a6ee",
          "9cf8d32f-44a2-43c6-9e8e-45c099225467",
          "d3409f51-f132-4881-906a-b7d5cb6c55e4"
        ];
        
        // Manejar específicamente estos campos
        if (bpFieldIds.includes(fieldId) && Array.isArray(fieldValue) && fieldValue.length > 0) {
          fieldValue = fieldValue[0]; // Extraer el primer valor del array
        }
        
        // Convertir el valor según el tipo de campo
        if (field.type === 'select' || field.type === 'radio') {
          if (fieldValue && typeof fieldValue === 'object' && 'label' in fieldValue) {
            fieldValue = fieldValue.label;
          }
        } else if (field.type === 'checkbox') {
          // Los campos de buenas prácticas pueden ser de tipo checkbox pero tienen valores diferentes
          const bpFieldIds = [
            "3d02e27f-a5e8-4b6b-a8fa-82ee600cf12e",
            "5bb73f01-5300-42be-985d-06a471027ef8",
            "03364956-5d2c-4f31-8ad1-302cd9815ecf",
            "421ff0d4-353f-40a8-a276-7d58d9c7a6ee",
            "9cf8d32f-44a2-43c6-9e8e-45c099225467",
            "d3409f51-f132-4881-906a-b7d5cb6c55e4"
          ];
          
          if (bpFieldIds.includes(fieldId)) {
            // No convertir a "Sí/No" para campos de buenas prácticas
            // Ya se habrán manejado arriba
          } else {
            fieldValue = fieldValue ? 'Sí' : 'No';
          }
        } else if (field.type === 'date') {
          if (fieldValue) {
            try {
              fieldValue = new Date(fieldValue).toLocaleDateString('es-MX');
            } catch (e) {
              console.error("Error al formatear fecha:", e);
            }
          }
        } else if (field.type === 'advancedTable') {
          // Para campos de tabla avanzada, se maneja de manera especial
          // y se renderiza más adelante, no aquí
          fieldValue = '[Ver tabla más abajo]';
        } else if (Array.isArray(fieldValue)) {
          // Detectar valores de buenas prácticas en arrays
          if (fieldValue.length === 1 && typeof fieldValue[0] === 'string') {
            if (fieldValue[0] === 'APROBADO') {
              fieldValue = 'APROBADO';
            } else if (fieldValue[0] === 'NO APROBADO') {
              fieldValue = 'NO APROBADO';
            } else if (fieldValue[0] === 'NO APLICA') {
              fieldValue = 'NO APLICA';
            } else {
              fieldValue = fieldValue.join(', ');
            }
          } else {
            fieldValue = fieldValue.join(', ');
          }
        } else if (field.type === 'buenas-practicas-option' || field.id.includes('checkbox-group')) {
          // Caso especial para formularios de buenas prácticas
          if (fieldValue === 'APROBADO') {
            fieldValue = 'APROBADO';
          } else if (fieldValue === 'NO APROBADO') {
            fieldValue = 'NO APROBADO';
          } else if (fieldValue === 'NO APLICA') {
            fieldValue = 'NO APLICA';
          } else {
            // Tratamos de detectar si el valor es un estado específico
            const lowercaseValue = String(fieldValue).toLowerCase();
            if (lowercaseValue.includes('aprobado') && !lowercaseValue.includes('no')) {
              fieldValue = 'APROBADO';
            } else if (lowercaseValue.includes('no') && lowercaseValue.includes('aprobado')) {
              fieldValue = 'NO APROBADO';
            } else if (lowercaseValue.includes('no') && lowercaseValue.includes('aplica')) {
              fieldValue = 'NO APLICA';
            } else {
              fieldValue = fieldValue || '';
            }
          }
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
          
          // Identificar campos específicos de buenas prácticas por su ID
          const bpFieldIds = [
            "3d02e27f-a5e8-4b6b-a8fa-82ee600cf12e",
            "5bb73f01-5300-42be-985d-06a471027ef8",
            "03364956-5d2c-4f31-8ad1-302cd9815ecf",
            "421ff0d4-353f-40a8-a276-7d58d9c7a6ee",
            "9cf8d32f-44a2-43c6-9e8e-45c099225467",
            "d3409f51-f132-4881-906a-b7d5cb6c55e4"
          ];
          
          // Manejar específicamente estos campos
          if (bpFieldIds.includes(fieldId) && Array.isArray(fieldValue) && fieldValue.length > 0) {
            fieldValue = fieldValue[0]; // Extraer el primer valor del array
          }
          
          // Convertir el valor según el tipo de campo
          if (field.type === 'select' || field.type === 'radio') {
            if (fieldValue && typeof fieldValue === 'object' && 'label' in fieldValue) {
              fieldValue = fieldValue.label;
            }
          } else if (field.type === 'checkbox') {
            // Los campos de buenas prácticas pueden ser de tipo checkbox pero tienen valores diferentes
            const bpFieldIds = [
              "3d02e27f-a5e8-4b6b-a8fa-82ee600cf12e",
              "5bb73f01-5300-42be-985d-06a471027ef8",
              "03364956-5d2c-4f31-8ad1-302cd9815ecf",
              "421ff0d4-353f-40a8-a276-7d58d9c7a6ee",
              "9cf8d32f-44a2-43c6-9e8e-45c099225467",
              "d3409f51-f132-4881-906a-b7d5cb6c55e4"
            ];
            
            if (bpFieldIds.includes(fieldId)) {
              // No convertir a "Sí/No" para campos de buenas prácticas
              // Ya se habrán manejado arriba
            } else {
              fieldValue = fieldValue ? 'Sí' : 'No';
            }
          } else if (field.type === 'date') {
            if (fieldValue) {
              try {
                fieldValue = new Date(fieldValue).toLocaleDateString('es-MX');
              } catch (e) {
                console.error("Error al formatear fecha:", e);
              }
            }
          } else if (field.type === 'advancedTable') {
            // Para campos de tabla avanzada, se maneja de manera especial
            // y se renderiza más adelante, no aquí
            fieldValue = '[Ver tabla más abajo]';
          } else if (Array.isArray(fieldValue)) {
            // Detectar valores de buenas prácticas en arrays
            if (fieldValue.length === 1 && typeof fieldValue[0] === 'string') {
              if (fieldValue[0] === 'APROBADO') {
                fieldValue = 'APROBADO';
              } else if (fieldValue[0] === 'NO APROBADO') {
                fieldValue = 'NO APROBADO';
              } else if (fieldValue[0] === 'NO APLICA') {
                fieldValue = 'NO APLICA';
              } else {
                fieldValue = fieldValue.join(', ');
              }
            } else {
              fieldValue = fieldValue.join(', ');
            }
          } else if (field.type === 'buenas-practicas-option' || field.id.includes('checkbox-group')) {
            // Caso especial para formularios de buenas prácticas
            if (fieldValue === 'APROBADO') {
              fieldValue = 'APROBADO';
            } else if (fieldValue === 'NO APROBADO') {
              fieldValue = 'NO APROBADO';
            } else if (fieldValue === 'NO APLICA') {
              fieldValue = 'NO APLICA';
            } else {
              // Tratamos de detectar si el valor es un estado específico
              const lowercaseValue = String(fieldValue).toLowerCase();
              if (lowercaseValue.includes('aprobado') && !lowercaseValue.includes('no')) {
                fieldValue = 'APROBADO';
              } else if (lowercaseValue.includes('no') && lowercaseValue.includes('aprobado')) {
                fieldValue = 'NO APROBADO';
              } else if (lowercaseValue.includes('no') && lowercaseValue.includes('aplica')) {
                fieldValue = 'NO APLICA';
              } else {
                fieldValue = fieldValue || '';
              }
            }
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
    
    // Título simple "Firma" como en la imagen de referencia
    // Centrado exactamente en la posición correspondiente al recuadro
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#000')
       .text('Firma', 0, doc.y, { 
          align: 'center',
          width: pageWidth
       });
       
    doc.moveDown(0.5);
    
    // Dibujar un recuadro simple para la firma como en la imagen de referencia
    const signatureBoxWidth = 300;
    const signatureBoxHeight = 80;
    const signatureBoxX = pageCenter - (signatureBoxWidth / 2);
    const signatureBoxY = doc.y;
    
    // Dibujar un recuadro simple con borde gris claro
    doc.rect(signatureBoxX, signatureBoxY, signatureBoxWidth, signatureBoxHeight)
       .lineWidth(0.5)
       .stroke('#999999');
       
    // Restaurar la opacidad para asegurarnos
    doc.fillOpacity(1);
    
    // Centrar la firma dentro del recuadro
    try {
      // Intentar añadir la imagen de firma
      if (entry.signature && entry.signature.startsWith('data:image')) {
        // Extraer la parte de base64 de la data URL
        const base64Data = entry.signature.split(',')[1];
        if (base64Data) {
          // Convertir a buffer
          const signatureBuffer = Buffer.from(base64Data, 'base64');
          
          // Dimensiones óptimas para la firma
          const signatureWidth = 180;
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
      doc.fontSize(9).font('Helvetica').text('Documento firmado electrónicamente', 
        signatureBoxX + 50, signatureBoxY + 30, { 
          width: signatureBoxWidth - 100,
          align: 'center' 
        });
    }
    
    // Movernos al final del recuadro
    doc.y = signatureBoxY + signatureBoxHeight + 15;
    
    // Información del firmante en formato similar a la imagen de referencia
    doc.fillColor('#000000');
    
    // Texto de "Firmado por" y la fecha en dos columnas
    const firmadoPorX = pageCenter - 100;
    const fechaFirmaX = pageCenter + 20;
    
    // Columna izquierda: Firmado por
    doc.fontSize(9).font('Helvetica-Bold')
       .text('Firmado por:', firmadoPorX, doc.y);
    doc.font('Helvetica')
       .text(`${entry.signedBy ? creator?.name || `Usuario ID: ${entry.signedBy}` : creatorName}`, 
          firmadoPorX, doc.y);
    
    // Columna derecha: Fecha de firma (en la misma línea)
    if (entry.signedAt) {
      // Posicionar en la misma altura que "Firmado por"
      doc.fontSize(9).font('Helvetica-Bold')
         .text('Fecha de firma:', fechaFirmaX, doc.y - doc.currentLineHeight());
      doc.font('Helvetica')
         .text(`${new Date(entry.signedAt).toLocaleDateString('es-MX')}`, 
            fechaFirmaX, doc.y);
    }
  }
  
  // Pie de página como en la imagen de referencia
  // Siempre colocamos el pie de página en la parte inferior de la página actual
  doc.moveDown(2);
  const bottomPos = doc.page.height - 40;
  
  // Guardar la posición actual del cursor
  const currentPos = doc.y;
  
  // Texto del pie de página
  doc.fontSize(8).font('Helvetica').fillColor('#333333')
     .text(
       `Documento generado automáticamente por el sistema de captura de formularios.`,
       50, bottomPos - 20, 
       { align: 'center', width: doc.page.width - 100 }
     );
     
  doc.fontSize(8).font('Helvetica')
     .text(
       `© ${new Date().getFullYear()} GELAG S.A DE C.V. - Todos los derechos reservados`,
       50, bottomPos - 10, 
       { align: 'center', width: doc.page.width - 100 }
     );
     
  // Restaurar la posición del cursor solo si no hemos avanzado demasiado
  if (currentPos < bottomPos - 50) {
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