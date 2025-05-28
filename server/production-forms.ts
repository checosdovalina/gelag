import { Request, Response } from "express";
import { db } from "./db";
import {
  productionForms,
  ProductionForm,
  insertProductionFormSchema,
  ProductionFormStatus,
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";
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
      .orderBy(desc(productionForms.id))
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
    
    // Actualizar solo los campos específicos sin problemas de tipo
    const updateFields: any = {};
    
    // Campos de datos principales
    if (req.body.productId !== undefined) updateFields.productId = req.body.productId;
    if (req.body.liters !== undefined) updateFields.liters = req.body.liters;
    if (req.body.date !== undefined) updateFields.date = req.body.date;
    if (req.body.responsible !== undefined) updateFields.responsible = req.body.responsible;
    if (req.body.lotNumber !== undefined) updateFields.lotNumber = req.body.lotNumber;
    if (req.body.status !== undefined) updateFields.status = req.body.status;
    
    // Campos JSON
    if (req.body.ingredients !== undefined) updateFields.ingredients = req.body.ingredients;
    if (req.body.ingredientTimes !== undefined) updateFields.ingredientTimes = req.body.ingredientTimes;
    
    // Campos de seguimiento de proceso
    if (req.body.startTime !== undefined) updateFields.startTime = req.body.startTime;
    if (req.body.endTime !== undefined) updateFields.endTime = req.body.endTime;
    if (req.body.temperature !== undefined) updateFields.temperature = req.body.temperature;
    if (req.body.pressure !== undefined) updateFields.pressure = req.body.pressure;
    if (req.body.hourTracking !== undefined) updateFields.hourTracking = req.body.hourTracking;
    
    // Campos de calidad
    if (req.body.qualityTimes !== undefined) updateFields.qualityTimes = req.body.qualityTimes;
    if (req.body.brix !== undefined) updateFields.brix = req.body.brix;
    if (req.body.qualityTemp !== undefined) updateFields.qualityTemp = req.body.qualityTemp;
    if (req.body.texture !== undefined) updateFields.texture = req.body.texture;
    if (req.body.color !== undefined) updateFields.color = req.body.color;
    if (req.body.viscosity !== undefined) updateFields.viscosity = req.body.viscosity;
    if (req.body.smell !== undefined) updateFields.smell = req.body.smell;
    if (req.body.taste !== undefined) updateFields.taste = req.body.taste;
    if (req.body.statusCheck !== undefined) updateFields.statusCheck = req.body.statusCheck;
    
    // Campos de destino
    if (req.body.destinationType !== undefined) updateFields.destinationType = req.body.destinationType;
    if (req.body.destinationKilos !== undefined) updateFields.destinationKilos = req.body.destinationKilos;
    if (req.body.destinationProduct !== undefined) updateFields.destinationProduct = req.body.destinationProduct;
    if (req.body.destinationEstimation !== undefined) updateFields.destinationEstimation = req.body.destinationEstimation;
    if (req.body.totalKilos !== undefined) updateFields.totalKilos = req.body.totalKilos;
    
    // Campos de liberación
    if (req.body.liberationFolio !== undefined) updateFields.liberationFolio = req.body.liberationFolio;
    if (req.body.cP !== undefined) updateFields.cP = req.body.cP;
    if (req.body.cmConsistometer !== undefined) updateFields.cmConsistometer = req.body.cmConsistometer;
    if (req.body.finalBrix !== undefined) updateFields.finalBrix = req.body.finalBrix;
    if (req.body.yield !== undefined) updateFields.yield = req.body.yield;
    if (req.body.startState !== undefined) updateFields.startState = req.body.startState;
    if (req.body.endState !== undefined) updateFields.endState = req.body.endState;
    if (req.body.signatureUrl !== undefined) updateFields.signatureUrl = req.body.signatureUrl;
    
    // Campos de control - solo actualizar usuario
    if (req.user?.id) {
      updateFields.updatedBy = req.user.id;
      updateFields.lastUpdatedBy = req.user.id;
    }
    
    console.log("Campos a actualizar:", JSON.stringify(updateFields, null, 2));
    
    // Actualizar el formulario
    const [updatedForm] = await db.update(productionForms)
      .set(updateFields)
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