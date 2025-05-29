import { 
  users, type User, type InsertUser, 
  formTemplates, FormTemplate, InsertFormTemplate, 
  formEntries, FormEntry, InsertFormEntry, 
  activityLogs, ActivityLog, InsertActivityLog,
  savedReports, SavedReport, InsertSavedReport,
  folioCounters, FolioCounter, InsertFolioCounter,
  products, Product, InsertProduct,
  employees, Employee, InsertEmployee,
  productRecipes, ProductRecipe, InsertProductRecipe,
  recipeIngredients, RecipeIngredient, InsertRecipeIngredient,
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
  getUsersByRole(role: string): Promise<User[]>;
  
  // Form template methods
  getFormTemplate(id: number): Promise<FormTemplate | undefined>;
  createFormTemplate(template: InsertFormTemplate): Promise<FormTemplate>;
  updateFormTemplate(id: number, data: Partial<InsertFormTemplate>): Promise<FormTemplate | undefined>;
  deleteFormTemplate(id: number): Promise<void>;
  getAllFormTemplates(): Promise<FormTemplate[]>;
  getFormTemplatesByDepartment(department: string): Promise<FormTemplate[]>;
  
  // Form entry methods
  getFormEntry(id: number): Promise<FormEntry | undefined>;
  createFormEntry(entry: InsertFormEntry): Promise<FormEntry>;
  updateFormEntry(id: number, data: Partial<any>): Promise<FormEntry | undefined>;
  deleteFormEntry(id: number): Promise<void>;
  getFormEntriesByTemplate(templateId: number): Promise<FormEntry[]>;
  getFormEntriesByUser(userId: number): Promise<FormEntry[]>;
  getFormEntriesByDepartment(department: string): Promise<FormEntry[]>;
  getAllFormEntries(): Promise<FormEntry[]>;
  
  // Saved report methods
  getSavedReport(id: number): Promise<SavedReport | undefined>;
  getSavedReports(): Promise<SavedReport[]>;
  createSavedReport(report: InsertSavedReport): Promise<SavedReport>;
  updateSavedReport(id: number, data: Partial<InsertSavedReport>): Promise<SavedReport | undefined>;
  deleteSavedReport(id: number): Promise<void>;
  
  // Activity log methods
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getRecentActivity(limit: number): Promise<ActivityLog[]>;
  
  // Folio methods
  getFolioCounter(templateId: number): Promise<FolioCounter | undefined>;
  getNextFolioNumber(templateId: number): Promise<number>;
  
  // Productos methods
  getProduct(id: number): Promise<Product | undefined>;
  getProductByCode(code: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, data: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<void>;
  getAllProducts(): Promise<Product[]>;
  getActiveProducts(): Promise<Product[]>;
  
  // Empleados methods
  getEmployee(id: number): Promise<Employee | undefined>;
  getEmployeeByEmployeeId(employeeId: string): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, data: Partial<InsertEmployee>): Promise<Employee | undefined>;
  deleteEmployee(id: number): Promise<void>;
  getAllEmployees(): Promise<Employee[]>;
  getActiveEmployees(): Promise<Employee[]>;
  getEmployeesByDepartment(department: string): Promise<Employee[]>;
  
  // Recetas methods
  getProductRecipe(id: number): Promise<ProductRecipe | undefined>;
  getProductRecipesByProductId(productId: number): Promise<ProductRecipe[]>;
  createProductRecipe(recipe: InsertProductRecipe): Promise<ProductRecipe>;
  updateProductRecipe(id: number, data: Partial<InsertProductRecipe>): Promise<ProductRecipe | undefined>;
  deleteProductRecipe(id: number): Promise<void>;
  getAllProductRecipes(): Promise<ProductRecipe[]>;
  
  // Ingredientes de recetas methods
  getRecipeIngredientsByRecipeId(recipeId: number): Promise<RecipeIngredient[]>;
  createRecipeIngredient(ingredient: InsertRecipeIngredient): Promise<RecipeIngredient>;
  updateRecipeIngredient(id: number, data: Partial<InsertRecipeIngredient>): Promise<RecipeIngredient | undefined>;
  deleteRecipeIngredient(id: number): Promise<void>;
  
  // Production forms methods
  getAllProductionForms(): Promise<any[]>;
  getProductionFormsByUser(userId: number): Promise<any[]>;
  
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
  
  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
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
  
  async deleteFormTemplate(id: number): Promise<void> {
    await db
      .delete(formTemplates)
      .where(eq(formTemplates.id, id));
  }

  // Form entry methods
  async getFormEntry(id: number): Promise<FormEntry | undefined> {
    const [entry] = await db.select().from(formEntries).where(eq(formEntries.id, id));
    return entry;
  }

  async createFormEntry(entry: InsertFormEntry): Promise<FormEntry> {
    console.log("[Storage] Creando nueva entrada de formulario, datos:", entry);
    
    try {
      // Verificar que tenemos los datos necesarios
      if (!entry.formTemplateId) {
        throw new Error("La plantilla de formulario es requerida");
      }
      
      if (!entry.data || Object.keys(entry.data).length === 0) {
        throw new Error("Los datos del formulario no pueden estar vacíos");
      }
      
      // Crear una copia limpia de los datos para evitar problemas con referencias circulares
      const cleanData = JSON.parse(JSON.stringify(entry.data));
      entry.data = cleanData;
      
      // Obtener el siguiente número de folio para este tipo de formulario
      const nextFolioNumber = await this.getNextFolioNumber(entry.formTemplateId);
      console.log("[Storage] Número de folio asignado:", nextFolioNumber);
      
      // Añadir el número de folio a la entrada y asegurar valores por defecto para campos requeridos
      const entryWithFolio = {
        ...entry,
        folioNumber: nextFolioNumber,
        status: entry.status || "draft",
        createdAt: entry.createdAt || new Date(),
        updatedAt: entry.updatedAt || new Date()
      };
      
      // Guardar la entrada con el número de folio
      console.log("[Storage] Insertando entrada en la base de datos...");
      const [newEntry] = await db.insert(formEntries).values(entryWithFolio).returning();
      console.log("[Storage] Entrada guardada exitosamente, ID:", newEntry.id);
      
      return newEntry;
    } catch (error) {
      console.error("[Storage] Error al crear entrada de formulario:", error);
      throw error;
    }
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

  async getAllFormEntries(): Promise<FormEntry[]> {
    return await db
      .select()
      .from(formEntries)
      .orderBy(desc(formEntries.createdAt));
  }
  
  async deleteFormEntry(id: number): Promise<void> {
    await db
      .delete(formEntries)
      .where(eq(formEntries.id, id));
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
  
  // Folio methods
  async getFolioCounter(templateId: number): Promise<FolioCounter | undefined> {
    const [counter] = await db
      .select()
      .from(folioCounters)
      .where(eq(folioCounters.formTemplateId, templateId));
    return counter;
  }
  
  async getNextFolioNumber(templateId: number): Promise<number> {
    // Buscar el contador existente o crear uno nuevo
    let counter = await this.getFolioCounter(templateId);
    
    if (!counter) {
      // Si no existe, crear un nuevo contador iniciando en 1
      const [newCounter] = await db
        .insert(folioCounters)
        .values({
          formTemplateId: templateId,
          lastFolioNumber: 1,
          updatedAt: new Date()
        })
        .returning();
      
      return 1; // Devolver el primer número de folio
    } else {
      // Incrementar el contador existente
      const nextFolioNumber = counter.lastFolioNumber + 1;
      
      // Actualizar el contador en la base de datos
      await db
        .update(folioCounters)
        .set({
          lastFolioNumber: nextFolioNumber,
          updatedAt: new Date()
        })
        .where(eq(folioCounters.id, counter.id));
      
      return nextFolioNumber;
    }
  }
  
  // Implementación de métodos de productos
  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }
  
  async getProductByCode(code: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.code, code));
    return product;
  }
  
  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }
  
  async updateProduct(id: number, data: Partial<InsertProduct>): Promise<Product | undefined> {
    const updateData = {
      ...data,
      updatedAt: new Date()
    };
    
    const [updatedProduct] = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, id))
      .returning();
      
    return updatedProduct;
  }
  
  async deleteProduct(id: number): Promise<void> {
    await db
      .update(products)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(products.id, id));
  }
  
  async getAllProducts(): Promise<Product[]> {
    return await db.select().from(products);
  }
  
  async getActiveProducts(): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(eq(products.isActive, true));
  }
  
  // Implementación de métodos de empleados
  async getEmployee(id: number): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee;
  }
  
  async getEmployeeByEmployeeId(employeeId: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.employeeId, employeeId));
    return employee;
  }
  
  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const [newEmployee] = await db.insert(employees).values(employee).returning();
    return newEmployee;
  }
  
  async updateEmployee(id: number, data: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const updateData = {
      ...data,
      updatedAt: new Date()
    };
    
    const [updatedEmployee] = await db
      .update(employees)
      .set(updateData)
      .where(eq(employees.id, id))
      .returning();
      
    return updatedEmployee;
  }
  
  async deleteEmployee(id: number): Promise<void> {
    await db
      .update(employees)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(employees.id, id));
  }
  
  async getAllEmployees(): Promise<Employee[]> {
    return await db.select().from(employees);
  }
  
  async getActiveEmployees(): Promise<Employee[]> {
    return await db
      .select()
      .from(employees)
      .where(eq(employees.isActive, true));
  }
  
  async getEmployeesByDepartment(department: string): Promise<Employee[]> {
    return await db
      .select()
      .from(employees)
      .where(eq(employees.department, department));
  }

  // Métodos para recetas de productos
  async getProductRecipe(id: number): Promise<ProductRecipe | undefined> {
    const [recipe] = await db.select().from(productRecipes).where(eq(productRecipes.id, id));
    return recipe;
  }

  async getProductRecipesByProductId(productId: number): Promise<ProductRecipe[]> {
    return await db
      .select()
      .from(productRecipes)
      .where(eq(productRecipes.productId, productId));
  }

  async createProductRecipe(recipe: InsertProductRecipe): Promise<ProductRecipe> {
    const [newRecipe] = await db.insert(productRecipes).values(recipe).returning();
    return newRecipe;
  }

  async updateProductRecipe(id: number, data: Partial<InsertProductRecipe>): Promise<ProductRecipe | undefined> {
    const [updatedRecipe] = await db
      .update(productRecipes)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(productRecipes.id, id))
      .returning();
    return updatedRecipe;
  }

  async deleteProductRecipe(id: number): Promise<void> {
    await db
      .delete(productRecipes)
      .where(eq(productRecipes.id, id));
  }

  async getAllProductRecipes(): Promise<ProductRecipe[]> {
    return await db.select().from(productRecipes);
  }

  // Métodos para ingredientes de recetas
  async getRecipeIngredientsByRecipeId(recipeId: number): Promise<RecipeIngredient[]> {
    return await db
      .select()
      .from(recipeIngredients)
      .where(eq(recipeIngredients.recipeId, recipeId));
  }

  async createRecipeIngredient(ingredient: InsertRecipeIngredient): Promise<RecipeIngredient> {
    const [newIngredient] = await db.insert(recipeIngredients).values(ingredient).returning();
    return newIngredient;
  }

  async updateRecipeIngredient(id: number, data: Partial<InsertRecipeIngredient>): Promise<RecipeIngredient | undefined> {
    const [updatedIngredient] = await db
      .update(recipeIngredients)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(recipeIngredients.id, id))
      .returning();
    return updatedIngredient;
  }

  async deleteRecipeIngredient(id: number): Promise<void> {
    await db
      .delete(recipeIngredients)
      .where(eq(recipeIngredients.id, id));
  }

  // Production forms methods
  async getAllProductionForms(): Promise<any[]> {
    const { productionForms } = await import("@shared/schema");
    return await db.select().from(productionForms).orderBy(desc(productionForms.createdAt));
  }

  async getProductionFormsByUser(userId: number): Promise<any[]> {
    const { productionForms } = await import("@shared/schema");
    return await db
      .select()
      .from(productionForms)
      .where(eq(productionForms.createdBy, userId))
      .orderBy(desc(productionForms.createdAt));
  }
}

// Use DatabaseStorage instead of MemStorage
export const storage = new DatabaseStorage();
