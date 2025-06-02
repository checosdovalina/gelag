import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit3, Trash2, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface FolioManagerProps {
  entryId: number;
  folioFields: Array<{
    id: string;
    label: string;
    value: string | number;
    editable: boolean;
  }>;
  onFolioUpdate: (fieldId: string, newValue: string) => void;
}

export default function FolioManager({ entryId, folioFields, onFolioUpdate }: FolioManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  // Verificar permisos para editar folios
  const canEditFolios = () => {
    if (!user) return false;
    return ['superadmin', 'gerente_calidad', 'gerente_produccion'].includes(user.role);
  };

  // Verificar permisos para eliminar folios
  const canDeleteFolios = () => {
    if (!user) return false;
    return ['superadmin', 'gerente_calidad'].includes(user.role);
  };

  // Mutación para actualizar folio
  const updateFolioMutation = useMutation({
    mutationFn: async ({ fieldId, folioValue }: { fieldId: string; folioValue: string }) => {
      const response = await apiRequest('PATCH', `/api/form-entries/${entryId}/folio`, {
        fieldId,
        folioValue
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Folio actualizado",
        description: "El folio se ha actualizado correctamente"
      });
      onFolioUpdate(editingField!, editValue);
      setEditingField(null);
      setEditValue("");
      queryClient.invalidateQueries({ queryKey: ['/api/form-entries'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `No se pudo actualizar el folio: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Mutación para eliminar folio
  const deleteFolioMutation = useMutation({
    mutationFn: async (fieldId: string) => {
      const response = await apiRequest('DELETE', `/api/form-entries/${entryId}/folio/${fieldId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Folio eliminado",
        description: "El folio se ha eliminado correctamente"
      });
      onFolioUpdate(editingField!, "");
      queryClient.invalidateQueries({ queryKey: ['/api/form-entries'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `No se pudo eliminar el folio: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const handleStartEdit = (fieldId: string, currentValue: string | number) => {
    setEditingField(fieldId);
    setEditValue(String(currentValue));
  };

  const handleSaveEdit = () => {
    if (editingField) {
      updateFolioMutation.mutate({
        fieldId: editingField,
        folioValue: editValue
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  const handleDeleteFolio = (fieldId: string) => {
    deleteFolioMutation.mutate(fieldId);
  };

  if (folioFields.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Gestión de Folios</span>
          <Badge variant="outline" className="text-xs">
            {user?.role}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {folioFields.map((field) => (
            <div key={field.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <span className="font-medium text-sm">{field.label}:</span>
                  
                  {editingField === field.id ? (
                    <div className="flex items-center space-x-2">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-48"
                        placeholder="Ingrese nuevo valor"
                      />
                      <Button
                        size="sm"
                        onClick={handleSaveEdit}
                        disabled={updateFolioMutation.isPending}
                      >
                        <Save className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3">
                      <span className="px-2 py-1 bg-muted rounded text-sm font-mono">
                        {field.value || "Sin asignar"}
                      </span>
                      
                      {field.editable && (
                        <Badge 
                          variant="secondary" 
                          className="text-xs"
                        >
                          Editable
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center space-x-2">
                {canEditFolios() && field.editable && editingField !== field.id && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStartEdit(field.id, field.value)}
                  >
                    <Edit3 className="h-3 w-3" />
                  </Button>
                )}

                {canDeleteFolios() && field.value && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={deleteFolioMutation.isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar folio?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción eliminará permanentemente el valor del folio "{field.label}".
                          Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteFolio(field.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Información de permisos */}
        <div className="mt-6 p-3 bg-muted rounded-lg">
          <h4 className="font-medium text-sm mb-2">Permisos de gestión de folios:</h4>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div>• Editar: Gerente de Producción, Gerente de Calidad, Super Admin</div>
            <div>• Eliminar: Gerente de Calidad, Super Admin</div>
            <div>• Tu rol actual: <span className="font-medium">{user?.role}</span></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}