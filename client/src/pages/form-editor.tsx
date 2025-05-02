import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { FormStructure, formStructureSchema, UserRole } from "@shared/schema";
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
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, Save, AlertTriangle } from "lucide-react";
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
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("metadata");
  const [formId, setFormId] = useState<number | null>(null);
  const [formStructure, setFormStructure] = useState<FormStructure | null>(null);
  const [isNewForm, setIsNewForm] = useState(true);
  
  // Verificar si el usuario tiene permisos para crear/editar formularios (solo SuperAdmin)
  useEffect(() => {
    if (user && user.role !== UserRole.SUPERADMIN) {
      toast({
        title: "Acceso restringido",
        description: "Solo los SuperAdministradores pueden crear o editar formularios.",
        variant: "destructive",
      });
      setLocation("/forms");
    }
  }, [user, setLocation, toast]);

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

  // Función para actualizar la vista previa cuando cambian los metadatos
  const updateFormPreview = () => {
    if (formStructure) {
      // Obtener los valores actuales del formulario
      const formValues = form.getValues();
      
      // Clonar la estructura actual y actualizar el título
      const updatedStructure = {
        ...formStructure,
        title: formValues.name || formStructure.title
      };
      
      // Forzar la actualización de la estructura para reflejar los cambios
      setFormStructure(updatedStructure);
      
      // Actualizar también en la vista previa si está activa
      console.log("Actualizando vista previa con nombre:", formValues.name);
    }
  };

  // Observar cambios en los campos de metadatos para actualizar la vista previa en tiempo real
  useEffect(() => {
    // Crear suscripción para detectar cambios en el formulario
    const subscription = form.watch(() => {
      // Solo actualizar la vista previa si estamos en esa pestaña
      if (activeTab === "preview") {
        updateFormPreview();
      }
    });
    
    // Limpiar suscripción al desmontar
    return () => subscription.unsubscribe();
  }, [form, activeTab, formStructure]);

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
    // Verificar que cada campo tenga displayName y displayOrder
    const processedFields = structureData.fields.map(field => {
      // Si no tiene displayName, usar el label
      let displayNameValue: string;
      if (!field.displayName && field.displayName !== '') {
        displayNameValue = String(field.label || '');
      } else {
        displayNameValue = String(field.displayName || '');
      }
      
      // Si no tiene displayOrder, asignar un valor por defecto
      const displayOrderValue = field.displayOrder !== undefined && field.displayOrder !== null
        ? Number(field.displayOrder)
        : 0;
      
      // Asegurarse de que todos los campos sean del tipo esperado
      return {
        ...field,
        displayName: displayNameValue,
        displayOrder: displayOrderValue
      };
    });
    
    // Actualizar los datos con los campos procesados
    const processedStructure = {
      ...structureData,
      fields: processedFields
    };
    
    console.log("Estructura procesada para guardar:", processedStructure);
    
    // Profundo log para debugging
    processedStructure.fields.forEach((field, index) => {
      console.log(`Campo #${index+1} - ID: ${field.id}`);
      console.log(`  Label: ${field.label}`);
      console.log(`  DisplayName: ${field.displayName}`);
      console.log(`  DisplayOrder: ${field.displayOrder}`);
    });
    
    // Usamos JSON.stringify para asegurarnos de que los campos se serialicen correctamente
    console.log('JSON de la estructura:', JSON.stringify(processedStructure, null, 2));
    
    setFormStructure(processedStructure);
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

        <Tabs value={activeTab} onValueChange={(tab) => {
          // Si estamos cambiando a la pestaña de vista previa, asegurarnos de que se actualicen los metadatos
          if (tab === "preview" && formStructure) {
            // Forzar actualización de la vista previa con los datos más recientes
            setFormStructure({...formStructure});
          }
          setActiveTab(tab);
        }}>
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
                        onClick={() => {
                          // Actualizar formStructure con los metadatos actuales antes de cambiar de pestaña
                          if (formStructure) {
                            // Clonar la estructura actual y actualizar título
                            const updatedStructure = {
                              ...formStructure,
                              title: form.getValues().name || formStructure.title
                            };
                            setFormStructure(updatedStructure);
                          }
                          setActiveTab("structure");
                        }}
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
                    formTitle={form.getValues().name}
                    formDescription={form.getValues().description}
                    formTemplate={formStructure}
                    onSubmit={() => {}}
                    isReadOnly={true}
                    formId={formId ? Number(formId) : undefined}
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
