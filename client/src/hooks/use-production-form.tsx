import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ProductionFormStatus } from "@shared/schema";
import type { ProductionForm } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

// Hook para gestionar formularios de producción
export function useProductionForms() {
  const { toast } = useToast();

  // Obtener todos los formularios
  const {
    data: forms,
    isLoading,
    error,
    refetch
  } = useQuery<ProductionForm[]>({
    queryKey: ['/api/production-forms'],
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Crear un nuevo formulario
  const createFormMutation = useMutation({
    mutationFn: async (formData: Partial<ProductionForm>) => {
      const res = await apiRequest('POST', '/api/production-forms', formData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Formulario creado",
        description: "El formulario ha sido creado correctamente.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/production-forms'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al crear formulario",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Actualizar un formulario existente
  const updateFormMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      console.log("=== MUTATION ENVIANDO AL SERVIDOR ===");
      console.log("data.startTime en mutation:", data.startTime);
      console.log("data.endTime en mutation:", data.endTime);
      console.log("data completo en mutation:", JSON.stringify(data, null, 2));
      
      const res = await apiRequest('PUT', `/api/production-forms/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Formulario actualizado",
        description: "El formulario ha sido actualizado correctamente.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/production-forms'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar formulario",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Cambiar el estado de un formulario
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: ProductionFormStatus }) => {
      const res = await apiRequest('PATCH', `/api/production-forms/${id}/status`, { status });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Estado actualizado",
        description: "El estado del formulario ha sido actualizado correctamente.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/production-forms'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar estado",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Eliminar un formulario
  const deleteFormMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/production-forms/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Formulario eliminado",
        description: "El formulario ha sido eliminado correctamente.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/production-forms'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al eliminar formulario",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    forms,
    isLoading,
    error,
    refetch,
    createFormMutation,
    updateFormMutation,
    updateStatusMutation,
    deleteFormMutation,
  };
}

// Hook para gestionar un único formulario de producción
export function useProductionForm(id?: number) {
  const { toast } = useToast();

  // Obtener un formulario específico
  const {
    data: form,
    isLoading,
    error,
    refetch
  } = useQuery<ProductionForm>({
    queryKey: ['/api/production-forms', id],
    queryFn: async () => {
      if (!id) throw new Error("ID requerido");
      const res = await fetch(`/api/production-forms/${id}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error("Error al cargar formulario");
      return await res.json();
    },
    enabled: !!id, // Solo ejecutar si hay un ID
    staleTime: 0, // Siempre considerar datos como obsoletos para refrescar automáticamente
    refetchOnWindowFocus: true, // Refrescar al cambiar ventana/tab
  });

  // Actualizar un formulario existente
  const updateFormMutation = useMutation({
    mutationFn: async (data: Partial<ProductionForm>) => {
      if (!id) throw new Error("ID de formulario no proporcionado");
      
      // Limpiar datos para evitar problemas con timestamps pero preservar campos JSON
      const {
        id: dataId,
        createdAt,
        updatedAt,
        lastUpdatedBy,
        createdBy,
        ...cleanData
      } = data as any;
      
      // Crear objeto final con todos los campos preservados
      const finalData = cleanData;
      
      // Preservar campos JSON específicos si existen (incluyendo arrays vacíos)
      if (data.temperature !== undefined) finalData.temperature = data.temperature;
      if (data.pressure !== undefined) finalData.pressure = data.pressure;
      if (data.hour_tracking !== undefined) finalData.hour_tracking = data.hour_tracking;
      if (data.ingredientTimes !== undefined) finalData.ingredientTimes = data.ingredientTimes;
      if (data.qualityTimes !== undefined) finalData.qualityTimes = data.qualityTimes;
      if (data.conoData !== undefined) finalData.conoData = data.conoData;
      if (data.empaqueData !== undefined) finalData.empaqueData = data.empaqueData;
      if (data.additionalFields !== undefined) finalData.additionalFields = data.additionalFields;
      if (data.states !== undefined) finalData.states = data.states;
      
      // Preservar campos de tiempo específicos - incluir null y undefined
      finalData.startTime = data.startTime;
      finalData.endTime = data.endTime;
      
      // Preservar campos de calidad específicos
      if (data.brix !== undefined) finalData.brix = data.brix;
      if (data.qualityTemp !== undefined) finalData.qualityTemp = data.qualityTemp;
      if (data.texture !== undefined) finalData.texture = data.texture;
      if (data.color !== undefined) finalData.color = data.color;
      if (data.viscosity !== undefined) finalData.viscosity = data.viscosity;
      if (data.smell !== undefined) finalData.smell = data.smell;
      if (data.taste !== undefined) finalData.taste = data.taste;
      if (data.foreignMaterial !== undefined) finalData.foreignMaterial = data.foreignMaterial;
      if (data.statusCheck !== undefined) finalData.statusCheck = data.statusCheck;
      if (data.qualityNotes !== undefined) finalData.qualityNotes = data.qualityNotes;
      
      console.log("=== DATOS FINALES ENVIADOS AL SERVIDOR ===");
      console.log("data.startTime:", data.startTime);
      console.log("data.endTime:", data.endTime);
      console.log("data.ingredientTimes:", data.ingredientTimes);
      console.log("finalData.temperature:", finalData.temperature);
      console.log("finalData.pressure:", finalData.pressure);
      console.log("finalData.hour_tracking:", finalData.hour_tracking);
      console.log("finalData.startTime:", finalData.startTime);
      console.log("finalData.endTime:", finalData.endTime);
      console.log("=== VERIFICACIÓN DE TIPO DE DATOS ===");
      console.log("typeof data.startTime:", typeof data.startTime);
      console.log("typeof data.endTime:", typeof data.endTime);
      console.log("data.startTime === null:", data.startTime === null);
      console.log("data.endTime === null:", data.endTime === null);
      console.log("finalData.ingredientTimes:", finalData.ingredientTimes);
      console.log("finalData.brix:", finalData.brix);
      console.log("finalData.qualityTemp:", finalData.qualityTemp);
      console.log("finalData.texture:", finalData.texture);
      console.log("finalData.color:", finalData.color);
      console.log("finalData.viscosity:", finalData.viscosity);
      console.log("finalData.smell:", finalData.smell);
      console.log("finalData.taste:", finalData.taste);
      console.log("finalData.foreignMaterial:", finalData.foreignMaterial);
      console.log("finalData.statusCheck:", finalData.statusCheck);
      console.log("Objeto completo finalData:", JSON.stringify(finalData, null, 2));
      
      const res = await apiRequest('PUT', `/api/production-forms/${id}`, finalData);
      return await res.json();
    },
    onSuccess: (updatedForm) => {
      toast({
        title: "Formulario actualizado",
        description: "El formulario ha sido actualizado correctamente.",
      });
      // Invalidar tanto la consulta específica como la lista general
      queryClient.invalidateQueries({ queryKey: ['/api/production-forms', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/production-forms'] });
      // También actualizar directamente la cache con los nuevos datos
      queryClient.setQueryData(['/api/production-forms', id], updatedForm);
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar formulario",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Cambiar el estado de un formulario
  const updateStatusMutation = useMutation({
    mutationFn: async (status: ProductionFormStatus) => {
      if (!id) throw new Error("ID de formulario no proporcionado");
      const res = await apiRequest('PATCH', `/api/production-forms/${id}/status`, { status });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Estado actualizado",
        description: "El estado del formulario ha sido actualizado correctamente.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/production-forms', id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar estado",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    form,
    isLoading,
    error,
    refetch,
    updateFormMutation,
    updateStatusMutation,
  };
}