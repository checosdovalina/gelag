import { db } from "../server/db";
import { formTemplates } from "../shared/schema";
import { pool } from "../server/db";

// No necesitamos cargar variables de entorno, ya están disponibles

async function createMicrobiologiaTemplate() {
  console.log("Iniciando creación de plantilla de Análisis Microbiológico...");

  const templateData = {
    name: "Análisis Microbiológico",
    description: "Formulario para registrar análisis microbiológicos de productos",
    department: "Calidad",
    structure: {
      title: "Análisis Microbiológico",
      fields: [
        {
          id: "fecha",
          type: "date",
          label: "Fecha",
          displayName: "Fecha",
          required: true,
          displayOrder: 1
        },
        {
          id: "folio",
          type: "text",
          label: "Folio",
          displayName: "Folio",
          required: true,
          displayOrder: 2
        },
        {
          id: "producto",
          type: "product",
          label: "Producto",
          displayName: "Producto",
          required: true,
          displayOrder: 3
        },
        {
          id: "fecha_caducidad",
          type: "date",
          label: "Fecha de Caducidad",
          displayName: "FechaCaducidad",
          required: true,
          displayOrder: 4
        },
        {
          id: "tabla_analisis",
          type: "advanced-table",
          label: "Análisis Microbiológico",
          displayName: "AnalisisMicrobiologico",
          required: true,
          displayOrder: 5,
          advancedTableConfig: {
            rows: 5,
            dynamicRows: true,
            sections: [
              {
                title: "Análisis Microbiológico",
                columns: [
                  {
                    id: "parametro",
                    header: "Parámetro",
                    type: "text",
                    readOnly: true,
                    width: "200px"
                  },
                  {
                    id: "resultado",
                    header: "Resultado",
                    type: "select",
                    options: [
                      { label: "Si", value: "Si" },
                      { label: "No", value: "No" },
                      { label: "NA", value: "NA" }
                    ],
                    width: "150px"
                  },
                  {
                    id: "observaciones",
                    header: "Observaciones",
                    type: "text",
                    width: "300px"
                  }
                ]
              }
            ],
            initialData: [
              {
                parametro: "Hongos y Levaduras"
              },
              {
                parametro: "Coliformes"
              },
              {
                parametro: "Staphylococos"
              },
              {
                parametro: "Mesofilicos"
              },
              {
                parametro: "Salmonella"
              }
            ]
          }
        },
        {
          id: "observaciones_generales",
          type: "textarea",
          label: "Observaciones Generales",
          displayName: "ObservacionesGenerales",
          required: false,
          displayOrder: 6
        },
        {
          id: "realizado_por",
          type: "employee",
          label: "Realizado por",
          displayName: "RealizadoPor",
          required: true,
          displayOrder: 7
        }
      ]
    },
    createdBy: 1, // ID del superadmin
    isActive: true
  };

  try {
    // Insertar el template en la base de datos
    const [newTemplate] = await db
      .insert(formTemplates)
      .values(templateData)
      .returning();

    console.log("Plantilla creada exitosamente:", newTemplate);
  } catch (error) {
    console.error("Error al crear la plantilla:", error);
  } finally {
    // Cerrar la conexión de la base de datos
    await pool.end();
    console.log("Conexión a la base de datos cerrada");
  }
}

// Ejecutar la función
createMicrobiologiaTemplate().catch(console.error);