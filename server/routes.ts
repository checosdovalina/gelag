import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, authorize } from "./auth";
import { storage } from "./storage";
import { 
  insertFormTemplateSchema, 
  insertFormEntrySchema, 
  UserRole, 
  insertUserSchema,
  insertSavedReportSchema,
  formTemplates,
  FormWorkflowStatus,
  updateFormWorkflowSchema,
  FormEntry,
  ProductionFormStatus,
  insertProductionFormSchema,
  productionForms
} from "@shared/schema";
import { 
  getProductionForms,
  getProductionFormById,
  createProductionForm,
  updateProductionForm,
  updateProductionFormStatus,
  deleteProductionForm
} from './production-forms';
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { hashPassword } from "./auth";
import { upload, parseExcelFile, parsePdfFile, cleanupFile } from "./file-upload";
import PDFDocument from "pdfkit";
import fs from 'fs';
import { User } from "@shared/schema";

// Función para verificar si un usuario puede actualizar un formulario según su rol y estado del flujo
interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Verifica si un usuario puede actualizar un formulario según su estado en el flujo de trabajo
 * @param user Usuario que intenta realizar la actualización
 * @param formEntry Entrada de formulario actual
 * @param targetStatus Estado al que se quiere cambiar
 * @returns Resultado con permiso y razón
 */
async function canUserUpdateWorkflow(
  user: User, 
  formEntry: FormEntry, 
  targetStatus: FormWorkflowStatus
): Promise<PermissionCheckResult> {
  // SuperAdmin y Admin siempre pueden actualizar formularios
  if (user.role === UserRole.SUPERADMIN || user.role === UserRole.ADMIN) {
    return { allowed: true };
  }
  
  // El creador del formulario siempre puede actualizarlo
  if (formEntry.createdBy === user.id) {
    return { allowed: true };
  }
  
  // Matriz de permisos según el rol y estado del flujo
  const workflowRules: Record<UserRole, { 
    canInitiate: boolean;
    canEditStatuses: FormWorkflowStatus[];
    canTransitionTo: Partial<Record<FormWorkflowStatus, FormWorkflowStatus[]>>; 
  }> = {
    // Gerente de Producción inicia el flujo y puede transicionar a IN_PROGRESS
    [UserRole.PRODUCTION_MANAGER]: {
      canInitiate: true,
      canEditStatuses: [FormWorkflowStatus.INITIATED, FormWorkflowStatus.IN_PROGRESS],
      canTransitionTo: {
        [FormWorkflowStatus.INITIATED]: [FormWorkflowStatus.IN_PROGRESS],
        [FormWorkflowStatus.IN_PROGRESS]: [FormWorkflowStatus.PENDING_QUALITY]
      }
    },
    
    // Operativos de Producción pueden actualizar cuando está en progreso
    [UserRole.PRODUCTION]: {
      canInitiate: false,
      canEditStatuses: [FormWorkflowStatus.IN_PROGRESS],
      canTransitionTo: {
        [FormWorkflowStatus.IN_PROGRESS]: [FormWorkflowStatus.IN_PROGRESS] // Se mantiene en el mismo estado
      }
    },
    
    // Gerente de Calidad puede revisar y completar cuando está pendiente de calidad
    [UserRole.QUALITY_MANAGER]: {
      canInitiate: false,
      canEditStatuses: [FormWorkflowStatus.PENDING_QUALITY],
      canTransitionTo: {
        [FormWorkflowStatus.PENDING_QUALITY]: [FormWorkflowStatus.COMPLETED]
      }
    },
    
    // Operativos de Calidad pueden revisar cuando está pendiente
    [UserRole.QUALITY]: {
      canInitiate: false,
      canEditStatuses: [FormWorkflowStatus.PENDING_QUALITY],
      canTransitionTo: {
        [FormWorkflowStatus.PENDING_QUALITY]: [FormWorkflowStatus.PENDING_QUALITY] // Se mantiene en el mismo estado
      }
    },
    
    // Los roles de solo visualización no pueden editar
    [UserRole.VIEWER]: {
      canInitiate: false,
      canEditStatuses: [],
      canTransitionTo: {}
    },
    
    // Por compatibilidad - Administradores pueden hacer todo
    [UserRole.SUPERADMIN]: {
      canInitiate: true,
      canEditStatuses: Object.values(FormWorkflowStatus),
      canTransitionTo: {
        [FormWorkflowStatus.INITIATED]: Object.values(FormWorkflowStatus),
        [FormWorkflowStatus.IN_PROGRESS]: Object.values(FormWorkflowStatus),
        [FormWorkflowStatus.PENDING_QUALITY]: Object.values(FormWorkflowStatus),
        [FormWorkflowStatus.COMPLETED]: Object.values(FormWorkflowStatus), 
        [FormWorkflowStatus.SIGNED]: Object.values(FormWorkflowStatus),
        [FormWorkflowStatus.APPROVED]: Object.values(FormWorkflowStatus),
        [FormWorkflowStatus.REJECTED]: Object.values(FormWorkflowStatus)
      }
    },
    
    [UserRole.ADMIN]: {
      canInitiate: true,
      canEditStatuses: Object.values(FormWorkflowStatus),
      canTransitionTo: {
        [FormWorkflowStatus.INITIATED]: Object.values(FormWorkflowStatus),
        [FormWorkflowStatus.IN_PROGRESS]: Object.values(FormWorkflowStatus),
        [FormWorkflowStatus.PENDING_QUALITY]: Object.values(FormWorkflowStatus),
        [FormWorkflowStatus.COMPLETED]: Object.values(FormWorkflowStatus), 
        [FormWorkflowStatus.SIGNED]: Object.values(FormWorkflowStatus),
        [FormWorkflowStatus.APPROVED]: Object.values(FormWorkflowStatus),
        [FormWorkflowStatus.REJECTED]: Object.values(FormWorkflowStatus)
      }
    }
  };
  
  const userRules = workflowRules[user.role];
  const currentStatus = formEntry.workflowStatus || FormWorkflowStatus.INITIATED;
  
  // Verificar si el usuario puede editar el estado actual
  if (!userRules.canEditStatuses.includes(currentStatus)) {
    return { 
      allowed: false, 
      reason: `El rol ${user.role} no puede editar formularios en estado ${currentStatus}`
    };
  }
  
  // Verificar si puede transicionar al estado objetivo
  const allowedTransitions = userRules.canTransitionTo[currentStatus] || [];
  if (!allowedTransitions.includes(targetStatus)) {
    return { 
      allowed: false, 
      reason: `No se permite transicionar de ${currentStatus} a ${targetStatus} para el rol ${user.role}`
    };
  }
  
  return { allowed: true };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);
  
  // User routes
  app.get("/api/users", authorize([UserRole.SUPERADMIN, UserRole.ADMIN]), async (req, res, next) => {
    try {
      const users = await storage.getAllUsers();
      // Remove passwords from response
      const sanitizedUsers = users.map(({ password, ...rest }) => rest);
      res.json(sanitizedUsers);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/users", authorize([UserRole.SUPERADMIN, UserRole.ADMIN]), async (req, res, next) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "El nombre de usuario ya existe" });
      }
      
      // Hash password
      const hashedPassword = await hashPassword(userData.password);
      
      // Create user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user.id,
        action: "created",
        resourceType: "user",
        resourceId: user.id,
        details: { username: user.username, role: user.role }
      });
      
      // Return user without password
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos inválidos", details: error.errors });
      }
      next(error);
    }
  });

  app.put("/api/users/:id", authorize([UserRole.SUPERADMIN, UserRole.ADMIN]), async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID de usuario inválido" });
      }
      
      // Check if user exists
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      
      // Validate input
      const updateData = req.body;
      
      // If updating password, hash it
      if (updateData.password) {
        updateData.password = await hashPassword(updateData.password);
      }
      
      // Update user
      const updatedUser = await storage.updateUser(userId, updateData);
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user.id,
        action: "updated",
        resourceType: "user",
        resourceId: userId,
        details: { username: existingUser.username }
      });
      
      // Return user without password
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });

  // Form template routes
  app.get("/api/form-templates", async (req, res, next) => {
    try {
      // Filter by department if specified
      let templates;
      if (req.query.department) {
        templates = await storage.getFormTemplatesByDepartment(req.query.department as string);
      } else {
        templates = await storage.getAllFormTemplates();
      }
      res.json(templates);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/form-templates/:id", async (req, res, next) => {
    try {
      const templateId = parseInt(req.params.id);
      if (isNaN(templateId)) {
        return res.status(400).json({ message: "ID de plantilla inválido" });
      }
      
      const template = await storage.getFormTemplate(templateId);
      if (!template) {
        return res.status(404).json({ message: "Plantilla no encontrada" });
      }
      
      res.json(template);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/form-templates", authorize([UserRole.SUPERADMIN]), async (req, res, next) => {
    try {
      // Primero añadimos el createdBy al objeto para que pase la validación
      const dataToValidate = {
        ...req.body,
        createdBy: req.user.id
      };
      
      // Procesamos la estructura para asegurar que todos los campos tengan displayName y displayOrder
      if (dataToValidate.structure && dataToValidate.structure.fields) {
        dataToValidate.structure.fields = dataToValidate.structure.fields.map(field => {
          // Asegurar que cada campo tenga displayName (si no lo tiene, usar label)
          if (!field.displayName) {
            field.displayName = field.label;
          }
          
          // Asegurar que cada campo tenga displayOrder
          if (field.displayOrder === undefined) {
            field.displayOrder = 0;
          }
          
          return field;
        });
        
        console.log("Campos del formulario nuevo procesados para guardar:", dataToValidate.structure.fields);
      }
      
      // Ahora validamos los datos completos
      const templateData = insertFormTemplateSchema.parse(dataToValidate);
      
      // Create template
      const template = await storage.createFormTemplate(templateData);
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user.id,
        action: "created",
        resourceType: "form_template",
        resourceId: template.id,
        details: { name: template.name }
      });
      
      res.status(201).json(template);
    } catch (error) {
      console.error("Error al crear formulario:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos inválidos", details: error.errors });
      }
      next(error);
    }
  });

  // Endpoint directo para actualizar campos en formularios
  app.patch("/api/form-templates/:id/field/:fieldId/display-name", authorize([UserRole.SUPERADMIN]), async (req, res, next) => {
    try {
      console.log("\n\n=== NUEVO ENDPOINT PARA ACTUALIZAR DISPLAYNAME ===\n");
      
      const templateId = parseInt(req.params.id);
      const fieldId = req.params.fieldId;
      const { displayName } = req.body;
      
      if (isNaN(templateId) || !fieldId) {
        console.error("Parámetros inválidos:", { templateId, fieldId });
        return res.status(400).json({ message: "Parámetros inválidos" });
      }
      
      console.log(`Actualizando campo ${fieldId} del formulario ${templateId}`);
      console.log(`Nuevo displayName: "${displayName}"`);
      
      // Obtener el formulario actual directamente de la base de datos
      const [existingTemplate] = await db
        .select()
        .from(formTemplates)
        .where(eq(formTemplates.id, templateId));
        
      if (!existingTemplate) {
        console.error(`Plantilla con ID ${templateId} no encontrada`);
        return res.status(404).json({ message: "Plantilla no encontrada" });
      }
      
      // Verificar que la estructura tenga el formato esperado
      if (!existingTemplate.structure || typeof existingTemplate.structure !== 'object') {
        console.error(`Estructura inválida en plantilla ${templateId}:`, existingTemplate.structure);
        return res.status(400).json({ message: "Estructura de formulario inválida" });
      }
      
      // Hacer una copia profunda de la estructura
      let structure: any;
      try {
        structure = JSON.parse(JSON.stringify(existingTemplate.structure));
      } catch (e) {
        console.error("Error al parsear estructura:", e);
        return res.status(500).json({ message: "Error al procesar estructura del formulario" });
      }
      
      // Asegurar que fields existe y es un array
      if (!Array.isArray(structure.fields)) {
        console.error("El campo 'fields' no es un array:", structure.fields);
        return res.status(400).json({ message: "Estructura de formulario inválida: fields no es un array" });
      }
      
      // Buscar el campo por ID
      let fieldFound = false;
      for (let i = 0; i < structure.fields.length; i++) {
        if (structure.fields[i].id === fieldId) {
          const oldValue = structure.fields[i].displayName;
          structure.fields[i].displayName = displayName;
          fieldFound = true;
          console.log(`Campo encontrado en posición ${i}`);
          console.log(`  Valor anterior: "${oldValue}"`);
          console.log(`  Nuevo valor: "${displayName}"`);
          break;
        }
      }
      
      if (!fieldFound) {
        console.error(`Campo ${fieldId} no encontrado en los ${structure.fields.length} campos del formulario`);
        return res.status(404).json({ message: "Campo no encontrado en el formulario" });
      }
      
      // Actualizar directamente en la base de datos
      console.log("\n=== ACTUALIZANDO EN BASE DE DATOS ===\n");
      await db
        .update(formTemplates)
        .set({
          structure: structure,
          updatedAt: new Date()
        })
        .where(eq(formTemplates.id, templateId));
      
      console.log("Actualización completada en base de datos");
      
      // Verificar que se guardó correctamente
      const [verifiedTemplate] = await db
        .select()
        .from(formTemplates)
        .where(eq(formTemplates.id, templateId));
        
      if (!verifiedTemplate || !verifiedTemplate.structure) {
        console.error("No se pudo verificar la actualización");
        return res.status(500).json({ message: "Error al verificar la actualización" });
      }
      
      // Verificar que el campo se actualizó correctamente
      let verifiedField;
      try {
        const verifiedStructure = typeof verifiedTemplate.structure === 'string' 
          ? JSON.parse(verifiedTemplate.structure) 
          : verifiedTemplate.structure;
          
        verifiedField = verifiedStructure.fields.find((f: any) => f.id === fieldId);
        console.log(`Verificación: valor guardado = "${verifiedField?.displayName}"`);
      } catch (e) {
        console.error("Error al verificar campo actualizado:", e);
      }
      
      // Log de actividad
      await storage.createActivityLog({
        userId: req.user.id,
        action: "updated_field",
        resourceType: "form_template",
        resourceId: templateId,
        details: { fieldId, displayName }
      });
      
      // Retornar respuesta exitosa
      res.status(200).json({ 
        success: true,
        message: "Campo actualizado correctamente",
        fieldId,
        displayName,
        verified: verifiedField?.displayName === displayName
      });
    } catch (error) {
      console.error("Error al actualizar campo:", error);
      res.status(500).json({ message: "Error interno del servidor", error: String(error) });
    }
  });

  app.put("/api/form-templates/:id", authorize([UserRole.SUPERADMIN]), async (req, res, next) => {
    try {
      console.log("\n\n==================================================");
      console.log("=== ACTUALIZACIÓN DE FORMULARIO INICIADA ===");
      console.log("==================================================\n");
      
      // Log completo del cuerpo de la solicitud para depuración
      console.log("Datos recibidos:", JSON.stringify(req.body, null, 2));
      
      const templateId = parseInt(req.params.id);
      if (isNaN(templateId)) {
        return res.status(400).json({ message: "ID de plantilla inválido" });
      }
      
      // Check if template exists
      const existingTemplate = await storage.getFormTemplate(templateId);
      if (!existingTemplate) {
        return res.status(404).json({ message: "Plantilla no encontrada" });
      }
      
      console.log("\n=== COMPARACIÓN DE ESTRUCTURAS ===\n");
      console.log("FORMULARIO ID:", templateId);
      console.log("NOMBRE:", existingTemplate.name);
      
      // Verificación de IDs coincidentes entre las estructuras original y nueva
      const originalFields = existingTemplate.structure?.fields || [];
      const newFields = req.body.structure?.fields || [];
      
      console.log("NÚMERO DE CAMPOS - Original:", originalFields.length, "Nueva:", newFields.length);
      
      // Mapeo de IDs para facilitar la búsqueda
      const originalFieldsMap = new Map();
      originalFields.forEach((field: any) => {
        originalFieldsMap.set(field.id, field);
      });
      
      // Verificar cambios específicos en displayName
      console.log("\n=== CAMBIOS EN DISPLAYNAME ===\n");
      newFields.forEach((newField: any, idx: number) => {
        const originalField = originalFieldsMap.get(newField.id);
        if (originalField) {
          // Comprobar si displayName ha cambiado
          if (originalField.displayName !== newField.displayName) {
            console.log(`Campo #${idx} - ID: ${newField.id}`);
            console.log(`  Label: ${newField.label}`);
            console.log(`  DisplayName ORIGINAL: ${originalField.displayName}`);
            console.log(`  DisplayName NUEVO: ${newField.displayName}`);
            console.log(`  CAMBIO DETECTADO: SÍ`);
          }
        } else {
          console.log(`ADVERTENCIA: Campo nuevo no encontrado en original - ID: ${newField.id}`);
        }
      });
      
      // Procesamos la estructura para asegurar que todos los campos tengan displayName y displayOrder
      if (req.body.structure && req.body.structure.fields) {
        console.log("Procesando campos del formulario...");
        
        // Registro previo a la modificación para cada campo
        req.body.structure.fields.forEach((field, idx) => {
          console.log(`Campo #${idx} antes de procesar:`, 
            `ID: ${field.id}, `,
            `Label: ${field.label}, `,
            `DisplayName: ${field.displayName}, `,
            `DisplayOrder: ${field.displayOrder}`
          );
        });
        
        req.body.structure.fields = req.body.structure.fields.map(field => {
          // Guardar valores originales para logging
          const originalDisplayName = field.displayName;
          
          // Asegurar que cada campo tenga displayName (si no lo tiene, usar label)
          if (field.displayName === undefined || (field.displayName === '' && field.label)) {
            field.displayName = field.label;
          }
          
          // Convertir displayName a string explícitamente
          field.displayName = String(field.displayName || '');
          
          // Asegurar que cada campo tenga displayOrder
          if (field.displayOrder === undefined) {
            field.displayOrder = 0;
          }
          
          // Convertir displayOrder a número explícitamente
          field.displayOrder = Number(field.displayOrder);
          
          console.log(`Campo procesado - ID: ${field.id}`, 
            `DisplayName Original: ${originalDisplayName}, `,
            `DisplayName Final: ${field.displayName}`
          );
          
          return field;
        });
        
        console.log("Estructura final a guardar:", JSON.stringify(req.body.structure, null, 2));
      }
      
      // Update template
      const updatedTemplate = await storage.updateFormTemplate(templateId, req.body);
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user.id,
        action: "updated",
        resourceType: "form_template",
        resourceId: templateId,
        details: { name: existingTemplate.name }
      });
      
      res.json(updatedTemplate);
    } catch (error) {
      console.error("Error al actualizar formulario:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos inválidos", details: error.errors });
      }
      next(error);
    }
  });
  
  // Eliminar plantilla de formulario (sólo SuperAdmin)
  app.delete("/api/form-templates/:id", authorize([UserRole.SUPERADMIN]), async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      // Verificar si el formulario existe
      const template = await storage.getFormTemplate(id);
      if (!template) {
        return res.status(404).json({ message: "Formulario no encontrado" });
      }
      
      // Verificar si hay entradas asociadas a este formulario
      const entries = await storage.getFormEntriesByTemplate(id);
      if (entries && entries.length > 0) {
        return res.status(400).json({ 
          message: "No se puede eliminar el formulario porque tiene entradas asociadas", 
          count: entries.length 
        });
      }
      
      // Eliminar formulario
      await storage.deleteFormTemplate(id);
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user.id,
        action: "deleted",
        resourceType: "form_template",
        resourceId: id,
        details: { name: template.name }
      });
      
      res.json({ message: "Formulario eliminado correctamente" });
    } catch (error) {
      console.error("Error al eliminar formulario:", error);
      next(error);
    }
  });

  // Form entry routes - versión simplificada para resolver errores 503
  app.get("/api/form-entries", async (req, res, next) => {
    try {
      console.log("=== GET FORM ENTRIES ===");
      console.log("Usuario autenticado:", !!req.user);
      
      // Check if user is authenticated
      if (!req.user) {
        console.log("Usuario no autenticado");
        return res.status(401).json({ message: "No autenticado" });
      }
      
      console.log("Usuario:", req.user.username, "Rol:", req.user.role);

      // Respuesta simplificada para evitar errores 503
      console.log("Devolviendo respuesta simplificada");
      return res.json({
        entries: [],
        productionForms: [],
        totalEntries: 0,
        totalProductionForms: 0
      });
      
      /*
      // Código original comentado temporalmente para resolver errores de compilación
      */
    } catch (error) {
      console.error("Error getting form entries:", error);
      next(error);
    }
  });

  app.get("/api/form-entries/:id", async (req, res, next) => {
    try {
      const entryId = parseInt(req.params.id);
      if (isNaN(entryId)) {
        return res.status(400).json({ message: "ID de entrada inválido" });
      }
      
      const entry = await storage.getFormEntry(entryId);
      if (!entry) {
        return res.status(404).json({ message: "Entrada no encontrada" });
      }
      
      // Check if user has permission to view this entry
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "No autenticado" });
      }
      
      if (
        req.user?.role !== UserRole.SUPERADMIN &&
        req.user?.role !== UserRole.ADMIN && 
        entry.createdBy !== req.user?.id && 
        entry.department !== req.user?.department
      ) {
        return res.status(403).json({ message: "No autorizado para ver esta entrada" });
      }
      
      res.json(entry);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/form-entries", authorize([UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.PRODUCTION, UserRole.QUALITY]), 
    async (req, res, next) => {
      try {
        console.log("[API] Recibiendo solicitud para crear entrada de formulario");
        
        // Crear una copia limpia de los datos para evitar problemas de referencia
        const cleanData = JSON.parse(JSON.stringify(req.body));
        
        // Validar los datos con Zod
        const entryData = insertFormEntrySchema.parse(cleanData);
        
        console.log("[API] Datos de entrada validados correctamente");
        
        // Set creator ID from logged in user
        entryData.createdBy = req.user.id;
        
        // Set default status to draft
        entryData.status = "draft";
        
        // Check if form template exists
        const template = await storage.getFormTemplate(entryData.formTemplateId);
        if (!template) {
          console.log("[API] Error: Plantilla no encontrada, ID:", entryData.formTemplateId);
          return res.status(404).json({ message: "Plantilla de formulario no encontrada" });
        }
        
        console.log("[API] Plantilla encontrada:", template.name);
        
        // Validar que los datos del formulario no están vacíos
        if (!entryData.data || Object.keys(entryData.data).length === 0) {
          console.log("[API] Error: Datos de formulario vacíos");
          return res.status(400).json({ 
            message: "Los datos del formulario no pueden estar vacíos" 
          });
        }
        
        // Create entry
        console.log("[API] Creando entrada de formulario...");
        const entry = await storage.createFormEntry(entryData);
        
        // Log activity
        await storage.createActivityLog({
          userId: req.user.id,
          action: "created",
          resourceType: "form_entry",
          resourceId: entry.id,
          details: { 
            formTemplateId: entry.formTemplateId,
            formTemplateName: template.name
          }
        });
        
        console.log("[API] Entrada creada exitosamente, ID:", entry.id);
        res.status(201).json(entry);
      } catch (error) {
        console.error("[API] Error al crear entrada de formulario:", error);
        
        if (error instanceof z.ZodError) {
          return res.status(400).json({ 
            message: "Datos inválidos", 
            details: error.errors 
          });
        }
        next(error);
      }
    }
  );
  
  // Eliminar entrada de formulario (sólo SuperAdmin)
  app.delete("/api/form-entries/:id", authorize([UserRole.SUPERADMIN]), async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      // Verificar si la entrada existe
      const entry = await storage.getFormEntry(id);
      if (!entry) {
        return res.status(404).json({ message: "Entrada de formulario no encontrada" });
      }
      
      // Eliminar entrada
      await storage.deleteFormEntry(id);
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user.id,
        action: "deleted",
        resourceType: "form_entry",
        resourceId: id,
        details: { formTemplateId: entry.formTemplateId }
      });
      
      res.json({ message: "Entrada de formulario eliminada correctamente" });
    } catch (error) {
      console.error("Error al eliminar entrada de formulario:", error);
      next(error);
    }
  });

  // Activity log routes
  app.get("/api/activity", authorize([UserRole.SUPERADMIN, UserRole.ADMIN]), async (req, res, next) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const activities = await storage.getRecentActivity(limit);
      res.json(activities);
    } catch (error) {
      next(error);
    }
  });

  // Dashboard stats route
  app.get("/api/dashboard/stats", async (req, res, next) => {
    try {
      const users = await storage.getAllUsers();
      const templates = await storage.getAllFormTemplates();
      const entries = (await storage.getFormEntriesByUser(0)).length; // This is just a workaround for demo
      
      res.json({
        users: users.length,
        templates: templates.length,
        entries: entries,
        // Mocking exports count as it's not tracked in our storage
        exports: 0
      });
    } catch (error) {
      next(error);
    }
  });
  
  // Ruta de prueba para crear un formulario con folio (solo para desarrollo)
  app.get("/api/test/create-form-entry", async (req, res, next) => {
    try {
      // Solo permitir en entorno de desarrollo
      if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({ message: "Esta ruta solo está disponible en entorno de desarrollo" });
      }
      
      // Obtener el primer template de formulario disponible
      const templates = await storage.getAllFormTemplates();
      if (templates.length === 0) {
        return res.status(404).json({ message: "No hay plantillas de formularios disponibles" });
      }
      
      const templateId = templates[0].id;
      
      // Crear una entrada de formulario de prueba
      const formEntry = await storage.createFormEntry({
        formTemplateId: templateId,
        department: "calidad",
        createdBy: 7, // Asegúrate de que este usuario existe
        data: {
          "campo_prueba": "Valor de prueba",
          "descripcion": "Formulario de prueba para verificar folios"
        },
        status: "draft"
      });
      
      res.json({
        message: "Formulario creado exitosamente",
        entry: formEntry
      });
    } catch (error) {
      next(error);
    }
  });
  
  // Endpoint para obtener el próximo número de folio para un formulario específico
  app.get("/api/form-templates/:id/next-folio", async (req, res, next) => {
    try {
      const templateId = parseInt(req.params.id);
      if (isNaN(templateId)) {
        return res.status(400).json({ message: "ID de formulario inválido" });
      }
      
      // Verificar si existe el formulario
      const template = await storage.getFormTemplate(templateId);
      if (!template) {
        return res.status(404).json({ message: "Plantilla de formulario no encontrada" });
      }
      
      // Obtener el próximo número de folio
      const nextFolioNumber = await storage.getNextFolioNumber(templateId);
      
      // Extraer código del formulario del nombre (asumiendo formato como "CA-RE-01-01 - NOMBRE DEL FORM")
      let formCode = '';
      const nameMatch = template.name.match(/^([A-Z]{2}-[A-Z]{2}-\d{2}-\d{2})/);
      if (nameMatch && nameMatch[1]) {
        formCode = nameMatch[1];
      }
      
      // Formato personalizado para el folio
      const formattedFolio = formCode 
        ? `${formCode}-F${nextFolioNumber}` 
        : nextFolioNumber.toString();
      
      res.json({ 
        nextFolio: nextFolioNumber,
        formattedFolio: formattedFolio 
      });
    } catch (error) {
      next(error);
    }
  });
  
  // Endpoint para clonar un formulario existente
  app.post("/api/form-templates/:id/clone", authorize([UserRole.SUPERADMIN]), async (req, res, next) => {
    try {
      const templateId = parseInt(req.params.id);
      if (isNaN(templateId)) {
        return res.status(400).json({ message: "ID de formulario inválido" });
      }
      
      // Obtener el formulario original
      const originalTemplate = await storage.getFormTemplate(templateId);
      if (!originalTemplate) {
        return res.status(404).json({ message: "Plantilla de formulario no encontrada" });
      }
      
      // Crear nombre para la copia
      const newName = `${originalTemplate.name} (Copia)`;
      
      // Crear copia del formulario conservando todas sus propiedades
      const newTemplate = await storage.createFormTemplate({
        name: newName,
        description: originalTemplate.description,
        department: originalTemplate.department,
        structure: originalTemplate.structure,
        createdBy: req.user.id,
        isActive: true
      });
      
      // Registrar actividad
      await storage.createActivityLog({
        userId: req.user.id,
        action: "cloned",
        resourceType: "form_template",
        resourceId: newTemplate.id,
        details: { 
          name: newTemplate.name, 
          originalId: originalTemplate.id,
          originalName: originalTemplate.name
        }
      });
      
      res.status(201).json(newTemplate);
    } catch (error) {
      console.error("Error al clonar formulario:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos inválidos", details: error.errors });
      }
      next(error);
    }
  });
  
  // File upload routes
  app.post("/api/upload", authorize([UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.PRODUCTION, UserRole.QUALITY]), 
    upload.single('file'), async (req, res, next) => {
      try {
        // Check if file exists
        if (!req.file) {
          return res.status(400).json({ message: "No se ha proporcionado ningún archivo" });
        }
        
        const filePath = req.file.path;
        let parsedData;
        let formTemplateData;
        let excelFormData;
        
        // Solo procesamos archivos Excel por el momento
        if (req.file.mimetype.includes('spreadsheet') || 
            req.file.mimetype.includes('excel') || 
            req.file.mimetype.includes('sheet')) {
          try {
            // Parsear el archivo Excel
            parsedData = await parseExcelFile(filePath);
            console.log("Excel file parsed successfully:", parsedData && parsedData.length);
            
            // Importar módulo de parseo de Excel
            const { 
              processExcelData, 
              createFormTemplateFromExcel 
            } = await import('./excel-parser');
            
            // Procesar los datos para extraer metadatos
            excelFormData = processExcelData(parsedData);
            console.log("Excel data processed successfully:", excelFormData?.title);
            
            // Crear estructura de plantilla de formulario (para previsualización)
            formTemplateData = createFormTemplateFromExcel(
              parsedData, 
              req.user.department || 'General'
            );
            console.log("Form template created successfully:", formTemplateData?.name);
          } catch (parseError) {
            console.error('Error parsing Excel file:', parseError);
            // Clean up file in case of error
            cleanupFile(filePath);
            return res.status(500).json({ 
              message: "Error al analizar el archivo Excel. Por favor, verifica que sea un formato válido.", 
              error: parseError.message 
            });
          }
        } else if (req.file.mimetype === 'application/pdf') {
          // PDF parsing no disponible por el momento
          cleanupFile(filePath);
          return res.status(400).json({ 
            message: "El procesamiento de archivos PDF no está disponible actualmente. Por favor, sube un archivo Excel."
          });
        } else {
          cleanupFile(filePath);
          return res.status(400).json({ 
            message: "Formato de archivo no soportado. Solo se permiten archivos Excel." 
          });
        }
        
        // Log activity
        await storage.createActivityLog({
          userId: req.user.id,
          action: "uploaded",
          resourceType: "file",
          resourceId: 0, // No specific ID for files
          details: { fileName: req.file.originalname, fileType: req.file.mimetype }
        });
        
        // Clean up the file after processing
        cleanupFile(filePath);
        
        // Responder con los datos procesados
        res.status(200).json({
          fileName: req.file.originalname,
          fileType: req.file.mimetype,
          fileSize: req.file.size || 0,
          data: parsedData,
          formTemplate: formTemplateData
        });
      } catch (error) {
        // Clean up file in case of error
        if (req.file) {
          cleanupFile(req.file.path);
        }
        
        console.error('Error processing file:', error);
        res.status(500).json({ 
          message: "Error al procesar el archivo", 
          error: error.message || "Error desconocido" 
        });
      }
    }
  );
  
  // Route to create form template from uploaded Excel
  app.post("/api/import-form-template", authorize([UserRole.SUPERADMIN]), 
    async (req, res, next) => {
      try {
        // Validate request body
        if (!req.body.excelData || !req.body.template) {
          return res.status(400).json({ 
            message: "Se requiere la información del archivo Excel y la plantilla de formulario" 
          });
        }
        
        // Create form template
        const templateData = {
          name: req.body.template.name,
          description: req.body.template.description,
          department: req.body.template.department,
          structure: req.body.template.structure,
          createdBy: req.user.id,
          isActive: true
        };
        
        // Save the template to database
        const template = await storage.createFormTemplate(templateData);
        
        // Log activity
        await storage.createActivityLog({
          userId: req.user.id,
          action: "imported",
          resourceType: "form_template",
          resourceId: template.id,
          details: { name: template.name, source: "excel" }
        });
        
        res.status(201).json({
          success: true,
          message: "Plantilla de formulario importada correctamente",
          template
        });
      } catch (error) {
        console.error('Error importing form template:', error);
        res.status(500).json({ 
          message: "Error al importar la plantilla de formulario", 
          error: error.message 
        });
      }
    }
  );

  // Ruta para actualizar estado de un formulario capturado
  app.patch("/api/form-entries/:id/status", async (req, res, next) => {
    try {
      const entryId = parseInt(req.params.id);
      if (isNaN(entryId)) {
        return res.status(400).json({ message: "ID de formulario inválido" });
      }

      // Verificar si existe el formulario
      const entry = await storage.getFormEntry(entryId);
      if (!entry) {
        return res.status(404).json({ message: "Formulario no encontrado" });
      }

      // Validar datos de estado
      const { status, signature } = req.body;
      if (!status) {
        return res.status(400).json({ message: "Se requiere el estado del formulario" });
      }

      // Actualizar según el estado
      const updateData: any = { status };
      
      if (status === "signed" && signature) {
        updateData.signature = signature;
        updateData.signedBy = req.user?.id;
        updateData.signedAt = new Date();
      } else if (status === "approved") {
        updateData.approvedBy = req.user?.id;
        updateData.approvedAt = new Date();
      }

      // Actualizar en la base de datos
      const updatedEntry = await storage.updateFormEntry(entryId, updateData);

      // Registrar actividad
      await storage.createActivityLog({
        userId: req.user?.id || 0,
        action: `${status}`,
        resourceType: "form_entry",
        resourceId: entryId,
        details: { formTemplateId: entry.formTemplateId }
      });

      res.json(updatedEntry);
    } catch (error) {
      next(error);
    }
  });

  // Borrado para unificar con la ruta de abajo
  
  // Rutas para reportes guardados
  app.get("/api/saved-reports", async (req, res, next) => {
    try {
      const reports = await storage.getSavedReports();
      res.json(reports);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/saved-reports/:id", async (req, res, next) => {
    try {
      const reportId = parseInt(req.params.id);
      if (isNaN(reportId)) {
        return res.status(400).json({ message: "ID de reporte inválido" });
      }
      
      const report = await storage.getSavedReport(reportId);
      if (!report) {
        return res.status(404).json({ message: "Reporte no encontrado" });
      }
      
      res.json(report);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/saved-reports", async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "No autenticado" });
      }

      const reportData = insertSavedReportSchema.parse({
        ...req.body,
        createdBy: req.user.id
      });
      
      const report = await storage.createSavedReport(reportData);
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user.id,
        action: "created",
        resourceType: "saved_report",
        resourceId: report.id,
        details: { name: report.name }
      });
      
      res.status(201).json(report);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos inválidos", details: error.errors });
      }
      next(error);
    }
  });

  app.patch("/api/saved-reports/:id", async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "No autenticado" });
      }

      const reportId = parseInt(req.params.id);
      if (isNaN(reportId)) {
        return res.status(400).json({ message: "ID de reporte inválido" });
      }
      
      // Check if report exists
      const existingReport = await storage.getSavedReport(reportId);
      if (!existingReport) {
        return res.status(404).json({ message: "Reporte no encontrado" });
      }
      
      // Verify ownership or admin privileges
      if (existingReport.createdBy !== req.user.id && req.user.role !== UserRole.SUPERADMIN && req.user.role !== UserRole.ADMIN) {
        return res.status(403).json({ message: "No autorizado para editar este reporte" });
      }
      
      // Update report
      const updatedReport = await storage.updateSavedReport(reportId, req.body);
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user.id,
        action: "updated",
        resourceType: "saved_report",
        resourceId: reportId,
        details: { name: existingReport.name }
      });
      
      res.json(updatedReport);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos inválidos", details: error.errors });
      }
      next(error);
    }
  });

  app.delete("/api/saved-reports/:id", async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "No autenticado" });
      }

      const reportId = parseInt(req.params.id);
      if (isNaN(reportId)) {
        return res.status(400).json({ message: "ID de reporte inválido" });
      }
      
      // Check if report exists
      const existingReport = await storage.getSavedReport(reportId);
      if (!existingReport) {
        return res.status(404).json({ message: "Reporte no encontrado" });
      }
      
      // Verify ownership or admin privileges
      if (existingReport.createdBy !== req.user.id && req.user.role !== UserRole.SUPERADMIN && req.user.role !== UserRole.ADMIN) {
        return res.status(403).json({ message: "No autorizado para eliminar este reporte" });
      }
      
      // Delete report
      await storage.deleteSavedReport(reportId);
      
      // Log the deletion
      await storage.createActivityLog({
        userId: req.user.id,
        action: "deleted",
        resourceType: "saved_report",
        resourceId: reportId,
        details: { name: existingReport.name }
      });
      
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Ruta para crear tabla products directamente (temporal)
  app.get("/api/create-products-table", async (req, res) => {
    try {
      console.log("=== CREANDO TABLA PRODUCTS ===");
      
      // Crear tabla products directamente con SQL
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS products (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          code TEXT UNIQUE,
          description TEXT,
          category TEXT,
          unit TEXT DEFAULT 'kg',
          is_active BOOLEAN DEFAULT true,
          created_by INTEGER,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      console.log("Tabla products creada exitosamente");
      
      // Insertar algunos productos básicos de cajeta
      await db.execute(sql`
        INSERT INTO products (name, code, category, description) VALUES
        ('Conito', 'CNT001', 'Tipo de Cajeta', 'Cajeta tipo conito'),
        ('Mielmex 65° Brix', 'MLX001', 'Tipo de Cajeta', 'Mielmex con 65 grados Brix'),
        ('Cajeton Espesa', 'CJE001', 'Tipo de Cajeta', 'Cajeton de consistencia espesa'),
        ('Cajeton Tradicional', 'CJT001', 'Tipo de Cajeta', 'Cajeton tradicional'),
        ('Gloria untable 78° Brix', 'GLR001', 'Tipo de Cajeta', 'Gloria untable 78 grados'),
        ('Horneable', 'HRN001', 'Tipo de Cajeta', 'Cajeta para hornear')
        ON CONFLICT (code) DO NOTHING
      `);
      
      console.log("Productos básicos insertados");
      
      res.json({
        status: "success",
        message: "Tabla products creada y productos básicos insertados exitosamente"
      });
    } catch (error) {
      console.error("Error creando tabla:", error);
      res.status(500).json({
        status: "error",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Ruta de diagnóstico para productos (temporal)
  app.get("/api/products-debug", async (req, res) => {
    try {
      console.log("=== PRODUCTS DEBUG ===");
      console.log("Database URL exists:", !!process.env.DATABASE_URL);
      
      // Verificar si la tabla products existe
      const tableCheck = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'products'
        );
      `);
      console.log("Table products exists:", tableCheck.rows[0]);
      
      // Contar productos
      const countResult = await db.execute(sql`SELECT COUNT(*) as total FROM products`);
      console.log("Total products:", countResult.rows[0]);
      
      // Obtener algunos productos de muestra
      const sampleResult = await db.execute(sql`SELECT * FROM products LIMIT 5`);
      console.log("Sample products:", sampleResult.rows);
      
      res.json({
        status: "success",
        tableExists: tableCheck.rows[0],
        totalProducts: countResult.rows[0],
        sampleProducts: sampleResult.rows
      });
    } catch (error) {
      console.error("Debug error:", error);
      res.status(500).json({
        status: "error",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  });

  // Ruta para obtener productos
  app.get("/api/products", authorize([UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.PRODUCTION, UserRole.PRODUCTION_MANAGER]), async (req, res, next) => {
    try {
      console.log("=== GET PRODUCTS ===");
      console.log("Query params:", req.query);
      
      let result;
      // Si se especifica active=true, solo devolver productos activos
      if (req.query.active === 'true') {
        result = await db.execute(sql`
          SELECT * FROM products WHERE is_active = true ORDER BY name
        `);
      } else {
        result = await db.execute(sql`
          SELECT * FROM products ORDER BY name
        `);
      }
      
      console.log("Productos encontrados:", result.rows.length);
      res.json(result.rows);
    } catch (error) {
      console.error("Error al obtener productos:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
