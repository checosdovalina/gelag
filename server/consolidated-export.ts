import { Request, Response, NextFunction } from 'express';
import { FormEntry, FormTemplate, User } from '@shared/schema';
import { storage } from './storage';
import * as excel from 'exceljs';
// Importar PDFDocument correctamente
const PDFDocument = require('pdfkit');

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
    entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    if (format === "pdf") {
      await generateConsolidatedPDF(entries, template, fileName || 'formularios_homologados', res);
    } else {
      await generateConsolidatedExcel(entries, template, fileName || 'formularios_homologados', res);
    }
  } catch (error) {
    console.error("Error al exportar datos consolidados:", error);
    next(error);
  }
}

/**
 * Genera un PDF consolidado con los datos de múltiples formularios
 */
async function generateConsolidatedPDF(
  entries: FormEntry[], 
  template: FormTemplate, 
  fileName: string, 
  res: Response
) {
  // Crear documento PDF
  const doc = new PDFDocument({ 
    size: 'A4',
    margin: 50,
    info: {
      Title: `Datos homologados: ${template.name}`,
      Author: 'GELAG - Sistema de Formularios',
    }
  });
  
  // Configurar las cabeceras de respuesta
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}.pdf"`);
  
  // Reenviar el PDF directamente al navegador
  doc.pipe(res);
  
  // Título del documento
  doc.fontSize(16).font('Helvetica-Bold').text(`DATOS HOMOLOGADOS: ${template.name}`, { align: 'center' });
  doc.moveDown();
  doc.fontSize(10).font('Helvetica').text(`Generado el ${new Date().toLocaleString()}`, { align: 'center' });
  doc.moveDown();
  doc.text(`Total de formularios: ${entries.length}`, { align: 'center' });
  doc.moveDown(2);
  
  // Para cada formulario, agregar sus datos
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const creator = await storage.getUser(entry.createdBy);
    
    // Encabezado del formulario
    doc.fontSize(12).font('Helvetica-Bold').text(`FORMULARIO #${i+1}: Folio ${entry.folioNumber || 'N/A'}`);
    doc.moveDown(0.5);
    
    // Información del formulario
    doc.fontSize(10).font('Helvetica');
    doc.text(`Fecha: ${new Date(entry.createdAt).toLocaleString()}`);
    doc.text(`Departamento: ${entry.department}`);
    doc.text(`Creado por: ${creator ? creator.name : `Usuario ${entry.createdBy}`}`);
    doc.text(`Estado: ${entry.status === 'draft' ? 'Borrador' : 
                    entry.status === 'signed' ? 'Firmado' : 
                    entry.status === 'approved' ? 'Aprobado' : 'Rechazado'}`);
    doc.moveDown();
    
    // Datos del formulario
    doc.fontSize(11).font('Helvetica-Bold').text('DATOS DEL FORMULARIO:');
    doc.moveDown(0.5);
    
    const formData = entry.data;
    doc.fontSize(10).font('Helvetica');
    
    if (template.structure && template.structure.fields) {
      // Obtener los campos ordenados por displayOrder si existe
      let fields = [...template.structure.fields];
      fields.sort((a: any, b: any) => {
        // Si tienen displayOrder, ordenar por ese valor
        if (a.displayOrder !== undefined && b.displayOrder !== undefined) {
          return a.displayOrder - b.displayOrder;
        }
        // Si solo uno tiene displayOrder, ese va primero
        if (a.displayOrder !== undefined) return -1;
        if (b.displayOrder !== undefined) return 1;
        // Si ninguno tiene, ordenar por ID
        return a.id.localeCompare(b.id);
      });
      
      // Mostrar los campos ordenados
      for (const field of fields) {
        const value = formData[field.id];
        if (value === undefined) continue;
        
        // Usar etiqueta legible del campo
        const fieldLabel = field.label || field.displayName || field.id;
        
        // Convertir valor a string para mostrar
        let displayValue = '';
        if (value === null || value === undefined) {
          displayValue = 'No especificado';
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
        
        doc.text(`${fieldLabel}: ${displayValue}`, { continued: false });
      }
    } else {
      // Si no hay estructura definida, mostrar todos los campos
      Object.entries(formData).forEach(([key, value]) => {
        let displayValue = '';
        if (value === null || value === undefined) {
          displayValue = 'No especificado';
        } else if (typeof value === 'object') {
          try {
            displayValue = JSON.stringify(value);
          } catch (e) {
            displayValue = '[Objeto complejo]';
          }
        } else {
          displayValue = String(value);
        }
        
        doc.text(`${key}: ${displayValue}`, { continued: false });
      });
    }
    
    // Mostrar firma si existe
    if (entry.signature) {
      doc.moveDown();
      doc.fontSize(11).font('Helvetica-Bold').text('FIRMA:');
      doc.moveDown(0.5);
      
      // Convertir data URL a Buffer para insertarla en el PDF
      try {
        const signatureData = entry.signature.split(',')[1];
        const signatureBuffer = Buffer.from(signatureData, 'base64');
        
        doc.image(signatureBuffer, {
          fit: [200, 100],
          align: 'center'
        });
        
        if (entry.signedBy) {
          const signer = await storage.getUser(entry.signedBy);
          doc.fontSize(9).font('Helvetica').text(
            `Firmado por ${signer ? signer.name : `Usuario ${entry.signedBy}`}${
              entry.signedAt ? ` el ${new Date(entry.signedAt).toLocaleString()}` : ''
            }`,
            { align: 'center' }
          );
        }
      } catch (signatureError) {
        console.error("Error al procesar firma:", signatureError);
        doc.text('Error al mostrar la firma', { align: 'center' });
      }
    }
    
    // Separador entre formularios (excepto el último)
    if (i < entries.length - 1) {
      doc.moveDown(2);
      doc.strokeColor('#888888').lineWidth(0.5).dash(5, { space: 5 }).moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
      doc.moveDown(2);
    }
    
    // Si el siguiente formulario no cabe en la página actual, crear una nueva
    if (i < entries.length - 1 && doc.y > doc.page.height - 150) {
      doc.addPage();
    }
  }
  
  // Finalizar la generación del PDF
  doc.end();
}

/**
 * Genera un Excel consolidado con los datos de múltiples formularios
 */
async function generateConsolidatedExcel(
  entries: FormEntry[], 
  template: FormTemplate, 
  fileName: string, 
  res: Response
) {
  const workbook = new excel.Workbook();
  
  // Primera hoja: Resumen
  const summarySheet = workbook.addWorksheet('Resumen');
  
  // Encabezados del resumen
  summarySheet.addRow(['DATOS HOMOLOGADOS']);
  summarySheet.addRow(['Formulario', template.name]);
  summarySheet.addRow(['Total de formularios', entries.length]);
  summarySheet.addRow(['Fecha de generación', new Date().toLocaleString()]);
  summarySheet.addRow([]);
  
  // Tabla de resumen de formularios
  summarySheet.addRow(['#', 'Folio', 'Fecha', 'Departamento', 'Creado por', 'Estado']);
  
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const creator = await storage.getUser(entry.createdBy);
    
    summarySheet.addRow([
      i + 1,
      entry.folioNumber || 'N/A',
      new Date(entry.createdAt).toLocaleString(),
      entry.department,
      creator ? creator.name : `Usuario ${entry.createdBy}`,
      entry.status === 'draft' ? 'Borrador' : 
      entry.status === 'signed' ? 'Firmado' : 
      entry.status === 'approved' ? 'Aprobado' : 'Rechazado'
    ]);
  }
  
  // Ajustar anchos de columna
  summarySheet.columns.forEach(column => {
    column.width = 20;
  });
  
  // Segunda hoja: Datos detallados
  const detailSheet = workbook.addWorksheet('Datos Detallados');
  
  // Encontrar todos los campos únicos entre todos los formularios
  const allFields = new Set<string>();
  entries.forEach(entry => {
    Object.keys(entry.data).forEach(key => allFields.add(key));
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
  
  // Construir encabezados
  const headers = ['#', 'Folio', 'Fecha', 'Departamento', 'Creado por', 'Estado'];
  Array.from(allFields).sort((a, b) => {
    // Intentar ordenar por orden de visualización si está disponible
    const fieldA = template.structure?.fields?.find((f: any) => f.id === a);
    const fieldB = template.structure?.fields?.find((f: any) => f.id === b);
    
    const orderA = fieldA?.displayOrder || 9999;
    const orderB = fieldB?.displayOrder || 9999;
    
    if (orderA !== orderB) return orderA - orderB;
    
    // Si no hay orden de visualización o es igual, ordenar por etiqueta
    return fieldLabels[a].localeCompare(fieldLabels[b]);
  }).forEach(fieldId => {
    headers.push(fieldLabels[fieldId]);
  });
  
  detailSheet.addRow(headers);
  
  // Añadir datos de cada formulario
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const creator = await storage.getUser(entry.createdBy);
    
    const rowData: any[] = [
      i + 1,
      entry.folioNumber || 'N/A',
      new Date(entry.createdAt).toLocaleString(),
      entry.department,
      creator ? creator.name : `Usuario ${entry.createdBy}`,
      entry.status === 'draft' ? 'Borrador' : 
      entry.status === 'signed' ? 'Firmado' : 
      entry.status === 'approved' ? 'Aprobado' : 'Rechazado'
    ];
    
    // Añadir los valores para cada campo, o dejar vacío si no existe
    Array.from(allFields).sort((a, b) => {
      const fieldA = template.structure?.fields?.find((f: any) => f.id === a);
      const fieldB = template.structure?.fields?.find((f: any) => f.id === b);
      
      const orderA = fieldA?.displayOrder || 9999;
      const orderB = fieldB?.displayOrder || 9999;
      
      if (orderA !== orderB) return orderA - orderB;
      return fieldLabels[a].localeCompare(fieldLabels[b]);
    }).forEach(fieldId => {
      const value = entry.data[fieldId];
      
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
      
      rowData.push(displayValue);
    });
    
    detailSheet.addRow(rowData);
  }
  
  // Ajustar anchos de columna
  detailSheet.columns.forEach(column => {
    column.width = 20;
  });
  
  // Enviar el archivo Excel
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}.xlsx"`);
  
  const buffer = await workbook.xlsx.writeBuffer();
  res.send(buffer);
}