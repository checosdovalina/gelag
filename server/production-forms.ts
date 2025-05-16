import { Request, Response } from "express";
import { db } from "./db";
import { productionForms, ProductionFormStatus } from "@shared/schema";
import { eq } from "drizzle-orm";

// Endpoint para obtener todos los formularios de producción
export async function getProductionForms(req: Request, res: Response) {
  try {
    const forms = await db.select().from(productionForms).orderBy(productionForms.createdAt);
    return res.status(200).json(forms);
  } catch (error) {
    console.error("Error al obtener formularios de producción:", error);
    return res.status(500).json({ message: "Error al obtener formularios de producción" });
  }
}

// Endpoint para obtener un formulario específico por ID
export async function getProductionFormById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const [form] = await db.select().from(productionForms).where(eq(productionForms.id, parseInt(id)));
    
    if (!form) {
      return res.status(404).json({ message: "Formulario no encontrado" });
    }
    
    return res.status(200).json(form);
  } catch (error) {
    console.error(`Error al obtener formulario de producción con ID ${req.params.id}:`, error);
    return res.status(500).json({ message: "Error al obtener formulario de producción" });
  }
}

// Endpoint para crear un nuevo formulario de producción
export async function createProductionForm(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "No autenticado" });
    }
    
    // Generar número de folio automático
    const folio = `P-${Date.now().toString().slice(-5)}`;
    
    const formData = {
      ...req.body,
      folio,
      createdBy: req.user.id,
      updatedBy: req.user.id
    };
    
    const [newForm] = await db.insert(productionForms).values(formData).returning();
    
    return res.status(201).json(newForm);
  } catch (error) {
    console.error("Error al crear formulario de producción:", error);
    return res.status(500).json({ message: "Error al crear formulario de producción" });
  }
}

// Endpoint para actualizar un formulario existente
export async function updateProductionForm(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    if (!req.user) {
      return res.status(401).json({ message: "No autenticado" });
    }
    
    // Comprobar si el formulario existe
    const [existingForm] = await db.select().from(productionForms).where(eq(productionForms.id, parseInt(id)));
    
    if (!existingForm) {
      return res.status(404).json({ message: "Formulario no encontrado" });
    }
    
    // Actualizar el formulario
    const [updatedForm] = await db.update(productionForms)
      .set({
        ...req.body,
        updatedBy: req.user.id,
        updatedAt: new Date()
      })
      .where(eq(productionForms.id, parseInt(id)))
      .returning();
    
    return res.status(200).json(updatedForm);
  } catch (error) {
    console.error(`Error al actualizar formulario de producción con ID ${req.params.id}:`, error);
    return res.status(500).json({ message: "Error al actualizar formulario de producción" });
  }
}

// Endpoint para cambiar el estado de un formulario
export async function updateProductionFormStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ message: "No autenticado" });
    }
    
    if (!Object.values(ProductionFormStatus).includes(status)) {
      return res.status(400).json({ message: "Estado de formulario no válido" });
    }
    
    // Comprobar si el formulario existe
    const [existingForm] = await db.select().from(productionForms).where(eq(productionForms.id, parseInt(id)));
    
    if (!existingForm) {
      return res.status(404).json({ message: "Formulario no encontrado" });
    }
    
    // Actualizar el estado del formulario
    const [updatedForm] = await db.update(productionForms)
      .set({
        status,
        updatedBy: req.user.id,
        updatedAt: new Date()
      })
      .where(eq(productionForms.id, parseInt(id)))
      .returning();
    
    return res.status(200).json(updatedForm);
  } catch (error) {
    console.error(`Error al actualizar estado del formulario de producción con ID ${req.params.id}:`, error);
    return res.status(500).json({ message: "Error al actualizar estado del formulario de producción" });
  }
}

// Endpoint para eliminar un formulario
export async function deleteProductionForm(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    if (!req.user) {
      return res.status(401).json({ message: "No autenticado" });
    }
    
    // Comprobar si el usuario tiene permisos para eliminar (solo SuperAdmin)
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ message: "No tiene permisos para eliminar formularios" });
    }
    
    // Comprobar si el formulario existe
    const [existingForm] = await db.select().from(productionForms).where(eq(productionForms.id, parseInt(id)));
    
    if (!existingForm) {
      return res.status(404).json({ message: "Formulario no encontrado" });
    }
    
    // Eliminar el formulario
    await db.delete(productionForms).where(eq(productionForms.id, parseInt(id)));
    
    return res.status(200).json({ message: "Formulario eliminado correctamente" });
  } catch (error) {
    console.error(`Error al eliminar formulario de producción con ID ${req.params.id}:`, error);
    return res.status(500).json({ message: "Error al eliminar formulario de producción" });
  }
}