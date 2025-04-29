import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import MainLayout from "@/layouts/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus } from "lucide-react";
import FormViewer from "@/components/forms/form-viewer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface FormTemplate {
  id: number;
  name: string;
  description: string;
  department: string;
  structure: any;
}

interface FormEntry {
  id: number;
  formTemplateId: number;
  data: any;
  createdBy: number;
  createdAt: string;
  department: string;
}

export default function FormCapture() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [currentEntry, setCurrentEntry] = useState<FormEntry | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [tabValue, setTabValue] = useState("templates");
  const [confirmDialog, setConfirmDialog] = useState(false);

  // Fetch form templates
  const { data: templates, isLoading: isLoadingTemplates } = useQuery<FormTemplate[]>({
    queryKey: ["/api/form-templates", { department: departmentFilter }],
    enabled: !!user,
  });

  // Fetch completed forms by user
  const { data: entries, isLoading: isLoadingEntries } = useQuery<FormEntry[]>({
    queryKey: ["/api/form-entries", { userId: user?.id }],
    enabled: !!user,
  });

  // Create form entry mutation
  const createEntryMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/form-entries", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Datos guardados",
        description: "Los datos del formulario han sido guardados exitosamente",
      });
      setIsFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/form-entries"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al guardar datos",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter templates based on search and department
  const filteredTemplates = templates
    ? templates.filter(
        (template) =>
          template.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          (departmentFilter
            ? template.department === departmentFilter
            : true)
      )
    : [];

  // Get unique departments from templates
  const departments = templates
    ? Array.from(new Set(templates.map((template) => template.department)))
    : [];

  // Handle template selection
  const handleSelectTemplate = (template: FormTemplate) => {
    setSelectedTemplate(template);
    setIsFormOpen(true);
  };

  // Handle form submission
  const handleFormSubmit = (data: any) => {
    if (!selectedTemplate) return;

    const formEntry = {
      formTemplateId: selectedTemplate.id,
      data: data,
      department: selectedTemplate.department,
    };

    setConfirmDialog(true);
    setCurrentEntry({
      ...formEntry,
      id: 0,
      createdBy: user!.id,
      createdAt: new Date().toISOString(),
    });
  };

  // Handle confirmation
  const handleConfirmSubmit = () => {
    if (currentEntry) {
      createEntryMutation.mutate(currentEntry);
    }
    setConfirmDialog(false);
  };

  // Handle view entry
  const handleViewEntry = (entry: FormEntry) => {
    // Find the template for this entry
    const template = templates?.find(t => t.id === entry.formTemplateId);
    if (template) {
      setSelectedTemplate(template);
      setCurrentEntry(entry);
      setIsFormOpen(true);
    } else {
      toast({
        title: "Error",
        description: "No se pudo encontrar la plantilla para esta entrada",
        variant: "destructive",
      });
    }
  };

  return (
    <MainLayout title="Capturar Datos">
      <div className="space-y-6">
        <Tabs value={tabValue} onValueChange={setTabValue}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="templates">Formularios Disponibles</TabsTrigger>
            <TabsTrigger value="entries">Mis Entradas</TabsTrigger>
          </TabsList>
          
          {/* Templates Tab */}
          <TabsContent value="templates">
            <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-neutral-400" />
                <Input
                  placeholder="Buscar formularios..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-full sm:w-60">
                  <SelectValue placeholder="Todos los departamentos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los departamentos</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isLoadingTemplates ? (
                Array(6)
                  .fill(0)
                  .map((_, index) => (
                    <Card key={index} className="animate-pulse">
                      <CardHeader className="pb-2">
                        <div className="h-6 bg-neutral-100 rounded w-3/4"></div>
                      </CardHeader>
                      <CardContent>
                        <div className="h-4 bg-neutral-100 rounded w-full mb-2"></div>
                        <div className="h-4 bg-neutral-100 rounded w-2/3"></div>
                        <div className="flex justify-end mt-4">
                          <div className="h-9 bg-neutral-100 rounded w-28"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
              ) : filteredTemplates.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                  <Search className="h-12 w-12 text-neutral-300 mb-2" />
                  <h3 className="text-lg font-medium">No se encontraron formularios</h3>
                  <p className="text-neutral-500 mt-1">
                    Intente con otra búsqueda o departamento
                  </p>
                </div>
              ) : (
                filteredTemplates.map((template) => (
                  <Card key={template.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-neutral-500 mb-2 line-clamp-2">
                        {template.description || "Sin descripción"}
                      </p>
                      <p className="text-xs text-neutral-400 mb-4">
                        Departamento: {template.department}
                      </p>
                      <div className="flex justify-end">
                        <Button onClick={() => handleSelectTemplate(template)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Completar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
          
          {/* Entries Tab */}
          <TabsContent value="entries">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isLoadingEntries ? (
                Array(6)
                  .fill(0)
                  .map((_, index) => (
                    <Card key={index} className="animate-pulse">
                      <CardHeader className="pb-2">
                        <div className="h-6 bg-neutral-100 rounded w-3/4"></div>
                      </CardHeader>
                      <CardContent>
                        <div className="h-4 bg-neutral-100 rounded w-full mb-2"></div>
                        <div className="h-4 bg-neutral-100 rounded w-2/3"></div>
                        <div className="flex justify-end mt-4">
                          <div className="h-9 bg-neutral-100 rounded w-28"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
              ) : !entries || entries.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-neutral-100 p-3 mb-3">
                    <Search className="h-8 w-8 text-neutral-400" />
                  </div>
                  <h3 className="text-lg font-medium">No hay entradas de formularios</h3>
                  <p className="text-neutral-500 mt-1">
                    Complete algún formulario para ver sus entradas aquí
                  </p>
                  <Button 
                    className="mt-4"
                    onClick={() => setTabValue("templates")}
                  >
                    Ir a Formularios
                  </Button>
                </div>
              ) : (
                entries.map((entry) => {
                  // Find template for this entry
                  const template = templates?.find(t => t.id === entry.formTemplateId);
                  return (
                    <Card key={entry.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">
                          {template?.name || `Formulario #${entry.formTemplateId}`}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-neutral-400 mb-1">
                          Departamento: {entry.department}
                        </p>
                        <p className="text-xs text-neutral-400 mb-4">
                          Fecha: {new Date(entry.createdAt).toLocaleDateString('es-ES')}
                        </p>
                        <div className="flex justify-end">
                          <Button variant="outline" onClick={() => handleViewEntry(entry)}>
                            Ver Entrada
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Form Dialog */}
      {selectedTemplate && (
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{selectedTemplate.name}</DialogTitle>
              <DialogDescription>
                {selectedTemplate.description}
              </DialogDescription>
            </DialogHeader>
            
            <div className="max-h-[70vh] overflow-y-auto py-4">
              <FormViewer
                formTemplate={selectedTemplate.structure}
                initialData={currentEntry?.data}
                onSubmit={handleFormSubmit}
                isReadOnly={!!currentEntry}
                isLoading={createEntryMutation.isPending}
              />
            </div>
            
            {currentEntry && (
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsFormOpen(false)}>
                  Cerrar
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      )}
      
      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar envío</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de que desea enviar este formulario? Una vez enviado, no podrá ser modificado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSubmit}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
