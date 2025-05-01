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
  const css = `
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
    // Si no tiene estructura definida, mostrar los datos crudos
    formContent += `
      <div class="section">
        <h3 class="section-title">Datos del formulario</h3>
        <pre>${JSON.stringify(entry.data, null, 2)}</pre>
      </div>
    `;
  }
  
  // Generar sección de firma si existe
  let signatureSection = '';
  if (entry.signature) {
    signatureSection = `
      <div class="signature-section">
        <h3>Firma</h3>
        <div class="signature-container">
          <img class="signature-img" src="${entry.signature}" alt="Firma digital" />
        </div>
        <div class="signature-name">
          ${entry.signedBy ? `Usuario ID: ${entry.signedBy}` : creatorName}
        </div>
        ${entry.signedAt ? `<div>Fecha de firma: ${new Date(entry.signedAt).toLocaleDateString('es-MX')}</div>` : ''}
      </div>
    `;
  }
  
  // Generar el HTML completo
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${template.name} - ${entry.id}</title>
      <style>${css}</style>
    </head>
    <body>
      <div class="header">
        <h1>${template.name}</h1>
        <div class="company-info">
          GELAG S.A DE C.V. BLVD. SANTA RITA #842, PARQUE INDUSTRIAL SANTA RITA, GOMEZ PALACIO, DGO.
        </div>
      </div>
      
      <div class="meta-info">
        <div class="meta-item">
          <strong>Folio:</strong> ${entry.id}
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