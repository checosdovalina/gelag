import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import MainLayout from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft } from "lucide-react";
import ProcessFormEditor, { ProcessFormStatus, ProcessFormData } from "@/components/process-forms/process-form-editor";
import { SectionPermission } from "@/components/process-forms/section-permissions";
import { FormStructure } from "@/components/forms/form-builder";
import { Skeleton } from "@/components/ui/skeleton";

// Permisos de producción para el formulario de ejemplo mostrado (PR-PR-01-04)
const PRODUCTION_FORM_SECTIONS: SectionPermission[] = [
  {
    sectionId: "general",
    sectionName: "Información General",
    allowedRoles: ["production_manager"],
    order: 0,
    editable: true
  },
  {
    sectionId: "raw-materials",
    sectionName: "Materias Primas",
    allowedRoles: ["production_manager"],
    order: 1,
    editable: true
  },
  {
    sectionId: "process-data",
    sectionName: "Datos de Proceso",
    allowedRoles: ["operator", "production_manager"],
    order: 2,
    editable: true
  },
  {
    sectionId: "quality-verification",
    sectionName: "Verificación de Calidad",
    allowedRoles: ["operator", "production_manager"],
    order: 3,
    editable: true
  },
  {
    sectionId: "notes",
    sectionName: "Notas",
    allowedRoles: ["operator", "production_manager", "quality_manager"],
    order: 4,
    editable: true
  },
  {
    sectionId: "product-destination",
    sectionName: "Destino de Producto",
    allowedRoles: ["production_manager", "operator"],
    order: 5,
    editable: true
  },
  {
    sectionId: "liberation-data",
    sectionName: "Datos de Liberación",
    allowedRoles: ["quality_manager"],
    order: 6,
    editable: true
  }
];

export default function ProcessFormPage() {
  const [_, setLocation] = useLocation();
  const { id, templateId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isNewForm = id === "new";

  // Fetch form template
  const { data: template, isLoading: isLoadingTemplate, error: templateError } = useQuery({
    queryKey: [`/api/process-templates/${templateId}`],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", `/api/form-templates/${templateId}`);
        if (!res.ok) {
          throw new Error("Error al cargar la plantilla");
        }
        
        const templateData = await res.json();
        // Asignar permisos de secciones - por ahora usamos los definidos estáticamente
        // En un futuro deberían venir del backend
        return {
          ...templateData,
          sectionPermissions: PRODUCTION_FORM_SECTIONS
        };
      } catch (error) {
        throw new Error("Error al cargar la plantilla del formulario");
      }
    },
    enabled: !!templateId
  });

  // Fetch form data if editing an existing form
  const { data: formData, isLoading: isLoadingForm } = useQuery({
    queryKey: [`/api/process-forms/${id}`],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", `/api/form-entries/${id}`);
        if (!res.ok) {
          throw new Error("Error al cargar los datos del formulario");
        }
        
        const entryData = await res.json();
        
        // Convertir datos de la entrada de formulario al formato esperado por el editor
        return {
          formId: entryData.id,
          templateId: entryData.formTemplateId,
          data: entryData.data,
          roleSpecificData: entryData.roleSpecificData || {},
          status: entryData.workflowStatus as ProcessFormStatus || ProcessFormStatus.DRAFT,
          createdBy: entryData.createdBy,
          lastUpdatedBy: entryData.updatedBy
        };
      } catch (error) {
        throw new Error("Error al cargar los datos del formulario");
      }
    },
    enabled: !!id && !isNewForm
  });

  // Mutation to save the form
  const saveMutation = useMutation({
    mutationFn: async (data: ProcessFormData) => {
      const apiPath = isNewForm ? "/api/form-entries" : `/api/form-entries/${id}`;
      const method = isNewForm ? "POST" : "PATCH";
      
      // Preparar los datos para enviar al servidor
      const payload = {
        formTemplateId: data.templateId,
        data: data.data,
        roleSpecificData: data.roleSpecificData,
        workflowStatus: data.status,
        updatedBy: user?.id
      };
      
      const res = await apiRequest(method, apiPath, payload);
      if (!res.ok) {
        throw new Error("Error al guardar el formulario");
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Formulario guardado",
        description: "Los cambios han sido guardados correctamente"
      });
      
      // Actualizar caché
      queryClient.invalidateQueries({ queryKey: [`/api/process-forms/${data.id}`] });
      
      // Redirigir a la página de edición si es nuevo
      if (isNewForm) {
        setLocation(`/process-forms/${data.id}`);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Handle save
  const handleSave = (data: ProcessFormData) => {
    saveMutation.mutate(data);
  };

  // Loading states
  const isLoading = isLoadingTemplate || isLoadingForm || saveMutation.isPending;

  if (templateError) {
    return (
      <MainLayout title="Error">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error al cargar la plantilla del formulario. Por favor, intenta de nuevo.
          </AlertDescription>
        </Alert>
        <Button 
          className="mt-4" 
          variant="outline" 
          onClick={() => setLocation("/process-forms")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </MainLayout>
    );
  }

  if (isLoadingTemplate || (isLoadingForm && !isNewForm)) {
    return (
      <MainLayout title="Cargando...">
        <div className="space-y-6">
          <Skeleton className="w-full h-12" />
          <Skeleton className="w-full h-64" />
          <Skeleton className="w-full h-64" />
        </div>
      </MainLayout>
    );
  }

  if (!template) {
    return (
      <MainLayout title="Plantilla no encontrada">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            La plantilla solicitada no existe.
          </AlertDescription>
        </Alert>
        <Button 
          className="mt-4" 
          variant="outline" 
          onClick={() => setLocation("/process-forms")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </MainLayout>
    );
  }

  const pageTitle = isNewForm 
    ? `Nuevo Formulario de ${template.name}` 
    : `Editar Formulario ${formData?.formId || ''}`;

  return (
    <MainLayout title={pageTitle}>
      <div className="space-y-6">
        <Button 
          variant="outline" 
          onClick={() => setLocation("/process-forms")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Formularios de Proceso
        </Button>

        <ProcessFormEditor
          formTemplate={template}
          initialData={formData}
          onSave={handleSave}
          isLoading={isLoading}
        />
      </div>
    </MainLayout>
  );
}