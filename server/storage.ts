import { 
  users, type User, type InsertUser, 
  formTemplates, FormTemplate, InsertFormTemplate, 
  formEntries, FormEntry, InsertFormEntry, 
  activityLogs, ActivityLog, InsertActivityLog,
  savedReports, SavedReport, InsertSavedReport,
  UserRole 
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPgSimple from "connect-pg-simple";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import { Pool } from '@neondatabase/serverless';

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPgSimple(session);

// Type definition for session store since it's not exported directly from express-session
declare module "express-session" {
  interface SessionStore {
    all: (callback: (err: any, sessions: any) => void) => void;
    get: (sid: string, callback: (err: any, session: any) => void) => void;
    set: (sid: string, session: any, callback?: (err?: any) => void) => void;
    destroy: (sid: string, callback?: (err?: any) => void) => void;
    length?: (callback: (err: any, length: number) => void) => void;
    clear?: (callback?: (err?: any) => void) => void;
    touch?: (sid: string, session: any, callback?: (err?: any) => void) => void;
  }
}

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // Form template methods
  getFormTemplate(id: number): Promise<FormTemplate | undefined>;
  createFormTemplate(template: InsertFormTemplate): Promise<FormTemplate>;
  updateFormTemplate(id: number, data: Partial<InsertFormTemplate>): Promise<FormTemplate | undefined>;
  getAllFormTemplates(): Promise<FormTemplate[]>;
  getFormTemplatesByDepartment(department: string): Promise<FormTemplate[]>;
  
  // Form entry methods
  getFormEntry(id: number): Promise<FormEntry | undefined>;
  createFormEntry(entry: InsertFormEntry): Promise<FormEntry>;
  updateFormEntry(id: number, data: Partial<any>): Promise<FormEntry | undefined>;
  getFormEntriesByTemplate(templateId: number): Promise<FormEntry[]>;
  getFormEntriesByUser(userId: number): Promise<FormEntry[]>;
  getFormEntriesByDepartment(department: string): Promise<FormEntry[]>;
  
  // Saved report methods
  getSavedReport(id: number): Promise<SavedReport | undefined>;
  getSavedReports(): Promise<SavedReport[]>;
  createSavedReport(report: InsertSavedReport): Promise<SavedReport>;
  updateSavedReport(id: number, data: Partial<InsertSavedReport>): Promise<SavedReport | undefined>;
  deleteSavedReport(id: number): Promise<void>;
  
  // Activity log methods
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getRecentActivity(limit: number): Promise<ActivityLog[]>;
  
  // Session store
  sessionStore: session.SessionStore;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    // Create session store using PostgreSQL
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true,
      tableName: 'session'
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Form template methods
  async getFormTemplate(id: number): Promise<FormTemplate | undefined> {
    const [template] = await db.select().from(formTemplates).where(eq(formTemplates.id, id));
    return template;
  }

  async createFormTemplate(template: InsertFormTemplate): Promise<FormTemplate> {
    const [newTemplate] = await db.insert(formTemplates).values(template).returning();
    return newTemplate;
  }

  // Método especial para actualizar solamente la estructura de un formulario
  async updateFormStructure(id: number, structure: any): Promise<boolean> {
    console.log("=== MÉTODO updateFormStructure ===");
    console.log("ID del formulario a actualizar:", id);
    
    try {
      // Obtenemos la plantilla existente para verificar que existe
      const existingTemplate = await this.getFormTemplate(id);
      if (!existingTemplate) {
        console.error("No se encontró la plantilla con ID:", id);
        return false;
      }
      
      // Serializar y deserializar para evitar problemas de referencia
      const cleanStructure = JSON.parse(JSON.stringify(structure));
      
      console.log("\n=== ESTRUCTURA A GUARDAR ===\n");
      if (cleanStructure.fields && Array.isArray(cleanStructure.fields)) {
        cleanStructure.fields.forEach((field: any, idx: number) => {
          // Asegurar que cada campo tenga displayName como string
          field.displayName = String(field.displayName || field.label || '');
          
          // Asegurar que displayOrder sea un número
          field.displayOrder = Number(field.displayOrder || 0);
          
          console.log(`Campo #${idx} - ID: ${field.id}`);
          console.log(`  Label: ${field.label}`);
          console.log(`  DisplayName: ${field.displayName}`);
        });
      }
      
      // Actualizar sólo la estructura, manteniendo los demás campos sin cambios
      // Forzamos una conversión a texto y luego a JSON para asegurar que se guarde correctamente
      const structureJSON = JSON.stringify(cleanStructure);
      
      await db
        .update(formTemplates)
        .set({
          structure: JSON.parse(structureJSON),
          updatedAt: new Date()
        })
        .where(eq(formTemplates.id, id));
      
      console.log("\n=== ESTRUCTURA ACTUALIZADA EXITOSAMENTE ===\n");
      
      // Verificar que se guardó correctamente
      const verifiedTemplate = await this.getFormTemplate(id);
      if (verifiedTemplate && verifiedTemplate.structure) {
        console.log("Verificación exitosa de cambios en estructura");
        
        // Mostrar campos actualizados
        if (typeof verifiedTemplate.structure === 'object' && 
            verifiedTemplate.structure.fields && 
            Array.isArray(verifiedTemplate.structure.fields)) {
          
          verifiedTemplate.structure.fields.forEach((field: any, idx: number) => {
            console.log(`Campo ${idx} verificado - ID: ${field.id}, DisplayName: ${field.displayName}`);
          });
        }
        
        return true;
      } else {
        console.error("Error de verificación: No se pudo obtener la estructura actualizada");
        return false;
      }
    } catch (error) {
      console.error("Error al actualizar estructura:", error);
      return false;
    }
  }

  async updateFormTemplate(id: number, data: Partial<InsertFormTemplate>): Promise<FormTemplate | undefined> {
    // Log debugging
    console.log("=== MÉTODO updateFormTemplate ===");
    console.log("ID del formulario a actualizar:", id);
    
    // Primero obtenemos la plantilla existente para compararla
    const existingTemplate = await this.getFormTemplate(id);
    if (!existingTemplate) {
      console.error("No se encontró la plantilla con ID:", id);
      return undefined;
    }
    
    // Realizar una copia profunda de los datos para evitar problemas de referencia
    // Manejamos la fecha updatedAt de forma especial para evitar problemas con la serialización
    const updateData = JSON.parse(JSON.stringify({
      ...data
    }));
    
    // Añadimos la fecha después de la serialización para evitar problemas con toISOString
    updateData.updatedAt = new Date();
    
    // Verificar si hay estructura y campos
    if (updateData.structure && updateData.structure.fields) {
      console.log("\n=== PROCESAMIENTO DE CAMPOS PREVIO A GUARDAR ===\n");
      console.log("Número de campos en la estructura:", updateData.structure.fields.length);
      
      // Comparar con el original para debugging
      console.log("\n=== COMPARACIÓN CON CAMPOS ORIGINALES ===\n");
      
      const originalMap = new Map();
      // Verificamos si structure existe y tiene campos
      if (existingTemplate.structure && 
          typeof existingTemplate.structure === 'object' && 
          existingTemplate.structure.fields && 
          Array.isArray(existingTemplate.structure.fields)) {
        
        existingTemplate.structure.fields.forEach((field: any) => {
          originalMap.set(field.id, field);
        });
      } else {
        console.log("ADVERTENCIA: La estructura original no tiene campos o no es un objeto válido");
      }
      
      // Verificar cada campo individualmente
      updateData.structure.fields = updateData.structure.fields.map((field: any) => {
        const originalField = originalMap.get(field.id);
        
        // Guardar nombre para reporte (displayName) y preservarlo
        let displayNameToSave = field.displayName;
        
        // Si hay un valor nuevo, mantenerlo
        if (displayNameToSave !== originalField?.displayName) {
          console.log(`Campo con ID ${field.id} tiene un displayName modificado:`, 
            `Original: "${originalField?.displayName || '[Sin valor]'}", Nuevo: "${displayNameToSave || '[Sin valor]'}"`);
        }
        
        // Asegurar que displayName sea string y displayOrder sea número
        displayNameToSave = String(displayNameToSave || field.label || '');
        const displayOrderToSave = Number(field.displayOrder || 0);
        
        return {
          ...field,
          displayName: displayNameToSave,
          displayOrder: displayOrderToSave
        };
      });
      
      // Log final de todos los campos
      console.log("\n=== CAMPOS FINALES A GUARDAR ===\n");
      updateData.structure.fields.forEach((field: any, idx: number) => {
        console.log(`Campo #${idx} - ID: ${field.id}`);
        console.log(`  Label: ${field.label}`);
        console.log(`  DisplayName: ${field.displayName}`);
        console.log(`  DisplayOrder: ${field.displayOrder}`);
      });
    }
    
    // Ejecutar la actualización
    console.log("\n=== GUARDANDO EN BASE DE DATOS ===\n");
    const [updatedTemplate] = await db
      .update(formTemplates)
      .set(updateData)
      .where(eq(formTemplates.id, id))
      .returning();
    
    console.log("\n=== PLANTILLA ACTUALIZADA EXITOSAMENTE ===\n");
    
    // Verificación posterior
    const verifiedTemplate = await this.getFormTemplate(id);
    console.log("\n=== VERIFICACIÓN POSTERIOR A ACTUALIZACIÓN ===\n");
    
    if (verifiedTemplate && verifiedTemplate.structure && 
        typeof verifiedTemplate.structure === 'object' && 
        verifiedTemplate.structure.fields && 
        Array.isArray(verifiedTemplate.structure.fields)) {
        
      verifiedTemplate.structure.fields.forEach((field: any, idx: number) => {
        console.log(`Campo #${idx} verificado - ID: ${field.id}, DisplayName: ${field.displayName}`);
      });
    } else {
      console.log("ADVERTENCIA: La estructura verificada no tiene campos o no es un objeto válido");
      console.log("Estructura verificada:", JSON.stringify(verifiedTemplate?.structure || {}));
    }
    
    return updatedTemplate;
  }

  async getAllFormTemplates(): Promise<FormTemplate[]> {
    return await db.select().from(formTemplates);
  }

  async getFormTemplatesByDepartment(department: string): Promise<FormTemplate[]> {
    return await db
      .select()
      .from(formTemplates)
      .where(eq(formTemplates.department, department));
  }

  // Form entry methods
  async getFormEntry(id: number): Promise<FormEntry | undefined> {
    const [entry] = await db.select().from(formEntries).where(eq(formEntries.id, id));
    return entry;
  }

  async createFormEntry(entry: InsertFormEntry): Promise<FormEntry> {
    const [newEntry] = await db.insert(formEntries).values(entry).returning();
    return newEntry;
  }

  async getFormEntriesByTemplate(templateId: number): Promise<FormEntry[]> {
    return await db
      .select()
      .from(formEntries)
      .where(eq(formEntries.formTemplateId, templateId));
  }

  async getFormEntriesByUser(userId: number): Promise<FormEntry[]> {
    return await db
      .select()
      .from(formEntries)
      .where(eq(formEntries.createdBy, userId));
  }

  async getFormEntriesByDepartment(department: string): Promise<FormEntry[]> {
    return await db
      .select()
      .from(formEntries)
      .where(eq(formEntries.department, department));
  }
  
  async updateFormEntry(id: number, data: Partial<any>): Promise<FormEntry | undefined> {
    // Log debugging
    console.log("=== MÉTODO updateFormEntry ===");
    console.log("ID del formulario a actualizar:", id);
    
    // Primero obtenemos la entrada existente para verificar que existe
    const existingEntry = await this.getFormEntry(id);
    if (!existingEntry) {
      console.error("No se encontró la entrada con ID:", id);
      return undefined;
    }
    
    // Preparar los datos para actualización
    const updateData: any = {
      ...data,
      updatedAt: new Date()
    };
    
    // Convertir cadenas de fecha a objetos Date
    if (updateData.signedAt && !(updateData.signedAt instanceof Date)) {
      try {
        updateData.signedAt = new Date();
      } catch (e) {
        console.error("Error al convertir signedAt a fecha:", e);
        delete updateData.signedAt;
      }
    }
    
    if (updateData.approvedAt && !(updateData.approvedAt instanceof Date)) {
      try {
        updateData.approvedAt = new Date();
      } catch (e) {
        console.error("Error al convertir approvedAt a fecha:", e);
        delete updateData.approvedAt;
      }
    }
    
    console.log("Datos de actualización:", updateData);
    
    // Ejecutar la actualización
    try {
      const [updatedEntry] = await db
        .update(formEntries)
        .set(updateData)
        .where(eq(formEntries.id, id))
        .returning();
      
      console.log("Entrada actualizada exitosamente");
      return updatedEntry;
    } catch (error) {
      console.error("Error al actualizar entrada:", error);
      throw error;
    }
  }

  // Activity log methods
  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [newLog] = await db.insert(activityLogs).values(log).returning();
    return newLog;
  }

  async getRecentActivity(limit: number): Promise<ActivityLog[]> {
    return await db
      .select()
      .from(activityLogs)
      .orderBy(desc(activityLogs.timestamp))
      .limit(limit);
  }

  // Saved Report methods
  async getSavedReport(id: number): Promise<SavedReport | undefined> {
    const [report] = await db.select().from(savedReports).where(eq(savedReports.id, id));
    return report;
  }

  async getSavedReports(): Promise<SavedReport[]> {
    return await db.select().from(savedReports);
  }

  async createSavedReport(report: InsertSavedReport): Promise<SavedReport> {
    const [newReport] = await db.insert(savedReports).values(report).returning();
    return newReport;
  }

  async updateSavedReport(id: number, data: Partial<InsertSavedReport>): Promise<SavedReport | undefined> {
    // Usamos el mismo patrón para evitar problemas con las fechas
    const updateData = JSON.parse(JSON.stringify(data));
    updateData.updatedAt = new Date();
    
    const [updatedReport] = await db
      .update(savedReports)
      .set(updateData)
      .where(eq(savedReports.id, id))
      .returning();
    return updatedReport;
  }

  async deleteSavedReport(id: number): Promise<void> {
    await db
      .delete(savedReports)
      .where(eq(savedReports.id, id));
  }
}

// Use DatabaseStorage instead of MemStorage
export const storage = new DatabaseStorage();
