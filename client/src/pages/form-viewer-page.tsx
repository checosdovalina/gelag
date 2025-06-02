import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import SidebarLayout from "@/components/layout/sidebar-layout";
import FormViewer from "@/components/forms/form-viewer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FormViewerPageProps {
  params?: {
    templateId?: string;
    entryId?: string;
  };
}

export default function FormViewerPage({ params }: FormViewerPageProps) {
  const [_, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const templateId = params?.templateId;
  const entryId = params?.entryId;
  const isNew = !!templateId;

  // Cargar template del formulario
  const { data: formTemplate, isLoading: templateLoading } = useQuery({
    queryKey: [`/api/form-templates/${templateId || entryId}`],
    queryFn: async () => {
      const response = await fetch(`/api/form-templates/${templateId || entryId}`);
      if (!response.ok) {
        throw new Error('Error al cargar template');
      }
      return response.json();
    },
    enabled: !!(templateId || entryId)
  });

  // Cargar entrada existente si editamos
  const { data: existingEntry, isLoading: entryLoading } = useQuery({
    queryKey: [`/api/form-entries/${entryId}`],
    queryFn: async () => {
      const response = await fetch(`/api/form-entries/${entryId}`);
      if (!response.ok) {
        throw new Error('Error al cargar entrada');
      }
      return response.json();
    },
    enabled: !!entryId && !isNew
  });

  // Mutación para guardar
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = isNew ? '/api/form-entries' : `/api/form-entries/${entryId}`;
      const method = isNew ? 'POST' : 'PUT';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formTemplateId: isNew ? parseInt(templateId!) : existingEntry?.formTemplateId,
          data,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al guardar formulario');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Éxito",
        description: `Formulario ${isNew ? 'creado' : 'actualizado'} correctamente`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/form-entries'] });
      navigate('/forms');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      await saveMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExport = async () => {
    if (!entryId) return;
    
    try {
      const response = await fetch(`/api/form-entries/${entryId}/export`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Error al exportar formulario');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `formulario_${entryId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Éxito",
        description: "Formulario exportado correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al exportar el formulario",
        variant: "destructive",
      });
    }
  };

  const handleBack = () => {
    navigate('/forms');
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
          <CardContent className="flex justify-center items-center py-12">
            <p className="text-muted-foreground">Formulario no encontrado</p>
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
            <Button variant="outline" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {formTemplate.name}
              </h1>
              <p className="text-muted-foreground">
                {isNew ? 'Nuevo formulario' : 'Editando formulario'}
              </p>
            </div>
          </div>
        </div>

        <FormViewer
          formTemplate={formTemplate.structure}
          formTitle={formTemplate.name}
          formDescription={formTemplate.description}
          initialData={existingEntry?.data || {}}
          onSubmit={handleSubmit}
          onExport={!isNew ? handleExport : undefined}
          isLoading={isSubmitting || saveMutation.isPending}
          isReadOnly={false}
        />
      </div>
    </SidebarLayout>
  );
}