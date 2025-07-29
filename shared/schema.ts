import { pgTable, text, serial, integer, boolean, timestamp, json, jsonb, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User role types
export enum UserRole {
  SUPERADMIN = "superadmin",
  ADMIN = "admin",
  PRODUCTION = "produccion",
  QUALITY = "calidad",
  PRODUCTION_MANAGER = "gerente_produccion",
  QUALITY_MANAGER = "gerente_calidad",
  VIEWER = "viewer"
}

export enum EmployeeType {
  OPERATIVE = "operativo",
  QUALITY = "calidad",
  PRODUCTION = "produccion",
  ADMINISTRATIVE = "administrativo"
}

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").$type<UserRole>().notNull().default(UserRole.VIEWER),
  department: text("department"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true
});

// Form template schema (form structure/definition)
export const formTemplates = pgTable("form_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  department: text("department"),
  structure: json("structure").notNull(), // JSON structure defining the form fields
  createdBy: integer("created_by").notNull(), // User ID of creator
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isActive: boolean("is_active").default(true),
});

export const insertFormTemplateSchema = createInsertSchema(formTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Saved Report schemas
export const savedReports = pgTable("saved_reports", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  configuration: json("configuration").notNull(), // JSON with complete report configuration
  createdBy: integer("created_by").notNull(), // User ID of creator
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isPublic: boolean("is_public").default(false), // Whether this report is visible to all users
});

export const insertSavedReportSchema = createInsertSchema(savedReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Form workflow status enum
export enum FormWorkflowStatus {
  INITIATED = "initiated",      // El formulario ha sido iniciado por un gerente
  IN_PROGRESS = "in_progress",  // Operativos están trabajando en él
  PENDING_QUALITY = "pending_quality", // Pendiente de revisión de calidad
  COMPLETED = "completed",      // Formulario completamente lleno
  SIGNED = "signed",            // Firmado
  APPROVED = "approved",        // Aprobado
  REJECTED = "rejected"         // Rechazado
}

// Production form status enum
export enum ProductionFormStatus {
  DRAFT = "draft",              // Borrador inicial
  IN_PROGRESS = "in_progress",  // En proceso de producción
  PENDING_REVIEW = "pending_review", // Esperando revisión de calidad
  COMPLETED = "completed"       // Proceso completado
}

// Form workflow stages for role-based access
export enum FormWorkflowStage {
  INIT = "init",                // Gerente de producción - campos rosa
  OPERATION = "operation",      // Operadores - campos amarillos
  QUALITY = "quality",          // Gerente de calidad - finalización
  COMPLETED = "completed"       // Proceso completado
}

// Form data schema (completed forms)
export const formEntries = pgTable("form_entries", {
  id: serial("id").primaryKey(),
  formTemplateId: integer("form_template_id").notNull(), // Reference to form template
  data: json("data").notNull(), // The actual form data submitted
  createdBy: integer("created_by").notNull(), // User ID who filled the form
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  department: text("department"),
  status: text("status").default("draft"), // "draft", "signed", "approved", "rejected"
  workflowStatus: text("workflow_status").$type<FormWorkflowStatus>().default(FormWorkflowStatus.INITIATED), // Estado en el flujo de trabajo
  workflowStage: text("workflow_stage").$type<FormWorkflowStage>().default(FormWorkflowStage.INIT), // Etapa del flujo por roles
  lastUpdatedBy: integer("last_updated_by"), // Usuario que realizó la última actualización
  lotNumber: text("lot_number"), // Número de lote para referenciar relacionados
  roleSpecificData: jsonb("role_specific_data"), // Datos específicos por rol para formularios secuenciales
  stageCompletedAt: jsonb("stage_completed_at"), // Timestamps de cuando se completó cada etapa
  signature: text("signature"), // Base64 encoded signature image
  signedBy: integer("signed_by"), // User ID who signed the form
  signedAt: timestamp("signed_at"), // When the form was signed
  approvedBy: integer("approved_by"), // User ID who approved the form (if applicable)
  approvedAt: timestamp("approved_at"), // When the form was approved (if applicable)
  folioNumber: integer("folio_number"), // Consecutive folio number for this template
});

// Folios counter schema (tracks last folio number used per template)
export const folioCounters = pgTable("folio_counters", {
  id: serial("id").primaryKey(),
  formTemplateId: integer("form_template_id").notNull().unique(), // Reference to form template
  lastFolioNumber: integer("last_folio_number").notNull().default(0), // Last used folio number
  prefix: text("prefix"), // Optional prefix for the folio (e.g., "INV-", "QA-")
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFolioCounterSchema = createInsertSchema(folioCounters).omit({
  id: true,
  updatedAt: true
});

export const insertFormEntrySchema = createInsertSchema(formEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  signedAt: true,
  approvedAt: true
});

// Esquema para actualizaciones del flujo de trabajo secuencial
export const updateFormWorkflowSchema = z.object({
  workflowStatus: z.nativeEnum(FormWorkflowStatus),
  data: z.record(z.any()).optional(),
  roleSpecificData: z.record(z.any()).optional(),
  lotNumber: z.string().optional(),
  lastUpdatedBy: z.number().optional(),
});

// Activity log schema
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  action: text("action").notNull(), // e.g., "created", "updated", "exported"
  resourceType: text("resource_type").notNull(), // e.g., "form_template", "form_entry"
  resourceId: integer("resource_id").notNull(),
  details: json("details"), // Additional context details
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  timestamp: true
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Aquí solo añadir tipos adicionales si es necesario

export type FormTemplate = typeof formTemplates.$inferSelect;
export type InsertFormTemplate = z.infer<typeof insertFormTemplateSchema>;

export type SavedReport = typeof savedReports.$inferSelect;
export type InsertSavedReport = z.infer<typeof insertSavedReportSchema>;

export type FormEntry = typeof formEntries.$inferSelect;
export type InsertFormEntry = z.infer<typeof insertFormEntrySchema>;

export type FolioCounter = typeof folioCounters.$inferSelect;
export type InsertFolioCounter = z.infer<typeof insertFolioCounterSchema>;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

export type UpdateFormWorkflow = z.infer<typeof updateFormWorkflowSchema>;

// Form field type definitions used in the JSON structure
export const fieldTypes = [
  "text",
  "number",
  "date",
  "time", // Campo para seleccionar hora
  "select",
  "checkbox",
  "radio",
  "textarea",
  "table",
  "evaluationMatrix",
  "employee", // Campo para seleccionar un empleado
  "employeeByType", // Campo para seleccionar un empleado filtrado por tipo
  "userByRole", // Campo para seleccionar un usuario filtrado por rol
  "product",   // Campo para seleccionar un producto
  "advancedTable" // Tabla avanzada con múltiples columnas y filas, diseño personalizable
] as const;

export type FieldType = typeof fieldTypes[number];

export const formFieldSchema = z.object({
  id: z.string(),
  type: z.enum(fieldTypes),
  label: z.string(),
  // Campo para personalizar el nombre de visualización en reportes
  displayName: z.string().optional(),
  // Campo para ordenar campos en los reportes
  displayOrder: z.number().optional(),
  // Campo para controlar si el campo es editable en el constructor de formularios
  editable: z.boolean().optional(),
  description: z.string().optional(),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
  defaultValue: z.any().optional(),
  // Características especiales del campo (autocompletado de recetas, etc.)
  features: z.array(z.string()).optional(),
  options: z.array(z.union([
    z.string(),
    z.object({
      label: z.string(),
      value: z.string()
    })
  ])).optional(),
  // Campo para especificar el tipo de empleado a mostrar (para campos tipo employeeByType)
  employeeType: z.enum([
    EmployeeType.OPERATIVE,
    EmployeeType.QUALITY,
    EmployeeType.PRODUCTION,
    EmployeeType.ADMINISTRATIVE
  ]).optional(),
  // Campo para especificar el rol de usuario a mostrar (para campos tipo userByRole)
  userRole: z.enum([
    UserRole.SUPERADMIN,
    UserRole.ADMIN,
    UserRole.PRODUCTION,
    UserRole.QUALITY,
    UserRole.PRODUCTION_MANAGER,
    UserRole.QUALITY_MANAGER,
    UserRole.VIEWER
  ]).optional(),
  columns: z.array(z.object({
    id: z.string(),
    header: z.string(),
    type: z.enum(["text", "number", "select"]),
    displayName: z.string().optional(), // Nombre de visualización para columnas
    options: z.array(z.object({
      label: z.string(),
      value: z.string()
    })).optional()
  })).optional(), // For table type fields
  // Campos específicos para el tipo evaluationMatrix
  employeeNames: z.array(z.string()).optional(), // Nombres de empleados para la matriz
  criteria: z.array(z.string()).optional(), // Criterios de evaluación
  days: z.array(z.string()).optional(), // Días de la semana (opcional)
  // Campos específicos para tablas avanzadas
  advancedTableConfig: z.object({
    rows: z.number().optional(), // Número de filas fijas
    dynamicRows: z.boolean().optional(), // Si permite agregar filas dinámicamente
    sections: z.array(z.object({
      title: z.string(),
      colspan: z.number().optional(), // Número de columnas que abarca el título
      columns: z.array(z.object({
        id: z.string(),
        header: z.string(),
        width: z.string().optional(), // Ancho de la columna (%, px)
        type: z.enum(["text", "number", "select", "checkbox", "date", "product", "employee", "time"]),
        span: z.number().optional(), // Para celdas que ocupan múltiples columnas
        rowspan: z.number().optional(), // Para celdas que ocupan múltiples filas
        readOnly: z.boolean().optional(), // Si la celda es de solo lectura
        validation: z.object({
          min: z.number().optional(),
          max: z.number().optional(),
          pattern: z.string().optional(),
          required: z.boolean().optional()
        }).optional(),
        options: z.array(z.object({
          label: z.string(),
          value: z.string()
        })).optional()
      }))
    })).optional(),
    initialData: z.array(z.record(z.string(), z.any())).optional() // Datos iniciales de la tabla
  }).optional() // Para campos tipo advancedTable
});

// Export both the type and the schema
export interface FormField extends z.infer<typeof formFieldSchema> {}
// Make sure the FormField type is exported correctly

export const formStructureSchema = z.object({
  title: z.string(),
  fields: z.array(formFieldSchema),
  sections: z.array(z.object({
    title: z.string(),
    fields: z.array(formFieldSchema)
  })).optional()
});

export type FormStructure = z.infer<typeof formStructureSchema>;

// Tabla de productos para reutilizar en formularios
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  description: text("description"),
  category: text("category"),
  unit: text("unit"), // Unidad de medida (kg, litros, piezas, etc.)
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").notNull(), // Usuario que creó el producto
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Tabla de empleados para reutilizar en formularios
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  employeeId: text("employee_id").notNull().unique(), // Número de empleado
  position: text("position"), // Puesto específico (ej. "Supervisor", "Operador", etc.)
  employeeType: text("employee_type").$type<EmployeeType>().notNull().default(EmployeeType.OPERATIVE), // Tipo de empleado (operativo, calidad, producción, administrativo)
  department: text("department"),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").notNull(), // Usuario que creó el registro del empleado
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Tipos adicionales
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;

// Tabla de recetas de productos
export const productRecipes = pgTable("product_recipes", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  name: text("name").notNull(), // Nombre del proceso
  baseQuantity: integer("base_quantity").notNull().default(100), // Litros base (generalmente 100)
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").notNull(), // Usuario que creó la receta
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProductRecipeSchema = createInsertSchema(productRecipes).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Tabla de materiales para recetas
export const recipeIngredients = pgTable("recipe_ingredients", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id").notNull().references(() => productRecipes.id),
  materialName: text("material_name").notNull(), // Nombre del material (ej. "Leche de Cabra")
  quantity: text("quantity").notNull(), // Cantidad en formato string (para manejar decimales)
  unit: text("unit").default("kg"), // Unidad de medida (kg, litros, etc.)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRecipeIngredientSchema = createInsertSchema(recipeIngredients).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Tipos para recetas
export type ProductRecipe = typeof productRecipes.$inferSelect;
export type InsertProductRecipe = z.infer<typeof insertProductRecipeSchema>;

export type RecipeIngredient = typeof recipeIngredients.$inferSelect;
export type InsertRecipeIngredient = z.infer<typeof insertRecipeIngredientSchema>;

// Tabla para formularios de producción por secciones
export const productionForms = pgTable("production_forms", {
  id: serial("id").primaryKey(),
  productId: text("product_id").notNull(), // ID del producto seleccionado
  liters: integer("liters").notNull(), // Litros a producción
  date: text("date").notNull(), // Fecha de producción
  responsible: text("responsible").notNull(), // Responsable
  caducidad: text("caducidad"), // Fecha de caducidad
  marmita: text("marmita"), // Número de marmita
  folio: text("folio").notNull(), // Número de folio
  folioInterno: text("folio_interno"), // Folio interno
  folioBajaMP: text("folio_baja_mp"), // Folio Baja MP
  folioBajaME: text("folio_baja_me"), // Folio Baja ME
  folioPT: text("folio_pt"), // Folio PT
  status: text("status").$type<ProductionFormStatus>().notNull().default(ProductionFormStatus.DRAFT),
  lotNumber: text("lot_number"), // Número de lote
  ingredients: json("ingredients"), // Lista de ingredientes calculados
  ingredientTimes: json("ingredient_times"), // Horas de adición de ingredientes
  
  // Sección de seguimiento de proceso
  startTime: text("start_time"), // Hora inicio
  endTime: text("end_time"), // Hora término
  temperature: json("temperature"), // Temperaturas
  pressure: json("pressure"), // Manómetro
  hourTracking: json("hour_tracking"), // Tabla de hora
  
  // Sección de verificación de calidad
  qualityTimes: json("quality_times"), // Horas de verificación
  brix: json("brix"), // Grados Brix
  qualityTemp: json("quality_temp"), // Temperatura
  texture: json("texture"), // Textura
  color: json("color"), // Color
  viscosity: json("viscosity"), // Viscosidad
  smell: json("smell"), // Olor
  taste: json("taste"), // Sabor
  foreignMaterial: json("foreign_material"), // Material Extraño
  statusCheck: json("status_check"), // Status
  qualityNotes: text("quality_notes"), // Notas de verificación de calidad
  
  // Sección de destino de producto
  destinationType: json("destination_type"), // Tipo de Cajeta
  destinationKilos: json("destination_kilos"), // Kilos
  destinationProduct: json("destination_product"), // Producto
  destinationEstimation: json("destination_estimation"), // Estimación
  totalKilos: text("total_kilos"), // Total Kilos
  liberationFolio: text("liberation_folio"), // Folio de liberación
  
  // Sección de datos de liberación
  cP: text("c_p"), // cP
  cmConsistometer: text("cm_consistometer"), // Cm en consistómetro
  finalBrix: text("final_brix"), // Grados Brix finales
  yield: text("yield"), // Rendimiento
  startState: text("start_state"), // Estado al inicio (colador)
  endState: text("end_state"), // Estado al final (colador)
  signatureUrl: text("signature_url"), // URL de la firma del responsable
  
  // Metadatos
  createdBy: integer("created_by").notNull(), // Usuario que creó el formulario
  updatedBy: integer("updated_by"), // Último usuario que lo modificó
  lastUpdatedBy: integer("last_updated_by"), // Último usuario que actualizó (compatibilidad)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProductionFormSchema = createInsertSchema(productionForms).omit({
  id: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
  updatedBy: true
}).extend({
  folio: z.string().optional() // El folio es opcional, se genera automáticamente si no se proporciona
});

export type ProductionForm = typeof productionForms.$inferSelect;
export type InsertProductionForm = z.infer<typeof insertProductionFormSchema>;
