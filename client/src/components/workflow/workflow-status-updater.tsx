import React, { useState } from 'react';
import { FormEntry, FormWorkflowStatus, UserRole } from '@shared/schema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpCircle,
  Hourglass,
  ClipboardCheck,
  Lock,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface WorkflowStatusUpdaterProps {
  formEntry: FormEntry;
  onStatusUpdated: () => void;
}

export default function WorkflowStatusUpdater({ formEntry, onStatusUpdated }: WorkflowStatusUpdaterProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [lotNumber, setLotNumber] = useState(formEntry.lot_number || '');
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<FormWorkflowStatus | null>(null);

  // Mutation para actualizar el estado del flujo de trabajo
  const updateWorkflowMutation = useMutation({
    mutationFn: async ({ formId, status, lotNumber }: { formId: number, status: FormWorkflowStatus, lotNumber?: string }) => {
      const payload: { workflowStatus: FormWorkflowStatus, lotNumber?: string } = {
        workflowStatus: status
      };
      
      if (lotNumber) {
        payload.lotNumber = lotNumber;
      }
      
      const response = await apiRequest('PATCH', `/api/form-entries/${formId}/workflow`, payload);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar el flujo de trabajo');
      }
      return await response.json();
    },
    onSuccess: () => {
      // Cerrar el diálogo de confirmación
      setIsConfirmDialogOpen(false);
      
      // Mostrar mensaje de éxito
      toast({
        title: "Flujo actualizado",
        description: "El estado del flujo de trabajo ha sido actualizado correctamente",
      });
      
      // Actualizar la caché de formularios capturados
      queryClient.invalidateQueries({ queryKey: ["/api/form-entries"] });
      
      // Notificar al componente padre
      onStatusUpdated();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      
      setIsConfirmDialogOpen(false);
    }
  });
  
  // Obtener el siguiente estado posible según el rol del usuario y el estado actual
  const getNextPossibleStatuses = (): {status: FormWorkflowStatus, label: string, enabled: boolean}[] => {
    if (!user) return [];
    
    const currentStatus = formEntry.workflow_status as FormWorkflowStatus || FormWorkflowStatus.INITIATED;
    
    // Matriz de posibles transiciones según el rol
    const possibleTransitions: Record<UserRole, Record<FormWorkflowStatus, {status: FormWorkflowStatus, label: string}[]>> = {
      [UserRole.PRODUCTION_MANAGER]: {
        [FormWorkflowStatus.INITIATED]: [
          { status: FormWorkflowStatus.IN_PROGRESS, label: "Iniciar proceso (En progreso)" }
        ],
        [FormWorkflowStatus.IN_PROGRESS]: [
          { status: FormWorkflowStatus.PENDING_QUALITY, label: "Enviar a calidad" }
        ],
        [FormWorkflowStatus.PENDING_QUALITY]: [],
        [FormWorkflowStatus.COMPLETED]: [],
        [FormWorkflowStatus.SIGNED]: [],
        [FormWorkflowStatus.APPROVED]: [],
        [FormWorkflowStatus.REJECTED]: [],
      },
      [UserRole.PRODUCTION]: {
        [FormWorkflowStatus.INITIATED]: [],
        [FormWorkflowStatus.IN_PROGRESS]: [],
        [FormWorkflowStatus.PENDING_QUALITY]: [],
        [FormWorkflowStatus.COMPLETED]: [],
        [FormWorkflowStatus.SIGNED]: [],
        [FormWorkflowStatus.APPROVED]: [],
        [FormWorkflowStatus.REJECTED]: [],
      },
      [UserRole.QUALITY_MANAGER]: {
        [FormWorkflowStatus.INITIATED]: [],
        [FormWorkflowStatus.IN_PROGRESS]: [],
        [FormWorkflowStatus.PENDING_QUALITY]: [
          { status: FormWorkflowStatus.COMPLETED, label: "Marcar como completado" }
        ],
        [FormWorkflowStatus.COMPLETED]: [],
        [FormWorkflowStatus.SIGNED]: [],
        [FormWorkflowStatus.APPROVED]: [],
        [FormWorkflowStatus.REJECTED]: [],
      },
      [UserRole.QUALITY]: {
        [FormWorkflowStatus.INITIATED]: [],
        [FormWorkflowStatus.IN_PROGRESS]: [],
        [FormWorkflowStatus.PENDING_QUALITY]: [],
        [FormWorkflowStatus.COMPLETED]: [],
        [FormWorkflowStatus.SIGNED]: [],
        [FormWorkflowStatus.APPROVED]: [],
        [FormWorkflowStatus.REJECTED]: [],
      },
      [UserRole.ADMIN]: {
        [FormWorkflowStatus.INITIATED]: [
          { status: FormWorkflowStatus.IN_PROGRESS, label: "Marcar en progreso" },
          { status: FormWorkflowStatus.PENDING_QUALITY, label: "Enviar a calidad" },
          { status: FormWorkflowStatus.COMPLETED, label: "Marcar como completado" },
        ],
        [FormWorkflowStatus.IN_PROGRESS]: [
          { status: FormWorkflowStatus.PENDING_QUALITY, label: "Enviar a calidad" },
          { status: FormWorkflowStatus.COMPLETED, label: "Marcar como completado" },
        ],
        [FormWorkflowStatus.PENDING_QUALITY]: [
          { status: FormWorkflowStatus.COMPLETED, label: "Marcar como completado" },
          { status: FormWorkflowStatus.IN_PROGRESS, label: "Regresar a producción" },
        ],
        [FormWorkflowStatus.COMPLETED]: [
          { status: FormWorkflowStatus.SIGNED, label: "Firmar y aprobar" },
          { status: FormWorkflowStatus.PENDING_QUALITY, label: "Regresar a calidad" },
        ],
        [FormWorkflowStatus.SIGNED]: [],
        [FormWorkflowStatus.APPROVED]: [],
        [FormWorkflowStatus.REJECTED]: [],
      },
      [UserRole.SUPERADMIN]: {
        [FormWorkflowStatus.INITIATED]: [
          { status: FormWorkflowStatus.IN_PROGRESS, label: "Marcar en progreso" },
          { status: FormWorkflowStatus.PENDING_QUALITY, label: "Enviar a calidad" },
          { status: FormWorkflowStatus.COMPLETED, label: "Marcar como completado" },
        ],
        [FormWorkflowStatus.IN_PROGRESS]: [
          { status: FormWorkflowStatus.PENDING_QUALITY, label: "Enviar a calidad" },
          { status: FormWorkflowStatus.COMPLETED, label: "Marcar como completado" },
        ],
        [FormWorkflowStatus.PENDING_QUALITY]: [
          { status: FormWorkflowStatus.COMPLETED, label: "Marcar como completado" },
          { status: FormWorkflowStatus.IN_PROGRESS, label: "Regresar a producción" },
        ],
        [FormWorkflowStatus.COMPLETED]: [
          { status: FormWorkflowStatus.SIGNED, label: "Firmar y aprobar" },
          { status: FormWorkflowStatus.PENDING_QUALITY, label: "Regresar a calidad" },
        ],
        [FormWorkflowStatus.SIGNED]: [],
        [FormWorkflowStatus.APPROVED]: [],
        [FormWorkflowStatus.REJECTED]: [],
      },
      [UserRole.VIEWER]: {
        [FormWorkflowStatus.INITIATED]: [],
        [FormWorkflowStatus.IN_PROGRESS]: [],
        [FormWorkflowStatus.PENDING_QUALITY]: [],
        [FormWorkflowStatus.COMPLETED]: [],
        [FormWorkflowStatus.SIGNED]: [],
        [FormWorkflowStatus.APPROVED]: [],
        [FormWorkflowStatus.REJECTED]: [],
      },
    };
    
    // Verificar si el usuario es el creador del formulario
    const isCreator = formEntry.createdBy === user.id;
    
    // Si el usuario es el creador y el rol no tiene permisos específicos,
    // permitir transiciones básicas
    let transitions = possibleTransitions[user.role][currentStatus] || [];
    
    // Marcar todas las transiciones posibles como habilitadas o deshabilitadas
    return transitions.map(transition => ({
      ...transition,
      enabled: true
    }));
  };
  
  // Iniciar el proceso de actualización del flujo
  const handleUpdateWorkflow = (status: FormWorkflowStatus) => {
    setTargetStatus(status);
    
    // Si es transición a estado "en progreso" y no hay número de lote,
    // pedir el número de lote
    if (status === FormWorkflowStatus.IN_PROGRESS && !formEntry.lot_number) {
      setIsConfirmDialogOpen(true);
    } else {
      // Para otros estados, confirmar directamente
      setIsConfirmDialogOpen(true);
    }
  };
  
  // Confirmar la actualización del flujo
  const confirmWorkflowUpdate = () => {
    if (!targetStatus) return;
    
    // Si es transición a "en progreso" y se proporcionó un número de lote
    if (targetStatus === FormWorkflowStatus.IN_PROGRESS && lotNumber.trim()) {
      updateWorkflowMutation.mutate({
        formId: formEntry.id,
        status: targetStatus,
        lotNumber: lotNumber.trim()
      });
    } else {
      // Para otros estados, solo actualizar el estado
      updateWorkflowMutation.mutate({
        formId: formEntry.id,
        status: targetStatus
      });
    }
  };
  
  // Renderizar el icono apropiado según el estado del flujo
  const renderStatusIcon = (status: FormWorkflowStatus | string | null) => {
    switch(status) {
      case FormWorkflowStatus.INITIATED:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
      case FormWorkflowStatus.IN_PROGRESS:
        return <Hourglass className="h-5 w-5 text-blue-500" />;
      case FormWorkflowStatus.PENDING_QUALITY:
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      case FormWorkflowStatus.COMPLETED:
        return <ClipboardCheck className="h-5 w-5 text-green-500" />;
      case FormWorkflowStatus.SIGNED:
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case FormWorkflowStatus.APPROVED:
        return <CheckCircle className="h-5 w-5 text-green-700" />;
      case FormWorkflowStatus.REJECTED:
        return <Lock className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };
  
  // Obtener la etiqueta legible del estado
  const getStatusLabel = (status: FormWorkflowStatus | string | null) => {
    switch(status) {
      case FormWorkflowStatus.INITIATED:
        return "Iniciado";
      case FormWorkflowStatus.IN_PROGRESS:
        return "En progreso";
      case FormWorkflowStatus.PENDING_QUALITY:
        return "Pendiente de calidad";
      case FormWorkflowStatus.COMPLETED:
        return "Completado";
      case FormWorkflowStatus.SIGNED:
        return "Firmado";
      case FormWorkflowStatus.APPROVED:
        return "Aprobado";
      case FormWorkflowStatus.REJECTED:
        return "Rechazado";
      default:
        return "Desconocido";
    }
  };
  
  // Obtener la variante de badge según el estado
  const getStatusBadgeVariant = (status: FormWorkflowStatus | string | null) => {
    switch(status) {
      case FormWorkflowStatus.INITIATED:
        return "outline";
      case FormWorkflowStatus.IN_PROGRESS:
        return "secondary";
      case FormWorkflowStatus.PENDING_QUALITY:
        return "secondary"; // Con clase personalizada
      case FormWorkflowStatus.COMPLETED:
        return "default";
      case FormWorkflowStatus.SIGNED:
        return "success";
      case FormWorkflowStatus.APPROVED:
        return "success";
      case FormWorkflowStatus.REJECTED:
        return "destructive";
      default:
        return "outline";
    }
  };
  
  // Clase personalizada para estado "pendiente de calidad"
  const getCustomStatusClass = (status: FormWorkflowStatus | string | null) => {
    if (status === FormWorkflowStatus.PENDING_QUALITY) {
      return "bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300";
    }
    return "";
  };
  
  // Lista de posibles transiciones según el rol y estado actual
  const possibleTransitions = getNextPossibleStatuses();
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          {renderStatusIcon(formEntry.workflow_status)}
          <span>Estado del flujo de trabajo</span>
        </CardTitle>
        <CardDescription>
          {formEntry.lot_number && (
            <div className="text-sm mt-1">
              <span className="font-medium">Número de lote:</span> {formEntry.lot_number}
            </div>
          )}
          {formEntry.lastUpdatedBy && (
            <div className="text-sm mt-1">
              <span className="font-medium">Última actualización:</span> {format(new Date(formEntry.updatedAt || formEntry.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
            </div>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Estado actual:</span>
            <Badge 
              variant={getStatusBadgeVariant(formEntry.workflow_status) as any} 
              className={getCustomStatusClass(formEntry.workflow_status)}
            >
              {getStatusLabel(formEntry.workflow_status)}
            </Badge>
          </div>
          
          {possibleTransitions.length > 0 && (
            <div className="border-t pt-4 mt-4">
              <h4 className="text-sm font-medium mb-2">Acciones disponibles:</h4>
              <div className="flex flex-wrap gap-2">
                {possibleTransitions.map((transition) => (
                  <Button
                    key={transition.status}
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdateWorkflow(transition.status)}
                    disabled={!transition.enabled || updateWorkflowMutation.isPending}
                    className="flex items-center"
                  >
                    <span>{transition.label}</span>
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Diálogo de confirmación para cambio de estado */}
        <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Confirmar cambio de estado</DialogTitle>
              <DialogDescription>
                {targetStatus === FormWorkflowStatus.IN_PROGRESS && !formEntry.lot_number ? (
                  "Se requiere un número de lote para iniciar el proceso."
                ) : (
                  `¿Está seguro que desea cambiar el estado a "${getStatusLabel(targetStatus)}"?`
                )}
              </DialogDescription>
            </DialogHeader>
            
            {targetStatus === FormWorkflowStatus.IN_PROGRESS && !formEntry.lot_number && (
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="lotNumber">Número de lote</Label>
                  <Input
                    id="lotNumber"
                    placeholder="Ej. L12345"
                    value={lotNumber}
                    onChange={(e) => setLotNumber(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
            )}
            
            <DialogFooter className="sm:justify-end">
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancelar
                </Button>
              </DialogClose>
              <Button
                type="button"
                onClick={confirmWorkflowUpdate}
                disabled={updateWorkflowMutation.isPending || (targetStatus === FormWorkflowStatus.IN_PROGRESS && !lotNumber.trim())}
              >
                {updateWorkflowMutation.isPending ? "Actualizando..." : "Confirmar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}