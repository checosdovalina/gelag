import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import MainLayout from "@/layouts/main-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { 
  Search, 
  Download, 
  Eye, 
  CalendarIcon, 
  FileDown, 
  Filter, 
  UserCircle2,
  Trash2,
  AlertCircle,
  Settings
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { UserRole } from "@shared/schema";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import SignaturePad from "@/components/forms/signature-pad";
import { FieldsSelectorModal } from "@/components/fields-selector-modal";

interface FormEntry {
  id: number;
  formTemplateId: number;
  data: any;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  department: string;
  status: string;
  signature?: string;
  signedBy?: number;
  signedAt?: string;
  folioNumber?: string;
}

interface FormTemplate {
  id: number;
  name: string;
  description: string;
  department: string;
  structure: any;
}

interface User {
  id: number;
  name: string;
  username: string;
  department: string | null;
  role: string;
}

export default function CapturedFormsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [contentSearchTerm, setContentSearchTerm] = useState(""); // Término para buscar en el contenido
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [userFilter, setUserFilter] = useState<number | "all">("all");
  const [templateFilter, setTemplateFilter] = useState<number | "all">("all");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [selectedEntry, setSelectedEntry] = useState<FormEntry | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(true); // Mostrar filtros por defecto
  const [showAllFormsContent, setShowAllFormsContent] = useState(false); // Estado para mostrar todos los contenidos
  
  // Estados para el diálogo de eliminación
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<FormEntry | null>(null);
  
  // Estados para el selector de campos
  const [fieldSelectorOpen, setFieldSelectorOpen] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [fieldOrder, setFieldOrder] = useState<Record<string, number>>({});
  const [templateForFields, setTemplateForFields] = useState<FormTemplate | null>(null);
  const [entriesToExport, setEntriesToExport] = useState<FormEntry[]>([]);
  const [exportFormat, setExportFormat] = useState<"pdf" | "excel">("pdf");
  
  const isSuperAdmin = user?.role === UserRole.SUPERADMIN;
  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPERADMIN;
  
  // Fetch form entries
  const { data: entries, isLoading: isLoadingEntries, refetch: refetchEntries } = useQuery<FormEntry[]>({
    queryKey: ["/api/form-entries"],
    enabled: !!user,
  });
  
  // Fetch templates for filter and display
  const { data: templates } = useQuery<FormTemplate[]>({
    queryKey: ["/api/form-templates"],
    enabled: !!user,
  });
  
  // Fetch users for filter
  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: !!user,
  });
  
  // Mutation to update status (e.g., for signing)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ entryId, status, signature }: { entryId: number, status: string, signature?: string }) => {
      const response = await apiRequest("PATCH", `/api/form-entries/${entryId}/status`, { status, signature });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-entries"] });
      toast({
        title: "Formulario actualizado",
        description: "El estado del formulario ha sido actualizado correctamente."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `No se pudo actualizar el estado: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Mutation para eliminar formularios
  const deleteEntryMutation = useMutation({
    mutationFn: async (entryId: number) => {
      const response = await apiRequest('DELETE', `/api/form-entries/${entryId}`);
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
      setEntryToDelete(null);
      
      // Actualizar la lista de formularios
      queryClient.invalidateQueries({ queryKey: ["/api/form-entries"] });
    },
    onError: (error: Error) => {
      console.error("Error al eliminar formulario:", error);
      
      toast({
        title: "Error al eliminar",
        description: error.message,
        variant: "destructive",
      });
      
      setDeleteDialogOpen(false);
    }
  });
  
  // Load template details when a form entry is selected
  useEffect(() => {
    if (selectedEntry && templates) {
      const template = templates.find(t => t.id === selectedEntry.formTemplateId);
      if (template) {
        setSelectedTemplate(template);
      }
    }
  }, [selectedEntry, templates]);
  
  // Función auxiliar para buscar en el contenido del formulario
  const searchInFormContent = (entry: FormEntry, searchTerm: string): boolean => {
    if (!searchTerm || searchTerm === "") return true;
    
    const searchTermLower = searchTerm.toLowerCase();
    
    try {
      // Función recursiva para buscar en objetos anidados
      const searchInNestedObject = (obj: any): boolean => {
        if (!obj) return false;
        
        // Si es un array, buscar en cada elemento
        if (Array.isArray(obj)) {
          return obj.some(item => searchInNestedObject(item));
        }
        
        // Si es un objeto, buscar en cada propiedad
        if (typeof obj === 'object') {
          return Object.values(obj).some(value => searchInNestedObject(value));
        }
        
        // Para valores primitivos (string, number, etc.)
        return String(obj).toLowerCase().includes(searchTermLower);
      };
      
      // Comprobar si algún valor en los datos del formulario contiene el término de búsqueda
      return searchInNestedObject(entry.data);
    } catch (error) {
      console.error("Error al buscar en contenido del formulario:", error);
      return false;
    }
  };

  // Apply filters to entries
  const filteredEntries = entries
    ? entries.filter(entry => {
        // Text search (nombre del formulario)
        const hasSearchTerm = 
          searchTerm === "" || 
          (templates?.find(t => t.id === entry.formTemplateId)?.name.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
        
        // Content search (búsqueda en el contenido del formulario)
        const passesContentSearch = contentSearchTerm === "" || searchInFormContent(entry, contentSearchTerm);
        
        // Department filter
        const passesDepartmentFilter = 
          departmentFilter === "all" || 
          entry.department === departmentFilter;
        
        // Status filter
        const passesStatusFilter = 
          statusFilter === "all" || 
          entry.status === statusFilter;
        
        // User filter
        const passesUserFilter = 
          userFilter === "all" || 
          entry.createdBy === userFilter;
        
        // Template filter
        const passesTemplateFilter = 
          templateFilter === "all" || 
          entry.formTemplateId === templateFilter;
        
        // Date range filter
        let passesDateFilter = true;
        const entryDate = new Date(entry.createdAt);
        
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          passesDateFilter = passesDateFilter && entryDate >= start;
        }
        
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          passesDateFilter = passesDateFilter && entryDate <= end;
        }
        
        return hasSearchTerm && 
               passesContentSearch &&
               passesDepartmentFilter && 
               passesStatusFilter && 
               passesUserFilter && 
               passesTemplateFilter && 
               passesDateFilter;
      })
    : [];
  
  // View form details
  const handleViewForm = (entry: FormEntry) => {
    setSelectedEntry(entry);
    setDetailsOpen(true);
  };
  
  // Download form as PDF or Excel
  const handleExportForm = async (entry: FormEntry, format: "pdf" | "excel") => {
    try {
      toast({
        title: "Exportando formulario",
        description: `Preparando el formulario para descarga en formato ${format.toUpperCase()}.`
      });
      
      const response = await apiRequest(
        "GET",
        `/api/form-entries/${entry.id}/export?format=${format}`,
        null
      );
      
      // Create a URL for the blob response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Get the template name for filename
      const templateName = templates?.find(t => t.id === entry.formTemplateId)?.name || "formulario";
      
      // Create a temporary anchor element to trigger the download
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `${templateName}_${format === "pdf" ? "pdf" : "xlsx"}`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Exportación completada",
        description: "El formulario ha sido exportado correctamente."
      });
    } catch (error) {
      toast({
        title: "Error de exportación",
        description: "No se pudo exportar el formulario. Inténtelo de nuevo.",
        variant: "destructive"
      });
    }
  };
  
  // Sign form state
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [formToSign, setFormToSign] = useState<FormEntry | null>(null);
  
  // Sign a form
  const handleSignForm = (entry: FormEntry) => {
    setFormToSign(entry);
    setShowSignaturePad(true);
  };
  
  // Handle signature save
  const handleSaveSignature = (signatureDataUrl: string) => {
    if (formToSign) {
      updateStatusMutation.mutate({
        entryId: formToSign.id,
        status: "signed",
        signature: signatureDataUrl
      });
      
      setShowSignaturePad(false);
      setFormToSign(null);
    }
  };
  
  // Handle signature cancel
  const handleCancelSignature = () => {
    setShowSignaturePad(false);
    setFormToSign(null);
  };
  
  // Función para exportar datos consolidados de múltiples formularios
  const handleExportConsolidatedData = async (entries: FormEntry[]) => {
    try {
      if (entries.length === 0) {
        toast({
          title: "Sin datos",
          description: "No hay formularios para exportar",
          variant: "destructive"
        });
        return;
      }
      
      toast({
        title: "Preparando datos",
        description: "Generando vista homologada de formularios...",
      });
      
      // Agrupar los formularios por tipo (formTemplateId)
      const groupedByTemplate: Record<number, FormEntry[]> = {};
      
      entries.forEach(entry => {
        if (!groupedByTemplate[entry.formTemplateId]) {
          groupedByTemplate[entry.formTemplateId] = [];
        }
        groupedByTemplate[entry.formTemplateId].push(entry);
      });
      
      // Para cada tipo de formulario, crear un consolidado
      const promises = Object.entries(groupedByTemplate).map(async ([templateId, templateEntries]) => {
        const templateIdNum = parseInt(templateId);
        const templateName = getTemplateName(templateIdNum);
        
        // Preparar datos para la API
        const payload = {
          templateId: templateIdNum,
          entryIds: templateEntries.map(entry => entry.id),
          format: "pdf", // Puedes cambiar a "excel" si prefieres Excel
          fileName: `Consolidado_${templateName.replace(/[^\w\s]/gi, '')}`
        };
        
        // Solicitar el consolidado al servidor
        const response = await apiRequest(
          "POST",
          "/api/form-entries/consolidated-export",
          payload
        );
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Error al generar consolidado");
        }
        
        // Descargar el archivo
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        // Crear enlace para descarga
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `${payload.fileName}.pdf`;
        document.body.appendChild(a);
        a.click();
        
        // Limpiar
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        return templateName;
      });
      
      // Esperar a que todos los consolidados se generen
      await Promise.all(promises);
      
      toast({
        title: "Exportación completada",
        description: "Los archivos consolidados han sido generados correctamente.",
      });
      
    } catch (error) {
      console.error("Error al generar consolidado:", error);
      toast({
        title: "Error de exportación",
        description: error instanceof Error ? error.message : "No se pudo generar el consolidado",
        variant: "destructive"
      });
    }
  };
  
  // Manejador para preparar configuración de campos
  const handleConfigureFields = (entries: FormEntry[], format: "pdf" | "excel") => {
    // Si no hay entradas seleccionadas
    if (entries.length === 0) {
      toast({
        title: "Sin datos",
        description: "No hay formularios para exportar",
        variant: "destructive"
      });
      return;
    }
    
    // Verificar que todas las entradas sean del mismo tipo de formulario
    const firstTemplateId = entries[0].formTemplateId;
    const allSameTemplate = entries.every(entry => entry.formTemplateId === firstTemplateId);
    
    if (!allSameTemplate) {
      toast({
        title: "Tipos de formulario mixtos",
        description: "Solo puedes configurar campos para formularios del mismo tipo",
        variant: "destructive"
      });
      return;
    }
    
    // Buscar la plantilla correspondiente
    const template = templates?.find(t => t.id === firstTemplateId);
    if (!template) {
      toast({
        title: "Error",
        description: "No se encontró la plantilla del formulario",
        variant: "destructive"
      });
      return;
    }
    
    // Establecer los datos necesarios para el selector de campos
    setTemplateForFields(template);
    setEntriesToExport(entries);
    setExportFormat(format);
    
    // Inicializar campos seleccionados
    if (template.structure && template.structure.fields) {
      setSelectedFields(template.structure.fields.map(field => field.id));
    }
    
    // Abrir el modal de selección de campos
    setFieldSelectorOpen(true);
  };
  
  // Manejador para la selección de campos
  const handleFieldSelection = (selectedFieldIds: string[], fieldOrdering: Record<string, number>) => {
    // Guardar la selección y orden de campos
    setSelectedFields(selectedFieldIds);
    setFieldOrder(fieldOrdering);
    
    // Cerrar el modal y proceder con la exportación
    setFieldSelectorOpen(false);
    
    // Exportar los datos con la configuración de campos
    exportWithFieldConfig(entriesToExport, templateForFields!, selectedFieldIds, fieldOrdering, exportFormat);
  };
  
  // Función para exportar con configuración de campos
  const exportWithFieldConfig = async (
    entries: FormEntry[], 
    template: FormTemplate,
    selectedFieldIds: string[],
    fieldOrdering: Record<string, number>,
    format: "pdf" | "excel"
  ) => {
    try {
      toast({
        title: "Preparando datos",
        description: `Generando ${format === "pdf" ? "PDF" : "Excel"} con campos configurados...`,
      });
      
      // Preparar datos para la API
      const payload = {
        templateId: template.id,
        entryIds: entries.map(entry => entry.id),
        format,
        fileName: `Configurado_${template.name.replace(/[^\w\s]/gi, '')}`,
        selectedFields: selectedFieldIds,
        fieldOrder: fieldOrdering
      };
      
      // Solicitar la exportación al servidor
      const response = await apiRequest(
        "POST",
        "/api/form-entries/consolidated-export",
        payload
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error al generar ${format.toUpperCase()}`);
      }
      
      // Descargar el archivo
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Crear enlace para descarga
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `${payload.fileName}.${format === "pdf" ? "pdf" : "xlsx"}`;
      document.body.appendChild(a);
      a.click();
      
      // Limpieza
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Exportación completada",
        description: "El archivo ha sido generado correctamente con tus campos seleccionados.",
      });
      
    } catch (error) {
      console.error(`Error al exportar con campos configurados:`, error);
      toast({
        title: "Error de exportación",
        description: error instanceof Error ? error.message : "No se pudo generar el archivo",
        variant: "destructive"
      });
    }
  };
  
  // Funciones para manejar la eliminación de formularios
  const handleDeleteForm = (entry: FormEntry) => {
    setEntryToDelete(entry);
    setDeleteDialogOpen(true);
  };
  
  const confirmDeleteForm = () => {
    if (entryToDelete) {
      deleteEntryMutation.mutate(entryToDelete.id);
    }
  };
  
  // Get user name by ID
  const getUserName = (userId: number) => {
    return users?.find(u => u.id === userId)?.name || `Usuario ${userId}`;
  };
  
  // Get template name by ID
  const getTemplateName = (templateId: number) => {
    return templates?.find(t => t.id === templateId)?.name || `Formulario ${templateId}`;
  };
  
  // Define table columns
  const columns: ColumnDef<FormEntry>[] = [
    {
      accessorKey: "folioNumber",
      header: "Folio",
      cell: ({ row }) => {
        const folioNumber = row.getValue("folioNumber");
        if (!folioNumber) return <div>-</div>;
        return <div className="font-medium">{folioNumber}</div>;
      },
    },
    {
      accessorKey: "formTemplateId",
      header: "Formulario",
      cell: ({ row }) => <div>{getTemplateName(row.getValue("formTemplateId"))}</div>,
    },
    {
      accessorKey: "department",
      header: "Departamento",
    },
    {
      accessorKey: "createdBy",
      header: "Creado por",
      cell: ({ row }) => <div>{getUserName(row.getValue("createdBy"))}</div>,
    },
    {
      accessorKey: "createdAt",
      header: "Fecha",
      cell: ({ row }) => {
        return format(new Date(row.getValue("createdAt")), "dd/MM/yyyy HH:mm", { locale: es });
      },
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        let variant: "default" | "success" | "destructive" | "outline" | "secondary" = "outline";
        
        switch (status) {
          case "draft":
            variant = "outline";
            break;
          case "signed":
            variant = "success";
            break;
          case "approved":
            variant = "default";
            break;
          case "rejected":
            variant = "destructive";
            break;
        }
        
        let label = "Borrador";
        switch (status) {
          case "signed":
            label = "Firmado";
            break;
          case "approved":
            label = "Aprobado";
            break;
          case "rejected":
            label = "Rechazado";
            break;
        }
        
        return <Badge variant={variant}>{label}</Badge>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const entry = row.original;
        
        return (
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => handleViewForm(entry)}
              title="Ver formulario"
            >
              <Eye className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => handleExportForm(entry, "pdf")}
              title="Exportar a PDF"
            >
              <FileDown className="h-4 w-4" />
            </Button>
            
            {entry.status === "draft" && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => handleSignForm(entry)}
                title="Firmar formulario"
              >
                <UserCircle2 className="h-4 w-4" />
              </Button>
            )}
            
            {isSuperAdmin && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => handleDeleteForm(entry)}
                title="Eliminar formulario"
                className="text-red-500 hover:text-red-700 hover:bg-red-100"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];
  
  const clearFilters = () => {
    setSearchTerm("");
    setContentSearchTerm("");
    setDepartmentFilter("all");
    setStatusFilter("all");
    setUserFilter("all");
    setTemplateFilter("all");
    setStartDate(undefined);
    setEndDate(undefined);
  };
  
  return (
    <MainLayout title="Formularios Capturados">
      <div className="space-y-6">
        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Confirmar eliminación
              </AlertDialogTitle>
              <AlertDialogDescription>
                {entryToDelete && (
                  <div className="space-y-2">
                    <p>¿Está seguro que desea eliminar este formulario?</p>
                    <div className="bg-muted p-3 rounded text-sm">
                      <p><span className="font-medium">Formulario:</span> {getTemplateName(entryToDelete.formTemplateId)}</p>
                      <p><span className="font-medium">Creado por:</span> {getUserName(entryToDelete.createdBy)}</p>
                      <p><span className="font-medium">Fecha:</span> {format(new Date(entryToDelete.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}</p>
                    </div>
                    <p className="text-red-500 font-medium">Esta acción no se puede deshacer.</p>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteForm}
                className="bg-red-500 hover:bg-red-600"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* Signature Pad Modal */}
        {showSignaturePad && (
          <Dialog open={showSignaturePad} onOpenChange={setShowSignaturePad}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Firmar Formulario</DialogTitle>
                <DialogDescription>
                  {formToSign && (
                    <div className="mt-2">
                      <span className="font-medium">Formulario:</span> {getTemplateName(formToSign.formTemplateId)}
                    </div>
                  )}
                </DialogDescription>
              </DialogHeader>
              <SignaturePad 
                onSave={handleSaveSignature}
                onCancel={handleCancelSignature}
              />
            </DialogContent>
          </Dialog>
        )}
        
        {/* Modal para selección de campos en exportación */}
        <FieldsSelectorModal
          open={fieldSelectorOpen}
          onOpenChange={setFieldSelectorOpen}
          template={templateForFields || { id: 0, name: "", description: "", department: "", structure: {} }}
          initialSelectedFields={selectedFields}
          onSave={handleFieldSelection}
        />
        
        {/* Actions bar */}
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-neutral-400" />
            <Input
              placeholder="Buscar formularios..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setFiltersVisible(!filtersVisible)}
            >
              <Filter className="mr-2 h-4 w-4" />
              {filtersVisible ? "Ocultar filtros" : "Mostrar filtros"}
            </Button>
            
            <Button 
              variant={showAllFormsContent ? "default" : "outline"} 
              onClick={() => setShowAllFormsContent(!showAllFormsContent)}
            >
              <Eye className="mr-2 h-4 w-4" />
              {showAllFormsContent ? "Ocultar contenidos" : "Ver contenidos"}
            </Button>
          </div>
        </div>
        
        {/* Filters panel */}
        {filtersVisible && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex justify-between">
                <span>Filtros</span>
                <Button variant="ghost" size="sm" onClick={clearFilters}>Limpiar</Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Buscar en contenido</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                    <Input
                      placeholder="Buscar dentro de formularios..."
                      className="pl-10"
                      value={contentSearchTerm}
                      onChange={(e) => setContentSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Departamento</label>
                  <Select
                    value={departmentFilter}
                    onValueChange={setDepartmentFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los departamentos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los departamentos</SelectItem>
                      <SelectItem value="calidad">Calidad</SelectItem>
                      <SelectItem value="produccion">Producción</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Estado</label>
                  <Select
                    value={statusFilter}
                    onValueChange={setStatusFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="draft">Borrador</SelectItem>
                      <SelectItem value="signed">Firmado</SelectItem>
                      <SelectItem value="approved">Aprobado</SelectItem>
                      <SelectItem value="rejected">Rechazado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Usuario</label>
                  <Select
                    value={userFilter.toString()}
                    onValueChange={(val) => setUserFilter(val === "all" ? "all" : parseInt(val))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los usuarios" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los usuarios</SelectItem>
                      {users?.map(user => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Formulario</label>
                  <Select
                    value={templateFilter.toString()}
                    onValueChange={(val) => setTemplateFilter(val === "all" ? "all" : parseInt(val))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los formularios" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los formularios</SelectItem>
                      {templates?.map(template => (
                        <SelectItem key={template.id} value={template.id.toString()}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fecha inicial</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "P", { locale: es }) : <span>Seleccionar</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fecha final</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "P", { locale: es }) : <span>Seleccionar</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Forms list */}
        <Card>
          <CardHeader>
            <CardTitle>Formularios Capturados</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={filteredEntries}
              searchPlaceholder="Filtrar formularios..."
              searchColumn="formTemplateId"
              isLoading={isLoadingEntries}
            />
          </CardContent>
        </Card>
        
        {/* Expanded view of all forms content */}
        {showAllFormsContent && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Contenido de formularios filtrados</span>
                {filteredEntries.length > 0 && (
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" onClick={() => {
                      toast({
                        title: "Exportando formularios",
                        description: "Se exportarán todos los formularios filtrados como PDF individuales"
                      });
                      
                      // Exportar todos los formularios filtrados (uno por uno)
                      filteredEntries.forEach(entry => {
                        setTimeout(() => {
                          handleExportForm(entry, "pdf");
                        }, 500); // Pequeño retraso para evitar sobrecargar el navegador
                      });
                    }}>
                      <Download className="mr-2 h-4 w-4" />
                      Exportar todos (PDF)
                    </Button>
                    
                    <Button size="sm" variant="default" onClick={() => {
                      toast({
                        title: "Generando archivo homologado",
                        description: "Creando vista consolidada de todos los formularios filtrados"
                      });
                      
                      handleExportConsolidatedData(filteredEntries);
                    }}>
                      <FileDown className="mr-2 h-4 w-4" />
                      Vista homologada
                    </Button>

                    {isAdmin && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleConfigureFields(filteredEntries, "pdf")}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Configurar campos
                      </Button>
                    )}
                  </div>
                )}
              </CardTitle>
              <CardDescription>
                {filteredEntries.length > 0 
                  ? `Mostrando contenido de ${filteredEntries.length} formularios` 
                  : "No hay formularios que coincidan con los filtros seleccionados"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {filteredEntries.map(entry => {
                  const template = templates?.find(t => t.id === entry.formTemplateId);
                  if (!template) return null;
                  
                  return (
                    <div key={entry.id} className="border rounded-lg p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-2 border-b">
                        <div>
                          <h3 className="text-lg font-semibold">{getTemplateName(entry.formTemplateId)}</h3>
                          <div className="text-sm text-muted-foreground flex flex-col sm:flex-row sm:gap-4">
                            <span>Folio: {entry.folioNumber || "-"}</span>
                            <span>Creado por: {getUserName(entry.createdBy)}</span>
                            <span>Fecha: {format(new Date(entry.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            entry.status === "signed" ? "success" : 
                            entry.status === "approved" ? "default" :
                            entry.status === "rejected" ? "destructive" : "outline"
                          }>
                            {entry.status === "draft" ? "Borrador" :
                             entry.status === "signed" ? "Firmado" :
                             entry.status === "approved" ? "Aprobado" : "Rechazado"}
                          </Badge>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewForm(entry)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Ver detalle
                          </Button>
                        </div>
                      </div>
                      
                      <div className="max-h-[500px] overflow-y-auto bg-muted/30 rounded-md p-4">
                        <FormViewer
                          formTemplate={template.structure}
                          initialData={entry.data}
                          onSubmit={() => {}}
                          isReadOnly={true}
                          formId={template.id}
                        />
                        
                        {/* Signature display if form is signed */}
                        {entry.signature && (
                          <div className="mt-4 border-t pt-4">
                            <h4 className="text-md font-medium mb-2">Firma</h4>
                            <div className="flex items-center justify-center p-2 border rounded-md bg-white">
                              <img 
                                src={entry.signature} 
                                alt="Firma digital" 
                                className="max-h-24"
                              />
                            </div>
                            <p className="text-xs text-muted-foreground mt-2 text-center">
                              Firmado por {getUserName(entry.signedBy || entry.createdBy)} 
                              {entry.signedAt && ` el ${format(new Date(entry.signedAt), "dd/MM/yyyy HH:mm", { locale: es })}`}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Form details dialog */}
        {selectedEntry && selectedTemplate && (
          <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>{getTemplateName(selectedEntry.formTemplateId)}</DialogTitle>
                <DialogDescription>
                  Creado por {getUserName(selectedEntry.createdBy)} el {
                    format(new Date(selectedEntry.createdAt), "dd/MM/yyyy HH:mm", { locale: es })
                  }
                </DialogDescription>
              </DialogHeader>
              
              <div className="max-h-[70vh] overflow-y-auto py-4">
                <FormViewer
                  formTemplate={selectedTemplate.structure}
                  initialData={selectedEntry.data}
                  onSubmit={() => {}}
                  isReadOnly={true}
                  formId={selectedTemplate.id}
                />
                
                {/* Signature display if form is signed */}
                {selectedEntry.signature && (
                  <div className="mt-6 border-t pt-4">
                    <h3 className="text-lg font-medium mb-2">Firma</h3>
                    <div className="flex items-center justify-center p-4 border rounded-md">
                      <img 
                        src={selectedEntry.signature} 
                        alt="Firma digital" 
                        className="max-h-32"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 text-center">
                      Firmado por {getUserName(selectedEntry.signedBy || selectedEntry.createdBy)} 
                      {selectedEntry.signedAt && ` el ${format(new Date(selectedEntry.signedAt), "dd/MM/yyyy HH:mm", { locale: es })}`}
                    </p>
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <div className="flex flex-col sm:flex-row sm:justify-between w-full gap-2">
                  <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                    Cerrar
                  </Button>
                  
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => handleExportForm(selectedEntry, "pdf")}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Descargar PDF
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleExportForm(selectedEntry, "excel")}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Descargar Excel
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      onClick={() => handleConfigureFields([selectedEntry], "pdf")}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Configurar campos
                    </Button>
                    
                    {selectedEntry.status === "draft" && (
                      <Button 
                        onClick={() => handleSignForm(selectedEntry)}
                      >
                        <UserCircle2 className="mr-2 h-4 w-4" />
                        Firmar
                      </Button>
                    )}
                  </div>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </MainLayout>
  );
}