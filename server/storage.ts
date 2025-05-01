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

  async updateFormTemplate(id: number, data: Partial<InsertFormTemplate>): Promise<FormTemplate | undefined> {
    // Log debugging
    console.log("=== MÉTODO updateFormTemplate ===");
    console.log("ID del formulario a actualizar:", id);
    
    // Realizar una copia profunda de los datos para evitar problemas de referencia
    const updateData = JSON.parse(JSON.stringify({
      ...data,
      updatedAt: new Date()
    }));
    
    // Verificar si hay estructura y campos
    if (updateData.structure && updateData.structure.fields) {
      console.log("Número de campos en la estructura:", updateData.structure.fields.length);
      
      // Verificar cada campo individualmente
      updateData.structure.fields.forEach((field: any, idx: number) => {
        console.log(`Verificando campo #${idx} antes de guardar:`, 
          `ID: ${field.id}, `,
          `Label: ${field.label}, `,
          `DisplayName: ${field.displayName || '[Sin valor]'}, `,
          `DisplayOrder: ${field.displayOrder || 0}`
        );
        
        // Asegurar que displayName sea string y displayOrder sea número
        field.displayName = String(field.displayName || field.label || '');
        field.displayOrder = Number(field.displayOrder || 0);
      });
    }
    
    // Ejecutar la actualización
    const [updatedTemplate] = await db
      .update(formTemplates)
      .set(updateData)
      .where(eq(formTemplates.id, id))
      .returning();
    
    console.log("Plantilla actualizada exitosamente");
    
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
    const [updatedReport] = await db
      .update(savedReports)
      .set({
        ...data,
        updatedAt: new Date()
      })
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
