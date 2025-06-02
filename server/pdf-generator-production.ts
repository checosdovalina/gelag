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