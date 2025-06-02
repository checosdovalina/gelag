import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, AlertTriangle, CheckCircle, Users, Settings, Wrench, CheckSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import FormViewer from "@/components/forms/form-viewer";
import FolioManager from "@/components/folio/folio-manager";

interface WorkflowFormViewerProps {
  formTemplate: any;
  formTitle: string;
  formDescription?: string;
  initialData?: any;
  entryId?: number;
  onSubmit: (data: any) => void;
  isLoading?: boolean;
}

const workflowStages = {
  init: { label: "Iniciación", color: "bg-pink-100 text-pink-800", description: "Gerente de Producción inicia el formulario" },
  operation: { label: "Operación", color: "bg-yellow-100 text-yellow-800", description: "Operadores completan durante turnos" },
  quality: { label: "Calidad", color: "bg-green-100 text-green-800", description: "Gerente de Calidad finaliza proceso" },
  completed: { label: "Completado", color: "bg-blue-100 text-blue-800", description: "Proceso terminado" }
};

// Permisos por rol para cada etapa del flujo
const stagePermissions = {
  init: ["superadmin", "gerente_produccion"],
  operation: ["superadmin", "produccion"],
  quality: ["superadmin", "gerente_calidad"],
  completed: ["superadmin"]
};

// Esquema de validación básico
const formSchema = z.object({
  // Esquema dinámico se construirá según el template
});

export default function WorkflowFormViewer({
  formTemplate,
  formTitle,
  formDescription,
  initialData = {},
  entryId,
  onSubmit,
  isLoading = false
}: WorkflowFormViewerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStage, setCurrentStage] = useState(initialData.workflowStage || 'init');
  const [timeAccessStatus, setTimeAccessStatus] = useState<any>(null);

  // Verificar acceso por horario
  const { data: accessCheck } = useQuery({
    queryKey: ['/api/user/time-access'],
    queryFn: async () => {
      const response = await fetch('/api/user/time-access');
      if (!response.ok) return { allowed: true }; // Fallback si no hay endpoint
      return response.json();
    },
    refetchInterval: 60000 // Verificar cada minuto
  });

  useEffect(() => {
    setTimeAccessStatus(accessCheck);
  }, [accessCheck]);

  // Verificar si el usuario puede acceder a la etapa actual
  const canAccessCurrentStage = () => {
    if (!user) return false;
    const allowedRoles = stagePermissions[currentStage as keyof typeof stagePermissions] || [];
    return allowedRoles.includes(user.role);
  };

  // Verificar si hay restricciones de horario
  const hasTimeRestrictions = () => {
    return timeAccessStatus && !timeAccessStatus.allowed;
  };

  // Mutación para cambiar etapa del flujo de trabajo
  const stageTransitionMutation = useMutation({
    mutationFn: async ({ stage, completedAt }: { stage: string; completedAt: string }) => {
      if (!entryId) throw new Error("No hay ID de entrada");
      
      const response = await apiRequest('PATCH', `/api/form-entries/${entryId}/workflow-stage`, {
        stage,
        completedAt
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Etapa actualizada",
        description: `El formulario ha avanzado a la etapa: ${workflowStages[data.workflowStage as keyof typeof workflowStages]?.label}`
      });
      setCurrentStage(data.workflowStage);
    },
    onError: (error: Error) => {
      toast({
        title: "Error en transición",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Función para avanzar a la siguiente etapa
  const advanceStage = () => {
    const stages = ['init', 'operation', 'quality', 'completed'];
    const currentIndex = stages.indexOf(currentStage);
    
    if (currentIndex < stages.length - 1) {
      const nextStage = stages[currentIndex + 1];
      const completedAt = new Date().toISOString();
      
      stageTransitionMutation.mutate({
        stage: nextStage,
        completedAt
      });
    }
  };

  // Filtrar campos según el rol y la etapa actual
  const getFieldsForCurrentUser = () => {
    if (!formTemplate.sections) return [];
    
    return formTemplate.sections.map((section: any) => ({
      ...section,
      fields: section.fields.filter((field: any) => {
        // Lógica de filtrado según el workflow stage y rol del usuario
        if (currentStage === 'init') {
          // En etapa de iniciación, solo campos rosa para gerentes de producción
          return field.workflowStage === 'init' || !field.workflowStage;
        } else if (currentStage === 'operation') {
          // En etapa de operación, campos amarillos para operadores
          return field.workflowStage === 'operation' || field.workflowStage === 'init';
        } else if (currentStage === 'quality') {
          // En etapa de calidad, todos los campos para revisión
          return true;
        }
        return true;
      })
    }));
  };

  // Obtener campos de folio para gestión
  const getFolioFields = () => {
    if (!formTemplate.sections || !initialData) return [];
    
    const folioFields: any[] = [];
    
    formTemplate.sections.forEach((section: any) => {
      section.fields?.forEach((field: any) => {
        if (field.autoGenerateFolio || field.type === 'folio' || field.id.toLowerCase().includes('folio')) {
          folioFields.push({
            id: field.id,
            label: field.label || field.displayName || field.id,
            value: initialData[field.id] || '',
            editable: field.editable !== false
          });
        }
      });
    });
    
    return folioFields;
  };

  // Función para actualizar folio
  const handleFolioUpdate = (fieldId: string, newValue: string) => {
    // El componente FolioManager ya maneja la actualización via API
    // Aquí solo necesitamos actualizar el estado local si es necesario
  };

  if (hasTimeRestrictions()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <span>Acceso Restringido por Horario</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>Motivo:</strong> {timeAccessStatus?.reason}</p>
                <p><strong>Horario permitido:</strong> {timeAccessStatus?.allowedHours}</p>
                <p>Tu rol actual: <Badge variant="outline">{user?.role}</Badge></p>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!canAccessCurrentStage()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-red-500" />
            <span>Sin Permisos para Esta Etapa</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              <div className="space-y-2">
                <p>No tienes permisos para acceder a la etapa actual del flujo de trabajo.</p>
                <p><strong>Etapa actual:</strong> {workflowStages[currentStage as keyof typeof workflowStages]?.label}</p>
                <p><strong>Tu rol:</strong> <Badge variant="outline">{user?.role}</Badge></p>
                <p><strong>Roles permitidos:</strong> {stagePermissions[currentStage as keyof typeof stagePermissions]?.join(', ')}</p>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const filteredTemplate = {
    ...formTemplate,
    sections: getFieldsForCurrentUser()
  };

  const folioFields = getFolioFields();

  return (
    <div className="space-y-6">
      {/* Indicador de flujo de trabajo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Estado del Flujo de Trabajo</span>
            <Badge className={workflowStages[currentStage as keyof typeof workflowStages]?.color}>
              {workflowStages[currentStage as keyof typeof workflowStages]?.label}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {workflowStages[currentStage as keyof typeof workflowStages]?.description}
            </p>
            
            {currentStage !== 'completed' && canAccessCurrentStage() && (
              <Button
                onClick={advanceStage}
                disabled={stageTransitionMutation.isPending}
                size="sm"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Completar Etapa
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Gestión de folios */}
      {folioFields.length > 0 && entryId && (
        <FolioManager
          entryId={entryId}
          folioFields={folioFields}
          onFolioUpdate={handleFolioUpdate}
        />
      )}

      {/* Formulario con campos filtrados */}
      <FormViewer
        formTemplate={filteredTemplate}
        formTitle={formTitle}
        formDescription={formDescription}
        initialData={initialData}
        onSubmit={onSubmit}
        isLoading={isLoading}
        isReadOnly={false}
      />
    </div>
  );
}