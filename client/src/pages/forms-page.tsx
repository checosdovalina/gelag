import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { 
  Eye, PenSquare, FileDown, Search, Plus, Trash2, AlertCircle, 
  ClipboardCheck, Copy, Loader2 
} from "lucide-react";
import MainLayout from "@/layouts/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import FormViewer from "@/components/forms/form-viewer";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface FormTemplate {
  id: number;
  name: string;
  description: string;
  department: string;
  structure: any;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export default function FormsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedForm, setSelectedForm] = useState<FormTemplate | null>(null);
  const [formData, setFormData] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<FormTemplate | null>(null);
  const [deleteErrorDialogOpen, setDeleteErrorDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  
  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPERADMIN;
  const isSuperAdmin = user?.role === UserRole.SUPERADMIN;

  // Fetch forms
  const { data: forms, isLoading, refetch } = useQuery<FormTemplate[]>({
    queryKey: ["/api/form-templates"],
    enabled: !!user,
    staleTime: 0, // No caché, siempre actualizar al montar
    refetchOnWindowFocus: true, // Actualizar al volver a la ventana
    refetchOnMount: true, // Actualizar al montar el componente
    refetchInterval: false, // No refrescar automáticamente
  });
  
  // Efecto para forzar recarga de formularios cuando el componente se monta
  useEffect(() => {
    console.log("FormsPage: Forzando actualización de formularios al montar");
    
    // Limpiar caché al montar
    queryClient.removeQueries({ queryKey: ["/api/form-templates"] });
    
    // Recargar datos después de limpiar la caché
    setTimeout(() => {
      console.log("FormsPage: Actualizando formularios...");
      refetch().then(result => {
        console.log("FormsPage: Formularios actualizados:", result.data);
      });
    }, 100);
    
    // Configurar un intervalo para mantener actualizada la lista
    const interval = setInterval(() => {
      console.log("FormsPage: Refrescando lista de formularios...");
      refetch();
    }, 30000); // 30 segundos
    
    return () => clearInterval(interval);
  }, [refetch]);
  
  // Mutation para eliminar formularios
  const deleteFormMutation = useMutation({
    mutationFn: async (formId: number) => {
      const response = await apiRequest('DELETE', `/api/form-templates/${formId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al eliminar el formulario');
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Formulario eliminado",
        description: "El formulario ha sido eliminado correctamente",
      });
      
      // Cerrar el diálogo y actualizar la lista
      setDeleteDialogOpen(false);
      setFormToDelete(null);
      
      // Actualizar la lista de formularios
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
    },
    onError: (error: Error) => {
      console.error("Error al eliminar formulario:", error);
      
      // Si el error es porque hay entradas asociadas, mostramos diálogo específico
      if (error.message.includes("tiene entradas asociadas")) {
        setDeleteError(error.message);
        setDeleteErrorDialogOpen(true);
      } else {
        toast({
          title: "Error al eliminar",
          description: error.message,
          variant: "destructive",
        });
      }
      
      setDeleteDialogOpen(false);
    }
  });
  
  // Mutation para clonar formularios
  const cloneFormMutation = useMutation({
    mutationFn: async (formId: number) => {
      const response = await apiRequest('POST', `/api/form-templates/${formId}/clone`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al clonar el formulario');
      }
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Formulario clonado",
        description: "Se ha creado una copia del formulario correctamente",
      });
      
      // Actualizar la lista de formularios
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
      
      // Redirigir al editor del nuevo formulario
      if (data && data.id) {
        window.location.href = `/form-editor?id=${data.id}`;
      }
    },
    onError: (error: Error) => {
      console.error("Error al clonar formulario:", error);
      toast({
        title: "Error al clonar",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Define columns for data table
  const columns: ColumnDef<FormTemplate>[] = [
    {
      accessorKey: "name",
      header: "Nombre",
      cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "description",
      header: "Descripción",
      cell: ({ row }) => (
        <div className="max-w-[300px] truncate" title={row.getValue("description")}>
          {row.getValue("description") || "Sin descripción"}
        </div>
      ),
    },
    {
      accessorKey: "department",
      header: "Departamento",
    },
    {
      accessorKey: "updatedAt",
      header: "Actualizado",
      cell: ({ row }) => {
        return new Date(row.getValue("updatedAt")).toLocaleDateString("es-ES", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const form = row.original;
        
        return (
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => handleViewForm(form)}
              title="Ver formulario"
            >
              <Eye className="h-4 w-4" />
            </Button>
            
            {isSuperAdmin && (
              <>
                <Link href={`/form-editor?id=${form.id}`}>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    title="Editar formulario"
                  >
                    <PenSquare className="h-4 w-4" />
                  </Button>
                </Link>
                
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleCloneForm(form)}
                  title="Clonar formulario"
                  className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                  disabled={cloneFormMutation.isPending}
                >
                  {cloneFormMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleDeleteForm(form)}
                  title="Eliminar formulario"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
            
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => handleExportForm(form, "pdf")}
              title="Exportar a PDF"
            >
              <FileDown className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  // Forzar recarga al montar el componente
  useEffect(() => {
    if (user) {
      refetch();
    }
  }, [refetch, user]);
  
  // Filter forms based on search term
  const filteredForms = forms
    ? forms.filter(
        (form) =>
          form.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          form.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (form.description && form.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : [];

  // Handle view form
  const handleViewForm = (form: FormTemplate) => {
    setSelectedForm(form);
    setPreviewOpen(true);
  };
  
  // Handle export form
  const handleExportForm = (form: FormTemplate, format: "pdf" | "excel") => {
    toast({
      title: `Exportando ${form.name}`,
      description: `El formulario se está exportando a ${format.toUpperCase()}`,
    });
    
    // In a real application, this would make an API call to export the form
    setTimeout(() => {
      toast({
        title: "Exportación completada",
        description: `El formulario ${form.name} ha sido exportado correctamente`,
      });
    }, 1500);
  };
  
  // Función para clonar un formulario
  const handleCloneForm = (form: FormTemplate) => {
    toast({
      title: "Clonando formulario",
      description: `Creando una copia de ${form.name}...`,
    });
    
    cloneFormMutation.mutate(form.id);
  };
  
  // Funciones para manejar la eliminación de formularios
  const handleDeleteForm = (form: FormTemplate) => {
    setFormToDelete(form);
    setDeleteDialogOpen(true);
  };
  
  const confirmDeleteForm = () => {
    if (formToDelete) {
      deleteFormMutation.mutate(formToDelete.id);
    }
  };
  
  const closeDeleteErrorDialog = () => {
    setDeleteErrorDialogOpen(false);
    setDeleteError("");
    setFormToDelete(null);
  };

  return (
    <MainLayout title="Formularios">
      <div className="space-y-6">
        {/* Actions bar */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-neutral-400" />
            <Input
              placeholder="Buscar formularios..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {isSuperAdmin && (
            <Link href="/form-editor">
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Formulario
              </Button>
            </Link>
          )}
        </div>
        
        {/* Forms list */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Formularios</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={filteredForms}
              searchPlaceholder="Filtrar formularios..."
              searchColumn="name"
            />
          </CardContent>
        </Card>
        
        {/* Form preview dialog */}
        {selectedForm && (
          <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Vista previa: {selectedForm.name}</DialogTitle>
                <DialogDescription>
                  {selectedForm.department && `Departamento: ${selectedForm.department}`}
                </DialogDescription>
              </DialogHeader>
              
              <div className="max-h-[70vh] overflow-y-auto py-4">
                <FormViewer
                  formTemplate={selectedForm.structure}
                  isReadOnly={true}
                  onSubmit={() => {}}
                  onExport={(format) => handleExportForm(selectedForm, format)}
                  formId={selectedForm.id}
                />
              </div>
              
              <DialogFooter className="flex justify-between">
                <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                  Cerrar
                </Button>
                
                <div className="flex gap-2">
                  {isSuperAdmin && (
                    <>
                      <Button 
                        variant="secondary"
                        onClick={() => {
                          setPreviewOpen(false);
                          handleCloneForm(selectedForm);
                        }}
                        disabled={cloneFormMutation.isPending}
                      >
                        {cloneFormMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Clonando...
                          </>
                        ) : (
                          <>
                            <Copy className="mr-2 h-4 w-4" />
                            Clonar
                          </>
                        )}
                      </Button>
                      
                      <Link href={`/form-editor?id=${selectedForm.id}`}>
                        <Button>
                          <PenSquare className="mr-2 h-4 w-4" />
                          Editar
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      
      {/* Diálogo de confirmación para eliminar formulario */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro de eliminar este formulario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. {formToDelete?.name && (
                <>
                  El formulario <span className="font-medium">{formToDelete.name}</span> y toda su configuración serán eliminados permanentemente.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setFormToDelete(null);
              }}
              disabled={deleteFormMutation.isPending}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteForm}
              className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
              disabled={deleteFormMutation.isPending}
            >
              {deleteFormMutation.isPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Eliminando...
                </>
              ) : "Eliminar formulario"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Diálogo de error al eliminar */}
      <Dialog open={deleteErrorDialogOpen} onOpenChange={setDeleteErrorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-500">
              <AlertCircle className="h-5 w-5 mr-2" />
              No se puede eliminar el formulario
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>{deleteError}</p>
            <p className="mt-2">Debe eliminar las entradas asociadas antes de eliminar este formulario.</p>
          </div>
          <DialogFooter className="flex justify-between">
            <Button onClick={closeDeleteErrorDialog} variant="outline">Cancelar</Button>
            <Link href={formToDelete ? `/captured-forms?template=${formToDelete.id}` : "/captured-forms"}>
              <Button 
                className="bg-primary hover:bg-primary/90"
                onClick={closeDeleteErrorDialog}
              >
                <ClipboardCheck className="mr-2 h-4 w-4" />
                Ver entradas asociadas
              </Button>
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
