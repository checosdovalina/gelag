import { db } from "../server/db";
import { formTemplates } from "../shared/schema";
import { pool } from "../server/db";
import { v4 as uuidv4 } from "uuid";

// Función para crear la plantilla de análisis microbiológico con formato horizontal
async function createPlantillaMicrobiologiaHorizontal() {
  console.log("Iniciando creación de plantilla horizontal de Análisis Microbiológico...");

  const templateData = {
    name: "Análisis Microbiológico Horizontal",
    description: "Plantilla para análisis microbiológico con parámetros en formato horizontal",
    department: "Calidad",
    structure: {
      title: "Análisis Microbiológico",
      fields: [
        {
          id: uuidv4(),
          type: "advanced-table",
          label: "Análisis Microbiológico",
          displayName: "AnalisisMicrobiologico",
          required: true,
          displayOrder: 1,
          advancedTableConfig: {
            rows: 3,
            dynamicRows: true,
            sections: [
              {
                title: "Análisis Microbiológico",
                columns: [
                  {
                    id: uuidv4(),
                    header: "Fecha",
                    type: "date",
                    width: "120px"
                  },
                  {
                    id: uuidv4(),
                    header: "Producto",
                    type: "product",
                    width: "150px"
                  },
                  {
                    id: uuidv4(),
                    header: "Lote",
                    type: "text",
                    width: "100px"
                  },
                  {
                    id: uuidv4(),
                    header: "Fecha de caducidad",
                    type: "date",
                    width: "150px"
                  },
                  {
                    id: uuidv4(),
                    header: "Hongos y Levaduras",
                    type: "select",
                    width: "150px",
                    options: [
                      { label: "Si", value: "Si" },
                      { label: "No", value: "No" },
                      { label: "NA", value: "NA" }
                    ]
                  },
                  {
                    id: uuidv4(),
                    header: "Coliformes",
                    type: "select",
                    width: "120px",
                    options: [
                      { label: "Si", value: "Si" },
                      { label: "No", value: "No" },
                      { label: "NA", value: "NA" }
                    ]
                  },
                  {
                    id: uuidv4(),
                    header: "Staphylococos",
                    type: "select",
                    width: "150px",
                    options: [
                      { label: "Si", value: "Si" },
                      { label: "No", value: "No" },
                      { label: "NA", value: "NA" }
                    ]
                  },
                  {
                    id: uuidv4(),
                    header: "Mesofilicos",
                    type: "select",
                    width: "120px",
                    options: [
                      { label: "Si", value: "Si" },
                      { label: "No", value: "No" },
                      { label: "NA", value: "NA" }
                    ]
                  },
                  {
                    id: uuidv4(),
                    header: "Salmonella",
                    type: "select",
                    width: "120px",
                    options: [
                      { label: "Si", value: "Si" },
                      { label: "No", value: "No" },
                      { label: "NA", value: "NA" }
                    ]
                  }
                ]
              }
            ]
          }
        },
        {
          id: uuidv4(),
          type: "textarea",
          label: "Observaciones Generales",
          displayName: "ObservacionesGenerales",
          required: false,
          displayOrder: 2
        },
        {
          id: uuidv4(),
          type: "employee",
          label: "Realizado por",
          displayName: "RealizadoPor",
          required: true,
          displayOrder: 3
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

    console.log("Plantilla horizontal creada exitosamente:", newTemplate);
  } catch (error) {
    console.error("Error al crear la plantilla horizontal:", error);
  } finally {
    // Cerrar la conexión de la base de datos
    await pool.end();
    console.log("Conexión a la base de datos cerrada");
  }
}

// Ejecutar la función
createPlantillaMicrobiologiaHorizontal().catch(console.error);