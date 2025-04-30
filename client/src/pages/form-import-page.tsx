import { useLocation } from "wouter";
import { useEffect } from "react";
import { UserRole } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import MainLayout from "@/layouts/main-layout";
import FormImport from "@/components/forms/form-import";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export default function FormImportPage() {
  const [, setLocation] = useLocation();

  const handleImportComplete = (data: any) => {
    // Navegar a la página de formularios después de importar exitosamente
    setLocation("/forms");
  };

  return (
    <MainLayout title="Importar Formulario">
      <div className="mb-6 flex items-center">
        <Button
          variant="ghost"
          className="mr-2 h-8 w-8 p-0"
          onClick={() => setLocation("/forms")}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Volver</span>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Importar Formulario desde Excel</h1>
      </div>

      <div className="space-y-4">
        <p className="text-muted-foreground">
          Importa formularios existentes desde archivos Excel. El sistema analizará la estructura
          del archivo y creará automáticamente un formulario digital equivalente.
        </p>
        
        <FormImport onImportComplete={handleImportComplete} />
      </div>
    </MainLayout>
  );
}