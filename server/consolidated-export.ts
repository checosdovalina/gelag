import { Request, Response, NextFunction } from 'express';
import { FormEntry, FormTemplate, User } from '@shared/schema';
import { storage } from './storage';
import * as exceljs from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import PDFDocument from 'pdfkit';

/**
 * Función para exportar datos consolidados de múltiples formularios a PDF o Excel
 */
export async function exportConsolidatedForms(req: Request, res: Response, next: NextFunction) {
  try {
    const { templateId, entryIds, format, fileName } = req.body;
    
    if (!templateId || !entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
      return res.status(400).json({ message: "Parámetros inválidos" });
    }
    
    if (!format || (format !== "pdf" && format !== "excel")) {
      return res.status(400).json({ message: "Formato no válido. Use 'pdf' o 'excel'." });
    }
    
    // Obtener la plantilla
    const template = await storage.getFormTemplate(templateId);
    if (!template) {
      return res.status(404).json({ message: "Plantilla no encontrada" });
    }
    
    // Obtener todos los formularios
    const entries: FormEntry[] = [];
    for (const id of entryIds) {
      const entry = await storage.getFormEntry(id);
      if (entry) {
        // Verificar permisos para acceder a este formulario
        if (
          req.user!.role !== "superadmin" &&
          req.user!.role !== "admin" && 
          entry.createdBy !== req.user!.id && 
          entry.department !== req.user!.department
        ) {
          continue; // Saltar entradas a las que no tiene acceso
        }
        entries.push(entry);
      }
    }
    
    if (entries.length === 0) {
      return res.status(404).json({ message: "No se encontraron formularios o no tiene permisos para acceder a ellos" });
    }
    
    // Registrar actividad
    await storage.createActivityLog({
      userId: req.user!.id,
      action: "exported_consolidated",
      resourceType: "form_entries",
      resourceId: templateId,
      details: { 
        format, 
        formName: template.name,
        count: entries.length,
        entryIds: entries.map(e => e.id)
      }
    });
    
    // Ordenar formularios por fecha (más reciente primero)
    entries.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
    
    const outputFileName = fileName || `formularios_homologados_${Date.now()}`;
    
    if (format === "pdf") {
      try {
        await generatePDFAndSend(entries, template, outputFileName, res);
      } catch (pdfError) {
        console.error("Error generando PDF:", pdfError);
        return res.status(500).json({ message: "Error al generar PDF", error: String(pdfError) });
      }
    } else {
      try {
        await generateExcelAndSend(entries, template, outputFileName, res);
      } catch (excelError) {
        console.error("Error generando Excel:", excelError);
        return res.status(500).json({ message: "Error al generar Excel", error: String(excelError) });
      }
    }
  } catch (error) {
    console.error("Error al exportar datos consolidados:", error);
    next(error);
  }
}

/**
 * Genera un PDF en un archivo temporal y lo envía al cliente
 */
async function generatePDFAndSend(
  entries: FormEntry[], 
  template: FormTemplate, 
  fileName: string, 
  res: Response
) {
  // Crear un archivo temporal para el PDF
  const tempDir = os.tmpdir();
  const tempFilePath = path.join(tempDir, `${fileName}_${Date.now()}.pdf`);
  
  // Crear un stream para escribir el PDF a un archivo
  const fileStream = fs.createWriteStream(tempFilePath);
  
  // Crear el documento PDF (Landscape para tablas grandes)
  const doc = new PDFDocument({ 
    size: 'A4', 
    layout: 'landscape',
    margin: 30,
    info: {
      Title: `Datos homologados: ${template.name}`,
      Author: 'GELAG - Sistema de Formularios',
    }
  });
  
  // Stream del PDF a un archivo
  doc.pipe(fileStream);
  
  // Añadir logo de GELAG
  try {
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
  
  // Título del documento
  doc.fontSize(16).font('Helvetica-Bold').text(`DATOS HOMOLOGADOS: ${template.name}`, { align: 'center' });
  doc.moveDown();
  doc.fontSize(10).font('Helvetica').text(`Generado el ${new Date().toLocaleString()}`, { align: 'center' });
  doc.moveDown();
  doc.text(`Total de formularios: ${entries.length}`, { align: 'center' });
  doc.moveDown(2);
  
  // Recolectar todos los campos únicos entre todos los formularios para la tabla
  const commonFields = new Set<string>();
  let fieldLabels: Record<string, string> = {};
  
  // Primero identificamos los campos comunes y sus etiquetas
  entries.forEach(entry => {
    if (entry.data && typeof entry.data === 'object') {
      Object.keys(entry.data as Record<string, any>).forEach(key => {
        commonFields.add(key);
      });
    }
  });
  
  // Mapear IDs de campo a etiquetas legibles
  commonFields.forEach(fieldId => {
    let label = fieldId;
    
    if (template.structure && template.structure.fields) {
      const field = template.structure.fields.find((f: any) => f.id === fieldId);
      if (field) {
        label = field.label || field.displayName || fieldId;
      }
    }
    
    fieldLabels[fieldId] = label;
  });
  
  // Filtrar y ordenar campos para la tabla
  const tableFields = Array.from(commonFields).sort((a, b) => {
    // Intentar ordenar por displayOrder si existe
    if (template.structure && template.structure.fields) {
      const fieldA = template.structure.fields.find((f: any) => f.id === a);
      const fieldB = template.structure.fields.find((f: any) => f.id === b);
      
      const orderA = fieldA?.displayOrder || 9999;
      const orderB = fieldB?.displayOrder || 9999;
      
      if (orderA !== orderB) return orderA - orderB;
    }
    
    // Si no hay orden de visualización o es igual, ordenar alfabéticamente por etiqueta
    return fieldLabels[a].localeCompare(fieldLabels[b]);
  });
  
  // Dibujar tabla para los datos
  const tableTop = doc.y + 10;
  const pageWidth = doc.page.width - 60; // Márgenes a ambos lados
  const startX = 30;
  
  // Calcular ancho de columna basado en el número de campos
  // Asumimos al menos las columnas básicas (Fecha, Folio, etc.)
  const columns = [...tableFields];
  const colWidth = Math.min(120, pageWidth / (columns.length || 1));
  
  // Encabezados de la tabla
  let currentX = startX;
  let currentY = tableTop;
  
  // Dibujar fondo del encabezado
  doc.fillColor("#f0f0f0")
     .rect(startX, currentY, pageWidth, 25)
     .fill();
  
  // Dibujar líneas de la tabla para el encabezado
  doc.strokeColor("#000000")
     .lineWidth(0.5)
     .rect(startX, currentY, pageWidth, 25)
     .stroke();
  
  // Texto de los encabezados
  doc.fillColor("#000000").fontSize(9).font('Helvetica-Bold');
  
  columns.forEach((field, i) => {
    // Dibujar línea vertical entre columnas (excepto al principio)
    if (i > 0) {
      doc.moveTo(currentX, currentY)
         .lineTo(currentX, currentY + 25)
         .stroke();
    }
    
    // Texto centrado en la celda
    doc.text(
      fieldLabels[field],
      currentX + 3,
      currentY + 7,
      {
        width: colWidth - 6,
        align: 'center',
        ellipsis: true
      }
    );
    
    currentX += colWidth;
  });
  
  // Avanzamos a la siguiente fila
  currentY += 25;
  
  // Filas de datos
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    
    if (currentY > doc.page.height - 50) {
      doc.addPage({ layout: 'landscape', margin: 30 });
      currentY = 30;
      
      // Repetir encabezados en la nueva página
      currentX = startX;
      
      // Dibujar fondo del encabezado
      doc.fillColor("#f0f0f0")
         .rect(startX, currentY, pageWidth, 25)
         .fill();
      
      // Dibujar líneas de la tabla para el encabezado
      doc.strokeColor("#000000")
         .lineWidth(0.5)
         .rect(startX, currentY, pageWidth, 25)
         .stroke();
      
      // Texto de los encabezados
      doc.fillColor("#000000").fontSize(9).font('Helvetica-Bold');
      
      columns.forEach((field, i) => {
        // Dibujar línea vertical entre columnas (excepto al principio)
        if (i > 0) {
          doc.moveTo(currentX, currentY)
             .lineTo(currentX, currentY + 25)
             .stroke();
        }
        
        // Texto centrado en la celda
        doc.text(
          fieldLabels[field],
          currentX + 3,
          currentY + 7,
          {
            width: colWidth - 6,
            align: 'center',
            ellipsis: true
          }
        );
        
        currentX += colWidth;
      });
      
      // Avanzamos a la siguiente fila
      currentY += 25;
    }
    
    // Altura de la fila (ajustable según contenido)
    const rowHeight = 20;
    
    // Dibujar bordes de la fila
    doc.strokeColor("#000000")
       .lineWidth(0.5)
       .rect(startX, currentY, pageWidth, rowHeight)
       .stroke();
    
    // Texto de las celdas
    currentX = startX;
    doc.fillColor("#000000").fontSize(8).font('Helvetica');
    
    // Para colores alternados en las filas
    if (i % 2 === 0) {
      doc.fillColor("#f8f8f8")
         .rect(startX, currentY, pageWidth, rowHeight)
         .fill();
      doc.fillColor("#000000");
    }
    
    columns.forEach((field, j) => {
      // Dibujar línea vertical entre columnas (excepto al principio)
      if (j > 0) {
        doc.moveTo(currentX, currentY)
           .lineTo(currentX, currentY + rowHeight)
           .stroke();
      }
      
      // Obtener el valor del campo
      const value = entry.data && typeof entry.data === 'object' ? 
                    (entry.data as Record<string, any>)[field] : undefined;
      
      // Convertir valor a string para mostrar
      let displayValue = '';
      if (value === null || value === undefined) {
        displayValue = '';
      } else if (typeof value === 'boolean') {
        displayValue = value ? 'Sí' : 'No';
      } else if (typeof value === 'object') {
        if (Array.isArray(value)) {
          displayValue = value.join(', ');
        } else {
          try {
            displayValue = JSON.stringify(value);
          } catch (e) {
            displayValue = '[Objeto complejo]';
          }
        }
      } else {
        displayValue = String(value);
      }
      
      // Texto centrado en la celda
      doc.text(
        displayValue,
        currentX + 3,
        currentY + 6,
        {
          width: colWidth - 6,
          align: 'center',
          ellipsis: true
        }
      );
      
      currentX += colWidth;
    });
    
    // Avanzamos a la siguiente fila
    currentY += rowHeight;
  }
  
  // Añadir pie de página
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    
    // Línea separadora en el pie de página
    doc.strokeColor("#d0d0d0")
       .lineWidth(0.5)
       .moveTo(30, doc.page.height - 25)
       .lineTo(doc.page.width - 30, doc.page.height - 25)
       .stroke();
    
    // Texto del pie de página
    doc.fillColor("#888888")
       .fontSize(8)
       .text(
         `Página ${i+1} de ${pageCount}`,
         30,
         doc.page.height - 20,
         { align: 'center', width: doc.page.width - 60 }
       );
  }
  
  // Finalizar la generación del PDF
  doc.end();
  
  // Esperar a que se complete la escritura del archivo
  await new Promise<void>((resolve, reject) => {
    fileStream.on('finish', () => {
      resolve();
    });
    fileStream.on('error', (err) => {
      reject(err);
    });
  });
  
  // Enviar el archivo al cliente
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}.pdf"`);
  
  // Stream el archivo al cliente
  const readStream = fs.createReadStream(tempFilePath);
  readStream.pipe(res);
  
  // Limpiar el archivo temporal después de enviarlo
  readStream.on('end', () => {
    try {
      fs.unlinkSync(tempFilePath);
    } catch (err) {
      console.error("Error al eliminar archivo temporal:", err);
    }
  });
}

/**
 * Genera un Excel en un archivo temporal y lo envía al cliente
 */
async function generateExcelAndSend(
  entries: FormEntry[], 
  template: FormTemplate, 
  fileName: string, 
  res: Response
) {
  // Crear un archivo temporal para el Excel
  const tempDir = os.tmpdir();
  const tempFilePath = path.join(tempDir, `${fileName}_${Date.now()}.xlsx`);
  
  // Crear un workbook
  const workbook = new exceljs.Workbook();
  
  // Primera hoja: Resumen
  const summarySheet = workbook.addWorksheet('Resumen');
  
  // Encabezados del resumen (celda fusionada para título)
  summarySheet.mergeCells('A1:F1');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = `DATOS HOMOLOGADOS: ${template.name}`;
  titleCell.font = { bold: true, size: 16 };
  titleCell.alignment = { horizontal: 'center' };
  
  // Información del resumen
  summarySheet.addRow(['Formulario', template.name]);
  summarySheet.addRow(['Total de formularios', entries.length]);
  summarySheet.addRow(['Fecha de generación', new Date().toLocaleString()]);
  summarySheet.addRow([]);
  
  // Tabla de resumen de formularios
  const headerRow = summarySheet.addRow(['#', 'Folio', 'Formulario', 'Departamento', 'Creado por', 'Fecha']);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'F0F0F0' }
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  
  // Añadir datos a la tabla de resumen
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const creator = await storage.getUser(entry.createdBy);
    
    const dataRow = summarySheet.addRow([
      i + 1,
      entry.folioNumber || 'N/A',
      template.name,
      entry.department || 'N/A',
      creator ? creator.name : `Usuario ${entry.createdBy}`,
      entry.createdAt ? new Date(entry.createdAt).toLocaleString() : 'N/A'
    ]);
    
    // Aplicar bordes y alineación a cada celda
    dataRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    
    // Filas alternadas para mejor legibilidad
    if (i % 2 === 0) {
      dataRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F8F8F8' }
        };
      });
    }
  }
  
  // Ajustar anchos de columna automáticamente
  summarySheet.columns.forEach((column: any) => {
    column.width = 20;
  });
  
  // Segunda hoja: Contenido de formularios homologados
  const detailSheet = workbook.addWorksheet('Datos Detallados');
  
  // Título de la hoja de datos detallados
  detailSheet.mergeCells('A1:G1');
  const detailTitleCell = detailSheet.getCell('A1');
  detailTitleCell.value = 'CONTENIDO DE FORMULARIOS FILTRADOS';
  detailTitleCell.font = { bold: true, size: 14 };
  detailTitleCell.alignment = { horizontal: 'center' };
  
  // Subtítulo con contador
  detailSheet.mergeCells('A2:G2');
  const subtitleCell = detailSheet.getCell('A2');
  subtitleCell.value = `Mostrando contenido de ${entries.length} formularios`;
  subtitleCell.font = { size: 11 };
  subtitleCell.alignment = { horizontal: 'center' };
  detailSheet.addRow([]);
  
  // Encontrar todos los campos únicos entre todos los formularios
  const allFields = new Set<string>();
  entries.forEach(entry => {
    if (entry.data && typeof entry.data === 'object') {
      Object.keys(entry.data as Record<string, any>).forEach(key => allFields.add(key));
    }
  });
  
  // Mapear IDs de campo a etiquetas legibles
  const fieldLabels: Record<string, string> = {};
  allFields.forEach(fieldId => {
    let label = fieldId;
    
    if (template.structure && template.structure.fields) {
      const field = template.structure.fields.find((f: any) => f.id === fieldId);
      if (field) {
        label = field.label || field.displayName || fieldId;
      }
    }
    
    fieldLabels[fieldId] = label;
  });
  
  // Filtrar y ordenar campos para el detalle
  const tableFields = Array.from(allFields).sort((a, b) => {
    // Intentar ordenar por displayOrder si existe
    if (template.structure && template.structure.fields) {
      const fieldA = template.structure.fields.find((f: any) => f.id === a);
      const fieldB = template.structure.fields.find((f: any) => f.id === b);
      
      const orderA = fieldA?.displayOrder || 9999;
      const orderB = fieldB?.displayOrder || 9999;
      
      if (orderA !== orderB) return orderA - orderB;
    }
    
    // Si no hay orden de visualización o es igual, ordenar por etiqueta
    return fieldLabels[a].localeCompare(fieldLabels[b]);
  });
  
  // Para cada entrada, mostrar una sección con los datos
  let currentRow = 4;
  
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    
    // Título del formulario
    detailSheet.mergeCells(`A${currentRow}:G${currentRow}`);
    const formTitleCell = detailSheet.getCell(`A${currentRow}`);
    formTitleCell.value = template.name;
    formTitleCell.font = { bold: true, size: 12 };
    currentRow++;
    
    // Información básica del formulario en formato etiqueta-valor
    const creator = await storage.getUser(entry.createdBy);
    detailSheet.getCell(`A${currentRow}`).value = 'Folio:';
    detailSheet.getCell(`B${currentRow}`).value = entry.folioNumber || 'N/A';
    detailSheet.getCell(`C${currentRow}`).value = 'Creado por:';
    detailSheet.getCell(`D${currentRow}`).value = creator ? creator.name : `Usuario ${entry.createdBy}`;
    detailSheet.getCell(`E${currentRow}`).value = 'Fecha:';
    detailSheet.getCell(`F${currentRow}`).value = entry.createdAt ? new Date(entry.createdAt).toLocaleString() : 'N/A';
    
    // Aplicar estilo a las etiquetas
    ['A', 'C', 'E'].forEach(col => {
      const cell = detailSheet.getCell(`${col}${currentRow}`);
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'right' };
    });
    
    currentRow += 2; // Espacio para la tabla de datos
    
    // Crear tabla para los datos del formulario
    // Encabezados de la tabla
    const headers = tableFields.map(field => fieldLabels[field]);
    const headerRow = detailSheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'F0F0F0' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    
    currentRow++;
    
    // Datos de la tabla
    const dataRowValues: string[] = [];
    
    tableFields.forEach(fieldId => {
      const value = entry.data && typeof entry.data === 'object' ? 
                   (entry.data as Record<string, any>)[fieldId] : undefined;
      
      // Convertir valor a string para Excel
      let displayValue = '';
      if (value === null || value === undefined) {
        displayValue = '';
      } else if (typeof value === 'boolean') {
        displayValue = value ? 'Sí' : 'No';
      } else if (typeof value === 'object') {
        if (Array.isArray(value)) {
          displayValue = value.join(', ');
        } else {
          try {
            displayValue = JSON.stringify(value);
          } catch (e) {
            displayValue = '[Objeto complejo]';
          }
        }
      } else {
        displayValue = String(value);
      }
      
      dataRowValues.push(displayValue);
    });
    
    const dataRow = detailSheet.addRow(dataRowValues);
    dataRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    
    currentRow += 2; // Espacio entre formularios
    
    // Separador entre formularios (excepto el último)
    if (i < entries.length - 1) {
      detailSheet.addRow([]);
      const separatorRow = currentRow;
      detailSheet.mergeCells(`A${separatorRow}:G${separatorRow}`);
      const separatorCell = detailSheet.getCell(`A${separatorRow}`);
      separatorCell.border = {
        bottom: { style: 'double', color: { argb: 'CCCCCC' } }
      };
      currentRow += 2;
    }
  }
  
  // Ajustar anchos de columna automáticamente
  detailSheet.columns.forEach((column: any) => {
    column.width = 25;
  });
  
  // Tercera hoja: Vista tabular (como la imagen de ejemplo)
  const tabularSheet = workbook.addWorksheet('Vista Tabular');
  
  // Título de la hoja tabular
  tabularSheet.mergeCells('A1:G1');
  const tabularTitleCell = tabularSheet.getCell('A1');
  tabularTitleCell.value = 'VISTA TABULAR DE FORMULARIOS';
  tabularTitleCell.font = { bold: true, size: 14 };
  tabularTitleCell.alignment = { horizontal: 'center' };
  tabularSheet.addRow([]);
  
  // Construir los encabezados para la vista tabular
  // Basado en el primer registro, determinar qué campos mostrar
  const headerFields = [...tableFields]; // Copia para manipular
  
  // Añadir encabezados
  const tabularHeaderRow = tabularSheet.addRow(headerFields.map(field => fieldLabels[field]));
  tabularHeaderRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'F0F0F0' }
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  
  // Añadir los datos de cada formulario como filas
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const rowValues: string[] = [];
    
    headerFields.forEach(fieldId => {
      const value = entry.data && typeof entry.data === 'object' ? 
                   (entry.data as Record<string, any>)[fieldId] : undefined;
      
      let displayValue = '';
      if (value === null || value === undefined) {
        displayValue = '';
      } else if (typeof value === 'boolean') {
        displayValue = value ? 'Sí' : 'No';
      } else if (typeof value === 'object') {
        if (Array.isArray(value)) {
          displayValue = value.join(', ');
        } else {
          try {
            displayValue = JSON.stringify(value);
          } catch (e) {
            displayValue = '[Objeto complejo]';
          }
        }
      } else {
        displayValue = String(value);
      }
      
      rowValues.push(displayValue);
    });
    
    const dataRow = tabularSheet.addRow(rowValues);
    
    // Aplicar formato a las celdas de datos
    dataRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    
    // Filas alternadas para mejor legibilidad
    if (i % 2 === 0) {
      dataRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F8F8F8' }
        };
      });
    }
  }
  
  // Ajustar anchos de columna
  tabularSheet.columns.forEach((column: any) => {
    column.width = 22;
  });
  
  // Guardar el Excel en el archivo temporal
  await workbook.xlsx.writeFile(tempFilePath);
  
  // Configurar las cabeceras
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}.xlsx"`);
  
  // Enviar el archivo al cliente
  const readStream = fs.createReadStream(tempFilePath);
  readStream.pipe(res);
  
  // Limpiar el archivo temporal después de enviarlo
  readStream.on('end', () => {
    try {
      fs.unlinkSync(tempFilePath);
    } catch (err) {
      console.error("Error al eliminar archivo temporal:", err);
    }
  });
}