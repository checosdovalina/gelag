import puppeteer from 'puppeteer';
import { FormEntry, FormTemplate } from '@shared/schema';
import { User } from '@shared/schema';

// Función para generar un PDF a partir de los datos de un formulario
export async function generatePDF(
  entry: FormEntry, 
  template: FormTemplate, 
  creator?: User
): Promise<Buffer> {
  try {
    console.log("Generando PDF para formulario:", template.name);
    
    // Lanzar navegador en modo headless con configuración para Replit
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--font-render-hinting=none'
      ],
      // @ts-ignore - ignoreHTTPSErrors es válido pero no está en los tipos
      ignoreHTTPSErrors: true
    });
    const page = await browser.newPage();
    
    // Generar el HTML del formulario
    const html = generateFormHTML(entry, template, creator);
    
    // Cargar el HTML en el navegador
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // Generar PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '1cm',
        right: '1cm',
        bottom: '1cm',
        left: '1cm'
      }
    });
    
    // Asegurar que el resultado es un Buffer para Node.js
    const nodeBuffer = Buffer.from(pdfBuffer);
    
    // Cerrar el navegador
    await browser.close();
    
    console.log("PDF generado correctamente");
    return nodeBuffer;
  } catch (error) {
    console.error("Error al generar PDF:", error);
    throw error;
  }
}

// Función para generar el HTML del formulario
function generateFormHTML(
  entry: FormEntry, 
  template: FormTemplate, 
  creator?: User
): string {
  // Fecha de creación formateada
  const createdAt = new Date(entry.createdAt).toLocaleDateString('es-MX');
  
  // Nombre del creador (si está disponible)
  const creatorName = creator?.name || `Usuario ID: ${entry.createdBy}`;
  
  // Departamento
  const department = entry.department || 'N/A';
  
  // Generar CSS para el documento
  let cssContent = `
    body {
      font-family: 'Arial', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 2px solid #555;
      padding-bottom: 10px;
    }
    .header h1 {
      color: #2b4c7e;
      margin-bottom: 5px;
    }
    .company-info {
      font-size: 12px;
      margin-bottom: 15px;
    }
    .meta-info {
      margin: 20px 0;
      font-size: 14px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .meta-info div {
      margin-bottom: 5px;
    }
    .meta-item {
      margin-bottom: 5px;
    }
    .meta-item strong {
      font-weight: bold;
      display: inline-block;
      min-width: 100px;
    }
    .form-content {
      margin-top: 20px;
    }
    .section {
      margin-bottom: 25px;
    }
    .section-title {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 10px;
      color: #2b4c7e;
      border-bottom: 1px solid #ddd;
      padding-bottom: 5px;
    }
    .field {
      margin-bottom: 15px;
    }
    .field-label {
      font-weight: bold;
      margin-bottom: 3px;
    }
    .field-value {
      padding: 5px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    table, th, td {
      border: 1px solid #ddd;
    }
    th {
      background-color: #f2f2f2;
      text-align: left;
      padding: 8px;
      font-weight: bold;
    }
    td {
      padding: 8px;
    }
    .signature-section {
      margin-top: 30px;
      text-align: center;
    }
    .signature-container {
      display: flex;
      justify-content: center;
      margin-top: 10px;
    }
    .signature-img {
      max-width: 300px;
      max-height: 100px;
      border-bottom: 1px solid #000;
    }
    .signature-name {
      margin-top: 5px;
      font-weight: bold;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      font-size: 12px;
      color: #777;
      border-top: 1px solid #ddd;
      padding-top: 10px;
    }
    
    .signed-status, .approved-status {
      margin: 5px 0 10px 0;
      font-weight: bold;
      font-size: 16px;
    }
    .signed-status {
      color: #0066cc;
    }
    .approved-status {
      color: #009933;
    }
  `;
  
  // Generar secciones de la estructura del formulario
  let formContent = '';
  
  // Si la estructura tiene fields, es un formulario estructurado
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
    
    // Generar HTML para cada sección
    Object.keys(sections).forEach(sectionName => {
      formContent += `
        <div class="section">
          <h3 class="section-title">${sectionName}</h3>
      `;
      
      // Iterar sobre los campos de esta sección
      sections[sectionName].forEach(field => {
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
        
        formContent += `
          <div class="field">
            <div class="field-label">${fieldLabel}:</div>
            <div class="field-value">${fieldValue}</div>
          </div>
        `;
      });
      
      formContent += `</div>`;
    });
  } else {
    // Verificar si es un formulario de Liberación Preoperativa
    if (template.name?.includes('LIBERACION PREOPERATIVA') || template.name?.includes('CA-RE-03-01')) {
      formContent += generateLiberacionPreoperativaHTML(entry.data);
    } else {
      // Para otros formularios, mostrar estructura básica
      formContent += generateBasicFormHTML(entry.data);
    }
  }
  
  // Generar sección de firma si existe
  let signatureSection = '';
  if (entry.signature) {
    signatureSection = `
      <div class="signature-section">
        <div style="text-align: center; font-weight: bold; margin-bottom: 10px;">Firma</div>
        <div class="signature-container">
          <img class="signature-img" src="${entry.signature}" alt="Firma digital" />
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 15px;">
          <div style="text-align: left;">
            <strong>Firmado por:</strong><br/>
            ${entry.signedBy ? `Usuario ID: ${entry.signedBy}` : creatorName}
          </div>
          <div style="text-align: right;">
            <strong>Fecha de firma:</strong><br/>
            ${entry.signedAt ? new Date(entry.signedAt).toLocaleDateString('es-MX') : ''}
          </div>
        </div>
      </div>
    `;
  }
  
  // Generar el HTML completo con ajustes para evitar superposición en estado
  // Manejo especial para formularios de producto terminado
  let formTitle = template.name;
  let isProductoTerminado = false;
  
  // Verificar si es un formulario de inspección de producto terminado
  if (formTitle.includes("PRODUCTO TERMINADO")) {
    isProductoTerminado = true;
  }
  
  // Para formularios genéricos que contienen "TERMINADO" pero no son de producto
  if (!isProductoTerminado && formTitle.includes("TERMINADO")) {
    formTitle = formTitle.replace(" TERMINADO", "");
  }
  
  // Obtener estado para encabezado
  const statusFromEntry = getStatusLabel(entry.status).toUpperCase();
  
  // Determinar si necesitamos mostrar un estado especial
  let showStatus = false;
  let statusClass = '';
  let statusText = "";
  
  // Si el formulario tiene estado firmado o aprobado, siempre mostrar ese estado
  // (ignorando cualquier "TERMINADO" en el título)
  if (entry.status === 'signed' || entry.status === 'approved') {
    showStatus = true;
    
    if (entry.status === 'signed') {
      statusClass = 'signed-status';
      statusText = "FIRMADO";
    } else {
      statusClass = 'approved-status';
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
    statusClass = 'terminated-status';
    statusText = "TERMINADO";
  }
  
  // Generar contenido de encabezado según estado
  let headerContent = '';
  
  if (showStatus) {
    // Nuevo formato: Primero el título, luego la dirección de la empresa,
    // y finalmente el estado FIRMADO/TERMINADO con espacio adicional
    headerContent = `
      <h1>${formTitle}</h1>
      <div class="company-info" style="margin-top: 10px; margin-bottom: 20px;">
        GELAG S.A DE C.V. BLVD. SANTA RITA #842, PARQUE INDUSTRIAL SANTA RITA, GOMEZ PALACIO, DGO.
      </div>
      <div class="status-label ${statusClass}" style="margin-top: 30px; margin-bottom: 15px; font-size: 16px;">${statusText}</div>
    `;
  } else {
    // Sin estado especial
    headerContent = `
      <h1>${formTitle}</h1>
      <div class="company-info">
        GELAG S.A DE C.V. BLVD. SANTA RITA #842, PARQUE INDUSTRIAL SANTA RITA, GOMEZ PALACIO, DGO.
      </div>
    `;
  }
  
  // Asegurarnos de incluir estilos para el estado "TERMINADO"
  const terminatedStyle = `
    .terminated-status {
      margin: 5px 0 10px 0;
      font-weight: bold;
      font-size: 16px;
      color: #000000;
    }
  `;
  
  // No es necesario agregar más estilos ya que están incluidos en cssContent
  
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${template.name} - ${entry.id}</title>
      <style>${cssContent}${terminatedStyle}</style>
    </head>
    <body>
      <div class="header">
        ${headerContent}
      </div>
      
      <div class="meta-info">
        <div class="meta-item">
          <strong>Folio:</strong> ${entry.folioNumber || entry.id}
        </div>
        <div class="meta-item">
          <strong>Fecha:</strong> ${createdAt}
        </div>
        <div class="meta-item">
          <strong>Creado por:</strong> ${creatorName}
        </div>
        <div class="meta-item">
          <strong>Departamento:</strong> ${department}
        </div>
        <div class="meta-item">
          <strong>Estado:</strong> ${getStatusLabel(entry.status)}
        </div>
      </div>
      
      <div class="form-content">
        ${formContent}
      </div>
      
      ${signatureSection}
      
      <div class="footer">
        Documento generado automáticamente por el sistema de captura de formularios.
        <br>
        © ${new Date().getFullYear()} GELAG S.A DE C.V. - Todos los derechos reservados
      </div>
    </body>
    </html>
  `;
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

// Función para generar HTML específico para formularios de Liberación Preoperativa
function generateLiberacionPreoperativaHTML(data: any): string {
  let html = '';
  
  // Sección de Información General
  html += `
    <div class="section">
      <h3 class="section-title">Información General</h3>
      <div class="field">
        <div class="field-label">Fecha:</div>
        <div class="field-value">${data.fecha || 'No especificado'}</div>
      </div>
      <div class="field">
        <div class="field-label">Folio:</div>
        <div class="field-value">${data.folio || 'No especificado'}</div>
      </div>
      <div class="field">
        <div class="field-label">Folio de Producción:</div>
        <div class="field-value">${data.folio_produccion || 'No especificado'}</div>
      </div>
      <div class="field">
        <div class="field-label">Departamento Emisor:</div>
        <div class="field-value">${data.departamento_emisor || 'No especificado'}</div>
      </div>
    </div>
  `;

  // Sección de Resumen de Cumplimiento
  html += `
    <div class="section">
      <h3 class="section-title">Resumen de Cumplimiento</h3>
      <table>
        <thead>
          <tr>
            <th>Sección</th>
            <th>Porcentaje de Cumplimiento</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Marmitas</td>
            <td>${data.porcentaje_cumplimiento_marmitas || '0%'}</td>
          </tr>
          <tr>
            <td>Dulces</td>
            <td>${data.porcentaje_cumplimiento_dulces || '0%'}</td>
          </tr>
          <tr>
            <td>Producción</td>
            <td>${data.porcentaje_cumplimiento_produccion || '0%'}</td>
          </tr>
          <tr>
            <td>Reposo</td>
            <td>${data.porcentaje_cumplimiento_reposo || '0%'}</td>
          </tr>
          <tr>
            <td>Limpieza</td>
            <td>${data.porcentaje_cumplimiento_limpieza || '0%'}</td>
          </tr>
          <tr style="font-weight: bold; background-color: #f9f9f9;">
            <td>TOTAL</td>
            <td>${data.porcentaje_cumplimiento_total || '0%'}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  // Sección de Marmitas
  if (data.seccion_marmitas_checklist && Array.isArray(data.seccion_marmitas_checklist)) {
    html += generateChecklistSection('Sección Marmitas', data.seccion_marmitas_checklist);
  }

  // Sección de Dulces
  if (data.seccion_dulces_checklist && Array.isArray(data.seccion_dulces_checklist)) {
    html += generateChecklistSection('Sección Dulces', data.seccion_dulces_checklist);
  }

  // Sección de Producción
  if (data.seccion_area_produccion && Array.isArray(data.seccion_area_produccion)) {
    html += generateChecklistSection('Área de Producción', data.seccion_area_produccion);
  }

  // Sección de Reposo
  if (data.seccion_area_reposo && Array.isArray(data.seccion_area_reposo)) {
    html += generateChecklistSection('Área de Reposo', data.seccion_area_reposo);
  }

  // Estación de Limpieza
  if (data.estacion_limpieza && Array.isArray(data.estacion_limpieza)) {
    html += generateChecklistSection('Estación de Limpieza', data.estacion_limpieza);
  }

  return html;
}

// Función para generar una sección de checklist
function generateChecklistSection(title: string, items: any[]): string {
  let html = `
    <div class="section">
      <h3 class="section-title">${title}</h3>
      <table>
        <thead>
          <tr>
            <th>Actividad</th>
            <th>Porcentaje</th>
            <th>Cumple (SI)</th>
            <th>No Cumple (NO)</th>
          </tr>
        </thead>
        <tbody>
  `;

  items.forEach(item => {
    const cumpleSi = item.revision_visual_si === 'SI' ? '✓' : '';
    const cumpleNo = item.revision_visual_no === 'SI' ? '✓' : '';
    
    html += `
      <tr>
        <td>${item.actividad || 'No especificado'}</td>
        <td>${item.porcentaje || '0%'}</td>
        <td style="text-align: center;">${cumpleSi}</td>
        <td style="text-align: center;">${cumpleNo}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  return html;
}

// Función para generar HTML básico para otros formularios
function generateBasicFormHTML(data: any): string {
  let html = `
    <div class="section">
      <h3 class="section-title">Datos del Formulario</h3>
  `;

  // Recorrer los datos y mostrarlos de manera organizada
  Object.keys(data).forEach(key => {
    const value = data[key];
    let displayValue = '';

    if (value === null || value === undefined) {
      displayValue = 'No especificado';
    } else if (typeof value === 'object') {
      if (Array.isArray(value)) {
        displayValue = `${value.length} elementos`;
      } else {
        displayValue = JSON.stringify(value, null, 2);
      }
    } else {
      displayValue = value.toString();
    }

    html += `
      <div class="field">
        <div class="field-label">${key.replace(/_/g, ' ').toUpperCase()}:</div>
        <div class="field-value">${displayValue}</div>
      </div>
    `;
  });

  html += `</div>`;
  return html;
}