import { db } from "../server/db";
import { formTemplates } from "../shared/schema";
import { pool } from "../server/db";
import { v4 as uuidv4 } from "uuid";

// Función para crear la plantilla de análisis microbiológico
async function createPlantillaMicrobiologia() {
  console.log("Iniciando creación de plantilla completa de Análisis Microbiológico...");

  const parametroId = uuidv4(); // ID para el campo de parámetro (necesario para relacionar los datos)

  const templateData = {
    name: "Análisis Microbiológico Completo",
    description: "Plantilla para registrar análisis microbiológicos con todos los parámetros requeridos",
    department: "Calidad",
    structure: {
      title: "Análisis Microbiológico",
      fields: [
        {
          id: uuidv4(),
          type: "date",
          label: "Fecha",
          displayName: "Fecha",
          required: true,
          displayOrder: 1
        },
        {
          id: uuidv4(),
          type: "product",
          label: "Producto",
          displayName: "Producto",
          required: true,
          displayOrder: 2
        },
        {
          id: uuidv4(),
          type: "text",
          label: "Folio",
          displayName: "Folio",
          required: true,
          displayOrder: 3
        },
        {
          id: uuidv4(),
          type: "date",
          label: "Fecha de Caducidad",
          displayName: "FechaCaducidad",
          required: true,
          displayOrder: 4
        },
        {
          id: uuidv4(),
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
                    id: parametroId,
                    header: "Parámetro",
                    type: "text",
                    width: "200px",
                    readOnly: true
                  },
                  {
                    id: uuidv4(),
                    header: "Resultado",
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
                    header: "Observaciones",
                    type: "text",
                    width: "300px"
                  }
                ]
              }
            ],
            initialData: [
              { [parametroId]: "Hongos y Levaduras" },
              { [parametroId]: "Coliformes" },
              { [parametroId]: "Staphylococos" },
              { [parametroId]: "Mesofilicos" },
              { [parametroId]: "Salmonella" }
            ]
          }
        },
        {
          id: uuidv4(),
          type: "textarea",
          label: "Observaciones Generales",
          displayName: "ObservacionesGenerales",
          required: false,
          displayOrder: 6
        },
        {
          id: uuidv4(),
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
createPlantillaMicrobiologia().catch(console.error);