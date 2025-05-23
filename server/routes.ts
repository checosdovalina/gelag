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
  formTemplates
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { hashPassword } from "./auth";
import { upload, parseExcelFile, parsePdfFile, cleanupFile } from "./file-upload";
import fs from 'fs';

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

  // Form entry routes
  app.get("/api/form-entries", async (req, res, next) => {
    try {
      // Filter entries based on query parameters
      let entries;
      
      if (req.query.templateId) {
        const templateId = parseInt(req.query.templateId as string);
        entries = await storage.getFormEntriesByTemplate(templateId);
      } else if (req.query.userId) {
        const userId = parseInt(req.query.userId as string);
        entries = await storage.getFormEntriesByUser(userId);
      } else if (req.query.department) {
        entries = await storage.getFormEntriesByDepartment(req.query.department as string);
      } else {
        // Usuarios con rol SUPERADMIN o ADMIN pueden ver todos los formularios
        if (req.user.role === UserRole.SUPERADMIN || req.user.role === UserRole.ADMIN) {
          entries = await storage.getAllFormEntries();
        } else {
          // Para roles de PRODUCTION, QUALITY y VIEWER solo se muestran los formularios que ellos crearon
          entries = await storage.getFormEntriesByUser(req.user.id);
        }
      }
      
      res.json(entries);
    } catch (error) {
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
        const entryData = insertFormEntrySchema.parse(req.body);
        
        // Set creator ID from logged in user
        entryData.createdBy = req.user.id;
        
        // Set default status to draft
        entryData.status = "draft";
        
        // Check if form template exists
        const template = await storage.getFormTemplate(entryData.formTemplateId);
        if (!template) {
          return res.status(404).json({ message: "Plantilla de formulario no encontrada" });
        }
        
        // Create entry
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
        
        res.status(201).json(entry);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: "Datos inválidos", details: error.errors });
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
      
      // Log activity
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

  // Endpoint para exportación consolidada (homologada) de múltiples formularios
  app.post("/api/form-entries/consolidated-export", authorize(), async (req, res, next) => {
    try {
      // Importar la función de exportación consolidada desde el módulo
      const { exportConsolidatedForms } = await import('./consolidated-export');
      await exportConsolidatedForms(req, res, next);
    } catch (error) {
      console.error("Error al exportar datos consolidados:", error);
      next(error);
    }
  });
  
  // Ruta para actualizar el estado de un formulario (firmar, aprobar, etc.)
  app.patch("/api/form-entries/:id/status", authorize(), async (req, res, next) => {
    try {
      const entryId = parseInt(req.params.id);
      if (isNaN(entryId)) {
        return res.status(400).json({ message: "ID de entrada inválido" });
      }
      
      // Validar los datos de entrada
      if (!req.body.status) {
        return res.status(400).json({ message: "Se requiere un estado válido" });
      }
      
      // Obtener la entrada actual
      const entry = await storage.getFormEntry(entryId);
      if (!entry) {
        return res.status(404).json({ message: "Entrada de formulario no encontrada" });
      }
      
      // Verificar permisos (solo el creador o administradores pueden actualizar)
      if (entry.createdBy !== req.user!.id && req.user!.role !== UserRole.SUPERADMIN && req.user!.role !== UserRole.ADMIN) {
        return res.status(403).json({ message: "No autorizado para actualizar esta entrada" });
      }
      
      // Preparar datos de actualización
      const updateData: Partial<any> = {
        status: req.body.status
      };
      
      // Si hay firma, actualizar datos de firma
      if (req.body.signature && req.body.status === "signed") {
        updateData.signature = req.body.signature;
        updateData.signedBy = req.user!.id;
        updateData.signedAt = new Date();
      }
      
      // Actualizar la entrada
      const updatedEntry = await storage.updateFormEntry(entryId, updateData);
      
      // Registrar actividad
      await storage.createActivityLog({
        userId: req.user!.id,
        action: req.body.status === "signed" ? "signed" : "updated",
        resourceType: "form_entry",
        resourceId: entryId,
        details: { status: req.body.status }
      });
      
      res.json(updatedEntry);
    } catch (error) {
      next(error);
    }
  });
  
  // Exportar formulario a PDF o Excel
  app.get("/api/form-entries/:id/export", authorize(), async (req, res, next) => {
    try {
      const entryId = parseInt(req.params.id);
      if (isNaN(entryId)) {
        return res.status(400).json({ message: "ID de entrada inválido" });
      }
      
      // Validar formato de exportación
      const format = req.query.format as string || "pdf";
      if (format !== "pdf" && format !== "excel") {
        return res.status(400).json({ message: "Formato de exportación inválido. Use 'pdf' o 'excel'" });
      }
      
      // Obtener la entrada
      const entry = await storage.getFormEntry(entryId);
      if (!entry) {
        return res.status(404).json({ message: "Entrada de formulario no encontrada" });
      }
      
      // Obtener la plantilla asociada
      const template = await storage.getFormTemplate(entry.formTemplateId);
      if (!template) {
        return res.status(404).json({ message: "Plantilla de formulario no encontrada" });
      }
      
      // Verificar permisos para ver esta entrada
      if (
        req.user!.role !== UserRole.SUPERADMIN &&
        req.user!.role !== UserRole.ADMIN && 
        entry.createdBy !== req.user!.id && 
        entry.department !== req.user!.department
      ) {
        return res.status(403).json({ message: "No autorizado para exportar esta entrada" });
      }
      
      // Registrar actividad
      await storage.createActivityLog({
        userId: req.user!.id,
        action: "exported",
        resourceType: "form_entry",
        resourceId: entryId,
        details: { format, formName: template.name }
      });
      
      // Obtener usuario creador para mostrar en el PDF
      const creator = await storage.getUser(entry.createdBy);
      
      // Generar el archivo según el formato solicitado
      if (format === "pdf") {
        try {
          try {
            // Primero intentar con Puppeteer
            console.log("Intentando generar PDF con Puppeteer...");
            const { generatePDF } = await import('./pdf-generator');
            
            // Generar el PDF con la información del formulario
            const pdfBuffer = await generatePDF(entry, template, creator);
            
            // Configurar la respuesta y enviar el PDF
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="formulario_${template.name}_${entryId}.pdf"`);
            res.send(pdfBuffer);
          } catch (puppeteerError) {
            // Si falla Puppeteer, intentar con PDFKit como alternativa
            console.error("Error con Puppeteer, usando alternativa PDFKit:", puppeteerError);
            const { generatePDFFallback } = await import('./pdf-generator-fallback');
            
            // Generar el PDF usando la alternativa
            const pdfBuffer = await generatePDFFallback(entry, template, creator);
            
            // Configurar la respuesta y enviar el PDF
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="formulario_${template.name}_${entryId}.pdf"`);
            res.send(pdfBuffer);
          }
        } catch (error) {
          console.error("Error al generar PDF (todos los métodos fallaron):", error);
          return res.status(500).json({ 
            message: "Error al generar el PDF. Por favor, inténtelo de nuevo más tarde.", 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      } else {
        try {
          // TODO: Implementar generación de Excel con datos reales
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          res.setHeader('Content-Disposition', `attachment; filename="formulario_${template.name}_${entryId}.xlsx"`);
          
          // Por ahora enviamos un Excel vacío como placeholder
          const excelPlaceholder = Buffer.from("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", "base64");
          res.send(excelPlaceholder);
        } catch (error) {
          console.error("Error al generar Excel:", error);
          return res.status(500).json({ 
            message: "Error al generar el Excel", 
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    } catch (error) {
      next(error);
    }
  });

  // =========== Rutas para gestión de productos ===========
  // Obtener todos los productos
  app.get("/api/products", authorize([UserRole.SUPERADMIN, UserRole.ADMIN]), async (req, res, next) => {
    try {
      let products;
      // Si se especifica active=true, solo devolver productos activos
      if (req.query.active === 'true') {
        products = await storage.getActiveProducts();
      } else {
        products = await storage.getAllProducts();
      }
      res.json(products);
    } catch (error) {
      next(error);
    }
  });

  // Obtener un producto por ID
  app.get("/api/products/:id", authorize([UserRole.SUPERADMIN, UserRole.ADMIN]), async (req, res, next) => {
    try {
      const productId = parseInt(req.params.id);
      if (isNaN(productId)) {
        return res.status(400).json({ message: "ID de producto inválido" });
      }
      
      const product = await storage.getProduct(productId);
      if (!product) {
        return res.status(404).json({ message: "Producto no encontrado" });
      }
      
      res.json(product);
    } catch (error) {
      next(error);
    }
  });

  // Crear un nuevo producto
  app.post("/api/products", authorize([UserRole.SUPERADMIN, UserRole.ADMIN]), async (req, res, next) => {
    try {
      // Validar que el usuario esté autenticado
      if (!req.user) {
        return res.status(401).json({ message: "No autenticado" });
      }
      
      // Verificar si el código ya existe
      const existingProduct = await storage.getProductByCode(req.body.code);
      if (existingProduct) {
        return res.status(400).json({ message: "Ya existe un producto con ese código" });
      }
      
      // Agregar el usuario que crea el producto
      const productData = {
        ...req.body,
        createdBy: req.user.id
      };
      
      const newProduct = await storage.createProduct(productData);
      
      // Registrar actividad
      await storage.createActivityLog({
        userId: req.user.id,
        action: "create",
        resourceType: "product",
        resourceId: newProduct.id,
        details: { name: newProduct.name, code: newProduct.code }
      });
      
      res.status(201).json(newProduct);
    } catch (error) {
      next(error);
    }
  });

  // Actualizar un producto
  app.put("/api/products/:id", authorize([UserRole.SUPERADMIN, UserRole.ADMIN]), async (req, res, next) => {
    try {
      const productId = parseInt(req.params.id);
      if (isNaN(productId)) {
        return res.status(400).json({ message: "ID de producto inválido" });
      }
      
      // Verificar que el producto existe
      const existingProduct = await storage.getProduct(productId);
      if (!existingProduct) {
        return res.status(404).json({ message: "Producto no encontrado" });
      }
      
      // Si se cambia el código, verificar que no exista otro producto con ese código
      if (req.body.code && req.body.code !== existingProduct.code) {
        const productWithCode = await storage.getProductByCode(req.body.code);
        if (productWithCode && productWithCode.id !== productId) {
          return res.status(400).json({ message: "Ya existe un producto con ese código" });
        }
      }
      
      // Actualizar el producto
      const updatedProduct = await storage.updateProduct(productId, req.body);
      
      // Registrar actividad
      await storage.createActivityLog({
        userId: req.user?.id || 0,
        action: "update",
        resourceType: "product",
        resourceId: productId,
        details: { name: updatedProduct?.name, code: updatedProduct?.code }
      });
      
      res.json(updatedProduct);
    } catch (error) {
      next(error);
    }
  });

  // Eliminar un producto (soft delete)
  app.delete("/api/products/:id", authorize([UserRole.SUPERADMIN, UserRole.ADMIN]), async (req, res, next) => {
    try {
      const productId = parseInt(req.params.id);
      if (isNaN(productId)) {
        return res.status(400).json({ message: "ID de producto inválido" });
      }
      
      // Verificar que el producto existe
      const product = await storage.getProduct(productId);
      if (!product) {
        return res.status(404).json({ message: "Producto no encontrado" });
      }
      
      // Realizar soft delete
      await storage.deleteProduct(productId);
      
      // Registrar actividad
      await storage.createActivityLog({
        userId: req.user?.id || 0,
        action: "delete",
        resourceType: "product",
        resourceId: productId,
        details: { name: product.name, code: product.code }
      });
      
      res.json({ message: "Producto eliminado correctamente" });
    } catch (error) {
      next(error);
    }
  });

  // =========== Rutas para gestión de empleados ===========
  // Obtener todos los empleados
  app.get("/api/employees", authorize([UserRole.SUPERADMIN, UserRole.ADMIN]), async (req, res, next) => {
    try {
      let employees;
      
      // Filtrar por departamento si se especifica
      if (req.query.department) {
        employees = await storage.getEmployeesByDepartment(req.query.department as string);
      } 
      // Filtrar solo empleados activos si se especifica
      else if (req.query.active === 'true') {
        employees = await storage.getActiveEmployees();
      } 
      // Devolver todos los empleados
      else {
        employees = await storage.getAllEmployees();
      }
      
      res.json(employees);
    } catch (error) {
      next(error);
    }
  });

  // Obtener un empleado por ID
  app.get("/api/employees/:id", authorize([UserRole.SUPERADMIN, UserRole.ADMIN]), async (req, res, next) => {
    try {
      const employeeId = parseInt(req.params.id);
      if (isNaN(employeeId)) {
        return res.status(400).json({ message: "ID de empleado inválido" });
      }
      
      const employee = await storage.getEmployee(employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Empleado no encontrado" });
      }
      
      res.json(employee);
    } catch (error) {
      next(error);
    }
  });

  // Crear un nuevo empleado
  app.post("/api/employees", authorize([UserRole.SUPERADMIN, UserRole.ADMIN]), async (req, res, next) => {
    try {
      // Validar que el usuario esté autenticado
      if (!req.user) {
        return res.status(401).json({ message: "No autenticado" });
      }
      
      // Verificar si el número de empleado ya existe
      const existingEmployee = await storage.getEmployeeByEmployeeId(req.body.employeeId);
      if (existingEmployee) {
        return res.status(400).json({ message: "Ya existe un empleado con ese número de empleado" });
      }
      
      // Agregar el usuario que crea el empleado
      const employeeData = {
        ...req.body,
        createdBy: req.user.id
      };
      
      const newEmployee = await storage.createEmployee(employeeData);
      
      // Registrar actividad
      await storage.createActivityLog({
        userId: req.user.id,
        action: "create",
        resourceType: "employee",
        resourceId: newEmployee.id,
        details: { name: newEmployee.name, employeeId: newEmployee.employeeId }
      });
      
      res.status(201).json(newEmployee);
    } catch (error) {
      next(error);
    }
  });

  // Actualizar un empleado
  app.put("/api/employees/:id", authorize([UserRole.SUPERADMIN, UserRole.ADMIN]), async (req, res, next) => {
    try {
      const employeeId = parseInt(req.params.id);
      if (isNaN(employeeId)) {
        return res.status(400).json({ message: "ID de empleado inválido" });
      }
      
      // Verificar que el empleado existe
      const existingEmployee = await storage.getEmployee(employeeId);
      if (!existingEmployee) {
        return res.status(404).json({ message: "Empleado no encontrado" });
      }
      
      // Si se cambia el número de empleado, verificar que no exista otro empleado con ese número
      if (req.body.employeeId && req.body.employeeId !== existingEmployee.employeeId) {
        const employeeWithId = await storage.getEmployeeByEmployeeId(req.body.employeeId);
        if (employeeWithId && employeeWithId.id !== employeeId) {
          return res.status(400).json({ message: "Ya existe un empleado con ese número de empleado" });
        }
      }
      
      // Actualizar el empleado
      const updatedEmployee = await storage.updateEmployee(employeeId, req.body);
      
      // Registrar actividad
      await storage.createActivityLog({
        userId: req.user?.id || 0,
        action: "update",
        resourceType: "employee",
        resourceId: employeeId,
        details: { name: updatedEmployee?.name, employeeId: updatedEmployee?.employeeId }
      });
      
      res.json(updatedEmployee);
    } catch (error) {
      next(error);
    }
  });

  // Eliminar un empleado (soft delete)
  app.delete("/api/employees/:id", authorize([UserRole.SUPERADMIN, UserRole.ADMIN]), async (req, res, next) => {
    try {
      const employeeId = parseInt(req.params.id);
      if (isNaN(employeeId)) {
        return res.status(400).json({ message: "ID de empleado inválido" });
      }
      
      // Verificar que el empleado existe
      const employee = await storage.getEmployee(employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Empleado no encontrado" });
      }
      
      // Realizar soft delete
      await storage.deleteEmployee(employeeId);
      
      // Registrar actividad
      await storage.createActivityLog({
        userId: req.user?.id || 0,
        action: "delete",
        resourceType: "employee",
        resourceId: employeeId,
        details: { name: employee.name, employeeId: employee.employeeId }
      });
      
      res.json({ message: "Empleado eliminado correctamente" });
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
