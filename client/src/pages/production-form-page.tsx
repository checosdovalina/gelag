import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import ProductionForm from "@/components/process-forms/production-form";
import { ProductionFormStatus } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useProductionForm, useProductionForms } from "@/hooks/use-production-form";
import SidebarLayout from "@/components/layout/sidebar-layout";

// Datos iniciales para un nuevo formulario
const DEFAULT_FORM_DATA = {
  productId: "conito",
  liters: 500,
  date: new Date().toISOString().split('T')[0],
  responsible: "",
  status: ProductionFormStatus.DRAFT,
  lotNumber: "", // Añadimos el campo para número de lote
};

export default function ProductionFormPage() {
  const [_, setLocation] = useLocation();
  const [match, params] = useRoute("/production-form/:id");
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Estado para el formulario que se está editando
  const [formData, setFormData] = useState<any>(DEFAULT_FORM_DATA);
  const [isNewForm, setIsNewForm] = useState(true);
  
  // Hooks para interactuar con los formularios
  const { form, isLoading: isLoadingForm, updateFormMutation } = useProductionForm(
    match && params?.id ? parseInt(params.id) : undefined
  );
  const { createFormMutation } = useProductionForms();
  
  // Cargar datos si estamos editando un formulario existente
  useEffect(() => {
    if (form && match && !isLoadingForm) {
      // Solo cargar datos del servidor la primera vez o si no hay datos locales
      setFormData(prevData => {
        // Si los datos actuales son solo los datos por defecto, cargar desde el servidor
        if (JSON.stringify(prevData) === JSON.stringify(DEFAULT_FORM_DATA) || 
            !prevData.id) {
          return form;
        }
        // Si ya hay datos modificados localmente, mantenerlos
        return prevData;
      });
      setIsNewForm(false);
    } else if (user && !match) {
      // Si es un nuevo formulario, agregar el nombre del usuario actual como responsable
      setFormData(prevData => ({
        ...prevData,
        responsible: user.name || user.username
      }));
      setIsNewForm(true);
    }
  }, [form, match, user, isLoadingForm]);
  
  // Manejar guardado del formulario
  const handleSave = async (data: any) => {
    try {
      if (isNewForm) {
        // Crear nuevo formulario
        await createFormMutation.mutateAsync({
          ...data,
          createdBy: user?.id
        });
        
        // Después de crear, redirigir a la lista de formularios
        toast({
          title: "Formulario creado",
          description: "El formulario ha sido creado correctamente"
        });
        
        // Opcional: redirigir después de un tiempo
        setTimeout(() => {
          setLocation("/process-forms");
        }, 1500);
      } else {
        // Actualizar formulario existente
        if (match && params?.id) {
          await updateFormMutation.mutateAsync(data);
          // Actualizar el estado local con los datos guardados
          setFormData(data);
        }
      }
    } catch (error) {
      console.error("Error al guardar el formulario:", error);
    }
  };
  
  // Mostrar cargando si estamos obteniendo un formulario existente
  if (match && isLoadingForm) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <SidebarLayout title={isNewForm ? "Nuevo Formulario de Producción" : `Formulario de Producción - ${form?.folio || ''}`}>
      <div className="space-y-6">
        <Button
          variant="outline"
          onClick={() => setLocation("/process-forms")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Formularios de Proceso
        </Button>
        
        <Card className="mb-8">
          <CardHeader className="bg-muted">
            <CardTitle>
              {isNewForm ? "Nuevo Formulario de Producción" : `Formulario de Producción - ${form?.folio || ''}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="mb-6 text-muted-foreground">
              Este formulario de producción permite a diferentes usuarios
              (Gerente de Producción, Operador y Gerente de Calidad) completar distintas secciones del 
              formulario según sus roles, sin interferir con el trabajo ya realizado por otros.
            </p>
            
            <div className="p-4 border rounded-md mb-6 space-y-2">
              <p className="font-medium">Instrucciones:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>El <span className="text-yellow-600 font-medium">Gerente de Producción</span> completa la información general y materias primas (secciones amarillas)</li>
                <li>El <span className="text-green-600 font-medium">Operador</span> registra el seguimiento del proceso, la verificación de calidad y el destino del producto (secciones verdes)</li>
                <li>El <span className="text-blue-600 font-medium">Gerente de Calidad</span> completa los datos de liberación (secciones azules)</li>
              </ul>
            </div>
            
            <ProductionForm
              initialData={formData}
              onSave={handleSave}
              readOnly={createFormMutation.isPending || updateFormMutation.isPending}
            />
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}