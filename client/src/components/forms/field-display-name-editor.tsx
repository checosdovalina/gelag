import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check } from "lucide-react";

interface FieldDisplayNameEditorProps {
  formId: number;
  fieldId: string;
  currentDisplayName: string;
  fieldLabel: string;
  onUpdate: (fieldId: string, newDisplayName: string) => Promise<boolean>;
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
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  // Cuando cambie el currentDisplayName desde las props, actualizar el estado local
  useEffect(() => {
    setDisplayName(currentDisplayName || "");
  }, [currentDisplayName]);

  // Reset success state after a short delay
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        setIsSuccess(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess]);

  const handleSave = async () => {
    if (displayName.trim() === "") {
      toast({
        title: "Campo vacío",
        description: "El nombre para reportes no puede estar vacío",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      console.log(`Actualizando campo ${fieldId} con nuevo displayName: "${displayName}"`);
      
      // Llamar al método onUpdate del componente padre y esperar su resultado
      const success = await onUpdate(fieldId, displayName);
      
      if (success) {
        setIsSuccess(true);
        toast({
          title: "Campo actualizado",
          description: "El nombre para reportes ha sido actualizado correctamente"
        });
      } else {
        throw new Error("No se pudo actualizar el campo");
      }
    } catch (error) {
      console.error("Error al actualizar campo:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al actualizar el campo",
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
          className={isSuccess ? "border-green-500" : ""}
        />
        <Button 
          type="button"
          onClick={handleSave}
          disabled={isLoading}
          size="sm"
          variant={isSuccess ? "outline" : "default"}
          className={isSuccess ? "border-green-500 text-green-600" : ""}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isSuccess ? (
            <Check className="h-4 w-4" />
          ) : (
            "Guardar"
          )}
        </Button>
      </div>
    </div>
  );
}