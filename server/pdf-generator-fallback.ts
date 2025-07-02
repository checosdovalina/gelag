import PDFDocument from 'pdfkit';
import { FormEntry, FormTemplate } from '@shared/schema';
import { User } from '@shared/schema';
import fs from 'fs';
import path from 'path';

// Función para generar contenido específico del formulario PR-PR-02
function generatePRPR02Content(doc: any, entry: FormEntry): void {
  const data = entry.data as any;
  
  // Información básica en formato compacto - similar a la imagen
  const leftCol = 50;
  const rightCol = doc.page.width / 2;
  let currentY = doc.y;
  
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000');
  
  // Primera fila de información
  doc.text('Folio:', leftCol, currentY);
  doc.font('Helvetica').text(data.folio || '', leftCol + 40, currentY);
  
  doc.font('Helvetica-Bold').text('Fecha:', rightCol, currentY);
  doc.font('Helvetica').text(data.fecha || '', rightCol + 40, currentY);
  
  currentY += 15;
  
  // Segunda fila
  doc.font('Helvetica-Bold').text('Producto ID:', leftCol, currentY);
  doc.font('Helvetica').text(data.proceso || '', leftCol + 70, currentY);
  
  doc.font('Helvetica-Bold').text('Litros:', rightCol, currentY);
  doc.font('Helvetica').text(data.linea || '', rightCol + 40, currentY);
  
  currentY += 15;
  
  // Tercera fila
  doc.font('Helvetica-Bold').text('Responsable:', leftCol, currentY);
  doc.font('Helvetica').text(data.responsable || '', leftCol + 70, currentY);
  
  doc.font('Helvetica-Bold').text('Estado:', rightCol, currentY);
  doc.font('Helvetica').text('COMPLETED', rightCol + 40, currentY);
  
  currentY += 15;
  
  // Cuarta fila
  doc.font('Helvetica-Bold').text('Lote:', leftCol, currentY);
  doc.font('Helvetica').text(data.lote || '', leftCol + 40, currentY);
  
  doc.font('Helvetica-Bold').text('Creado por:', rightCol, currentY);
  doc.font('Helvetica').text(data.responsable || '', rightCol + 70, currentY);
  
  currentY += 25;
  doc.y = currentY;
  
  // CONTROL DE PROCESO (simplificado)
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000');
  doc.text('CONTROL DE PROCESO:', leftCol, doc.y);
  doc.moveDown(0.3);
  
  // Tabla simple de control de proceso
  const controlTableY = doc.y;
  const controlHeaders = ['Hora', 'Temperatura', 'Presión'];
  const controlColWidths = [80, 100, 100];
  let controlX = leftCol;
  
  doc.fontSize(9).font('Helvetica-Bold');
  controlHeaders.forEach((header, i) => {
    doc.rect(controlX, controlTableY, controlColWidths[i], 18).stroke();
    doc.text(header, controlX + 5, controlTableY + 5, { width: controlColWidths[i] - 10 });
    controlX += controlColWidths[i];
  });
  
  // Datos de ejemplo del muestreo para control de proceso
  const controlData = data.muestreo_table ? data.muestreo_table.slice(0, 2) : [];
  controlData.forEach((row: any, rowIndex: number) => {
    const rowY = controlTableY + 18 + (rowIndex * 18);
    controlX = leftCol;
    
    doc.font('Helvetica').fontSize(9);
    const values = [row.hora || '', row.h8 || '', row.h9 || ''];
    
    values.forEach((value, i) => {
      doc.rect(controlX, rowY, controlColWidths[i], 18).stroke();
      doc.text(value, controlX + 5, rowY + 5, { width: controlColWidths[i] - 10 });
      controlX += controlColWidths[i];
    });
  });
  
  doc.y = controlTableY + 18 + (Math.max(controlData.length, 1) * 18) + 15;
  
  // CONTROL DE CALIDAD
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000');
  doc.text('CONTROL DE CALIDAD:', leftCol, doc.y);
  doc.moveDown(0.3);
  
  // Tabla de control de calidad
  const calidadTableY = doc.y;
  const calidadHeaders = ['Hora', 'Brix', 'Temp', 'Textura', 'Color', 'Viscosidad', 'Olor', 'Sabor', 'Estado'];
  const calidadColWidths = [50, 40, 40, 50, 40, 60, 40, 40, 50];
  let calidadX = leftCol;
  
  doc.fontSize(8).font('Helvetica-Bold');
  calidadHeaders.forEach((header, i) => {
    doc.rect(calidadX, calidadTableY, calidadColWidths[i], 18).stroke();
    doc.text(header, calidadX + 2, calidadTableY + 5, { width: calidadColWidths[i] - 4 });
    calidadX += calidadColWidths[i];
  });
  
  // Datos de calidad (usando datos de muestreo)
  const calidadData = data.muestreo_table ? data.muestreo_table.slice(0, 2) : [];
  calidadData.forEach((row: any, rowIndex: number) => {
    const rowY = calidadTableY + 18 + (rowIndex * 18);
    calidadX = leftCol;
    
    doc.font('Helvetica').fontSize(8);
    const values = [
      row.hora || '', row.h8 || '', row.h9 || '', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok'
    ];
    
    values.forEach((value, i) => {
      doc.rect(calidadX, rowY, calidadColWidths[i], 18).stroke();
      doc.text(value, calidadX + 2, rowY + 5, { width: calidadColWidths[i] - 4 });
      calidadX += calidadColWidths[i];
    });
  });
  
  doc.y = calidadTableY + 18 + (Math.max(calidadData.length, 1) * 18) + 15;
  
  // RESULTADOS FINALES
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000');
  doc.text('RESULTADOS FINALES:', leftCol, doc.y);
  doc.moveDown(0.5);
  
  // Resultados en una línea
  doc.fontSize(9).font('Helvetica-Bold');
  doc.text('Consistómetro (cm):', leftCol, doc.y);
  doc.font('Helvetica').text('43', leftCol + 110, doc.y);
  
  doc.font('Helvetica-Bold').text('Brix Final:', leftCol + 200, doc.y);
  doc.font('Helvetica').text('44', leftCol + 260, doc.y);
  
  doc.font('Helvetica-Bold').text('Rendimiento:', leftCol + 320, doc.y);
  doc.font('Helvetica').text('53', leftCol + 390, doc.y);
  
  doc.moveDown(1);
  
  // DESTINO DEL PRODUCTO
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000');
  doc.text('DESTINO DEL PRODUCTO:', leftCol, doc.y);
  doc.moveDown(0.3);
  
  // Tabla de destino
  const destinoTableY = doc.y;
  const destinoHeaders = ['Tipo', 'Kilos', 'Producto', 'Estimación'];
  const destinoColWidths = [80, 80, 80, 80];
  let destinoX = leftCol;
  
  doc.fontSize(9).font('Helvetica-Bold');
  destinoHeaders.forEach((header, i) => {
    doc.rect(destinoX, destinoTableY, destinoColWidths[i], 18).stroke();
    doc.text(header, destinoX + 5, destinoTableY + 5, { width: destinoColWidths[i] - 10 });
    destinoX += destinoColWidths[i];
  });
  
  // Datos de destino
  const destinoRowY = destinoTableY + 18;
  destinoX = leftCol;
  const destinoValues = ['Conito', '36', 'test', 'test'];
  
  doc.font('Helvetica').fontSize(9);
  destinoValues.forEach((value, i) => {
    doc.rect(destinoX, destinoRowY, destinoColWidths[i], 18).stroke();
    doc.text(value, destinoX + 5, destinoRowY + 5, { width: destinoColWidths[i] - 10 });
    destinoX += destinoColWidths[i];
  });
  
  doc.y = destinoRowY + 18 + 15;
  
  // ESTADO DEL PROCESO
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000');
  doc.text('ESTADO DEL PROCESO:', leftCol, doc.y);
  doc.moveDown(0.5);
  
  doc.fontSize(9).font('Helvetica-Bold');
  doc.text('Estado Inicial:', leftCol, doc.y);
  doc.font('Helvetica').text('good', leftCol + 80, doc.y);
  
  doc.font('Helvetica-Bold').text('Estado Final:', leftCol + 200, doc.y);
  doc.font('Helvetica').text('good', leftCol + 280, doc.y);
  
  // INGREDIENTES (usando datos de mp_table)
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000');
  doc.text('INGREDIENTES:', leftCol, doc.y);
  doc.moveDown(0.3);
  
  // Tabla de ingredientes
  const ingredientesTableY = doc.y;
  const ingredientesHeaders = ['Nombre', 'Cantidad', 'Unidad'];
  const ingredientesColWidths = [200, 100, 100];
  let ingredientesX = leftCol;
  
  doc.fontSize(9).font('Helvetica-Bold');
  ingredientesHeaders.forEach((header, i) => {
    doc.rect(ingredientesX, ingredientesTableY, ingredientesColWidths[i], 18).stroke();
    doc.text(header, ingredientesX + 5, ingredientesTableY + 5, { width: ingredientesColWidths[i] - 10 });
    ingredientesX += ingredientesColWidths[i];
  });
  
  // Datos de ingredientes usando mp_table
  const ingredientesData = data.mp_table ? data.mp_table.filter((item: any) => item.mp && item.mp.trim() !== '').slice(0, 7) : [
    { mp: 'Leche de Vaca', kilos: '25', unidad: 'kg' },
    { mp: 'Leche de Cabra', kilos: '25', unidad: 'kg' },
    { mp: 'Azúcar', kilos: '10', unidad: 'kg' },
    { mp: 'Glucosa', kilos: '10', unidad: 'kg' },
    { mp: 'Malto', kilos: '2.5', unidad: 'kg' },
    { mp: 'Bicarbonato', kilos: '0.05', unidad: 'kg' },
    { mp: 'Lecitina', kilos: '0.03', unidad: 'kg' }
  ];
  
  ingredientesData.forEach((row: any, rowIndex: number) => {
    const rowY = ingredientesTableY + 18 + (rowIndex * 18);
    ingredientesX = leftCol;
    
    doc.font('Helvetica').fontSize(9);
    const values = [row.mp || '', row.kilos || '', 'kg'];
    
    values.forEach((value, i) => {
      doc.rect(ingredientesX, rowY, ingredientesColWidths[i], 18).stroke();
      doc.text(value, ingredientesX + 5, rowY + 5, { width: ingredientesColWidths[i] - 10 });
      ingredientesX += ingredientesColWidths[i];
    });
  });
  
  doc.y = ingredientesTableY + 18 + (Math.max(ingredientesData.length, 1) * 18) + 20;
  
  // Tabla de Muestreo
  if (data.muestreo_table && Array.isArray(data.muestreo_table) && data.muestreo_table.length > 0) {
    doc.moveDown(1);
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000')
      .text('MUESTREO', 50, doc.y, { 
        align: 'center',
        width: doc.page.width - 100
      });
    
    doc.moveDown(0.5);
    
    // Encabezados de muestreo
    const muestreoTableY = doc.y;
    const muestreoColWidths = [80, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40];
    const muestreoHeaders = ['Hora', 'h8', 'h9', 'h10', 'h11', 'h12', 'h13', 'h14', 'h15', 'h16', 'h17'];
    let muestreoX = 50;
    
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000');
    muestreoHeaders.forEach((header, i) => {
      doc.rect(muestreoX, muestreoTableY, muestreoColWidths[i], 15).stroke();
      doc.text(header, muestreoX + 2, muestreoTableY + 3, { width: muestreoColWidths[i] - 4 });
      muestreoX += muestreoColWidths[i];
    });
    
    // Datos de muestreo (máximo 3 filas)
    data.muestreo_table.slice(0, 3).forEach((row: any, rowIndex: number) => {
      const muestreoRowY = muestreoTableY + 15 + (rowIndex * 15);
      muestreoX = 50;
      
      doc.font('Helvetica').fontSize(8).fillColor('#000000');
      const muestreoValues = [
        row.hora || '',
        row.h8 || '', row.h9 || '', row.h10 || '', row.h11 || '', row.h12 || '',
        row.h13 || '', row.h14 || '', row.h15 || '', row.h16 || '', row.h17 || ''
      ];
      
      muestreoValues.forEach((value, i) => {
        doc.rect(muestreoX, muestreoRowY, muestreoColWidths[i], 15).stroke();
        doc.text(value, muestreoX + 2, muestreoRowY + 3, { width: muestreoColWidths[i] - 4 });
        muestreoX += muestreoColWidths[i];
      });
    });
    
    doc.y = muestreoTableY + 15 + (Math.min(data.muestreo_table.length, 3) * 15) + 10;
  }
  
  // CREAR NUEVA PÁGINA PARA REVISIÓN Y CAMPOS ADICIONALES
  doc.addPage();
  
  // Título para la nueva página
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000')
    .text('REVISIÓN Y DATOS ADICIONALES', 50, 50, { 
      align: 'center',
      width: doc.page.width - 100
    });
  
  doc.y = 80;
  
  // Tabla de Revisión
  if (data.revision_table && Array.isArray(data.revision_table) && data.revision_table.length > 0) {
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000')
      .text('REVISIÓN', 50, doc.y, { 
        align: 'center',
        width: doc.page.width - 100
      });
    
    doc.moveDown(0.5);
    
    // Encabezados de revisión - ajustar anchos para que quepan en la página
    const revisionTableY = doc.y;
    const availableWidth = doc.page.width - 100; // Ancho disponible (dejando márgenes)
    const totalColumns = 11;
    const horaColWidth = 70; // Ancho fijo para columna "Hora"
    const remainingWidth = availableWidth - horaColWidth;
    const hourColWidth = remainingWidth / 10; // Dividir el resto entre las 10 columnas de horas
    
    const revisionColWidths = [horaColWidth, hourColWidth, hourColWidth, hourColWidth, hourColWidth, hourColWidth, hourColWidth, hourColWidth, hourColWidth, hourColWidth, hourColWidth];
    const revisionHeaders = ['Hora', 'h8', 'h9', 'h10', 'h11', 'h12', 'h13', 'h14', 'h15', 'h16', 'h17'];
    let revisionX = 50;
    
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#000000'); // Reducir tamaño de fuente
    revisionHeaders.forEach((header, i) => {
      doc.rect(revisionX, revisionTableY, revisionColWidths[i], 15).stroke();
      doc.text(header, revisionX + 1, revisionTableY + 4, { 
        width: revisionColWidths[i] - 2, 
        align: 'center'
      });
      revisionX += revisionColWidths[i];
    });
    
    // Datos de revisión (máximo 6 filas)
    data.revision_table.slice(0, 6).forEach((row: any, rowIndex: number) => {
      const revisionRowY = revisionTableY + 15 + (rowIndex * 15);
      revisionX = 50;
      
      doc.font('Helvetica').fontSize(7).fillColor('#000000'); // Reducir tamaño de fuente
      const revisionValues = [
        row.hora || '',
        row.h8 || '', row.h9 || '', row.h10 || '', row.h11 || '', row.h12 || '',
        row.h13 || '', row.h14 || '', row.h15 || '', row.h16 || '', row.h17 || ''
      ];
      
      revisionValues.forEach((value, i) => {
        doc.rect(revisionX, revisionRowY, revisionColWidths[i], 15).stroke();
        doc.text(String(value), revisionX + 1, revisionRowY + 4, { 
          width: revisionColWidths[i] - 2,
          align: 'center'
        });
        revisionX += revisionColWidths[i];
      });
    });
    
    doc.y = revisionTableY + 15 + (Math.min(data.revision_table.length, 6) * 15) + 20;
  }
  
  // TODOS LOS CAMPOS ADICIONALES DEL FORMULARIO
  const leftColAdditional = 50;
  const rightColAdditional = doc.page.width / 2;
  
  // Campos adicionales que aparecen en el formulario
  const additionalFields = [
    { key: 'folio_liberacion', label: 'Folio Liberación' },
    { key: 'folio_baja_mp', label: 'Folio Baja MP' },
    { key: 'folio_baja_empaque', label: 'Folio Baja Empaque' },
    { key: 'total_prod_terminado', label: 'Total Producto Terminado' },
    { key: 'hora_inicio', label: 'Hora Inicio' },
    { key: 'hora_fin', label: 'Hora Fin' },
    { key: 'caducidad', label: 'Caducidad' },
    { key: 'observaciones', label: 'Observaciones' }
  ];
  
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000')
    .text('CAMPOS ADICIONALES', 50, doc.y, { 
      align: 'center',
      width: doc.page.width - 100
    });
  
  doc.moveDown(0.5);
  
  // Mostrar campos adicionales en dos columnas
  additionalFields.forEach((field, index) => {
    const value = data[field.key] || '';
    const isLeft = index % 2 === 0;
    const x = isLeft ? leftColAdditional : rightColAdditional;
    
    if (isLeft) {
      doc.moveDown(0.3);
    }
    
    const currentY = doc.y;
    
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000');
    doc.text(`${field.label}:`, x, currentY);
    
    doc.fontSize(9).font('Helvetica').fillColor('#000000');
    const displayValue = field.key === 'observaciones' ? String(value).substring(0, 100) : String(value);
    doc.text(displayValue, x + 100, currentY, { width: 180 });
    
    if (!isLeft) {
      doc.y = currentY + 15;
    }
  });
  
  // Material de Empaque
  if (data.empaque_table && Array.isArray(data.empaque_table) && data.empaque_table.length > 0) {
    doc.moveDown(1);
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000')
      .text('MATERIAL DE EMPAQUE', 50, doc.y, { 
        align: 'center',
        width: doc.page.width - 100
      });
    
    doc.moveDown(0.5);
    
    // Tabla simple para material de empaque
    const empaqueTableY = doc.y;
    const empaqueColWidths = [150, 150, 150];
    const empaqueHeaders = ['Material', 'Cantidad', 'Observaciones'];
    let empaqueX = 50;
    
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000');
    empaqueHeaders.forEach((header, i) => {
      doc.rect(empaqueX, empaqueTableY, empaqueColWidths[i], 20).stroke();
      doc.text(header, empaqueX + 5, empaqueTableY + 5, { width: empaqueColWidths[i] - 10 });
      empaqueX += empaqueColWidths[i];
    });
    
    doc.y = empaqueTableY + 20 + 10;
  }
  
  // Observaciones
  if (data.observaciones) {
    doc.moveDown(1);
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000');
    doc.text('Observaciones:', leftCol, doc.y);
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(9);
    doc.text(data.observaciones, leftCol, doc.y, { width: doc.page.width - 100 });
  }
  
  // Folio de Liberación y Total Producto Terminado
  if (data.folio_liberacion || data.total_prod_terminado) {
    doc.moveDown(1);
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000');
    
    if (data.folio_liberacion) {
      doc.text('Folio de Liberación:', leftCol, doc.y);
      doc.font('Helvetica').text(data.folio_liberacion, leftCol + 100, doc.y);
      doc.moveDown(0.3);
    }
    
    if (data.total_prod_terminado) {
      doc.font('Helvetica-Bold').text('Total Producto Terminado:', leftCol, doc.y);
      doc.font('Helvetica').text(data.total_prod_terminado, leftCol + 130, doc.y);
    }
  }
}

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
      
      // Determinar si el formulario necesita orientación horizontal
      const templateName = template.name || '';
      console.log("Nombre del formulario para decidir orientación:", templateName);
      
      // Verificar si el nombre indica una tabla ancha
      const detectByName = isFormWithWideTable(templateName);
      console.log("Detección por nombre:", detectByName);
      
      // Verificar si hay campos de tabla avanzada anchos
      const hasWideTable = Array.isArray(template.structure?.fields) && 
        template.structure.fields.some(field => 
          field.type === 'advancedTable' && 
          field?.advancedTableConfig?.sections?.[0]?.columns?.length > 6);
          
      console.log("Detección por estructura:", hasWideTable);
      
      // Siempre usar orientación horizontal para microbiología
      const isMicrobiologia = templateName.toLowerCase().includes('microbiologia') || 
                             templateName.toLowerCase().includes('microbiología');
                             
      const needsLandscape = detectByName || hasWideTable || isMicrobiologia;
      
      console.log("¿Usando orientación horizontal?", needsLandscape);

      // Crear un nuevo documento PDF con orientación apropiada y márgenes más compactos
      const doc = new PDFDocument({
        margins: { top: 30, bottom: 30, left: 40, right: 40 },
        size: 'A4',
        layout: needsLandscape ? 'landscape' : 'portrait'
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
            fit: [60, 30], // Logo más pequeño
            align: 'center'
          });
          doc.moveDown(0.2); // Mínimo espacio vertical
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
  doc.fillColor('#000000').fontSize(14).font('Helvetica-Bold'); // Reducido de 18 a 14
  
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
  
  // Establecer posición Y inicial para el título (más compacto)
  const titleY = 20;
  
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
  
  // El título ya ha sido dibujado, ahora añadimos un espacio vertical compacto
  // independientemente de si hay estado o no
  const directionY = titleY + 25; // Posición de la dirección más compacta
  
  // Insertar la dirección de la empresa con margen superior
  doc.fontSize(10).font('Helvetica').fillColor('#000000')
    .text('GELAG S.A DE C.V. BLVD. SANTA RITA #842, PARQUE INDUSTRIAL SANTA RITA, GOMEZ PALACIO, DGO.', 
      50, directionY, {
        align: 'center',
        width: pageWidth - 100
      });
  
  // Si hay estado para mostrar, añadirlo DEBAJO de la dirección
  if (showStatus) {
    // Posición del estado más compacta
    const statusY = directionY + 20; // Menor separación después de la dirección
    
    // Dibujar estado con su color correspondiente
    doc.fontSize(12).font('Helvetica-Bold').fillColor(headerStatusColor);
    doc.text(statusText, 50, statusY, { 
      align: 'center',
      width: pageWidth - 100
    });
    
    // Restablecer color por defecto
    doc.fillColor('#000000');
  }
  
  // Espacio después del título y dirección más compacto
  let lineY = showStatus ? 70 : 60;
  
  // Si es un formulario firmado o aprobado, ajustar el espacio por el título con estado
  if (entry.status === 'signed' || entry.status === 'approved') {
    lineY = 80; // Espacio más compacto para el estado adicional
  }
  
  // Información principal: columnas para folio, fecha, creado por, etc. (más compacto)
  const infoY = lineY + 10;
       
  doc.moveDown(0.3);
  
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
  
  // Avanzar para el contenido principal (más compacto)
  doc.moveDown(1);
  
  // Verificar si es un formulario de Liberación Preoperativa
  if (template.name?.includes('LIBERACION PREOPERATIVA') || template.name?.includes('CA-RE-03-01')) {
    generateLiberacionPreoperativaContentPDF(doc, entry);
    return;
  }
  
  // Verificar si es un formulario de Inspección Diaria de Limpieza
  if (template.name?.includes('INSPECCIÓN DIARIA DE LIMPIEZA') || template.name?.includes('CA-RE-07-01')) {
    console.log('=== GENERANDO PDF DE INSPECCIÓN DE LIMPIEZA ===');
    console.log('Template name:', template.name);
    console.log('Entry data keys:', Object.keys(entry.data || {}));
    generateInspeccionLimpiezaContentPDF(doc, entry, template);
    return;
  }

  // Verificar si es un formulario de Registro de Temperaturas
  if (template.name?.includes('CA-RE-08-01') || template.name?.includes('REGISTRO DE TEMPERATURAS')) {
    console.log('=== GENERANDO PDF DE REGISTRO DE TEMPERATURAS ===');
    console.log('Template name:', template.name);
    console.log('Entry data keys:', Object.keys(entry.data || {}));
    generateRegistroTemperaturasContentPDF(doc, entry, template);
    return;
  }

  // Contenido del formulario
  if (template.structure && template.structure.fields) {
    const fields = template.structure.fields;
    
    // Agrupar campos por sección si existe la propiedad section
    const sections: Record<string, any[]> = {};
    
    // Guardar los campos de tablas avanzadas para procesarlos después
    const advancedTables: any[] = [];
    
    console.log("Buscando tablas dinámicas en los campos del formulario...");
    
    fields.forEach(field => {
      console.log(`Campo: ${field.label} (${field.id}), tipo: ${field.type}`);
      
      // Si es un campo de tabla avanzada, lo guardamos para procesarlo después
      if (field.type === 'advancedTable') {
        console.log(`  - Encontrado campo advancedTable: ${field.label}`);
        console.log(`  - Datos para este campo:`, JSON.stringify(entry.data[field.id]));
        
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
      doc.y = Math.max(doc.y, currentY) + 5;
      
      doc.moveDown(0.3);
    });
    
    // Procesar las tablas avanzadas después de todas las secciones
    if (advancedTables.length > 0) {
      // Verificar si es necesario crear una nueva página según el espacio disponible
      if (doc.y > doc.page.height - 200) {
        doc.addPage();
      } else {
        // Si hay espacio suficiente, solo agregamos un espacio mínimo
        doc.moveDown(0.5);
      }
      
      // Usamos una lógica simplificada para determinar si es microbiología
      let isSingleMicrobiologiaTable = false;

      // Solo verificar si es una tabla de microbiología si hay exactamente 1 tabla
      if (advancedTables.length === 1) {
        const firstTable = advancedTables[0];
        const fieldLabel = firstTable?.field?.label || '';
        
        // Verificar por nombre (forma más segura)
        if (fieldLabel.toLowerCase().includes("microbiologia") || 
            fieldLabel.toLowerCase().includes("microbiología")) {
          isSingleMicrobiologiaTable = true;
        }
        
        // También revisar código de formulario para CA-RE-15
        if (template.name && template.name.includes("CA-RE-15")) {
          isSingleMicrobiologiaTable = true;
        }
      }
      
      // Solo mostramos el título general si no es una única tabla de microbiología
      if (!isSingleMicrobiologiaTable) {
        // Hacer más atractivo el título con fondo y perfectamente centrado
        const titleText = 'TABLAS DE DATOS ADICIONALES';
        // Aumentamos el ancho para que ocupe más espacio en la página
        const titleWidth = pageWidth * 0.7; // 70% del ancho de la página
        const titleHeight = 25;
        // Centramos con precisión, ajustando 10px a la izquierda
        const titleX = ((pageWidth - titleWidth) / 2) - 10;
        const titleY = doc.y;
        
        // Dibujar un fondo para el título
        doc.fillColor('#f5f5f5')
           .rect(titleX, titleY, titleWidth, titleHeight)
           .fill();
        
        // Dibujar un borde para el título
        doc.lineWidth(1)
           .rect(titleX, titleY, titleWidth, titleHeight)
           .stroke('#2a4d69');
        
        // Escribir el texto del título centrado
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#2a4d69')
           .text(titleText, titleX, titleY + 5, {
             align: 'center',
             width: titleWidth
           });
        
        // Espacio después del título
        doc.y = titleY + titleHeight + 10;
      }
      
      // Renderizar cada tabla avanzada
      advancedTables.forEach((tableData, tableIndex) => {
        const field = tableData.field;
        const data = tableData.data;
        const config = field.advancedTableConfig;
        
        if (!config || !config.sections || !Array.isArray(data)) {
          console.log("Tabla avanzada sin configuración válida o sin datos");
          return; // Saltamos esta tabla
        }
        
        // Título de la tabla (etiqueta del campo), ajustado 10px a la izquierda
        const tableLabel = field.displayName || field.label;
        // Calculamos el centro de la página menos 10px
        const centerTextX = (pageWidth / 2) - 10;
        doc.fontSize(12).font('Helvetica-Bold')
           .text(tableLabel, centerTextX - 100, doc.y, { width: 200, align: 'center' });
        
        doc.moveDown(0.5);
        
        console.log("Procesando tabla avanzada:", tableLabel);
        
        // Detectar si es la tabla de microbiología
        const isMicrobiologiaTable = tableLabel.toLowerCase().includes("microbiologia") || 
                                  (config.sections.length === 1 && 
                                   config.sections[0].columns.some(col => 
                                     col.header.includes("Hongos") || 
                                     col.header.includes("Coliformes") || 
                                     col.header.includes("Salmonella")));
                                     
        console.log("¿Es tabla de microbiología?", isMicrobiologiaTable);
                                     
        if (isMicrobiologiaTable) {
          // Renderizar tabla microbiológica en formato tabular
          renderMicrobiologiaTable(doc, config, data, pageWidth);
        } else {
          // Para cada fila de datos en la tabla avanzada (formato original)
          data.forEach((row, rowIndex) => {
            // Verificar que tengamos datos válidos
            if (!row || typeof row !== 'object') return;
            
            // Crear un rectángulo con borde para cada fila
            const startY = doc.y;
            
            // Agregar número de fila con mejor formato
            doc.roundedRect(40, doc.y - 5, pageWidth - 80, 22, 3)
               .fillAndStroke('#f0f0f0', '#cccccc');
               
            doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold')
               .text(`Fila ${rowIndex + 1}`, 50, doc.y + 5, { continued: false });
            
            doc.moveDown(1.2);
            
            // Iterar por cada sección del config
            config.sections.forEach(section => {
              // Título de la sección con color de fondo
              doc.rect(50, doc.y - 2, pageWidth - 100, 20)
                 .fillAndStroke('#e0e0e0', '#d0d0d0');
                 
              doc.fillColor('#333333').fontSize(9).font('Helvetica-Bold')
                 .text(`${section.title}`, 60, doc.y, { continued: false });
              
              doc.moveDown(0.8);
              
              // Crear un grid de 2 columnas para las propiedades
              let leftX = 60;
              let rightX = 300;
              let currentY = doc.y;
              let itemCount = 0;
              const itemsPerColumn = Math.ceil(section.columns.length / 2);
              
              // Columnas de esta sección
              section.columns.forEach((column, colIndex) => {
                const columnId = column.id;
                const columnHeader = column.header;
                let cellValue = row[columnId] || '';
                
                // Calcular posición X e Y
                const currentX = (itemCount < itemsPerColumn) ? leftX : rightX;
                
                if (itemCount === itemsPerColumn) {
                  // Reiniciar Y para la segunda columna
                  currentY = doc.y - (itemCount * 18);
                }
                
                // Formatear valor según tipo
                if (column.type === 'date' && cellValue) {
                  try {
                    cellValue = new Date(cellValue).toLocaleDateString('es-MX');
                  } catch (e) {
                    console.error("Error al formatear fecha en tabla:", e);
                  }
                } else if (column.type === 'checkbox') {
                  cellValue = cellValue ? 'Sí' : 'No';
                } else if (column.type === 'select' && column.options) {
                  // Buscar la etiqueta correspondiente al valor
                  const option = column.options.find(opt => opt.value === cellValue);
                  if (option) {
                    cellValue = option.label;
                  }
                }
                
                // Mostrar nombre de columna y valor con mejor formato
                doc.y = currentY + (itemCount % itemsPerColumn) * 18;
                
                // Rectángulo gris claro para el fondo
                doc.rect(currentX - 3, doc.y - 2, 230, 16)
                   .fillAndStroke('#f9f9f9', '#eeeeee');
                
                // Nombre de la columna en negrita
                doc.fillColor('#333333').fontSize(8).font('Helvetica-Bold')
                   .text(`${columnHeader}:`, currentX, doc.y, { continued: true });
                
                // Valor
                doc.font('Helvetica')
                   .text(` ${cellValue}`);
                   
                itemCount++;
              });
              
              doc.moveDown(0.3);
            });
            
            // Calcular la altura máxima para establecer el separador
            doc.moveDown(1);
            
            // Separador entre filas con mejor estilo
            if (rowIndex < data.length - 1) {
              // Dibujamos una línea decorativa entre filas
              doc.moveTo(50, doc.y)
                 .lineTo(pageWidth - 50, doc.y)
                 .lineWidth(0.5)
                 .dash(3, { space: 2 })
                 .stroke('#aaaaaa');
                 
              // Restaurar configuración de línea
              doc.undash();
              doc.lineWidth(1);
              
              // Espacio mínimo entre filas
              doc.moveDown(0.3);
            }
          });
        }
        
        // Espacio entre tablas
        if (tableIndex < advancedTables.length - 1) {
          // Verificar si hay suficiente espacio para la siguiente tabla
          if (doc.y > doc.page.height - 200) {
            doc.addPage();
          } else {
            doc.moveDown(0.5);
          }
        }
      });
      
      // Función para renderizar una tabla microbiológica en formato tabular
      function renderMicrobiologiaTable(doc, config, data, pageWidth) {
        console.log("Renderizando tabla de microbiología con formato tabular");
        
        // Detectar si estamos en orientación horizontal
        const isLandscape = doc.page.size[0] > doc.page.size[1];
        
        // Reducir márgenes en orientación horizontal para aprovechar más espacio
        const leftMargin = isLandscape ? 40 : 50;
        const tableWidth = pageWidth - (isLandscape ? 80 : 100);
        
        // Tomamos la primera sección
        const section = config.sections[0];
        
        // Calcular anchos de columnas optimizados para el formato microbiológico
        const columnCount = section.columns.length;
        
        // Ajuste de tamaño dependiendo de orientación para asegurar que todo quepa
        const scale = isLandscape ? 0.85 : 1.0; // Reducir tamaño un 15% en horizontal para mejor visualización
        
        // Definir un título más descriptivo y con mejor formato, ajustado 10px a la izquierda
        const centerX = (pageWidth / 2) - 10;  // Centramos pero 10px a la izquierda
        doc.fontSize(isLandscape ? 10 : 12).font('Helvetica-Bold')
          .text('TABLAS DE DATOS ADICIONALES', centerX - 100, doc.y, { width: 200, align: 'center' });
        doc.moveDown(0.2);
        
        // Añadir línea horizontal para separar título de la tabla
        doc.moveTo(leftMargin, doc.y)
           .lineTo(pageWidth - leftMargin, doc.y)
           .stroke();
        doc.moveDown(0.3);
        
        // Subtítulo de la tabla, ajustado 10px a la izquierda
        doc.fontSize(isLandscape ? 9 : 10).font('Helvetica-Bold')
          .text('Registro', centerX - 100, doc.y, { width: 200, align: 'center' });
        doc.moveDown(0.2); // Muy poco espacio después del subtítulo
        
        // Crear distribución de anchos basada en la imagen de referencia
        // Anchos personalizados por tipo de columna (como porcentaje del ancho total)
        const columnWidthMap: Record<string, number> = {
          'fecha': 0.11,        // Fecha - más compacta (como en la imagen)
          'producto': 0.16,     // Producto - ancho medio (ligeramente más ancho)
          'lote': 0.09,         // Lote - muy compacta (como en la imagen)
          'caducidad': 0.11,    // Fecha caducidad - compacta pero legible
          'analisis': 0.11,     // Columnas de análisis - tamaño uniforme
          'resultado': 0.11,    // Resultados - tamaño uniforme para Si/No
          'default': 0.11       // Valor por defecto para columnas no identificadas
        };
        
        // Columna por defecto si no se identifica
        const defaultColumnWidthFactor = 0.15;
        const defaultColumnWidth = Math.floor(tableWidth * defaultColumnWidthFactor * scale);
        
        // Función para determinar el tipo de columna basado en su encabezado
        function getColumnType(headerText) {
          const header = headerText.toLowerCase();
          
          if (header.includes('fecha') && !header.includes('caducidad')) {
            return 'fecha';
          } else if (header.includes('producto') || header.includes('descripción')) {
            return 'producto';
          } else if (header.includes('lote') || header.includes('codigo')) {
            return 'lote';
          } else if (header.includes('caducidad') || header.includes('vencimiento')) {
            return 'caducidad';
          } else if (header.includes('hongos') || header.includes('levaduras') || 
                    header.includes('coliforme') || header.includes('mesofílico') ||
                    header.includes('staphylococcus') || header.includes('staphylococo') ||
                    header.includes('salmonella') || header.includes('mohos') ||
                    header.includes('listeria') || header.includes('microorganismo')) {
            return 'analisis';
          } else if (header.includes('si') || header.includes('no') || 
                    header.includes('resultado') || header.includes('cumple')) {
            return 'resultado';
          }
          
          return 'default';
        }
        
        // Calcular anchos de columna basados en el tipo detectado o en la configuración original
        const columnWidths = [];
        let totalCalculatedWidth = 0;
        
        section.columns.forEach(column => {
          // Obtener tipo de columna por su encabezado
          const columnType = getColumnType(column.header);
          const widthFactor = columnWidthMap[columnType] || defaultColumnWidthFactor;
          
          // Calcular ancho proporcional para esta columna
          const calculatedWidth = Math.floor(tableWidth * widthFactor * scale);
          columnWidths.push(calculatedWidth);
          totalCalculatedWidth += calculatedWidth;
        });
        
        // Ajustar anchos para asegurar que el total sea exactamente el ancho de la tabla
        if (totalCalculatedWidth !== tableWidth) {
          const diff = tableWidth - totalCalculatedWidth;
          // Distribuir la diferencia entre todas las columnas
          const adjustPerColumn = Math.floor(diff / columnCount);
          
          // Aplicar ajuste a todas las columnas
          for (let i = 0; i < columnWidths.length; i++) {
            columnWidths[i] += adjustPerColumn;
          }
          
          // Si queda un residuo, añadirlo a la última columna
          const remainder = diff - (adjustPerColumn * columnCount);
          if (remainder !== 0 && columnWidths.length > 0) {
            columnWidths[columnWidths.length - 1] += remainder;
          }
        }
        
        // Variable para controlar la posición X actual
        let x = leftMargin;
        let y = doc.y;
        
        // Calcular altura para celdas (más pequeñas en horizontal para que quepa todo)
        // En modo horizontal necesitamos celdas más compactas
        const headerHeight = isLandscape ? 20 : 25;
        const rowHeight = isLandscape ? 18 : 20;
        
        // Dibujar fondo de la cabecera
        doc.rect(x, y, tableWidth, headerHeight)
           .fillAndStroke('#e0e0e0', '#cccccc');
        
        // Dibujar encabezados (columnas)
        x = leftMargin; // Resetear posición X al margen dinámico
        section.columns.forEach((column, index) => {
          // Usar el ancho calculado para esta columna
          const colWidth = columnWidths[index] || defaultColumnWidth;
          
          // Dibujar el texto del encabezado
          doc.fillColor('#000000').fontSize(isLandscape ? 7 : 8).font('Helvetica-Bold')
             .text(column.header, x + 3, y + 8, { 
               width: colWidth - 6,
               align: 'center',
               height: headerHeight - 10
             });
          
          // Dibujar línea vertical (excepto para la última columna)
          if (index < columnCount - 1) {
            doc.moveTo(x + colWidth, y)
               .lineTo(x + colWidth, y + headerHeight)
               .stroke('#cccccc');
          }
          
          // Actualizar posición X para la siguiente columna
          x += colWidth;
        });
        
        // Actualizar posición Y para comenzar las filas de datos
        y += headerHeight;
        doc.y = y;
        
        // Dibujar filas de datos
        data.forEach((row, rowIndex) => {
          // Verificar que tengamos datos válidos para esta fila
          if (!row || typeof row !== 'object') return;
          
          // Resetear posición X para comenzar la fila
          x = leftMargin;
          y = doc.y;
          
          // Alternar colores de fondo para las filas
          const fillColor = rowIndex % 2 === 0 ? '#f5f5f5' : '#ffffff';
          
          // Dibujar fondo de la fila
          doc.rect(x, y, tableWidth, rowHeight)
             .fillAndStroke(fillColor, '#cccccc');
          
          // Dibujar cada celda
          section.columns.forEach((column, colIndex) => {
            // Usar el ancho calculado para esta columna (igual que en los encabezados)
            const colWidth = columnWidths[colIndex] || defaultColumnWidth;
            
            // Obtener y formatear el valor de la celda
            let cellValue = row[column.id] || '';
            
            // Formatear valor según tipo
            if (column.type === 'date' && cellValue) {
              try {
                cellValue = new Date(cellValue).toLocaleDateString('es-MX');
              } catch (e) {
                console.error("Error al formatear fecha en tabla:", e);
              }
            } else if (column.type === 'checkbox') {
              cellValue = cellValue ? 'Sí' : 'No';
            } else if (column.type === 'select' && column.options) {
              // Buscar la etiqueta correspondiente al valor
              const option = column.options.find(opt => opt.value === cellValue);
              if (option) {
                cellValue = option.label;
              }
            }
            
            // Dibujar el texto de la celda
            doc.fillColor('#000000').fontSize(isLandscape ? 7 : 8).font('Helvetica')
               .text(cellValue.toString(), x + 3, y + 6, { 
                 width: colWidth - 6,
                 align: 'center',
                 height: rowHeight - 8
               });
            
            // Dibujar línea vertical (excepto para la última columna)
            if (colIndex < columnCount - 1) {
              doc.moveTo(x + colWidth, y)
                 .lineTo(x + colWidth, y + rowHeight)
                 .stroke('#cccccc');
            }
            
            // Actualizar posición X para la siguiente celda
            x += colWidth;
          });
          
          // Actualizar posición Y para la siguiente fila
          doc.y += rowHeight;
        });
        
        // Agregar espacio después de la tabla
        doc.moveDown(2);
      }
    }
  } else {
    // Si no tiene estructura definida, generar formato específico para PR-PR-02
    if (template.name.includes('PR-PR-02') || template.name.includes('dulces')) {
      generatePRPR02Content(doc, entry);
    } else {
      // Para otros formularios sin estructura, mostrar los datos crudos
      doc.fontSize(12).font('Helvetica-Bold').text('Datos del formulario');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').text(JSON.stringify(entry.data, null, 2));
      doc.moveDown(1);
    }
  }
  
  // Sección de firmas (con diseño mejorado para incluir dos firmas)
  // Verificar si el formulario está firmado o si es un formulario aprobado
  if (entry.signature || entry.status === 'SIGNED' || entry.status === 'APPROVED') {
    doc.moveDown(2);
    
    // Crear una sección para dos firmas en columnas
    const pageWidth = doc.page.width;
    const pageCenter = pageWidth / 2;
    
    // Título de la sección
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#000')
       .text('Firmas de autorización', 0, doc.y, { 
          align: 'center',
          width: pageWidth
       });
       
    doc.moveDown(1);
    
    // Configuración de los recuadros para firmas
    const signatureBoxWidth = Math.min(180, (pageWidth / 2) - 50);
    const signatureBoxHeight = 70;
    const spacing = 40;
    
    // Posición X para las dos columnas
    const leftSignatureX = (pageWidth / 2) - signatureBoxWidth - (spacing / 2);
    const rightSignatureX = (pageWidth / 2) + (spacing / 2);
    const signatureBoxY = doc.y;
    
    // -- PRIMERA FIRMA (RESPONSABLE) --
    
    // Título para la primera firma
    doc.fontSize(10).font('Helvetica-Bold')
       .text('Responsable', leftSignatureX, signatureBoxY - 15, { 
          width: signatureBoxWidth, 
          align: 'center' 
       });
    
    // Recuadro para la primera firma
    doc.rect(leftSignatureX, signatureBoxY, signatureBoxWidth, signatureBoxHeight)
       .lineWidth(1)
       .stroke('#999999');
    
    // Insertar la imagen de la firma si existe
    if (entry.signature && entry.signature.startsWith('data:image')) {
      // Extraer la parte de base64 de la data URL
      const base64Data = entry.signature.split(',')[1];
      
      try {
        if (base64Data) {
          // Convertir a buffer
          const signatureBuffer = Buffer.from(base64Data, 'base64');
          
          // Centrar la imagen en el recuadro
          const signatureWidth = Math.min(signatureBoxWidth - 20, 150);
          const signatureHeight = Math.min(signatureBoxHeight - 10, 50);
          
          // Posicionar en el centro del recuadro
          const sigX = leftSignatureX + (signatureBoxWidth - signatureWidth) / 2;
          const sigY = signatureBoxY + (signatureBoxHeight - signatureHeight) / 2;
          
          // Añadir la imagen de la firma
          doc.image(signatureBuffer, sigX, sigY, {
            fit: [signatureWidth, signatureHeight],
            align: 'center' 
          });
        }
      } catch (error) {
        console.error('Error al procesar imagen de firma:', error);
        // Si falla, mostramos texto alternativo
        doc.fontSize(9).font('Helvetica').text('Documento firmado electrónicamente', 
          leftSignatureX + 10, signatureBoxY + 30, { 
            width: signatureBoxWidth - 20,
            align: 'center' 
          });
      }
    }
    
    // Datos debajo de la primera firma
    doc.fontSize(8).font('Helvetica-Bold')
       .text('Nombre:', leftSignatureX, signatureBoxY + signatureBoxHeight + 5, { 
          width: signatureBoxWidth, 
          align: 'left' 
       });
       
    doc.fontSize(8).font('Helvetica')
       .text(
          entry.signedBy ? entry.signedBy : (creator ? creator.name || creator.username : 'Usuario del sistema'),
          leftSignatureX + 45, signatureBoxY + signatureBoxHeight + 5, 
          { width: signatureBoxWidth - 45, align: 'left' }
       );
       
    doc.fontSize(8).font('Helvetica-Bold')
       .text('Fecha:', leftSignatureX, signatureBoxY + signatureBoxHeight + 18, { 
          width: signatureBoxWidth, 
          align: 'left' 
       });
       
    doc.fontSize(8).font('Helvetica')
       .text(
          entry.signedAt 
            ? new Date(entry.signedAt).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) 
            : new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }),
          leftSignatureX + 45, signatureBoxY + signatureBoxHeight + 18, 
          { width: signatureBoxWidth - 45, align: 'left' }
       );
    
    // -- SEGUNDA FIRMA (SUPERVISOR/APROBADOR) --
    
    // Título para la segunda firma
    doc.fontSize(10).font('Helvetica-Bold')
       .text('Supervisor / Aprobador', rightSignatureX, signatureBoxY - 15, { 
          width: signatureBoxWidth, 
          align: 'center' 
       });
    
    // Recuadro para la segunda firma
    doc.rect(rightSignatureX, signatureBoxY, signatureBoxWidth, signatureBoxHeight)
       .lineWidth(1)
       .stroke('#999999');
    
    // Datos debajo de la segunda firma
    doc.fontSize(8).font('Helvetica-Bold')
       .text('Nombre:', rightSignatureX, signatureBoxY + signatureBoxHeight + 5, { 
          width: signatureBoxWidth, 
          align: 'left' 
       });
       
    // Solo mostrar el nombre del aprobador si el formulario está aprobado
    if (entry.status === 'APPROVED' && entry.approvedBy) {
      doc.fontSize(8).font('Helvetica')
         .text(
            entry.approvedBy,
            rightSignatureX + 45, signatureBoxY + signatureBoxHeight + 5, 
            { width: signatureBoxWidth - 45, align: 'left' }
         );
         
      // Mostrar fecha de aprobación si está disponible
      if (entry.approvedAt) {
        doc.fontSize(8).font('Helvetica-Bold')
           .text('Fecha:', rightSignatureX, signatureBoxY + signatureBoxHeight + 18, { 
              width: signatureBoxWidth, 
              align: 'left' 
           });
           
        doc.fontSize(8).font('Helvetica')
           .text(
              new Date(entry.approvedAt).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }),
              rightSignatureX + 45, signatureBoxY + signatureBoxHeight + 18, 
              { width: signatureBoxWidth - 45, align: 'left' }
           );
      }
    } else {
      // Si no está aprobado, dejar espacio para firma manual
      doc.fontSize(8).font('Helvetica')
         .text(
            '________________________________',
            rightSignatureX + 45, signatureBoxY + signatureBoxHeight + 5, 
            { width: signatureBoxWidth - 45, align: 'left' }
         );
         
      doc.fontSize(8).font('Helvetica-Bold')
         .text('Fecha:', rightSignatureX, signatureBoxY + signatureBoxHeight + 18, { 
            width: signatureBoxWidth, 
            align: 'left' 
         });
         
      doc.fontSize(8).font('Helvetica')
         .text(
            '_______________',
            rightSignatureX + 45, signatureBoxY + signatureBoxHeight + 18, 
            { width: signatureBoxWidth - 45, align: 'left' }
         );
    }
    
    // Movernos a después de la sección de firmas
    doc.y = signatureBoxY + signatureBoxHeight + 40;
  }
  
  // Pie de página como en la imagen de referencia
  // Siempre colocamos el pie de página en la parte inferior de la página actual
  doc.moveDown(2);
  // Movemos el pie de página 2 líneas más arriba (20 unidades adicionales)
  const bottomPos = doc.page.height - 60;
  
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
/**
 * Determinar si un formulario necesita orientación horizontal
 * @param formName Nombre del formulario
 * @returns true si el formulario debe mostrarse en horizontal
 */
function isFormWithWideTable(formName: string): boolean {
  if (!formName) return false;
  
  const lowercaseName = formName.toLowerCase();
  
  // Lista de términos que indican formularios anchos (alta probabilidad)
  const highPriorityKeywords = [
    'microbiologia',
    'microbiología',
    'análisis microbiológico',
    'analisis microbiologico',
    'laboratorio'
  ];
  
  // Códigos de formulario específicos que siempre deben ser horizontales
  const horizontalFormCodes = [
    'ca-re-15-01'   // Microbiología
  ];
  
  // Detección por códigos específicos
  if (horizontalFormCodes.some(code => lowercaseName.includes(code))) {
    console.log(`Orientación horizontal detectada por código de formulario: ${formName}`);
    return true;
  }
  
  // Detección por palabras clave de alta prioridad
  if (highPriorityKeywords.some(keyword => lowercaseName.includes(keyword))) {
    console.log(`Orientación horizontal detectada por palabra clave de alta prioridad: ${formName}`);
    return true;
  }
  
  // Lista extendida de términos que podrían indicar formularios anchos
  const wideFormKeywords = [
    'tabla',
    'análisis',
    'analisis',
    'parámetros',
    'parametros',
    'mediciones',
    'resultados',
    'reporte',
    'registro',
    'calidad',
    'control',
    'prueba',
    'test',
    'datos'
  ];
  
  // Si el nombre contiene algún término en la lista extendida, revisar también la longitud
  // Los nombres largos con estos términos suelen indicar formularios complejos con tablas
  const hasKeyword = wideFormKeywords.some(keyword => lowercaseName.includes(keyword));
  const isLongName = formName.length > 30;
  
  if (hasKeyword && isLongName) {
    console.log(`Orientación horizontal detectada por combinación de palabra clave y nombre largo: ${formName}`);
    return true;
  }
  
  return false;
}

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

// Función específica para generar contenido de Registro de Temperaturas en PDF
function generateRegistroTemperaturasContentPDF(doc: any, entry: FormEntry, template: FormTemplate): void {
  const data = entry.data as any;
  
  console.log('=== DATOS DEL FORMULARIO CA-RE-08-01 ===');
  console.log(JSON.stringify(data, null, 2));
  
  // Mapeo directo de los datos conocidos del formulario
  // Según los datos del log: folio: "D22223", equipo: "TESR", serie: "re443434", fecha: "2025-07-01", hora: "03:43", temperatura: "34", observacion: "test", reviso: 2
  
  // Formato en sección GENERAL de dos columnas
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#000');
  doc.text('GENERAL', 50, doc.y, { align: 'center', width: doc.page.width - 100 });
  doc.moveDown(0.5);
  
  // Línea divisoria
  doc.strokeColor('#000000').lineWidth(1);
  doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
  doc.moveDown(0.3);
  
  // Información en dos columnas - MAPEO CORRECTO
  const leftCol = 50;
  const rightCol = doc.page.width / 2 + 20;
  const startY = doc.y;
  
  // Mapeo correcto según datos reales vs labels del PDF
  const leftFields = [
    { label: 'Folio', value: data.folio || 'No especificado' },
    { label: 'Folio', value: '' }, // No hay folio de producción en este formulario
    { label: 'Fechaemision', value: '' }, // No especificado en este formulario
    { label: 'Remplaza', value: '' }, // No especificado
    { label: 'Departamentomisor', value: '' }, // No especificado
    { label: 'Tipo de Documento', value: '' }, // No especificado
    { label: 'Equipo', value: data.equipo || 'No especificado' } // Cambiado de "Fecha" a "Equipo"
  ];
  
  // Mapeo correcto para columna derecha
  const rightFields = [
    { label: 'Serie', value: data.serie || 'No especificado' }, // Cambiado de "Fecha de caducidad"
    { label: 'Fecha', value: data.fecha ? new Date(data.fecha).toLocaleDateString('es-MX') : 'No especificado' }, // Cambiado de "Producto"
    { label: 'Hora', value: data.hora || 'No especificado' }, // Cambiado de "Fecha de caducidad"  
    { label: 'Temperatura', value: data.temperatura || 'No especificado' }, // Cambiado de "Lote"
    { label: 'Observación', value: data.observacion || 'No especificado' }, // Cambiado de "Apariencia"
    { label: 'Revisó', value: data.reviso || 'No especificado' } // Cambiado de "Observaciones"
  ];
  
  // Renderizar columna izquierda
  let currentY = startY;
  leftFields.forEach(field => {
    if (field.value) { // Solo mostrar campos que tienen valor
      doc.fontSize(9).font('Helvetica-Bold')
        .text(`${field.label}:`, leftCol, currentY, { continued: true });
      doc.font('Helvetica')
        .text(` ${field.value}`, leftCol + 80, currentY);
      currentY += 15;
    }
  });
  
  // Renderizar columna derecha
  currentY = startY;
  rightFields.forEach(field => {
    doc.fontSize(9).font('Helvetica-Bold')
      .text(`${field.label}:`, rightCol, currentY, { continued: true });
    doc.font('Helvetica')
      .text(` ${field.value}`, rightCol + 80, currentY);
    currentY += 15;
  });
  
  // Ajustar posición Y para continuar después de las columnas
  doc.y = Math.max(startY + (leftFields.length * 15), startY + (rightFields.length * 15)) + 20;
}

// Función específica para generar contenido de Inspección Diaria de Limpieza en PDF
function generateInspeccionLimpiezaContentPDF(doc: any, entry: FormEntry, template: FormTemplate): void {
  const data = entry.data as any;
  
  // Información general del documento
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#000');
  doc.text('INFORMACIÓN DEL DOCUMENTO', 50, doc.y);
  doc.moveDown(0.5);
  
  // Campos básicos de información
  const infoFields = [
    { label: 'Fecha', value: data.fecha || 'No especificado' },
    { label: 'Folio', value: data.folio || 'No especificado' },
    { label: 'Folio de Producción', value: data.folio_produccion || 'No especificado' },
    { label: 'Departamento Emisor', value: data.departamento_emisor || 'No especificado' }
  ];
  
  infoFields.forEach(field => {
    doc.fontSize(9).font('Helvetica-Bold')
      .text(`${field.label}:`, 50, doc.y, { continued: true });
    doc.font('Helvetica')
      .text(` ${field.value}`);
    doc.moveDown(0.2);
  });
  
  doc.moveDown(0.5);
  
  // Secciones de inspección
  const inspectionSections = [
    { title: 'ADUANA PERSONAL', key: 'aduana_personal', employee_key: 'realizado_por' },
    { title: 'ALMACÉN MATERIA PRIMA', key: 'almacen_materia_prima' },
    { title: 'ÁREA DE REPOSO', key: 'area_reposo' },
    { title: 'ÁREA DE DULCES', key: 'area_dulces' },
    { title: 'ÁREA DE PRODUCCIÓN', key: 'area_produccion' },
    { title: 'ÁREA DE EMPAQUE', key: 'area_empaque' },
    { title: 'ÁREA DE ENVASADO', key: 'area_envasado' },
    { title: 'SERVICIOS SANITARIOS', key: 'servicios_sanitarios', employee_key: 'realizado_por' },
    { title: 'ÁREAS EXTERNAS', key: 'areas_externas', employee_key: 'realizado_por' },
    { title: 'ALMACÉN PRODUCTO TERMINADO', key: 'almacen_producto_terminado', employee_key: 'realizado_por' }
  ];
  
  // Obtener el template para acceder a la estructura de datos
  const sectionData = (template.structure as any)?.sections || [];
  
  inspectionSections.forEach(section => {
    const sectionInfo = data[section.key];
    if (!sectionInfo) return;
    
    // Verificar si necesitamos nueva página
    if (doc.y > doc.page.height - 150) {
      doc.addPage();
    }
    
    // Título de la sección
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#000');
    doc.text(section.title, 50, doc.y);
    doc.moveDown(0.3);
    
    // Encontrar la sección en el template para obtener las actividades
    const templateSection = sectionData.find((s: any) => s.id === section.key);
    let activities = [];
    
    if (templateSection && templateSection.data) {
      activities = templateSection.data;
    }
    
    // Si tenemos actividades del template, mostrarlas en formato tabla
    if (activities.length > 0) {
      const tableStartY = doc.y;
      const actividadWidth = 250;
      const pasaWidth = 80;
      const noPasaWidth = 80;
      const rowHeight = 16;
      
      // Encabezados de la tabla
      doc.fontSize(10).font('Helvetica-Bold');
      doc.rect(50, tableStartY, actividadWidth, rowHeight).fillAndStroke('#f0f0f0', '#000');
      doc.fillColor('#000').text('Actividad', 55, tableStartY + 6);
      doc.rect(50 + actividadWidth, tableStartY, pasaWidth, rowHeight).fillAndStroke('#f0f0f0', '#000');
      doc.fillColor('#000').text('Pasa', 55 + actividadWidth + 20, tableStartY + 6);
      doc.rect(50 + actividadWidth + pasaWidth, tableStartY, noPasaWidth, rowHeight).fillAndStroke('#f0f0f0', '#000');
      doc.fillColor('#000').text('No Pasa', 55 + actividadWidth + pasaWidth + 15, tableStartY + 6);
      
      // Filas de datos
      activities.forEach((activity: any, index: number) => {
        const rowY = tableStartY + rowHeight + (index * rowHeight);
        
        doc.fontSize(9).font('Helvetica');
        
        // Actividad
        doc.rect(50, rowY, actividadWidth, rowHeight).stroke();
        doc.text(activity.actividad || `Actividad ${index + 1}`, 55, rowY + 6, {
          width: actividadWidth - 10,
          height: rowHeight - 12
        });
        
        // Pasa
        doc.rect(50 + actividadWidth, rowY, pasaWidth, rowHeight).stroke();
        let pasaValue = '';
        if (Array.isArray(sectionInfo)) {
          pasaValue = sectionInfo[index]?.pasa ? '✓' : '';
        } else if (sectionInfo[index]) {
          pasaValue = sectionInfo[index].pasa ? '✓' : '';
        }
        doc.text(pasaValue, 55 + actividadWidth + 30, rowY + 6);
        
        // No Pasa
        doc.rect(50 + actividadWidth + pasaWidth, rowY, noPasaWidth, rowHeight).stroke();
        let noPasaValue = '';
        if (Array.isArray(sectionInfo)) {
          noPasaValue = sectionInfo[index]?.no_pasa ? '✓' : '';
        } else if (sectionInfo[index]) {
          noPasaValue = sectionInfo[index].no_pasa ? '✓' : '';
        }
        doc.text(noPasaValue, 55 + actividadWidth + pasaWidth + 25, rowY + 6);
      });
      
      doc.y = tableStartY + rowHeight + (activities.length * rowHeight) + 8;
    }
    
    // Mostrar empleado que realizó la inspección (si aplica)
    if (section.employee_key && sectionInfo[section.employee_key]) {
      doc.fontSize(8).font('Helvetica-Bold')
        .text('Realizado por:', 50, doc.y, { continued: true });
      doc.font('Helvetica')
        .text(` Empleado ID: ${sectionInfo[section.employee_key]}`);
      doc.moveDown(0.2);
    }
    
    doc.moveDown(0.5);
  });
  
  // Observaciones generales
  if (data.observaciones_generales) {
    // Verificar si necesitamos nueva página
    if (doc.y > doc.page.height - 100) {
      doc.addPage();
    }
    
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#000');
    doc.text('OBSERVACIONES GENERALES', 50, doc.y);
    doc.moveDown(0.5);
    
    doc.fontSize(10).font('Helvetica');
    doc.text(data.observaciones_generales, 50, doc.y, {
      width: doc.page.width - 100,
      align: 'justify'
    });
    doc.moveDown(1);
  }
}

// Función específica para generar contenido de Liberación Preoperativa en PDF
function generateLiberacionPreoperativaContentPDF(doc: any, entry: FormEntry): void {
  const data = entry.data as any;
  
  // Información general
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#000');
  doc.text('INFORMACIÓN GENERAL', 50, doc.y);
  doc.moveDown(0.5);
  
  // Campos básicos
  const infoFields = [
    { label: 'Fecha', value: data.fecha || 'No especificado' },
    { label: 'Folio', value: data.folio || 'No especificado' },
    { label: 'Folio de Producción', value: data.folio_produccion || 'No especificado' },
    { label: 'Departamento Emisor', value: data.departamento_emisor || 'No especificado' }
  ];
  
  infoFields.forEach(field => {
    doc.fontSize(10).font('Helvetica-Bold')
      .text(`${field.label}:`, 50, doc.y, { continued: true });
    doc.font('Helvetica')
      .text(` ${field.value}`);
    doc.moveDown(0.3);
  });
  
  doc.moveDown(0.5);
  
  // Resumen de cumplimiento
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#000');
  doc.text('RESUMEN DE CUMPLIMIENTO', 50, doc.y);
  doc.moveDown(0.5);
  
  const complianceData = [
    { section: 'Marmitas', percentage: data.porcentaje_cumplimiento_marmitas || '0%' },
    { section: 'Dulces', percentage: data.porcentaje_cumplimiento_dulces || '0%' },
    { section: 'Producción', percentage: data.porcentaje_cumplimiento_produccion || '0%' },
    { section: 'Reposo', percentage: data.porcentaje_cumplimiento_reposo || '0%' },
    { section: 'Limpieza', percentage: data.porcentaje_cumplimiento_limpieza || '0%' }
  ];
  
  // Tabla de resumen
  const tableStartY = doc.y;
  const colWidth = 150;
  const rowHeight = 20;
  
  // Encabezados
  doc.fontSize(10).font('Helvetica-Bold');
  doc.rect(50, tableStartY, colWidth, rowHeight).stroke();
  doc.text('Sección', 55, tableStartY + 5);
  doc.rect(50 + colWidth, tableStartY, colWidth, rowHeight).stroke();
  doc.text('Porcentaje de Cumplimiento', 55 + colWidth, tableStartY + 5);
  
  // Filas de datos
  complianceData.forEach((item, index) => {
    const rowY = tableStartY + rowHeight + (index * rowHeight);
    doc.fontSize(9).font('Helvetica');
    doc.rect(50, rowY, colWidth, rowHeight).stroke();
    doc.text(item.section, 55, rowY + 5);
    doc.rect(50 + colWidth, rowY, colWidth, rowHeight).stroke();
    doc.text(item.percentage, 55 + colWidth, rowY + 5);
  });
  
  // Fila total
  const totalRowY = tableStartY + rowHeight + (complianceData.length * rowHeight);
  doc.fontSize(10).font('Helvetica-Bold');
  doc.rect(50, totalRowY, colWidth, rowHeight).fillAndStroke('#f9f9f9', '#000');
  doc.fillColor('#000').text('TOTAL', 55, totalRowY + 5);
  doc.rect(50 + colWidth, totalRowY, colWidth, rowHeight).fillAndStroke('#f9f9f9', '#000');
  doc.fillColor('#000').text(data.porcentaje_cumplimiento_total || '0%', 55 + colWidth, totalRowY + 5);
  
  doc.y = totalRowY + rowHeight + 20;
  
  // Secciones de checklist
  const sections = [
    { title: 'SECCIÓN MARMITAS', data: data.seccion_marmitas_checklist },
    { title: 'SECCIÓN DULCES', data: data.seccion_dulces_checklist },
    { title: 'ÁREA DE PRODUCCIÓN', data: data.seccion_area_produccion },
    { title: 'ÁREA DE REPOSO', data: data.seccion_area_reposo },
    { title: 'ESTACIÓN DE LIMPIEZA', data: data.estacion_limpieza }
  ];
  
  sections.forEach(section => {
    if (section.data && Array.isArray(section.data) && section.data.length > 0) {
      // Verificar si necesitamos nueva página
      if (doc.y > doc.page.height - 200) {
        doc.addPage();
      }
      
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#000');
      doc.text(section.title, 50, doc.y);
      doc.moveDown(0.5);
      
      // Tabla de checklist
      const checklistStartY = doc.y;
      const actividadWidth = 200;
      const porcentajeWidth = 60;
      const cumpleWidth = 60;
      const noCumpleWidth = 60;
      const checkRowHeight = 18;
      
      // Encabezados
      doc.fontSize(9).font('Helvetica-Bold');
      doc.rect(50, checklistStartY, actividadWidth, checkRowHeight).stroke();
      doc.text('Actividad', 55, checklistStartY + 5);
      doc.rect(50 + actividadWidth, checklistStartY, porcentajeWidth, checkRowHeight).stroke();
      doc.text('Porcentaje', 55 + actividadWidth, checklistStartY + 5);
      doc.rect(50 + actividadWidth + porcentajeWidth, checklistStartY, cumpleWidth, checkRowHeight).stroke();
      doc.text('Cumple (SI)', 55 + actividadWidth + porcentajeWidth, checklistStartY + 5);
      doc.rect(50 + actividadWidth + porcentajeWidth + cumpleWidth, checklistStartY, noCumpleWidth, checkRowHeight).stroke();
      doc.text('No Cumple (NO)', 55 + actividadWidth + porcentajeWidth + cumpleWidth, checklistStartY + 5);
      
      // Filas de datos
      section.data.forEach((item, index) => {
        const checkRowY = checklistStartY + checkRowHeight + (index * checkRowHeight);
        
        doc.fontSize(8).font('Helvetica');
        
        // Actividad
        doc.rect(50, checkRowY, actividadWidth, checkRowHeight).stroke();
        doc.text(item.actividad || 'No especificado', 55, checkRowY + 5, { 
          width: actividadWidth - 10, 
          height: checkRowHeight - 10 
        });
        
        // Porcentaje
        doc.rect(50 + actividadWidth, checkRowY, porcentajeWidth, checkRowHeight).stroke();
        doc.text(item.porcentaje || '0%', 55 + actividadWidth, checkRowY + 5);
        
        // Cumple SI
        doc.rect(50 + actividadWidth + porcentajeWidth, checkRowY, cumpleWidth, checkRowHeight).stroke();
        const cumpleSi = item.revision_visual_si === 'SI' ? '✓' : '';
        doc.text(cumpleSi, 55 + actividadWidth + porcentajeWidth + 20, checkRowY + 5);
        
        // No Cumple NO
        doc.rect(50 + actividadWidth + porcentajeWidth + cumpleWidth, checkRowY, noCumpleWidth, checkRowHeight).stroke();
        const cumpleNo = item.revision_visual_no === 'SI' ? '✓' : '';
        doc.text(cumpleNo, 55 + actividadWidth + porcentajeWidth + cumpleWidth + 20, checkRowY + 5);
      });
      
      doc.y = checklistStartY + checkRowHeight + (section.data.length * checkRowHeight) + 20;
    }
  });
}