import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, AlertCircle, User } from "lucide-react";
import FormViewer from "@/components/forms/form-viewer";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface WorkflowFormViewerProps {
  formTemplate: any;
  formTitle: string;
  formDescription?: string;
  initialData?: any;
  entryId?: number;
  onSubmit: (data: any) => void;
  isLoading?: boolean;
}

// Mapeo de roles para verificación de permisos
const roleMapping = {
  'superadmin': ['superadmin'],
  'gerente_produccion': ['gerente_produccion', 'superadmin'],
  'operativo': ['operativo', 'produccion', 'superadmin'],
  'produccion': ['operativo', 'produccion', 'superadmin'],
  'gerente_calidad': ['gerente_calidad', 'calidad', 'superadmin'],
  'calidad': ['gerente_calidad', 'calidad', 'superadmin']
};

// Mapeo de etapas del flujo de trabajo
const stageInfo = {
  init: {
    title: "Inicio de Producción",
    description: "Gerente de producción configura parámetros iniciales",
    color: "pink",
    roles: ["gerente_produccion", "superadmin"],
    nextStage: "operation"
  },
  operation: {
    title: "Proceso Operativo",
    description: "Operadores registran datos del proceso",
    color: "yellow", 
    roles: ["operativo", "produccion", "superadmin"],
    nextStage: "quality"
  },
  quality: {
    title: "Control de Calidad",
    description: "Gerente de calidad finaliza y libera",
    color: "green",
    roles: ["gerente_calidad", "calidad", "superadmin"],
    nextStage: "completed"
  },
  completed: {
    title: "Proceso Completado",
    description: "Formulario completado y liberado",
    color: "blue",
    roles: [],
    nextStage: null
  }
};

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
  const queryClient = useQueryClient();
  
  const [currentStage, setCurrentStage] = useState(initialData.workflowStage || 'init');
  const [stageCompletedAt, setStageCompletedAt] = useState(initialData.stageCompletedAt || {});

  // Verificar si el usuario puede acceder a la etapa actual
  const canAccessCurrentStage = () => {
    if (!user) return false;
    const stageRoles = stageInfo[currentStage as keyof typeof stageInfo]?.roles || [];
    return stageRoles.includes(user.role) || user.role === 'superadmin';
  };

  // Verificar si un campo específico es editable para el usuario actual
  const isFieldEditable = (field: any) => {
    if (!user) return false;
    
    // Si no tiene metadatos de flujo de trabajo, usar lógica anterior
    if (!field.workflowStage || !field.allowedRoles) {
      return true;
    }

    // Verificar si la etapa del campo coincide con la etapa actual
    if (field.workflowStage !== currentStage) {
      return false;
    }

    // Verificar si el rol del usuario está permitido para este campo
    const allowedRoles = field.allowedRoles || [];
    return allowedRoles.includes(user.role) || user.role === 'superadmin';
  };

  // Modificar el template para marcar campos como readonly según el flujo de trabajo
  const getModifiedTemplate = () => {
    if (!formTemplate.workflowEnabled) {
      return formTemplate;
    }

    const modifiedTemplate = { ...formTemplate };
    
    if (modifiedTemplate.sections) {
      modifiedTemplate.sections = modifiedTemplate.sections.map((section: any) => ({
        ...section,
        fields: section.fields?.map((field: any) => ({
          ...field,
          readOnly: !isFieldEditable(field),
          fieldStyle: field.fieldColor ? getFieldStyle(field.fieldColor, !isFieldEditable(field)) : undefined
        }))
      }));
    }

    return modifiedTemplate;
  };

  // Obtener estilos para los campos según su color y estado
  const getFieldStyle = (color: string, isReadOnly: boolean) => {
    const baseStyles = {
      pink: isReadOnly ? "bg-pink-50 border-pink-200" : "bg-pink-100 border-pink-300",
      yellow: isReadOnly ? "bg-yellow-50 border-yellow-200" : "bg-yellow-100 border-yellow-300", 
      green: isReadOnly ? "bg-green-50 border-green-200" : "bg-green-100 border-green-300",
      blue: isReadOnly ? "bg-blue-50 border-blue-200" : "bg-blue-100 border-blue-300"
    };
    
    return baseStyles[color as keyof typeof baseStyles] || "";
  };

  // Mutación para avanzar a la siguiente etapa
  const advanceStage = useMutation({
    mutationFn: async () => {
      if (!entryId) throw new Error('No entry ID provided');
      
      const nextStage = stageInfo[currentStage as keyof typeof stageInfo]?.nextStage;
      if (!nextStage) throw new Error('No next stage available');

      const response = await apiRequest('PATCH', `/api/form-entries/${entryId}/workflow-stage`, {
        stage: nextStage,
        completedAt: new Date().toISOString()
      });

      return response.json();
    },
    onSuccess: (data) => {
      setCurrentStage(data.workflowStage);
      setStageCompletedAt(data.stageCompletedAt || {});
      
      toast({
        title: "Etapa completada",
        description: `Proceso avanzado a: ${stageInfo[data.workflowStage as keyof typeof stageInfo]?.title}`
      });

      queryClient.invalidateQueries({ queryKey: ['/api/form-entries'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `No se pudo avanzar la etapa: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Verificar si se pueden completar los campos requeridos de la etapa actual
  const canCompleteCurrentStage = () => {
    if (!formTemplate.workflowEnabled) return true;
    
    const currentStageFields = formTemplate.sections?.flatMap((section: any) => 
      section.fields?.filter((field: any) => 
        field.workflowStage === currentStage && field.required
      ) || []
    ) || [];

    return currentStageFields.every((field: any) => 
      initialData[field.id] !== undefined && initialData[field.id] !== ''
    );
  };

  const currentStageInfo = stageInfo[currentStage as keyof typeof stageInfo];
  const nextStageInfo = currentStageInfo?.nextStage ? 
    stageInfo[currentStageInfo.nextStage as keyof typeof stageInfo] : null;

  return (
    <div className="space-y-6">
      {/* Panel de estado del flujo de trabajo */}
      {formTemplate.workflowEnabled && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${
                  currentStage === 'completed' ? 'bg-green-100' : 'bg-blue-100'
                }`}>
                  {currentStage === 'completed' ? 
                    <CheckCircle className="h-5 w-5 text-green-600" /> :
                    <Clock className="h-5 w-5 text-blue-600" />
                  }
                </div>
                <div>
                  <CardTitle className="text-lg">{currentStageInfo?.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {currentStageInfo?.description}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="flex items-center space-x-1">
                  <User className="h-3 w-3" />
                  <span>{user?.role}</span>
                </Badge>
                {!canAccessCurrentStage() && (
                  <Badge variant="destructive" className="flex items-center space-x-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>Sin acceso</span>
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          
          {canAccessCurrentStage() && nextStageInfo && entryId && (
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">¿Completar esta etapa?</p>
                  <p className="text-sm text-muted-foreground">
                    Siguiente: {nextStageInfo.title}
                  </p>
                </div>
                <Button 
                  onClick={() => advanceStage.mutate()}
                  disabled={!canCompleteCurrentStage() || advanceStage.isPending}
                  size="sm"
                >
                  {advanceStage.isPending ? "Procesando..." : "Completar Etapa"}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Indicador de acceso */}
      {!canAccessCurrentStage() && formTemplate.workflowEnabled && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800">
                  No tienes acceso a esta etapa del proceso
                </p>
                <p className="text-sm text-amber-700">
                  Esta etapa requiere rol: {currentStageInfo?.roles.join(', ')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulario principal */}
      <FormViewer
        formTemplate={getModifiedTemplate()}
        formTitle={formTitle}
        formDescription={formDescription}
        initialData={initialData}
        onSubmit={onSubmit}
        isLoading={isLoading}
        isReadOnly={!canAccessCurrentStage() && formTemplate.workflowEnabled}
      />
    </div>
  );
}