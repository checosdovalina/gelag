import PDFDocument from 'pdfkit';
import { ProductionForm } from '@shared/schema';
import { User } from '@shared/schema';
import fs from 'fs';
import path from 'path';

// Función para generar un PDF de formulario de producción
export async function generateProductionFormPDF(
  form: ProductionForm, 
  creator?: User
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      console.log("Generando PDF para formulario de producción:", form.folio);
      
      // Crear un buffer para almacenar el PDF
      const chunks: Buffer[] = [];
      
      // Crear un nuevo documento PDF
      const doc = new PDFDocument({
        margins: { top: 30, bottom: 30, left: 40, right: 40 },
        size: 'A4',
        layout: 'portrait'
      });
      
      // Capturar datos del documento
      doc.on('data', (chunk) => chunks.push(chunk));
      
      // Resolver la promesa cuando el documento esté finalizado
      doc.on('end', () => {
        const result = Buffer.concat(chunks);
        console.log("PDF de producción generado correctamente");
        resolve(result);
      });
      
      // Capturar errores
      doc.on('error', (err) => {
        console.error("Error al generar PDF de producción:", err);
        reject(err);
      });
      
      // Iniciar generación del PDF
      try {
        // Agregar logo de GELAG
        const logoPath = path.resolve('./public/assets/gelag-logo.png');
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, {
            fit: [60, 30],
            align: 'center'
          });
          doc.moveDown(0.2);
        }
      } catch (logoError) {
        console.error('Error al añadir logo:', logoError);
      }
      
      // Generar el contenido del PDF
      generateProductionPDFContent(doc, form, creator);
      
      // Finalizar el documento
      doc.end();
    } catch (error) {
      console.error("Error al generar PDF de producción:", error);
      reject(error);
    }
  });
}

// Función para generar el contenido del PDF
function generateProductionPDFContent(
  doc: any,
  form: ProductionForm, 
  creator?: User
): void {
  const pageWidth = doc.page.width;
  
  // Título del documento
  doc.fillColor('#000000').fontSize(14).font('Helvetica-Bold');
  doc.text('FORMULARIO DE PRODUCCIÓN', 50, 20, { 
    align: 'center',
    width: pageWidth - 100
  });
  
  // Dirección de la empresa
  doc.fontSize(10).font('Helvetica').fillColor('#000000')
    .text('GELAG S.A DE C.V. BLVD. SANTA RITA #842, PARQUE INDUSTRIAL SANTA RITA, GOMEZ PALACIO, DGO.', 
      50, 45, {
        align: 'center',
        width: pageWidth - 100
      });
  
  doc.moveDown(0.3);
  
  // Información principal del formulario
  const currentY = doc.y;
  
  // Columna izquierda
  const leftColumn = 50;
  const rightColumn = pageWidth / 2 + 20;
  
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000');
  
  // Folio
  doc.text('Folio:', leftColumn, currentY);
  doc.font('Helvetica').text(form.folio || 'N/A', leftColumn + 50, currentY);
  
  // Fecha
  doc.font('Helvetica-Bold').text('Fecha:', rightColumn, currentY);
  doc.font('Helvetica').text(
    form.date ? new Date(form.date).toLocaleDateString('es-MX') : 'N/A', 
    rightColumn + 50, currentY
  );
  
  // Nueva línea
  const lineY = currentY + 20;
  
  // Producto ID
  doc.font('Helvetica-Bold').text('Producto ID:', leftColumn, lineY);
  doc.font('Helvetica').text(form.productId?.toString() || 'N/A', leftColumn + 70, lineY);
  
  // Litros
  doc.font('Helvetica-Bold').text('Litros:', rightColumn, lineY);
  doc.font('Helvetica').text(form.liters?.toString() || 'N/A', rightColumn + 50, lineY);
  
  // Nueva línea
  const line2Y = lineY + 20;
  
  // Responsable
  doc.font('Helvetica-Bold').text('Responsable:', leftColumn, line2Y);
  doc.font('Helvetica').text(form.responsible || 'N/A', leftColumn + 70, line2Y);
  
  // Estado
  doc.font('Helvetica-Bold').text('Estado:', rightColumn, line2Y);
  doc.font('Helvetica').text(getStatusLabel(form.status), rightColumn + 50, line2Y);
  
  // Nueva línea
  const line3Y = line2Y + 20;
  
  // Número de lote (si existe)
  if (form.lotNumber) {
    doc.font('Helvetica-Bold').text('Lote:', leftColumn, line3Y);
    doc.font('Helvetica').text(form.lotNumber, leftColumn + 50, line3Y);
  }
  
  // Creado por
  const creatorName = creator?.name || `Usuario ID: ${form.createdBy}`;
  doc.font('Helvetica-Bold').text('Creado por:', rightColumn, line3Y);
  doc.font('Helvetica').text(creatorName, rightColumn + 70, line3Y);
  
  // Avanzar para el contenido adicional
  doc.y = line3Y + 40;

  // Datos del proceso de producción
  const processData = form as any; // Cast para acceder a los campos adicionales
  
  // Sección de Control de Proceso
  if (processData.temperature || processData.pressure || processData.hourTracking) {
    doc.font('Helvetica-Bold').fontSize(12).text('CONTROL DE PROCESO:', 50, doc.y);
    doc.moveDown(0.5);
    
    // Tabla de control de proceso
    const tableY = doc.y;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Hora', 50, tableY);
    doc.text('Temperatura', 120, tableY);
    doc.text('Presión', 200, tableY);
    
    // Línea separadora
    doc.moveTo(50, tableY + 15).lineTo(350, tableY + 15).stroke();
    
    let currentRowY = tableY + 25;
    doc.font('Helvetica').fontSize(9);
    
    const maxRows = Math.max(
      processData.hourTracking?.length || 0,
      processData.temperature?.length || 0,
      processData.pressure?.length || 0
    );
    
    for (let i = 0; i < maxRows; i++) {
      const hour = processData.hourTracking?.[i] || '';
      const temp = processData.temperature?.[i] || '';
      const pressure = processData.pressure?.[i] || '';
      
      if (hour || temp || pressure) {
        doc.text(hour, 50, currentRowY);
        doc.text(temp, 120, currentRowY);
        doc.text(pressure, 200, currentRowY);
        currentRowY += 15;
      }
    }
    
    doc.y = currentRowY + 20;
  }
  
  // Sección de Control de Calidad
  if (processData.qualityTimes || processData.brix || processData.qualityTemp) {
    doc.font('Helvetica-Bold').fontSize(12).text('CONTROL DE CALIDAD:', 50, doc.y);
    doc.moveDown(0.5);
    
    const tableY = doc.y;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Hora', 50, tableY);
    doc.text('Brix', 120, tableY);
    doc.text('Temp', 170, tableY);
    doc.text('Textura', 220, tableY);
    doc.text('Color', 280, tableY);
    doc.text('Viscosidad', 330, tableY);
    doc.text('Olor', 400, tableY);
    doc.text('Sabor', 450, tableY);
    doc.text('Estado', 500, tableY);
    
    // Línea separadora
    doc.moveTo(50, tableY + 15).lineTo(550, tableY + 15).stroke();
    
    let currentRowY = tableY + 25;
    doc.font('Helvetica').fontSize(8);
    
    const maxQualityRows = Math.max(
      processData.qualityTimes?.length || 0,
      processData.brix?.length || 0,
      processData.qualityTemp?.length || 0,
      processData.texture?.length || 0,
      processData.color?.length || 0,
      processData.viscosity?.length || 0,
      processData.smell?.length || 0,
      processData.taste?.length || 0,
      processData.statusCheck?.length || 0
    );
    
    for (let i = 0; i < maxQualityRows; i++) {
      const time = processData.qualityTimes?.[i] || '';
      const brix = processData.brix?.[i] || '';
      const temp = processData.qualityTemp?.[i] || '';
      const texture = processData.texture?.[i] || '';
      const color = processData.color?.[i] || '';
      const viscosity = processData.viscosity?.[i] || '';
      const smell = processData.smell?.[i] || '';
      const taste = processData.taste?.[i] || '';
      const status = processData.statusCheck?.[i] || '';
      
      if (time || brix || temp || texture || color || viscosity || smell || taste || status) {
        doc.text(time, 50, currentRowY);
        doc.text(brix, 120, currentRowY);
        doc.text(temp, 170, currentRowY);
        doc.text(texture, 220, currentRowY);
        doc.text(color, 280, currentRowY);
        doc.text(viscosity, 330, currentRowY);
        doc.text(smell, 400, currentRowY);
        doc.text(taste, 450, currentRowY);
        doc.text(status, 500, currentRowY);
        currentRowY += 15;
      }
    }
    
    doc.y = currentRowY + 20;
  }
  
  // Información final del proceso
  if (processData.cmConsistometer || processData.finalBrix || processData.yield) {
    doc.font('Helvetica-Bold').fontSize(12).text('RESULTADOS FINALES:', 50, doc.y);
    doc.moveDown(0.5);
    
    const finalY = doc.y;
    doc.fontSize(10).font('Helvetica-Bold');
    
    if (processData.cmConsistometer) {
      doc.text('Consistómetro (cm):', 50, finalY);
      doc.font('Helvetica').text(processData.cmConsistometer, 150, finalY);
    }
    
    if (processData.finalBrix) {
      doc.font('Helvetica-Bold').text('Brix Final:', 250, finalY);
      doc.font('Helvetica').text(processData.finalBrix, 310, finalY);
    }
    
    if (processData.yield) {
      doc.font('Helvetica-Bold').text('Rendimiento:', 400, finalY);
      doc.font('Helvetica').text(processData.yield, 470, finalY);
    }
    
    doc.y = finalY + 30;
  }
  
  // Información de destino del producto
  if (processData.destinationType || processData.destinationKilos || processData.destinationProduct) {
    doc.font('Helvetica-Bold').fontSize(12).text('DESTINO DEL PRODUCTO:', 50, doc.y);
    doc.moveDown(0.5);
    
    const destTableY = doc.y;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Tipo', 50, destTableY);
    doc.text('Kilos', 150, destTableY);
    doc.text('Producto', 220, destTableY);
    doc.text('Estimación', 320, destTableY);
    
    // Línea separadora
    doc.moveTo(50, destTableY + 15).lineTo(450, destTableY + 15).stroke();
    
    let currentDestY = destTableY + 25;
    doc.font('Helvetica').fontSize(9);
    
    const maxDestRows = Math.max(
      processData.destinationType?.length || 0,
      processData.destinationKilos?.length || 0,
      processData.destinationProduct?.length || 0,
      processData.destinationEstimation?.length || 0
    );
    
    for (let i = 0; i < maxDestRows; i++) {
      const type = processData.destinationType?.[i] || '';
      const kilos = processData.destinationKilos?.[i] || '';
      const product = processData.destinationProduct?.[i] || '';
      const estimation = processData.destinationEstimation?.[i] || '';
      
      if (type || kilos || product || estimation) {
        doc.text(type, 50, currentDestY);
        doc.text(kilos, 150, currentDestY);
        doc.text(product, 220, currentDestY);
        doc.text(estimation, 320, currentDestY);
        currentDestY += 15;
      }
    }
    
    doc.y = currentDestY + 20;
  }
  
  // Estados inicial y final
  if (processData.startState || processData.endState) {
    doc.font('Helvetica-Bold').fontSize(12).text('ESTADO DEL PROCESO:', 50, doc.y);
    doc.moveDown(0.5);
    
    const stateY = doc.y;
    doc.fontSize(10).font('Helvetica-Bold');
    
    if (processData.startState) {
      doc.text('Estado Inicial:', 50, stateY);
      doc.font('Helvetica').text(processData.startState, 130, stateY);
    }
    
    if (processData.endState) {
      doc.font('Helvetica-Bold').text('Estado Final:', 250, stateY);
      doc.font('Helvetica').text(processData.endState, 320, stateY);
    }
    
    doc.y = stateY + 30;
  }
  
  // Ingredientes (si existen)
  if (form.ingredients && Array.isArray(form.ingredients) && form.ingredients.length > 0) {
    doc.font('Helvetica-Bold').fontSize(12).text('INGREDIENTES:', 50, doc.y);
    doc.moveDown(0.5);
    
    // Encabezados de tabla
    const tableY = doc.y;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Nombre', 50, tableY);
    doc.text('Cantidad', 200, tableY);
    doc.text('Unidad', 300, tableY);
    
    // Línea separadora
    doc.moveTo(50, tableY + 15).lineTo(pageWidth - 50, tableY + 15).stroke();
    
    let currentRowY = tableY + 25;
    doc.font('Helvetica').fontSize(9);
    
    form.ingredients.forEach((ingredient: any) => {
      doc.text(ingredient.name || 'N/A', 50, currentRowY);
      doc.text(ingredient.quantity || 'N/A', 200, currentRowY);
      doc.text(ingredient.unit || 'N/A', 300, currentRowY);
      currentRowY += 15;
    });
    
    doc.y = currentRowY + 20;
  }
  
  // Tiempos de ingredientes (si existen)
  if (form.ingredientTimes && Array.isArray(form.ingredientTimes) && form.ingredientTimes.length > 0) {
    doc.font('Helvetica-Bold').fontSize(12).text('TIEMPOS DE INGREDIENTES:', 50, doc.y);
    doc.moveDown(0.5);
    
    const tableY = doc.y;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Ingrediente', 50, tableY);
    doc.text('Tiempo', 200, tableY);
    
    // Línea separadora
    doc.moveTo(50, tableY + 15).lineTo(pageWidth - 50, tableY + 15).stroke();
    
    let currentRowY = tableY + 25;
    doc.font('Helvetica').fontSize(9);
    
    form.ingredientTimes.forEach((timeEntry: any) => {
      doc.text(timeEntry.ingredient || 'N/A', 50, currentRowY);
      doc.text(timeEntry.time || 'N/A', 200, currentRowY);
      currentRowY += 15;
    });
    
    doc.y = currentRowY + 20;
  }
  
  // Información de creación al final
  doc.moveDown(2);
  doc.fontSize(8).font('Helvetica');
  doc.text(`Generado el: ${new Date().toLocaleDateString('es-MX')} a las ${new Date().toLocaleTimeString('es-MX')}`, 50, doc.y);
}

// Función para obtener etiqueta del estado
function getStatusLabel(status: string): string {
  switch (status) {
    case 'draft': return 'Borrador';
    case 'in_progress': return 'En Progreso';
    case 'completed': return 'Completado';
    case 'approved': return 'Aprobado';
    case 'rejected': return 'Rechazado';
    default: return status || 'Desconocido';
  }
}