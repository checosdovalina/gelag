import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertFormTemplateSchema, insertFormEntrySchema, UserRole, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { hashPassword } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);
  
  // Get authorize middleware from app locals
  const { authorize } = app.locals;
  
  // User routes
  app.get("/api/users", authorize([UserRole.ADMIN]), async (req, res, next) => {
    try {
      const users = await storage.getAllUsers();
      // Remove passwords from response
      const sanitizedUsers = users.map(({ password, ...rest }) => rest);
      res.json(sanitizedUsers);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/users", authorize([UserRole.ADMIN]), async (req, res, next) => {
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

  app.put("/api/users/:id", authorize([UserRole.ADMIN]), async (req, res, next) => {
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

  app.post("/api/form-templates", authorize([UserRole.ADMIN]), async (req, res, next) => {
    try {
      const templateData = insertFormTemplateSchema.parse(req.body);
      
      // Set creator ID from logged in user
      templateData.createdBy = req.user.id;
      
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
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos inválidos", details: error.errors });
      }
      next(error);
    }
  });

  app.put("/api/form-templates/:id", authorize([UserRole.ADMIN]), async (req, res, next) => {
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
        // Only admins can see all entries without filters
        if (req.user.role !== UserRole.ADMIN) {
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

  app.post("/api/form-entries", authorize([UserRole.ADMIN, UserRole.PRODUCTION, UserRole.QUALITY]), 
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
  app.get("/api/activity", authorize([UserRole.ADMIN]), async (req, res, next) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
