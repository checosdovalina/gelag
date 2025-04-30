import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { FormStructure, formStructureSchema } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save } from "lucide-react";
import MainLayout from "@/layouts/main-layout";
import FormBuilder from "@/components/forms/form-builder";
import FormViewer from "@/components/forms/form-viewer";

// Define la interfaz para el formulario
interface FormTemplate {
  id: number;
  name: string;
  description: string;
  department: string;
  structure: FormStructure;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

// Form metadata schema
const formMetadataSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  department: z.string().min(1, "El departamento es requerido"),
});

export default function FormEditor() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("metadata");
  const [formId, setFormId] = useState<number | null>(null);
  const [formStructure, setFormStructure] = useState<FormStructure | null>(null);
  const [isNewForm, setIsNewForm] = useState(true);

  // Parse query parameters
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const id = queryParams.get("id");
    if (id) {
      setFormId(parseInt(id));
      setIsNewForm(false);
    }
  }, []);

  // Form for metadata
  const form = useForm<z.infer<typeof formMetadataSchema>>({
    resolver: zodResolver(formMetadataSchema),
    defaultValues: {
      name: "",
      description: "",
      department: "",
    },
  });

  // Fetch form data if editing an existing form
  const { data: formData, isLoading: isLoadingForm, error } = useQuery<FormTemplate>({
    queryKey: [`/api/form-templates/${formId}`],
    enabled: formId !== null,
  });
  
  // Log errors for debugging purposes
  useEffect(() => {
    if (error) {
      console.error("Error fetching form template:", error);
      toast({
        title: "Error al cargar el formulario",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Update form fields when data is loaded
  useEffect(() => {
    if (formData) {
      form.reset({
        name: formData.name,
        description: formData.description || "",
        department: formData.department || "",
      });
      setFormStructure(formData.structure);
    }
  }, [formData, form]);

  // Create form template mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/form-templates", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Formulario creado",
        description: "El formulario ha sido creado exitosamente",
      });
      // Invalidar la caché de consultas para asegurar que se muestran todos los formularios
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
      // Forzar la recarga de datos antes de navegar
      queryClient.refetchQueries({ queryKey: ["/api/form-templates"] });
      // Redirigir a la página de formularios después de un breve retraso para permitir la recarga
      setTimeout(() => {
        setLocation("/forms");
      }, 500);
    },
    onError: (error: Error) => {
      toast({
        title: "Error al crear el formulario",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update form template mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", `/api/form-templates/${formId}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Formulario actualizado",
        description: "El formulario ha sido actualizado exitosamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
      queryClient.invalidateQueries({ queryKey: [`/api/form-templates/${formId}`] });
      // Forzar la recarga de datos antes de navegar
      queryClient.refetchQueries({ queryKey: ["/api/form-templates"] });
      // Redirigir después de un breve retraso para permitir la recarga
      setTimeout(() => {
        setLocation("/forms");
      }, 500);
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar el formulario",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle metadata form submission
  const onMetadataSubmit = (data: z.infer<typeof formMetadataSchema>) => {
    if (!formStructure) {
      setActiveTab("structure");
      toast({
        title: "Complete la estructura",
        description: "Por favor defina la estructura del formulario",
        variant: "destructive",
      });
      return;
    }

    const formTemplate = {
      ...data,
      structure: formStructure,
    };

    if (isNewForm) {
      createMutation.mutate(formTemplate);
    } else {
      updateMutation.mutate(formTemplate);
    }
  };

  // Handle form structure save
  const handleStructureSave = (structureData: FormStructure) => {
    setFormStructure(structureData);
    setActiveTab("preview");
    toast({
      title: "Estructura guardada",
      description: "La estructura del formulario ha sido guardada",
    });
  };

  // Loading state
  if (formId && isLoadingForm) {
    return (
      <MainLayout title="Cargando formulario...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={isNewForm ? "Crear Formulario" : "Editar Formulario"}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => setLocation("/forms")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Formularios
          </Button>
          <Button
            onClick={form.handleSubmit(onMetadataSubmit)}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            <Save className="mr-2 h-4 w-4" />
            {createMutation.isPending || updateMutation.isPending
              ? "Guardando..."
              : "Guardar Formulario"}
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="metadata">Metadatos</TabsTrigger>
            <TabsTrigger value="structure">Estructura</TabsTrigger>
            <TabsTrigger value="preview" disabled={!formStructure}>
              Vista Previa
            </TabsTrigger>
          </TabsList>

          {/* Metadata Tab */}
          <TabsContent value="metadata">
            <Card>
              <CardHeader>
                <CardTitle>Información del Formulario</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form className="space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre del Formulario</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Control de Calidad" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Departamento</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccione un departamento" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Producción">Producción</SelectItem>
                              <SelectItem value="Calidad">Calidad</SelectItem>
                              <SelectItem value="Administración">Administración</SelectItem>
                              <SelectItem value="Logística">Logística</SelectItem>
                              <SelectItem value="Recursos Humanos">Recursos Humanos</SelectItem>
                              <SelectItem value="Ventas">Ventas</SelectItem>
                              <SelectItem value="Otro">Otro</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descripción</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Descripción detallada del propósito del formulario"
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        onClick={() => setActiveTab("structure")}
                      >
                        Continuar
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Structure Tab */}
          <TabsContent value="structure">
            <Card>
              <CardHeader>
                <CardTitle>Estructura del Formulario</CardTitle>
              </CardHeader>
              <CardContent>
                <FormBuilder
                  initialFormData={formStructure || undefined}
                  onSave={handleStructureSave}
                  isLoading={false}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview">
            {formStructure && (
              <Card>
                <CardHeader>
                  <CardTitle>Vista Previa</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormViewer
                    formTemplate={formStructure}
                    onSubmit={() => {}}
                    isReadOnly={true}
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
