import { Request, Response } from "express";
import { db } from "./db";
import {
  productionForms,
  ProductionForm,
  insertProductionFormSchema,
  ProductionFormStatus,
} from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { z } from "zod";

// Obtener todos los formularios de producción
export async function getProductionForms(req: Request, res: Response) {
  try {
    console.log("=== GET PRODUCTION FORMS ===");
    console.log("Usuario autenticado:", req.isAuthenticated());
    console.log("Usuario:", req.user);
    
    // Verificar si el usuario está autenticado
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "No autenticado" });
    }

    console.log("Intentando obtener formularios de producción...");
    
    // Obtener todos los formularios ordenados por fecha de creación descendente usando SQL directo
    const result = await db.execute(sql`
      SELECT * FROM production_forms ORDER BY created_at DESC
    `);
    
    console.log("Formularios obtenidos exitosamente:", result.rows.length, "registros");
    return res.json(result.rows);
  } catch (error) {
    console.error("Error detallado al obtener formularios de producción:", error);
    console.error("Stack trace:", error instanceof Error ? error.stack : 'No stack trace available');
    
    return res.status(500).json({ 
      message: "Error al obtener formularios de producción",
      error: error instanceof Error ? error.message : String(error)
    });
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
    if (!req.isAuthenticated() || !req.user?.id) {
      return res.status(401).json({ message: "No autenticado" });
    }

    console.log("Datos recibidos para crear formulario:", JSON.stringify(req.body, null, 2));

    // Validar datos usando Zod
    const validatedData = insertProductionFormSchema.parse(req.body);
    console.log("Datos validados:", JSON.stringify(validatedData, null, 2));
    
    // Usar folio proporcionado o generar uno automáticamente si no existe
    let folio = validatedData.folio;
    if (!folio || folio.trim() === '') {
      folio = await generateFolio();
      console.log("Folio generado automáticamente:", folio);
    } else {
      console.log("Usando folio proporcionado:", folio);
    }
    
    // Preparar datos para inserción
    const insertData = {
      productId: validatedData.productId,
      liters: validatedData.liters,
      date: validatedData.date,
      responsible: validatedData.responsible,
      folio,
      createdBy: req.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: validatedData.status || ProductionFormStatus.DRAFT,
      // Incluir otros campos opcionales si existen
      ...(validatedData.lotNumber && { lotNumber: validatedData.lotNumber }),
      ...(validatedData.caducidad && { caducidad: validatedData.caducidad }),
      ...(validatedData.marmita && { marmita: validatedData.marmita }),
      ...(validatedData.ingredients && { ingredients: validatedData.ingredients }),
      ...(validatedData.ingredientTimes && { ingredientTimes: validatedData.ingredientTimes }),
      // Nuevos campos de folio
      ...(validatedData.folioInterno && { folioInterno: validatedData.folioInterno }),
      ...(validatedData.folioBajaMP && { folioBajaMP: validatedData.folioBajaMP }),
      ...(validatedData.folioBajaME && { folioBajaME: validatedData.folioBajaME }),
      ...(validatedData.folioPT && { folioPT: validatedData.folioPT })
    };

    console.log("Datos preparados para inserción:", JSON.stringify(insertData, null, 2));

    // Insertar el nuevo formulario usando SQL directo
    const result = await db.execute(sql`
      INSERT INTO production_forms (
        product_id, liters, date, responsible, caducidad, marmita, folio, folio_interno, folio_baja_mp, folio_baja_me, folio_pt, created_by, status, lot_number, ingredients, ingredient_times, created_at, updated_at
      ) VALUES (
        ${insertData.productId}, ${insertData.liters}, ${insertData.date}, 
        ${insertData.responsible}, ${insertData.caducidad || null}, ${insertData.marmita || null}, 
        ${insertData.folio}, ${insertData.folioInterno || null}, ${insertData.folioBajaMP || null}, ${insertData.folioBajaME || null}, ${insertData.folioPT || null},
        ${insertData.createdBy}, 
        ${insertData.status}, ${insertData.lotNumber || null}, 
        ${insertData.ingredients ? JSON.stringify(insertData.ingredients) : null}, 
        ${insertData.ingredientTimes ? JSON.stringify(insertData.ingredientTimes) : null},
        NOW(), NOW()
      ) RETURNING *;
    `);
    
    const newForm = result.rows[0];
    
    console.log("Formulario creado exitosamente:", newForm);
    return res.status(201).json(newForm);
  } catch (error) {
    console.error("Error detallado al crear formulario de producción:", error);
    console.error("Stack trace:", error instanceof Error ? error.stack : 'No stack trace available');
    
    if (error instanceof z.ZodError) {
      console.error("Errores de validación Zod:", error.errors);
      return res.status(400).json({ message: "Datos inválidos", errors: error.errors });
    }
    return res.status(500).json({ 
      message: "Error al crear formulario de producción",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// Actualizar un formulario de producción existente
export async function updateProductionForm(req: Request, res: Response) {
  try {
    console.log("=== ACTUALIZAR FORMULARIO DE PRODUCCIÓN ===");
    console.log("Usuario autenticado:", req.isAuthenticated());
    console.log("Body recibido:", JSON.stringify(req.body, null, 2));
    
    // Verificar si el usuario está autenticado
    if (!req.isAuthenticated()) {
      console.log("ERROR: Usuario no autenticado");
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
    if (req.body.caducidad !== undefined) updateFields.caducidad = req.body.caducidad;
    if (req.body.marmita !== undefined) updateFields.marmita = req.body.marmita;
    if (req.body.lotNumber !== undefined) updateFields.lotNumber = req.body.lotNumber;
    if (req.body.status !== undefined) updateFields.status = req.body.status;
    
    // Folio - preservar el valor exacto proporcionado por el usuario
    if (req.body.folio !== undefined) {
      console.log("=== FOLIO UPDATE DEBUG ===");
      console.log("Folio recibido:", req.body.folio);
      console.log("Folio actual:", existingForm.folio);
      updateFields.folio = req.body.folio;
      console.log("Folio a actualizar:", updateFields.folio);
    }
    
    // Nuevos campos de folio
    if (req.body.folioInterno !== undefined) updateFields.folioInterno = req.body.folioInterno;
    if (req.body.folioBajaMP !== undefined) updateFields.folioBajaMP = req.body.folioBajaMP;
    if (req.body.folioBajaME !== undefined) updateFields.folioBajaME = req.body.folioBajaME;
    if (req.body.folioPT !== undefined) updateFields.folioPT = req.body.folioPT;
    
    // Campos JSON
    if (req.body.ingredients !== undefined) updateFields.ingredients = req.body.ingredients;
    if (req.body.ingredientTimes !== undefined) {
      console.log("=== INGREDIENT TIMES DEBUG ===");
      console.log("Valor recibido:", req.body.ingredientTimes);
      console.log("Tipo:", typeof req.body.ingredientTimes);
      console.log("Array.isArray:", Array.isArray(req.body.ingredientTimes));
      updateFields.ingredientTimes = req.body.ingredientTimes;
    }
    if (req.body.conoData !== undefined) updateFields.conoData = req.body.conoData;
    if (req.body.empaqueData !== undefined) updateFields.empaqueData = req.body.empaqueData;
    if (req.body.additionalFields !== undefined) updateFields.additionalFields = req.body.additionalFields;
    if (req.body.states !== undefined) updateFields.states = req.body.states;
    if (req.body.hour_tracking !== undefined) updateFields.hourTracking = req.body.hour_tracking;
    
    // Campos de seguimiento de proceso
    if (req.body.startTime !== undefined) {
      console.log("=== STARTTIME DEBUG ===");
      console.log("Valor recibido:", req.body.startTime);
      console.log("Tipo:", typeof req.body.startTime);
      console.log("Es string vacía:", req.body.startTime === "");
      // Preservar valores de tiempo exactamente como se reciben
      updateFields.startTime = req.body.startTime;
      console.log("Valor a guardar:", updateFields.startTime);
    }
    if (req.body.endTime !== undefined) {
      // Preservar valores de tiempo exactamente como se reciben
      updateFields.endTime = req.body.endTime;
    }
    if (req.body.temperature !== undefined) {
      console.log("=== TEMPERATURE DEBUG ===");
      console.log("Valor recibido:", req.body.temperature);
      console.log("Tipo:", typeof req.body.temperature);
      console.log("Array.isArray:", Array.isArray(req.body.temperature));
      updateFields.temperature = req.body.temperature;
    }
    if (req.body.pressure !== undefined) {
      console.log("=== PRESSURE DEBUG ===");
      console.log("Valor recibido:", req.body.pressure);
      console.log("Tipo:", typeof req.body.pressure);
      console.log("Array.isArray:", Array.isArray(req.body.pressure));
      updateFields.pressure = req.body.pressure;
    }
    if (req.body.hourTracking !== undefined) updateFields.hourTracking = req.body.hourTracking;
    
    // Campos de calidad
    if (req.body.qualityTimes !== undefined) {
      console.log("=== QUALITY TIMES DEBUG ===");
      console.log("Valor recibido:", req.body.qualityTimes);
      updateFields.qualityTimes = req.body.qualityTimes;
    }
    if (req.body.brix !== undefined) {
      console.log("=== BRIX DEBUG ===");
      console.log("Valor recibido:", req.body.brix);
      updateFields.brix = req.body.brix;
    }
    if (req.body.qualityTemp !== undefined) updateFields.qualityTemp = req.body.qualityTemp;
    if (req.body.texture !== undefined) updateFields.texture = req.body.texture;
    if (req.body.color !== undefined) updateFields.color = req.body.color;
    if (req.body.viscosity !== undefined) updateFields.viscosity = req.body.viscosity;
    if (req.body.smell !== undefined) updateFields.smell = req.body.smell;
    if (req.body.taste !== undefined) updateFields.taste = req.body.taste;
    if (req.body.foreignMaterial !== undefined) updateFields.foreignMaterial = req.body.foreignMaterial;
    if (req.body.statusCheck !== undefined) {
      console.log("=== STATUS CHECK DEBUG ===");
      console.log("Valor recibido:", req.body.statusCheck);
      updateFields.statusCheck = req.body.statusCheck;
    }
    if (req.body.qualityNotes !== undefined) updateFields.qualityNotes = req.body.qualityNotes;
    
    // Campos de destino
    if (req.body.destinationType !== undefined) updateFields.destinationType = req.body.destinationType;
    if (req.body.destinationKilos !== undefined) updateFields.destinationKilos = req.body.destinationKilos;
    if (req.body.destinationProduct !== undefined) updateFields.destinationProduct = req.body.destinationProduct;
    if (req.body.destinationEstimation !== undefined) updateFields.destinationEstimation = req.body.destinationEstimation;
    if (req.body.totalKilos !== undefined) updateFields.totalKilos = req.body.totalKilos;
    
    // Campos de liberación
    if (req.body.liberationFolio !== undefined) updateFields.liberationFolio = req.body.liberationFolio;
    if (req.body.cP !== undefined) updateFields.cP = req.body.cP; // Cambiar de c_p a cP para mapear correctamente
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
    
    console.log("=== DATOS RECIBIDOS ===");
    console.log("req.body completo:", JSON.stringify(req.body, null, 2));
    console.log("req.body.startTime:", req.body.startTime);
    console.log("req.body.endTime:", req.body.endTime);
    console.log("req.body.temperature:", req.body.temperature);
    console.log("req.body.pressure:", req.body.pressure);
    console.log("Campos a actualizar:", JSON.stringify(updateFields, null, 2));
    
    // Usar actualización directa con campos mapeados correctamente
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
    // Verificar si el usuario está autenticado y tiene permisos de eliminación
    const allowedRoles = ['superadmin', 'admin', 'gerente_produccion', 'gerente_calidad'];
    if (!req.isAuthenticated() || !allowedRoles.includes(req.user?.role || '')) {
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