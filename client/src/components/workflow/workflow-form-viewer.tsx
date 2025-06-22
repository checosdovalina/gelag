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

// Definición de módulos/pestañas sin colores
const workflowModules = {
  init: { 
    label: "Información General", 
    description: "Gerente de Producción inicia el formulario",
    icon: Settings,
    allowedRoles: ["superadmin", "gerente_produccion"]
  },
  operation: { 
    label: "Datos de Proceso", 
    description: "Operadores completan durante turnos",
    icon: Wrench,
    allowedRoles: ["superadmin", "produccion", "gerente_produccion"]
  },
  quality: { 
    label: "Control de Calidad", 
    description: "Gerente de Calidad finaliza proceso",
    icon: CheckSquare,
    allowedRoles: ["superadmin", "gerente_calidad", "calidad"]
  }
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

  console.log('[DEBUG] WorkflowFormViewer - Renderizando componente');
  console.log('[DEBUG] WorkflowFormViewer - user:', user);
  console.log('[DEBUG] WorkflowFormViewer - formTemplate:', formTemplate);
  console.log('[DEBUG] WorkflowFormViewer - initialData recibidos:', initialData);
  console.log('[DEBUG] WorkflowFormViewer - entryId:', entryId);

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
        description: `El formulario ha avanzado a la etapa: ${workflowModules[data.workflowStage as keyof typeof workflowModules]?.label}`
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

  // Organizar campos por módulo/pestaña
  const getFieldsByModule = () => {
    if (!formTemplate.sections) return {};
    
    const moduleFields: { [key: string]: any[] } = {
      init: [],
      operation: [],
      quality: []
    };
    
    formTemplate.sections.forEach((section: any) => {
      section.fields?.forEach((field: any) => {
        // Determinar a qué módulo pertenece el campo basado en workflowStage o backgroundColor
        let module = 'operation'; // por defecto
        
        if (field.workflowStage === 'init' || 
            field.backgroundColor === 'pink' || 
            field.backgroundColor === '#FF69B4' || 
            field.backgroundColor === '#FFC0CB') {
          module = 'init';
        } else if (field.workflowStage === 'quality' || 
                   field.backgroundColor === 'green' || 
                   field.backgroundColor === '#00FF00' || 
                   field.backgroundColor === '#90EE90') {
          module = 'quality';
        } else if (field.workflowStage === 'operation' || 
                   field.backgroundColor === 'yellow' || 
                   field.backgroundColor === '#FFFF00' || 
                   field.backgroundColor === '#FFD700' ||
                   field.backgroundColor === '#FFFF99' ||
                   field.backgroundColor === '#FFA500') {
          module = 'operation';
        }
        
        moduleFields[module].push({
          ...field,
          sectionTitle: section.title || 'Sin título'
        });
      });
    });
    
    return moduleFields;
  };

  // Obtener pestañas disponibles para el usuario actual
  const getAvailableTabs = () => {
    if (!user) return [];
    
    return Object.entries(workflowModules).filter(([moduleKey, moduleConfig]) => {
      return moduleConfig.allowedRoles.includes(user.role);
    });
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
                <p><strong>Etapa actual:</strong> {workflowModules[currentStage as keyof typeof workflowModules]?.label}</p>
                <p><strong>Tu rol:</strong> <Badge variant="outline">{user?.role}</Badge></p>
                <p><strong>Roles permitidos:</strong> {stagePermissions[currentStage as keyof typeof stagePermissions]?.join(', ')}</p>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const moduleFields = getFieldsByModule();
  const availableTabs = getAvailableTabs();
  const folioFields = getFolioFields();

  // Debug logs
  console.log('[DEBUG] WorkflowFormViewer - moduleFields:', moduleFields);
  console.log('[DEBUG] WorkflowFormViewer - availableTabs:', availableTabs);
  console.log('[DEBUG] WorkflowFormViewer - user role:', user?.role);
  console.log('[DEBUG] WorkflowFormViewer - formTemplate sections:', formTemplate?.sections);

  // Estado para la pestaña activa
  const [activeTab, setActiveTab] = useState('init');

  return (
    <div className="space-y-6">
      {/* Indicador de flujo de trabajo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Estado del Flujo de Trabajo</span>
            <Badge variant="outline">
              {workflowModules[currentStage as keyof typeof workflowModules]?.label}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {workflowModules[currentStage as keyof typeof workflowModules]?.description}
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

      {/* Formulario organizado en pestañas por módulos */}
      <Card>
        <CardHeader>
          <CardTitle>{formTitle}</CardTitle>
          {formDescription && (
            <p className="text-sm text-muted-foreground">{formDescription}</p>
          )}
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              {availableTabs.map(([moduleKey, moduleConfig]) => {
                const Icon = moduleConfig.icon;
                const fieldCount = moduleFields[moduleKey]?.length || 0;
                
                return (
                  <TabsTrigger
                    key={moduleKey}
                    value={moduleKey}
                    className="flex items-center space-x-2"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{moduleConfig.label}</span>
                    <Badge variant="secondary" className="ml-2">
                      {fieldCount}
                    </Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {availableTabs.map(([moduleKey, moduleConfig]) => {
              const fieldsForModule = moduleFields[moduleKey] || [];
              
              if (fieldsForModule.length === 0) {
                return (
                  <TabsContent key={moduleKey} value={moduleKey} className="mt-6">
                    <div className="text-center py-8 text-muted-foreground">
                      <moduleConfig.icon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No hay campos disponibles en este módulo</p>
                    </div>
                  </TabsContent>
                );
              }

              // Crear un template temporal solo con los campos del módulo actual
              const moduleTemplate = {
                ...formTemplate,
                sections: [{
                  title: `Campos del Módulo ${moduleConfig.label}`,
                  fields: fieldsForModule
                }]
              };

              return (
                <TabsContent key={moduleKey} value={moduleKey} className="mt-6">
                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center space-x-2 mb-4">
                      <moduleConfig.icon className="h-5 w-5" />
                      <h3 className="font-medium">{moduleConfig.description}</h3>
                    </div>
                    
                    <FormViewer
                      formTemplate={moduleTemplate}
                      formTitle=""
                      initialData={initialData}
                      onSubmit={onSubmit}
                      isLoading={isLoading}
                      isReadOnly={false}
                    />
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}