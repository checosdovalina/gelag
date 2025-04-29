import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User role types
export enum UserRole {
  SUPERADMIN = "superadmin",
  ADMIN = "admin",
  PRODUCTION = "produccion",
  QUALITY = "calidad",
  VIEWER = "viewer"
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

// Form data schema (completed forms)
export const formEntries = pgTable("form_entries", {
  id: serial("id").primaryKey(),
  formTemplateId: integer("form_template_id").notNull(), // Reference to form template
  data: json("data").notNull(), // The actual form data submitted
  createdBy: integer("created_by").notNull(), // User ID who filled the form
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  department: text("department"),
  status: text("status").default("completed"),
});

export const insertFormEntrySchema = createInsertSchema(formEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true
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

export type FormTemplate = typeof formTemplates.$inferSelect;
export type InsertFormTemplate = z.infer<typeof insertFormTemplateSchema>;

export type FormEntry = typeof formEntries.$inferSelect;
export type InsertFormEntry = z.infer<typeof insertFormEntrySchema>;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

// Form field type definitions used in the JSON structure
export const fieldTypes = [
  "text",
  "number",
  "date",
  "select",
  "checkbox",
  "radio",
  "textarea",
  "table",
  "evaluationMatrix"
] as const;

export type FieldType = typeof fieldTypes[number];

export const formFieldSchema = z.object({
  id: z.string(),
  type: z.enum(fieldTypes),
  label: z.string(),
  description: z.string().optional(),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
  defaultValue: z.any().optional(),
  options: z.array(z.union([
    z.string(),
    z.object({
      label: z.string(),
      value: z.string()
    })
  ])).optional(),
  columns: z.array(z.object({
    id: z.string(),
    header: z.string(),
    type: z.enum(["text", "number", "select"]),
    options: z.array(z.object({
      label: z.string(),
      value: z.string()
    })).optional()
  })).optional(), // For table type fields
  // Campos específicos para el tipo evaluationMatrix
  employeeNames: z.array(z.string()).optional(), // Nombres de empleados para la matriz
  criteria: z.array(z.string()).optional(), // Criterios de evaluación
  days: z.array(z.string()).optional(), // Días de la semana (opcional)
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
