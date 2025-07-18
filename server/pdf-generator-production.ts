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
        margins: { top: 30, bottom: 30, left: 40, right: 40 },
        size: 'A4',
        layout: 'portrait',
        compress: true
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
  
  // Columnas optimizadas para formato horizontal
  const leftColumn = 50;
  const centerColumn = pageWidth / 3 + 20;
  const rightColumn = (pageWidth * 2) / 3 + 20;
  
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
  
  // Ingredientes (MATERIAS PRIMAS) - Primera sección
  if (form.ingredients && Array.isArray(form.ingredients) && form.ingredients.length > 0) {
    doc.font('Helvetica-Bold').fontSize(12).text('MATERIAS PRIMAS:', 50, doc.y);
    doc.moveDown(0.5);
    
    const ingredientsTableY = doc.y;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Materia Prima', 50, ingredientsTableY);
    doc.text('Cantidad (kg)', 200, ingredientsTableY);
    doc.text('Hora', 350, ingredientsTableY);
    
    // Línea separadora
    doc.moveTo(50, ingredientsTableY + 15).lineTo(450, ingredientsTableY + 15).stroke();
    
    let currentIngredientY = ingredientsTableY + 25;
    doc.font('Helvetica').fontSize(9);
    
    form.ingredients.forEach((ingredient: any, index: number) => {
      const time = processData.ingredientTimes?.[index] || 'No registrada';
      if (ingredient.quantity > 0) { // Solo mostrar ingredientes con cantidad mayor a 0
        doc.text(ingredient.name || '', 50, currentIngredientY);
        doc.text(`${ingredient.quantity} ${ingredient.unit}` || '', 200, currentIngredientY);
        doc.text(time, 350, currentIngredientY);
        currentIngredientY += 15;
      }
    });
    
    doc.y = currentIngredientY + 20;
  }
  
  // Sección de Control de Proceso
  if (processData.temperature || processData.pressure) {
    doc.font('Helvetica-Bold').fontSize(12).text('CONTROL DE PROCESO:', 50, doc.y);
    doc.moveDown(0.5);
    
    // Tabla de control de proceso optimizada para vertical
    const tableY = doc.y;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Tiempo', 50, tableY);
    doc.text('Temperatura (°C)', 200, tableY);
    doc.text('Presión (PSI)', 350, tableY);
    
    // Línea separadora
    doc.moveTo(50, tableY + 15).lineTo(450, tableY + 15).stroke();
    
    let currentRowY = tableY + 25;
    doc.font('Helvetica').fontSize(9);
    
    const maxRows = Math.max(
      processData.temperature?.length || 0,
      processData.pressure?.length || 0
    );
    
    for (let i = 0; i < maxRows; i++) {
      const temp = processData.temperature?.[i] || '';
      const pressure = processData.pressure?.[i] || '';
      
      if (temp || pressure) {
        doc.text(i < 6 ? `Hora ${i}` : 'Fin', 50, currentRowY);
        doc.text(temp, 200, currentRowY);
        doc.text(pressure, 350, currentRowY);
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
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Hora', 50, tableY);
    doc.text('Brix', 100, tableY);
    doc.text('Temp', 140, tableY);
    doc.text('Textura', 180, tableY);
    doc.text('Color', 230, tableY);
    doc.text('Visc.', 280, tableY);
    doc.text('Olor', 320, tableY);
    doc.text('Sabor', 360, tableY);
    doc.text('Estado', 410, tableY);
    
    // Línea separadora
    doc.moveTo(50, tableY + 15).lineTo(500, tableY + 15).stroke();
    
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
        doc.text(brix, 100, currentRowY);
        doc.text(temp, 140, currentRowY);
        doc.text(texture, 180, currentRowY);
        doc.text(color, 230, currentRowY);
        doc.text(viscosity, 280, currentRowY);
        doc.text(smell, 320, currentRowY);
        doc.text(taste, 360, currentRowY);
        doc.text(status, 410, currentRowY);
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
    doc.font('Helvetica').fontSize(8);
    
    // Mostrar datos de destino si existen
    if (processData.destinationKilos && typeof processData.destinationKilos === 'object') {
      Object.entries(processData.destinationKilos).forEach(([key, value]) => {
        if (value) {
          doc.text(key, 50, currentDestY);
          doc.text(value.toString(), 150, currentDestY);
          currentDestY += 15;
        }
      });
    }
    
    if (processData.destinationProduct) {
      doc.text('Producto:', 220, destTableY + 25);
      doc.text(processData.destinationProduct, 280, destTableY + 25);
    }
    
    if (processData.destinationEstimation && typeof processData.destinationEstimation === 'object') {
      let estY = destTableY + 25;
      Object.entries(processData.destinationEstimation).forEach(([key, value]) => {
        if (value) {
          doc.text(key, 320, estY);
          doc.text(value.toString(), 380, estY);
          estY += 15;
        }
      });
    }
    
    if (processData.totalKilos) {
      doc.font('Helvetica-Bold').text('Total Kilos:', 50, Math.max(currentDestY, destTableY + 60));
      doc.font('Helvetica').text(processData.totalKilos.toString(), 120, Math.max(currentDestY, destTableY + 60));
    }
    
    doc.y = Math.max(currentDestY, destTableY + 80);
  }
  
  // Información adicional final
  if (processData.startState || processData.endState) {
    doc.font('Helvetica-Bold').fontSize(12).text('ESTADOS:', 50, doc.y);
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
  
  // Agregar datos de empaque si existen
  if (processData.conoData || processData.empaqueData) {
    doc.font('Helvetica-Bold').fontSize(12).text('DATOS DE EMPAQUE:', 50, doc.y);
    doc.moveDown(0.5);
    
    if (processData.conoData && typeof processData.conoData === 'object') {
      doc.font('Helvetica-Bold').fontSize(10).text('Datos de Cono:', 50, doc.y);
      doc.moveDown(0.3);
      
      let conoY = doc.y;
      doc.fontSize(9).font('Helvetica');
      
      Object.entries(processData.conoData).forEach(([key, value]) => {
        if (value) {
          doc.text(`${key}:`, 50, conoY);
          doc.text(value.toString(), 200, conoY);
          conoY += 12;
        }
      });
      
      doc.y = conoY + 10;
    }
    
    if (processData.empaqueData && typeof processData.empaqueData === 'object') {
      doc.font('Helvetica-Bold').fontSize(10).text('Datos de Empaque:', 50, doc.y);
      doc.moveDown(0.3);
      
      let empaqueY = doc.y;
      doc.fontSize(9).font('Helvetica');
      
      Object.entries(processData.empaqueData).forEach(([key, value]) => {
        if (value) {
          doc.text(`${key}:`, 50, empaqueY);
          doc.text(value.toString(), 200, empaqueY);
          empaqueY += 12;
        }
      });
      
      doc.y = empaqueY + 10;
    }
  }
  
  // Observaciones de calidad si existen
  if (processData.qualityNotes) {
    doc.font('Helvetica-Bold').fontSize(12).text('OBSERVACIONES DE CALIDAD:', 50, doc.y);
    doc.moveDown(0.5);
    
    doc.font('Helvetica').fontSize(10);
    doc.text(processData.qualityNotes, 50, doc.y, {
      width: 500,
      align: 'justify'
    });
    
    doc.moveDown(1);
  }
  
  // Información de tiempos de proceso
  if (processData.startTime || processData.endTime) {
    doc.font('Helvetica-Bold').fontSize(12).text('TIEMPOS DE PROCESO:', 50, doc.y);
    doc.moveDown(0.5);
    
    const timeY = doc.y;
    doc.fontSize(10).font('Helvetica-Bold');
    
    if (processData.startTime) {
      doc.text('Hora Inicio:', 50, timeY);
      doc.font('Helvetica').text(processData.startTime, 120, timeY);
    }
    
    if (processData.endTime) {
      doc.font('Helvetica-Bold').text('Hora Término:', 250, timeY);
      doc.font('Helvetica').text(processData.endTime, 330, timeY);
    }
    
    doc.y = timeY + 30;
  }
  
  // Datos de liberación
  if (processData.liberationFolio || processData.cP || processData.cmConsistometer || processData.finalBrix) {
    doc.font('Helvetica-Bold').fontSize(12).text('DATOS DE LIBERACIÓN:', 50, doc.y);
    doc.moveDown(0.5);
    
    const liberationY = doc.y;
    doc.fontSize(10).font('Helvetica-Bold');
    
    if (processData.liberationFolio) {
      doc.text('Folio de Liberación:', 50, liberationY);
      doc.font('Helvetica').text(processData.liberationFolio, 150, liberationY);
    }
    
    if (processData.cP) {
      doc.font('Helvetica-Bold').text('cP:', 300, liberationY);
      doc.font('Helvetica').text(processData.cP, 330, liberationY);
    }
    
    const liberation2Y = liberationY + 20;
    
    if (processData.cmConsistometer) {
      doc.font('Helvetica-Bold').text('Cm Consistómetro:', 50, liberation2Y);
      doc.font('Helvetica').text(processData.cmConsistometer, 150, liberation2Y);
    }
    
    if (processData.finalBrix) {
      doc.font('Helvetica-Bold').text('Grados Brix:', 300, liberation2Y);
      doc.font('Helvetica').text(processData.finalBrix, 380, liberation2Y);
    }
    
    doc.y = liberation2Y + 30;
  }
  
  // Datos del Colador Final
  if (processData.totalKilos || processData.yield) {
    doc.font('Helvetica-Bold').fontSize(12).text('COLADOR FINAL:', 50, doc.y);
    doc.moveDown(0.5);
    
    const coladorY = doc.y;
    doc.fontSize(10).font('Helvetica-Bold');
    
    if (processData.totalKilos) {
      doc.text('Total Kilos:', 50, coladorY);
      doc.font('Helvetica').text(processData.totalKilos, 120, coladorY);
    }
    
    if (processData.yield) {
      doc.font('Helvetica-Bold').text('Rendimiento:', 250, coladorY);
      doc.font('Helvetica').text(processData.yield, 330, coladorY);
    }
    
    doc.y = coladorY + 30;
  }
  
  // Información adicional del formulario
  if (processData.caducidad) {
    doc.font('Helvetica-Bold').fontSize(12).text('INFORMACIÓN ADICIONAL:', 50, doc.y);
    doc.moveDown(0.5);
    
    const additionalY = doc.y;
    doc.fontSize(10).font('Helvetica-Bold');
    
    if (processData.caducidad) {
      doc.text('Fecha de Caducidad:', 50, additionalY);
      doc.font('Helvetica').text(
        new Date(processData.caducidad).toLocaleDateString('es-MX'), 
        160, additionalY
      );
    }
    
    if (processData.marmita) {
      doc.font('Helvetica-Bold').text('Marmita:', 300, additionalY);
      doc.font('Helvetica').text(processData.marmita, 350, additionalY);
    }
    
    doc.y = additionalY + 30;
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