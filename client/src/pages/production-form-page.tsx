import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import ProductionForm, { ProductionFormStatus } from "@/components/process-forms/production-form";
import { useToast } from "@/hooks/use-toast";

const DEMO_FORM_DATA = {
  productId: "conito",
  liters: 500,
  date: "2023-05-16",
  responsible: "ANGEL AM",
  folio: "A-6664",
  status: ProductionFormStatus.IN_PROGRESS
};

export default function ProductionFormPage() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [formData, setFormData] = useState(DEMO_FORM_DATA);
  
  const handleSave = (data: any) => {
    setFormData(data);
    toast({
      title: "Formulario guardado",
      description: "Los cambios han sido guardados correctamente"
    });
  };
  
  return (
    <div className="container py-6">
      <div className="space-y-6">
        <Button
          variant="outline"
          onClick={() => setLocation("/forms")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Formularios
        </Button>
        
        <Card className="mb-8">
          <CardHeader className="bg-muted">
            <CardTitle>Formulario de Producción - Vista de Demostración</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="mb-6 text-muted-foreground">
              Esta es una demostración de un formulario de producción que permite a diferentes usuarios
              (Gerente de Producción, Operador y Gerente de Calidad) completar distintas secciones del 
              formulario según sus roles, sin interferir con el trabajo ya realizado por otros.
            </p>
            
            <div className="p-4 border rounded-md mb-6 space-y-2">
              <p className="font-medium">Instrucciones de prueba:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>El <span className="text-yellow-600 font-medium">Gerente de Producción</span> completa la información general y materias primas (secciones amarillas)</li>
                <li>El <span className="text-green-600 font-medium">Operador</span> registra el seguimiento del proceso, la verificación de calidad y el destino del producto (secciones verdes)</li>
                <li>El <span className="text-blue-600 font-medium">Gerente de Calidad</span> completa los datos de liberación (secciones azules)</li>
              </ul>
            </div>
            
            <ProductionForm
              initialData={formData}
              onSave={handleSave}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}