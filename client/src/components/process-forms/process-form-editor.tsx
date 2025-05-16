import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormViewer } from "@/components/forms/form-viewer";
import { AdvancedTableViewer } from "@/components/forms/advanced-table-viewer";
import { Badge } from "@/components/ui/badge";
import { Info, AlertCircle, Save, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FormField, FormStructure } from "@/components/forms/form-builder";
import { SectionPermission, UserRole } from "./section-permissions";

// Define types for process form data
export interface ProcessFormData {
  formId?: number;
  templateId: number;
  data: Record<string, any>;
  roleSpecificData: Record<string, any>;
  status: ProcessFormStatus;
  createdBy: number;
  lastUpdatedBy?: number;
}

export enum ProcessFormStatus {
  DRAFT = "DRAFT",                 // Iniciado pero no enviado
  IN_PROGRESS = "IN_PROGRESS",     // En proceso de llenado
  PENDING_REVIEW = "PENDING_REVIEW", // Esperando revisión de calidad
  COMPLETED = "COMPLETED"          // Completado y firmado
}

interface ProcessFormEditorProps {
  formTemplate: {
    id: number;
    name: string;
    structure: FormStructure;
    sectionPermissions: SectionPermission[];
  };
  initialData?: ProcessFormData;
  onSave: (data: ProcessFormData) => void;
  isLoading?: boolean;
  readOnly?: boolean;
}

// Map user roles to app roles
const mapUserRoleToAppRole = (userRole: string): UserRole | null => {
  const roleMap: Record<string, UserRole> = {
    "SuperAdmin": "production_manager", // SuperAdmin can act as any role, default to manager
    "Admin": "production_manager",
    "Production": "operator",
    "ProductionManager": "production_manager",
    "Quality": "operator", // Regular quality user can also be an operator
    "QualityManager": "quality_manager",
    "Viewer": "operator" // Viewers will see but not edit
  };
  
  return roleMap[userRole] || null;
};

// Status badge component
const StatusBadge = ({ status }: { status: ProcessFormStatus }) => {
  const variants: Record<ProcessFormStatus, { variant: "default" | "secondary" | "outline" | "destructive", label: string }> = {
    [ProcessFormStatus.DRAFT]: { variant: "outline", label: "Borrador" },
    [ProcessFormStatus.IN_PROGRESS]: { variant: "default", label: "En Progreso" },
    [ProcessFormStatus.PENDING_REVIEW]: { variant: "secondary", label: "Pendiente de Revisión" },
    [ProcessFormStatus.COMPLETED]: { variant: "outline", label: "Completado" }
  };
  
  const { variant, label } = variants[status];
  
  return (
    <Badge variant={variant}>{label}</Badge>
  );
};

export default function ProcessFormEditor({ 
  formTemplate, 
  initialData, 
  onSave, 
  isLoading = false,
  readOnly = false
}: ProcessFormEditorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState<Record<string, any>>(initialData?.data || {});
  const [activeTab, setActiveTab] = useState<string>("general");
  const [formStatus, setFormStatus] = useState<ProcessFormStatus>(
    initialData?.status || ProcessFormStatus.DRAFT
  );
  
  // Determine the current user's role for this form
  const currentUserRole = user ? mapUserRoleToAppRole(user.role) : null;
  
  // Group fields by section
  const sections = formTemplate.sectionPermissions.map(section => {
    const sectionFields = formTemplate.structure.fields.filter(
      field => {
        // Match fields to sections by ID prefix - assumes section IDs are prefixes of field IDs
        const fieldBelongsToSection = field.id.startsWith(section.sectionId);
        return fieldBelongsToSection;
      }
    );
    
    return {
      ...section,
      fields: sectionFields
    };
  });
  
  // Determine which sections the current user can edit
  const canEditSection = (sectionId: string): boolean => {
    if (readOnly) return false;
    if (!user || !currentUserRole) return false;
    
    const section = formTemplate.sectionPermissions.find(s => s.sectionId === sectionId);
    if (!section) return false;
    
    // SuperAdmin can edit any section
    if (user.role === "SuperAdmin") return true;
    
    // Check if the user's role is allowed for this section
    return section.allowedRoles.includes(currentUserRole);
  };
  
  // Handle field changes
  const handleFieldChange = (fieldId: string, value: any) => {
    // Find which section this field belongs to
    const section = sections.find(s => s.fields.some(f => f.id === fieldId));
    if (!section) return;
    
    // Check if user can edit this section
    if (!canEditSection(section.sectionId)) {
      toast({
        title: "Acceso restringido",
        description: "No tienes permiso para editar este campo",
        variant: "destructive"
      });
      return;
    }
    
    // Update form data
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };
  
  // Handle form save
  const handleSave = () => {
    // Validate that required fields are filled
    const requiredFields = formTemplate.structure.fields.filter(f => f.required);
    const missingFields = requiredFields.filter(f => !formData[f.id]);
    
    if (missingFields.length > 0) {
      toast({
        title: "Campos requeridos",
        description: `Faltan por completar ${missingFields.length} campos obligatorios`,
        variant: "destructive"
      });
      return;
    }
    
    // Save the form data
    onSave({
      templateId: formTemplate.id,
      data: formData,
      roleSpecificData: initialData?.roleSpecificData || {},
      status: formStatus,
      createdBy: initialData?.createdBy || user?.id || 0,
      lastUpdatedBy: user?.id
    });
  };
  
  // Status transitions
  const handleStatusChange = (newStatus: ProcessFormStatus) => {
    // Validate status transition
    const allowedTransitions: Record<ProcessFormStatus, ProcessFormStatus[]> = {
      [ProcessFormStatus.DRAFT]: [ProcessFormStatus.IN_PROGRESS],
      [ProcessFormStatus.IN_PROGRESS]: [ProcessFormStatus.PENDING_REVIEW],
      [ProcessFormStatus.PENDING_REVIEW]: [ProcessFormStatus.COMPLETED, ProcessFormStatus.IN_PROGRESS],
      [ProcessFormStatus.COMPLETED]: [ProcessFormStatus.PENDING_REVIEW]
    };
    
    if (!allowedTransitions[formStatus].includes(newStatus)) {
      toast({
        title: "Transición no permitida",
        description: `No se puede cambiar de ${formStatus} a ${newStatus}`,
        variant: "destructive"
      });
      return;
    }
    
    // Check role permissions for status transition
    const allowedRoles: Record<string, UserRole[]> = {
      [`${ProcessFormStatus.DRAFT}-${ProcessFormStatus.IN_PROGRESS}`]: ["production_manager"],
      [`${ProcessFormStatus.IN_PROGRESS}-${ProcessFormStatus.PENDING_REVIEW}`]: ["operator", "production_manager"],
      [`${ProcessFormStatus.PENDING_REVIEW}-${ProcessFormStatus.COMPLETED}`]: ["quality_manager"],
      [`${ProcessFormStatus.PENDING_REVIEW}-${ProcessFormStatus.IN_PROGRESS}`]: ["quality_manager"],
      [`${ProcessFormStatus.COMPLETED}-${ProcessFormStatus.PENDING_REVIEW}`]: ["quality_manager"]
    };
    
    const transitionKey = `${formStatus}-${newStatus}`;
    if (currentUserRole && !allowedRoles[transitionKey]?.includes(currentUserRole)) {
      toast({
        title: "Permiso denegado",
        description: "No tienes permiso para realizar este cambio de estado",
        variant: "destructive"
      });
      return;
    }
    
    // Update status
    setFormStatus(newStatus);
    
    // Also save the form data with the new status
    onSave({
      ...initialData,
      templateId: formTemplate.id,
      data: formData,
      status: newStatus,
      lastUpdatedBy: user?.id
    });
  };
  
  // Render the form fields grouped by section
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{formTemplate.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={formStatus} />
            {initialData?.formId && (
              <span className="text-sm text-muted-foreground">
                Folio: {initialData.formId}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          {!readOnly && (
            <Button onClick={handleSave} disabled={isLoading}>
              <Save className="mr-2 h-4 w-4" />
              {isLoading ? "Guardando..." : "Guardar"}
            </Button>
          )}
          
          {/* Status transition buttons */}
          {formStatus === ProcessFormStatus.DRAFT && currentUserRole === "production_manager" && (
            <Button variant="outline" onClick={() => handleStatusChange(ProcessFormStatus.IN_PROGRESS)}>
              Iniciar Proceso
            </Button>
          )}
          
          {formStatus === ProcessFormStatus.IN_PROGRESS && (
            currentUserRole === "operator" || currentUserRole === "production_manager"
          ) && (
            <Button variant="outline" onClick={() => handleStatusChange(ProcessFormStatus.PENDING_REVIEW)}>
              Enviar a Revisión
            </Button>
          )}
          
          {formStatus === ProcessFormStatus.PENDING_REVIEW && currentUserRole === "quality_manager" && (
            <>
              <Button variant="outline" onClick={() => handleStatusChange(ProcessFormStatus.IN_PROGRESS)}>
                Devolver a Producción
              </Button>
              <Button variant="default" onClick={() => handleStatusChange(ProcessFormStatus.COMPLETED)}>
                Aprobar y Completar
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* Role-based access information */}
      {!currentUserRole && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No tienes un rol asignado para este formulario. Contacta al administrador.
          </AlertDescription>
        </Alert>
      )}
      
      {currentUserRole && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Estás trabajando como <strong>{
              currentUserRole === "production_manager" ? "Gerente de Producción" :
              currentUserRole === "operator" ? "Operador" :
              "Gerente de Calidad"
            }</strong>. 
            Solo puedes editar las secciones asignadas a tu rol.
          </AlertDescription>
        </Alert>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          {sections.map((section) => (
            <TabsTrigger key={section.sectionId} value={section.sectionId} className="flex items-center gap-2">
              {section.sectionName}
              {!canEditSection(section.sectionId) && <Lock className="h-3 w-3" />}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {sections.map((section) => (
          <TabsContent key={section.sectionId} value={section.sectionId}>
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between">
                  <span>{section.sectionName}</span>
                  {!canEditSection(section.sectionId) && (
                    <Badge variant="outline">Solo Lectura</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {section.fields.length > 0 ? (
                  <div className="space-y-6">
                    {section.fields.map((field) => {
                      // Render different field types
                      if (field.type === "advancedTable" && field.advancedTableConfig) {
                        return (
                          <div key={field.id} className="space-y-2">
                            <h3 className="text-sm font-medium">{field.label}</h3>
                            <AdvancedTableViewer
                              config={field.advancedTableConfig}
                              value={formData[field.id] || []}
                              onChange={(value) => handleFieldChange(field.id, value)}
                              readOnly={!canEditSection(section.sectionId)}
                            />
                          </div>
                        );
                      }
                      
                      // For other field types, use the FormViewer
                      return (
                        <FormViewer
                          key={field.id}
                          field={field}
                          value={formData[field.id]}
                          onChange={(value) => handleFieldChange(field.id, value)}
                          readOnly={!canEditSection(section.sectionId)}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No hay campos en esta sección</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}