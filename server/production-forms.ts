import { Request, Response } from "express";
import { db } from "./db";
import {
  productionForms,
  ProductionForm,
  insertProductionFormSchema,
  ProductionFormStatus,
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

// Obtener todos los formularios de producción
export async function getProductionForms(req: Request, res: Response) {
  try {
    // Verificar si el usuario está autenticado
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "No autenticado" });
    }

    // Obtener todos los formularios ordenados por fecha de creación descendente
    const forms = await db.select().from(productionForms).orderBy(productionForms.createdAt);
    
    return res.json(forms);
  } catch (error) {
    console.error("Error al obtener formularios de producción:", error);
    return res.status(500).json({ message: "Error al obtener formularios de producción" });
  }
}

// Obtener un formulario de producción por ID
export async function getProductionFormById(req: Request, res: Response) {
  try {
    // Verificar si el usuario está autenticado
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    // Obtener el formulario específico
    const [form] = await db.select().from(productionForms).where(eq(productionForms.id, id));
    
    if (!form) {
      return res.status(404).json({ message: "Formulario no encontrado" });
    }
    
    return res.json(form);
  } catch (error) {
    console.error("Error al obtener formulario de producción:", error);
    return res.status(500).json({ message: "Error al obtener formulario de producción" });
  }
}

// Generar folio consecutivo para el formulario
async function generateFolio(): Promise<string> {
  try {
    // Obtener el último formulario creado
    const [lastForm] = await db
      .select()
      .from(productionForms)
      .orderBy(productionForms.id, "desc")
      .limit(1);

    let nextNumber = 1;
    
    if (lastForm) {
      // Si existe un formulario previo, extraer el número del folio
      const lastFolioMatch = lastForm.folio.match(/(\d+)$/);
      if (lastFolioMatch && lastFolioMatch[1]) {
        nextNumber = parseInt(lastFolioMatch[1]) + 1;
      }
    }
    
    // Formato: PR-{número secuencial de 4 dígitos}
    return `PR-${nextNumber.toString().padStart(4, '0')}`;
  } catch (error) {
    console.error("Error al generar folio:", error);
    throw error;
  }
}

// Crear un nuevo formulario de producción
export async function createProductionForm(req: Request, res: Response) {
  try {
    // Verificar si el usuario está autenticado
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "No autenticado" });
    }

    // Validar datos usando Zod
    const validatedData = insertProductionFormSchema.parse(req.body);
    
    // Generar folio consecutivo automáticamente
    const folio = await generateFolio();
    
    // Insertar el nuevo formulario
    const [newForm] = await db.insert(productionForms).values({
      ...validatedData,
      folio,
      createdBy: req.user?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: validatedData.status || ProductionFormStatus.DRAFT
    }).returning();
    
    return res.status(201).json(newForm);
  } catch (error) {
    console.error("Error al crear formulario de producción:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Datos inválidos", errors: error.errors });
    }
    return res.status(500).json({ message: "Error al crear formulario de producción" });
  }
}

// Actualizar un formulario de producción existente
export async function updateProductionForm(req: Request, res: Response) {
  try {
    // Verificar si el usuario está autenticado
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    // Obtener formulario existente
    const [existingForm] = await db.select().from(productionForms).where(eq(productionForms.id, id));
    
    if (!existingForm) {
      return res.status(404).json({ message: "Formulario no encontrado" });
    }
    
    // Log de los datos recibidos para debugging
    console.log("Datos recibidos para actualización:", JSON.stringify(req.body, null, 2));
    
    // Preparar datos para actualización, asegurando que las fechas estén en formato correcto
    const updateData = { ...req.body };
    
    // Convertir fechas string a objetos Date si es necesario
    if (updateData.createdAt && typeof updateData.createdAt === 'string') {
      updateData.createdAt = new Date(updateData.createdAt);
    }
    if (updateData.updatedAt && typeof updateData.updatedAt === 'string') {
      updateData.updatedAt = new Date(updateData.updatedAt);
    }
    if (updateData.lastUpdatedAt && typeof updateData.lastUpdatedAt === 'string') {
      delete updateData.lastUpdatedAt; // Este campo lo manejamos nosotros
    }
    
    // Actualizar el formulario
    const [updatedForm] = await db.update(productionForms)
      .set({
        ...updateData,
        updatedAt: new Date(),
        updatedBy: req.user?.id
      })
      .where(eq(productionForms.id, id))
      .returning();
    
    console.log("Formulario actualizado:", JSON.stringify(updatedForm, null, 2));
    
    return res.json(updatedForm);
  } catch (error) {
    console.error("Error al actualizar formulario de producción:", error);
    return res.status(500).json({ message: "Error al actualizar formulario de producción" });
  }
}

// Actualizar el estado de un formulario de producción
export async function updateProductionFormStatus(req: Request, res: Response) {
  try {
    // Verificar si el usuario está autenticado
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const { status } = req.body;
    
    // Validar que el status sea válido
    if (!Object.values(ProductionFormStatus).includes(status)) {
      return res.status(400).json({ message: "Estado no válido" });
    }
    
    // Obtener formulario existente
    const [existingForm] = await db.select().from(productionForms).where(eq(productionForms.id, id));
    
    if (!existingForm) {
      return res.status(404).json({ message: "Formulario no encontrado" });
    }
    
    // Actualizar estado del formulario
    const [updatedForm] = await db.update(productionForms)
      .set({
        status,
        updatedAt: new Date(),
        updatedBy: req.user?.id
      })
      .where(eq(productionForms.id, id))
      .returning();
    
    return res.json(updatedForm);
  } catch (error) {
    console.error("Error al actualizar estado del formulario:", error);
    return res.status(500).json({ message: "Error al actualizar estado del formulario" });
  }
}

// Eliminar un formulario de producción
export async function deleteProductionForm(req: Request, res: Response) {
  try {
    // Verificar si el usuario está autenticado y es superadmin
    if (!req.isAuthenticated() || req.user?.role !== 'superadmin') {
      return res.status(403).json({ message: "No autorizado para eliminar formularios" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    // Obtener formulario existente para verificar que existe
    const [existingForm] = await db.select().from(productionForms).where(eq(productionForms.id, id));
    
    if (!existingForm) {
      return res.status(404).json({ message: "Formulario no encontrado" });
    }
    
    // Eliminar el formulario
    await db.delete(productionForms).where(eq(productionForms.id, id));
    
    return res.json({ message: "Formulario eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar formulario de producción:", error);
    return res.status(500).json({ message: "Error al eliminar formulario de producción" });
  }
}