import PDFDocument from 'pdfkit';
import { ProductionForm, User } from '@shared/schema';
import * as fs from 'fs';
import * as path from 'path';

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
      
      // Crear un nuevo documento PDF en formato vertical optimizado
      const doc = new PDFDocument({
        margins: { top: 40, bottom: 40, left: 40, right: 40 },
        size: 'A4',
        layout: 'portrait',
        compress: true
      });
      
      // Capturar datos del documento
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      
      // Resolver la promesa cuando el documento esté finalizado
      doc.on('end', () => {
        const result = Buffer.concat(chunks);
        console.log("PDF de producción generado correctamente");
        resolve(result);
      });
      
      // Capturar errores
      doc.on('error', (err: Error) => {
        console.error("Error al generar PDF de producción:", err);
        reject(err);
      });
      
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

// Función para dibujar una tabla de información principal
function drawInfoTable(doc: any, form: ProductionForm, y: number): number {
  const pageWidth = doc.page.width;
  const tableX = 40;
  const tableWidth = pageWidth - 80;
  const rowHeight = 18;
  
  // Datos del formulario en tabla organizada
  const data = [
    ['Folio:', form.folio || 'N/A', 'Fecha:', form.date ? new Date(form.date).toLocaleDateString('es-MX') : 'N/A'],
    ['Producto ID:', form.productId?.toString() || 'N/A', 'Litros:', form.liters?.toString() || 'N/A'],
    ['Responsable:', form.responsible || 'N/A', 'Estado:', getStatusLabel(form.status)],
    ['Lote:', form.lotNumber || 'N/A', 'Creado por:', form.createdBy?.toString() || 'N/A']
  ];
  
  data.forEach((row, index) => {
    const currentY = y + (index * rowHeight);
    
    // Fondo alternado
    if (index % 2 === 0) {
      doc.rect(tableX, currentY, tableWidth, rowHeight).fillAndStroke('#f8f9fa', '#dee2e6');
    } else {
      doc.rect(tableX, currentY, tableWidth, rowHeight).fillAndStroke('#ffffff', '#dee2e6');
    }
    
    // Primera columna
    doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold');
    doc.text(row[0], tableX + 8, currentY + 4);
    doc.font('Helvetica').text(row[1], tableX + 80, currentY + 4);
    
    // Segunda columna
    doc.font('Helvetica-Bold').text(row[2], tableX + tableWidth/2 + 8, currentY + 4);
    doc.font('Helvetica').text(row[3], tableX + tableWidth/2 + 80, currentY + 4);
  });
  
  return y + (data.length * rowHeight) + 10;
}

// Función para dibujar sección con encabezado
function drawSectionHeader(doc: any, title: string, y: number): number {
  const pageWidth = doc.page.width;
  const headerHeight = 22;
  
  doc.rect(40, y, pageWidth - 80, headerHeight).fillAndStroke('#1e40af', '#1e40af');
  doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold');
  doc.text(title, 40, y + 6, { 
    align: 'center',
    width: pageWidth - 80
  });
  
  return y + headerHeight + 5;
}

// Función para dibujar tabla de materias primas
function drawIngredientsTable(doc: any, form: ProductionForm, y: number): number {
  if (!form.ingredients || !Array.isArray(form.ingredients) || form.ingredients.length === 0) {
    return y;
  }

  const startY = drawSectionHeader(doc, 'MATERIAS PRIMAS', y);
  const tableX = 40;
  const pageWidth = doc.page.width;
  const tableWidth = pageWidth - 80;
  const rowHeight = 16;
  
  // Encabezados de tabla
  doc.rect(tableX, startY, tableWidth, rowHeight).fillAndStroke('#e9ecef', '#adb5bd');
  doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold');
  doc.text('Materia Prima', tableX + 8, startY + 4);
  doc.text('Cantidad (kg)', tableX + 200, startY + 4);
  doc.text('Hora', tableX + 350, startY + 4);
  
  let currentY = startY + rowHeight;
  const processData = form as any;
  
  form.ingredients.forEach((ingredient: any, index: number) => {
    if (ingredient.quantity > 0) {
      const time = processData.ingredientTimes?.[index] || 'No registrada';
      
      // Fondo alternado
      doc.rect(tableX, currentY, tableWidth, rowHeight).fillAndStroke(
        index % 2 === 0 ? '#ffffff' : '#f8f9fa', '#dee2e6'
      );
      
      doc.fillColor('#000000').fontSize(8).font('Helvetica');
      doc.text(ingredient.name || '', tableX + 8, currentY + 4);
      doc.text(`${ingredient.quantity} ${ingredient.unit}`, tableX + 200, currentY + 4);
      doc.text(time, tableX + 350, currentY + 4);
      
      currentY += rowHeight;
    }
  });
  
  return currentY + 15;
}

// Función para dibujar tabla de control de proceso
function drawProcessTable(doc: any, form: ProductionForm, y: number): number {
  const processData = form as any;
  
  if (!processData.temperature && !processData.pressure) {
    return y;
  }

  const startY = drawSectionHeader(doc, 'CONTROL DE PROCESO', y);
  const tableX = 40;
  const pageWidth = doc.page.width;
  const tableWidth = pageWidth - 80;
  const rowHeight = 16;
  
  // Encabezados
  doc.rect(tableX, startY, tableWidth, rowHeight).fillAndStroke('#e9ecef', '#adb5bd');
  doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold');
  doc.text('Tiempo', tableX + 8, startY + 4);
  doc.text('Temperatura (°C)', tableX + 150, startY + 4);
  doc.text('Presión (PSI)', tableX + 300, startY + 4);
  
  let currentY = startY + rowHeight;
  
  const maxRows = Math.max(
    processData.temperature?.length || 0,
    processData.pressure?.length || 0
  );
  
  for (let i = 0; i < maxRows; i++) {
    const temp = processData.temperature?.[i] || '';
    const pressure = processData.pressure?.[i] || '';
    
    if (temp || pressure) {
      doc.rect(tableX, currentY, tableWidth, rowHeight).fillAndStroke(
        i % 2 === 0 ? '#ffffff' : '#f8f9fa', '#dee2e6'
      );
      
      doc.fillColor('#000000').fontSize(8).font('Helvetica');
      doc.text(`Hora ${i}`, tableX + 8, currentY + 4);
      doc.text(temp, tableX + 150, currentY + 4);
      doc.text(pressure, tableX + 300, currentY + 4);
      
      currentY += rowHeight;
    }
  }
  
  return currentY + 15;
}

// Función para dibujar tabla de control de calidad
function drawQualityTable(doc: any, form: ProductionForm, y: number): number {
  const processData = form as any;
  
  if (!processData.qualityTimes && !processData.brix && !processData.qualityTemp) {
    return y;
  }

  const startY = drawSectionHeader(doc, 'CONTROL DE CALIDAD', y);
  const tableX = 40;
  const pageWidth = doc.page.width;
  const tableWidth = pageWidth - 80;
  const rowHeight = 16;
  
  // Encabezados
  doc.rect(tableX, startY, tableWidth, rowHeight).fillAndStroke('#e9ecef', '#adb5bd');
  doc.fillColor('#000000').fontSize(8).font('Helvetica-Bold');
  
  const colWidth = tableWidth / 9;
  const headers = ['Hora', 'Brix', 'Temp', 'Textura', 'Color', 'Visc.', 'Olor', 'Sabor', 'Estado'];
  headers.forEach((header, index) => {
    doc.text(header, tableX + (index * colWidth) + 4, startY + 4);
  });
  
  let currentY = startY + rowHeight;
  
  const maxQualityRows = Math.max(
    processData.qualityTimes?.length || 0,
    processData.brix?.length || 0,
    processData.qualityTemp?.length || 0
  );
  
  for (let i = 0; i < maxQualityRows; i++) {
    const time = processData.qualityTimes?.[i] || '';
    const brix = processData.brix?.[i] || '';
    const temp = processData.qualityTemp?.[i] || '';
    const texture = processData.texture?.[i] || 'Ok';
    const color = processData.color?.[i] || 'Ok';
    const viscosity = processData.viscosity?.[i] || 'Ok';
    const smell = processData.smell?.[i] || 'Ok';
    const taste = processData.taste?.[i] || 'Ok';
    const status = processData.statusCheck?.[i] || 'Ok';
    
    if (time || brix || temp) {
      doc.rect(tableX, currentY, tableWidth, rowHeight).fillAndStroke(
        i % 2 === 0 ? '#ffffff' : '#f8f9fa', '#dee2e6'
      );
      
      doc.fillColor('#000000').fontSize(7).font('Helvetica');
      const values = [time, brix, temp, texture, color, viscosity, smell, taste, status];
      values.forEach((value, index) => {
        doc.text(value, tableX + (index * colWidth) + 4, currentY + 4);
      });
      
      currentY += rowHeight;
    }
  }
  
  return currentY + 15;
}

// Función para dibujar resultados finales
function drawFinalResults(doc: any, form: ProductionForm, y: number): number {
  const processData = form as any;
  
  const startY = drawSectionHeader(doc, 'RESULTADOS FINALES', y);
  
  doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold');
  
  let currentY = startY;
  const lineHeight = 16;
  
  if (processData.cmConsistometer) {
    doc.text(`Consistómetro (cm): ${processData.cmConsistometer}`, 50, currentY);
    currentY += lineHeight;
  }
  
  if (processData.finalBrix) {
    doc.text(`Brix Final: ${processData.finalBrix}`, 200, startY);
  }
  
  if (processData.yield) {
    doc.text(`Rendimiento: ${processData.yield}`, 350, startY);
  }
  
  return currentY + 20;
}

// Función para dibujar información de destino
function drawDestinationInfo(doc: any, form: ProductionForm, y: number): number {
  const processData = form as any;
  
  if (!processData.destinationType && !processData.destinationKilos) {
    return y;
  }

  const startY = drawSectionHeader(doc, 'DESTINO DEL PRODUCTO', y);
  
  doc.fillColor('#000000').fontSize(9).font('Helvetica');
  
  let currentY = startY;
  
  if (processData.destinationType) {
    doc.font('Helvetica-Bold').text('Tipo: ', 50, currentY);
    doc.font('Helvetica').text(processData.destinationType, 90, currentY);
    currentY += 16;
  }
  
  if (processData.destinationKilos) {
    doc.font('Helvetica-Bold').text('Kilos: ', 50, currentY);
    doc.font('Helvetica').text(processData.destinationKilos.toString(), 90, currentY);
    currentY += 16;
  }
  
  if (processData.destinationProduct) {
    doc.font('Helvetica-Bold').text('Producto: ', 50, currentY);
    doc.font('Helvetica').text(processData.destinationProduct, 100, currentY);
    currentY += 16;
  }
  
  if (processData.totalKilos) {
    doc.font('Helvetica-Bold').text('Total Kilos: ', 50, currentY);
    doc.font('Helvetica').text(processData.totalKilos.toString(), 120, currentY);
    currentY += 16;
  }
  
  return currentY + 20;
}

// Función para generar el contenido del PDF
function generateProductionPDFContent(
  doc: any,
  form: ProductionForm, 
  creator?: User
): void {
  const pageWidth = doc.page.width;
  let currentY = 20;
  
  // Título del documento con fondo azul
  doc.rect(40, currentY, pageWidth - 80, 35).fillAndStroke('#2563eb', '#2563eb');
  doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold');
  doc.text('FORMULARIO DE PRODUCCIÓN', 40, currentY + 10, { 
    align: 'center',
    width: pageWidth - 80
  });
  
  currentY += 40;
  
  // Dirección de la empresa
  doc.fontSize(8).font('Helvetica').fillColor('#666666')
    .text('GELAG S.A DE C.V. BLVD. SANTA RITA #842, PARQUE INDUSTRIAL SANTA RITA, GOMEZ PALACIO, DGO.', 
      40, currentY, {
        align: 'center',
        width: pageWidth - 80
      });
  
  currentY += 25;
  
  // Información principal del formulario
  currentY = drawInfoTable(doc, form, currentY);
  currentY += 10;
  
  // Secciones del formulario
  currentY = drawIngredientsTable(doc, form, currentY);
  currentY = drawProcessTable(doc, form, currentY);
  currentY = drawQualityTable(doc, form, currentY);
  currentY = drawFinalResults(doc, form, currentY);
  currentY = drawDestinationInfo(doc, form, currentY);
  
  // Información adicional
  const processData = form as any;
  
  if (processData.startTime || processData.endTime) {
    currentY = drawSectionHeader(doc, 'TIEMPOS DE PROCESO', currentY);
    doc.fillColor('#000000').fontSize(9).font('Helvetica');
    
    if (processData.startTime) {
      doc.font('Helvetica-Bold').text('Hora Inicio: ', 50, currentY);
      doc.font('Helvetica').text(processData.startTime, 120, currentY);
      currentY += 16;
    }
    
    if (processData.endTime) {
      doc.font('Helvetica-Bold').text('Hora Término: ', 50, currentY);
      doc.font('Helvetica').text(processData.endTime, 120, currentY);
      currentY += 16;
    }
    
    currentY += 15;
  }
  
  if (processData.caducidad || form.marmita) {
    currentY = drawSectionHeader(doc, 'INFORMACIÓN ADICIONAL', currentY);
    doc.fillColor('#000000').fontSize(9).font('Helvetica');
    
    if (processData.caducidad) {
      doc.font('Helvetica-Bold').text('Fecha de Caducidad: ', 50, currentY);
      doc.font('Helvetica').text(processData.caducidad, 150, currentY);
      currentY += 16;
    }
    
    if (form.marmita) {
      doc.font('Helvetica-Bold').text('Marmita: ', 50, currentY);
      doc.font('Helvetica').text(form.marmita, 100, currentY);
      currentY += 16;
    }
  }
  
  // Pie de página
  const now = new Date();
  const dateString = now.toLocaleDateString('es-MX');
  const timeString = now.toLocaleTimeString('es-MX');
  
  doc.fontSize(8).font('Helvetica').fillColor('#666666');
  doc.text(`Generado el: ${dateString} a las ${timeString}`, 40, doc.page.height - 40, {
    align: 'center',
    width: pageWidth - 80
  });
}

// Función auxiliar para obtener etiqueta de estado
function getStatusLabel(status: string | undefined): string {
  const statusLabels: { [key: string]: string } = {
    'draft': 'Borrador',
    'in_progress': 'En Progreso',
    'completed': 'Completado',
    'signed': 'Firmado',
    'approved': 'Aprobado'
  };
  
  return statusLabels[status || 'draft'] || 'Borrador';
}