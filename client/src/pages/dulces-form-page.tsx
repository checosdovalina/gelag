import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import SidebarLayout from "@/components/layout/sidebar-layout";
import FormViewer from "@/components/forms/form-viewer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

interface DulcesFormPageProps {
  params?: {
    entryId?: string;
  };
}

export default function DulcesFormPage({ params }: DulcesFormPageProps) {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const entryId = params?.entryId;
  const isNew = !entryId || entryId === 'new';
  
  console.log('[DULCES-FORM] entryId:', entryId);
  console.log('[DULCES-FORM] isNew:', isNew);

  // Cargar el template del formulario de dulces (ID 19)
  const { data: formTemplate, isLoading: templateLoading } = useQuery({
    queryKey: ['/api/form-templates/19'],
    queryFn: async () => {
      const response = await fetch('/api/form-templates/19');
      if (!response.ok) {
        throw new Error('Error al cargar el template del formulario');
      }
      return response.json();
    }
  });

  // Cargar datos existentes si estamos editando
  const { data: existingEntry, isLoading: entryLoading } = useQuery({
    queryKey: ['/api/form-entries', entryId],
    queryFn: async () => {
      if (isNew) return null;
      console.log('[DULCES-FORM] Cargando datos para entryId:', entryId);
      const response = await fetch(`/api/form-entries/${entryId}`);
      if (!response.ok) {
        throw new Error('Error al cargar los datos del formulario');
      }
      const data = await response.json();
      console.log('[DULCES-FORM] Datos cargados del servidor:', data);
      return data;
    },
    enabled: !isNew
  });

  console.log('[DULCES-FORM] existingEntry después de la query:', existingEntry);
  console.log('[DULCES-FORM] existingEntry?.data:', existingEntry?.data);

  const saveMutation = useMutation({
    mutationFn: async (formData: any) => {
      const payload = {
        formTemplateId: 19,
        data: formData,
        createdBy: user?.username || 'unknown'
      };
      
      console.log('[DULCES-FORM] Enviando datos al servidor:', payload);

      const url = isNew ? '/api/form-entries' : `/api/form-entries/${entryId}`;
      const method = isNew ? 'POST' : 'PUT';
      
      const response = await apiRequest(method, url, payload);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Formulario guardado",
        description: `El formulario de dulces ${isNew ? 'ha sido creado' : 'ha sido actualizado'} exitosamente.`,
      });
      
      // Invalidar caché y navegar de vuelta
      queryClient.invalidateQueries({ queryKey: ['/api/form-entries'] });
      navigate('/process-forms');
    },
    onError: (error: any) => {
      toast({
        title: "Error al guardar",
        description: error.message || "No se pudo guardar el formulario",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = async (formData: any) => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await saveMutation.mutateAsync(formData);
    } catch (error) {
      console.error('Error al guardar:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExport = async (format: "pdf" | "excel") => {
    try {
      const response = await fetch(`/api/form-entries/${entryId}/export?format=${format}`, {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error(`Error al exportar: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dulces-form-${entryId}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Exportación exitosa",
        description: `El formulario ha sido exportado como ${format.toUpperCase()}`,
      });
    } catch (error: any) {
      toast({
        title: "Error al exportar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleBack = () => {
    navigate('/process-forms');
  };

  if (templateLoading || entryLoading) {
    return (
      <SidebarLayout>
        <Card>
          <CardContent className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2">Cargando formulario...</span>
          </CardContent>
        </Card>
      </SidebarLayout>
    );
  }

  if (!formTemplate) {
    return (
      <SidebarLayout>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No se pudo cargar el template del formulario de dulces.</p>
            <Button variant="outline" onClick={handleBack} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </CardContent>
        </Card>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {isNew ? 'Nuevo ' : 'Editar '}Formulario de Dulces
              </h1>
              <p className="text-muted-foreground">
                PR-PR-02 Ficha técnica producción de dulces
              </p>
            </div>
          </div>
        </div>

        <FormViewer
          formTemplate={formTemplate.structure}
          formTitle={formTemplate.name}
          formDescription={formTemplate.description}
          initialData={existingEntry?.data || {
            mp_table: [
              {"mp": "Cajeta", "kilos": "", "paq": "", "lote": "", "merma": ""},
              {"mp": "", "kilos": "", "paq": "", "lote": "", "merma": ""},
              {"mp": "", "kilos": "", "paq": "", "lote": "", "merma": ""},
              {"mp": "", "kilos": "", "paq": "", "lote": "", "merma": ""},
              {"mp": "", "kilos": "", "paq": "", "lote": "", "merma": ""},
              {"mp": "", "kilos": "", "paq": "", "lote": "", "merma": ""},
              {"mp": "", "kilos": "", "paq": "", "lote": "", "merma": ""},
              {"mp": "", "kilos": "", "paq": "", "lote": "", "merma": ""}
            ],
            muestreo_table: [
              {"hora": "PT", "h8": "", "h9": "", "h10": "", "h11": "", "h12": "", "h13": "", "h14": "", "h15": "", "h16": "", "h17": ""},
              {"hora": "Muestreo", "h8": "", "h9": "", "h10": "", "h11": "", "h12": "", "h13": "", "h14": "", "h15": "", "h16": "", "h17": ""},
              {"hora": "Merma", "h8": "", "h9": "", "h10": "", "h11": "", "h12": "", "h13": "", "h14": "", "h15": "", "h16": "", "h17": ""}
            ],
            revision_table: [
              {"hora": "Empaque", "h8": "", "h9": "", "h10": "", "h11": "", "h12": "", "h13": "", "h14": "", "h15": "", "h16": "", "h17": ""},
              {"hora": "Etiquetado", "h8": "", "h9": "", "h10": "", "h11": "", "h12": "", "h13": "", "h14": "", "h15": "", "h16": "", "h17": ""},
              {"hora": "Sellado", "h8": "", "h9": "", "h10": "", "h11": "", "h12": "", "h13": "", "h14": "", "h15": "", "h16": "", "h17": ""},
              {"hora": "Sin chorrear", "h8": "", "h9": "", "h10": "", "h11": "", "h12": "", "h13": "", "h14": "", "h15": "", "h16": "", "h17": ""},
              {"hora": "Loteado", "h8": "", "h9": "", "h10": "", "h11": "", "h12": "", "h13": "", "h14": "", "h15": "", "h16": "", "h17": ""},
              {"hora": "Peso promedio 9 a 11 g", "h8": "", "h9": "", "h10": "", "h11": "", "h12": "", "h13": "", "h14": "", "h15": "", "h16": "", "h17": ""}
            ]
          }}
          onSubmit={handleSubmit}
          onExport={!isNew ? handleExport : undefined}
          isLoading={isSubmitting || saveMutation.isPending}
          isReadOnly={false}
        />
      </div>
    </SidebarLayout>
  );
}