import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FormField } from "@shared/schema";

interface FieldDisplayNameEditorProps {
  formId: number;
  fieldId: string;
  currentDisplayName: string;
  fieldLabel: string;
  onUpdate: (fieldId: string, newDisplayName: string) => void;
}

export default function FieldDisplayNameEditor({
  formId,
  fieldId,
  currentDisplayName,
  fieldLabel,
  onUpdate
}: FieldDisplayNameEditorProps) {
  const [displayName, setDisplayName] = useState(currentDisplayName || "");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Cuando cambie el currentDisplayName desde las props, actualizar el estado local
  useEffect(() => {
    setDisplayName(currentDisplayName || "");
  }, [currentDisplayName]);

  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      // Hacer una petición directa para actualizar solo este campo específico
      const response = await apiRequest(
        "PATCH", 
        `/api/form-templates/${formId}/field/${fieldId}/display-name`,
        { displayName }
      );
      
      if (response.ok) {
        toast({
          title: "Campo actualizado",
          description: "El nombre para reportes ha sido actualizado correctamente"
        });
        
        // Notificar al componente padre sobre el cambio
        onUpdate(fieldId, displayName);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al actualizar el campo");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={`display-name-${fieldId}`}>Nombre para Reportes</Label>
      <div className="flex gap-2">
        <Input
          id={`display-name-${fieldId}`}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={fieldLabel}
          disabled={isLoading}
        />
        <Button 
          type="button"
          onClick={handleSave}
          disabled={isLoading}
          size="sm"
        >
          Guardar
        </Button>
      </div>
    </div>
  );
}