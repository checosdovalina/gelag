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
      
      // Asegurar que los campos JSON se preserven correctamente
      const finalData = {
        ...cleanData,
        // Preservar campos JSON específicos si existen
        ...(data.temperature && { temperature: data.temperature }),
        ...(data.pressure && { pressure: data.pressure }),
        ...(data.hour_tracking && { hour_tracking: data.hour_tracking }),
        ...(data.ingredientTimes && { ingredientTimes: data.ingredientTimes }),
        ...(data.qualityTimes && { qualityTimes: data.qualityTimes }),
        ...(data.conoData && { conoData: data.conoData }),
        ...(data.empaqueData && { empaqueData: data.empaqueData }),
        ...(data.additionalFields && { additionalFields: data.additionalFields }),
        ...(data.states && { states: data.states })
      };
      
      console.log("=== DATOS FINALES ENVIADOS AL SERVIDOR ===");
      console.log("finalData.temperature:", finalData.temperature);
      console.log("finalData.pressure:", finalData.pressure);
      console.log("finalData.hour_tracking:", finalData.hour_tracking);
      
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