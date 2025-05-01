import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { 
  insertFormTemplateSchema, 
  insertFormEntrySchema, 
  UserRole, 
  insertUserSchema,
  insertSavedReportSchema
} from "@shared/schema";
import { z } from "zod";
import { hashPassword } from "./auth";
import { upload, parseExcelFile, parsePdfFile, cleanupFile } from "./file-upload";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);
  
  // Get authorize middleware from app locals
  const { authorize } = app.locals;
  
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

  app.put("/api/form-templates/:id", authorize([UserRole.SUPERADMIN]), async (req, res, next) => {
    try {
      const templateId = parseInt(req.params.id);
      if (isNaN(templateId)) {
        return res.status(400).json({ message: "ID de plantilla inválido" });
      }
      
      // Check if template exists
      const existingTemplate = await storage.getFormTemplate(templateId);
      if (!existingTemplate) {
        return res.status(404).json({ message: "Plantilla no encontrada" });
      }
      
      // Procesamos la estructura para asegurar que todos los campos tengan displayName y displayOrder
      if (req.body.structure && req.body.structure.fields) {
        req.body.structure.fields = req.body.structure.fields.map(field => {
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
        
        console.log("Campos del formulario procesados para guardar:", req.body.structure.fields);
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
        // Only superadmins and admins can see all entries without filters
        if (req.user.role !== UserRole.SUPERADMIN && req.user.role !== UserRole.ADMIN) {
          return res.status(403).json({ message: "No autorizado para ver todas las entradas" });
        }
        
        // Get entries by user's department if not admin
        if (req.user.role === UserRole.PRODUCTION || req.user.role === UserRole.QUALITY) {
          entries = await storage.getFormEntriesByDepartment(req.user.department);
        } else {
          // For viewers, only show entries they created
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
      if (
        req.user.role !== UserRole.SUPERADMIN &&
        req.user.role !== UserRole.ADMIN && 
        entry.createdBy !== req.user.id && 
        entry.department !== req.user.department
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
        
        res.status(200).json({
          fileName: req.file.originalname,
          fileType: req.file.mimetype,
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

  const httpServer = createServer(app);
  return httpServer;
}
