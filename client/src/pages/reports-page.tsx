import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { DateRange } from "react-day-picker";
import { ColumnDef } from "@tanstack/react-table";
import { Search, Download, Calendar, FileDown, Settings2, Save, FolderOpen, Edit, Trash2, PlusCircle, Settings } from "lucide-react";
import MainLayout from "@/layouts/main-layout";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { SavedReport } from "@shared/schema";
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
  userName?: string;
  formName?: string;
}

interface FormTemplate {
  id: number;
  name: string;
  department: string;
  structure: {
    title: string;
    fields: {
      id: string;
      type: string;
      label: string;
      displayName?: string;
      [key: string]: any;
    }[];
    sections?: {
      title: string;
      fields: {
        id: string;
        type: string;
        label: string;
        displayName?: string;
        [key: string]: any;
      }[];
    }[];
  };
}

interface User {
  id: number;
  name: string;
  department: string;
  role: string;
}

// Colors for charts
const COLORS = ["#1976d2", "#f50057", "#ff9800", "#4caf50", "#9c27b0"];

// Función para convertir IDs de campo a nombres legibles
const formatFieldName = (fieldId: string): string => {
  // Primero, verificar si existe un displayName personalizado en el diccionario
  if (displayNameMap[fieldId]) {
    return displayNameMap[fieldId];
  }
  
  // Patrones comunes para mejorar la legibilidad
  if (fieldId === "formName") return "Formulario";
  if (fieldId === "userName") return "Usuario";
  if (fieldId === "department") return "Departamento";
  if (fieldId === "createdAt") return "Fecha";
  
  // Mapeo específico para campos conocidos
  const fieldMap: Record<string, string> = {
    "4376dffa-7b7e-45a4-b778-faee18b31cb7": "Código del formulario",
    "225b5b89-c8cf-4643-9845-17396a65e6ad": "Versión",
    "df7f3a71-2aa4-4d2a-b085-d34737106574": "Fecha de implementación",
    "5c66f802-76fb-43c2-a843-3b66bc388587": "Departamento",
    "8c52633c-7a08-4872-86b7-d6c7de760dc7": "Estado",
    "bada3df5-070b-4665-8674-a6c39e2a6e3c": "Tipo de registro",
    "7b2378c2-b301-4b7d-93e4-9dd3838b7a61": "Responsable",
    "8422e8ad-6d0d-4478-86b9-7663957fdc55": "Requisitos",
    "23a2a2ba-0120-4efb-afc1-0095ed1d9647": "Observaciones",
    "employeeNames": "Nombres de Personal",
    "criteria": "Criterios de Evaluación",
    "title": "Título",
    "company": "Empresa",
    "address": "Dirección",
    "date": "Fecha",
    "documentType": "Tipo de Documento",
    "version": "Versión",
    "code": "Código",
    "NA": "No Aplica",
    "SD": "Sin Datos",
    "CARE-01-01": "Código del Formulario"
  };
  
  // Verificar si existe en el mapeo
  if (fieldMap[fieldId]) {
    return fieldMap[fieldId];
  }
  
  // Detectar códigos UUID o códigos hexadecimales largos 
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fieldId) || 
      /^[0-9a-f]{32}$/i.test(fieldId)) {
    return "Campo " + fieldId.substring(0, 8);
  }
  
  // Eliminar caracteres no deseados en IDs
  let name = fieldId.replace(/[0-9a-f]{32}/g, "");
  
  // Convertir camelCase a palabras espaciadas
  name = name.replace(/([A-Z])/g, " $1")
    .replace(/^./, str => str.toUpperCase())
    .trim();
    
  // Si después de procesar queda vacío, usar el original
  if (!name.trim()) {
    return fieldId;
  }
  
  return name;
};

// Diccionario global para almacenar mapeos de displayName
const displayNameMap: Record<string, string> = {};

// Esquema para el formulario de guardado de reportes
const saveReportSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  isPublic: z.boolean().default(false)
});

export default function ReportsPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [formFilter, setFormFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [reportType, setReportType] = useState("submissions");
  const [selectedFormTemplate, setSelectedFormTemplate] = useState<FormTemplate | null>(null);
  const [showDetailReport, setShowDetailReport] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<FormEntry | null>(null);
  const [customReport, setCustomReport] = useState(false);
  const [customColumns, setCustomColumns] = useState<string[]>([]);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [customPersonnelFilter, setCustomPersonnelFilter] = useState<string>("");
  
  // Obtener usuario actual
  const { data: user } = useQuery({
    queryKey: ["/api/user"],
  });
  
  // Definir variables de control de acceso
  const isSuperAdmin = user?.role === "superadmin";
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  
  // Mapeo entre nombres legibles de columnas y sus IDs internos
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({
    "Formulario": "formName",
    "Departamento": "department",
    "Usuario": "userName",
    "Fecha": "createdAt"
  });
  
  // Estados para manejo de reportes guardados
  const [saveReportDialogOpen, setSaveReportDialogOpen] = useState(false);
  const [loadReportDialogOpen, setLoadReportDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<SavedReport | null>(null);
  const [isEditingReport, setIsEditingReport] = useState(false);
  
  // Estados para el selector de campos
  const [fieldSelectorOpen, setFieldSelectorOpen] = useState(false);
  const [templateForFields, setTemplateForFields] = useState<FormTemplate | null>(null);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [fieldOrder, setFieldOrder] = useState<Record<string, number>>({});
  const [entriesForExport, setEntriesForExport] = useState<FormEntry[]>([]);
  const [exportFormat, setExportFormat] = useState<"pdf" | "excel">("pdf");

  // Formulario para guardar reportes
  const saveReportForm = useForm<z.infer<typeof saveReportSchema>>({
    resolver: zodResolver(saveReportSchema),
    defaultValues: {
      name: "",
      description: "",
      isPublic: false
    }
  });

  // Fetch form entries for reports
  const { data: entriesData, isLoading: isLoadingEntries } = useQuery<FormEntry[]>({
    queryKey: ["/api/form-entries"],
  });

  // Fetch form templates for filter
  const { data: templates, isLoading: isLoadingTemplates } = useQuery<FormTemplate[]>({
    queryKey: ["/api/form-templates"]
  });

  // Fetch users for filter
  const { data: users, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });
  
  // Fetch saved reports
  const { data: savedReports, isLoading: isLoadingSavedReports } = useQuery<SavedReport[]>({
    queryKey: ["/api/saved-reports"],
  });

  // Mutations for saved reports
  const createReportMutation = useMutation({
    mutationFn: async (reportData: any) => {
      const res = await apiRequest("POST", "/api/saved-reports", reportData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Reporte guardado",
        description: "El reporte personalizado se ha guardado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/saved-reports"] });
      setSaveReportDialogOpen(false);
      saveReportForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error al guardar el reporte",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const updateReportMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const res = await apiRequest("PUT", `/api/saved-reports/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Reporte actualizado",
        description: "El reporte personalizado se ha actualizado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/saved-reports"] });
      setSaveReportDialogOpen(false);
      setIsEditingReport(false);
      setSelectedReport(null);
      saveReportForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar el reporte",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const deleteReportMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/saved-reports/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Reporte eliminado",
        description: "El reporte personalizado se ha eliminado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/saved-reports"] });
      setLoadReportDialogOpen(false);
      setSelectedReport(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error al eliminar el reporte",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Process entries with template and user information
  const [processedEntries, setProcessedEntries] = useState<FormEntry[]>([]);

  // Efecto para extraer los displayNames de los formularios
  useEffect(() => {
    if (templates) {
      // Crear un nuevo objeto para almacenar los displayNames
      const newDisplayNameMap: Record<string, string> = {};
      
      // Extraer displayNames de todos los formularios
      templates.forEach(template => {
        console.log(`Procesando template: ${template.name}`, template.structure);
        
        if (template.structure?.fields) {
          template.structure.fields.forEach(field => {
            // Usar console.log para depuración
            console.log(`Campo: ${field.id}`, { 
              label: field.label, 
              displayName: field.displayName,
              type: field.type 
            });
            
            if (field.displayName && field.id) {
              newDisplayNameMap[field.id] = field.displayName;
              // También almacenar un mapeo directo de UUID a displayName
              // para ser usado en exportaciones y reportes
              setColumnMapping(prevMapping => {
                const newMapping = { ...prevMapping };
                if (field.displayName && typeof field.displayName === 'string') {
                  newMapping[field.displayName] = field.id;
                }
                return newMapping;
              });
            }
          });
          
          // También procesar campos en secciones si existen
          if (template.structure.sections) {
            template.structure.sections.forEach(section => {
              section.fields.forEach(field => {
                console.log(`Campo en sección: ${field.id}`, {
                  label: field.label,
                  displayName: field.displayName,
                  type: field.type
                });
                
                if (field.displayName && field.id) {
                  newDisplayNameMap[field.id] = field.displayName;
                  // También actualizar el columnMapping
                  setColumnMapping(prevMapping => {
                    const newMapping = { ...prevMapping };
                    if (field.displayName && typeof field.displayName === 'string') {
                      newMapping[field.displayName] = field.id;
                    }
                    return newMapping;
                  });
                }
              });
            });
          }
        }
      });
      
      // Actualizar el diccionario global
      for (const key in displayNameMap) {
        delete displayNameMap[key];
      }
      
      // Copiar los valores al displayNameMap global
      Object.keys(newDisplayNameMap).forEach(key => {
        displayNameMap[key] = newDisplayNameMap[key];
      });
      
      console.log("DisplayNames cargados:", newDisplayNameMap);
    }
  }, [templates]);

  // Procesar entradas con información de plantilla y usuario
  useEffect(() => {
    if (entriesData && templates && users && Array.isArray(entriesData)) {
      const processed = entriesData.map(entry => {
        const template = templates.find(t => t.id === entry.formTemplateId);
        const user = users.find(u => u.id === entry.createdBy);
        return {
          ...entry,
          formName: template?.name || `Formulario ${entry.formTemplateId}`,
          userName: user?.name || `Usuario ${entry.createdBy}`
        };
      });
      setProcessedEntries(processed);
    }
  }, [entriesData, templates, users]);

  // Apply filters
  const filteredEntries = processedEntries.filter(entry => {
    // Search filter
    const searchMatches = 
      !searchTerm || 
      (entry.formName && entry.formName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (entry.userName && entry.userName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Department filter
    const departmentMatches = !departmentFilter || departmentFilter === "all" || entry.department === departmentFilter;
    
    // Form filter
    const formMatches = !formFilter || formFilter === "all" || entry.formTemplateId.toString() === formFilter;
    
    // User filter
    const userMatches = !userFilter || userFilter === "all" || entry.createdBy.toString() === userFilter;
    
    // Date range filter
    const dateMatches = !dateRange || !dateRange.from || 
      (new Date(entry.createdAt) >= dateRange.from && 
        (!dateRange.to || new Date(entry.createdAt) <= dateRange.to));
    
    return searchMatches && departmentMatches && formMatches && userMatches && dateMatches;
  });

  // Define columns for data table
  const columns: ColumnDef<FormEntry>[] = [
    {
      accessorKey: "formName",
      header: "Formulario",
    },
    {
      accessorKey: "department",
      header: "Departamento",
    },
    {
      accessorKey: "userName",
      header: "Usuario",
    },
    {
      accessorKey: "createdAt",
      header: "Fecha de creación",
      cell: ({ row }) => {
        return new Date(row.getValue("createdAt")).toLocaleDateString("es-ES", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        });
      },
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => {
        const entry = row.original;
        
        return (
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => handleViewDetailReport(entry)}
              title="Ver reporte por formulario"
            >
              <Search className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => handleViewEntryDetails(entry)}
              title="Ver detalle de entrada"
            >
              <Search className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => handleExport(entry, "pdf")}
              title="Exportar a PDF"
            >
              <FileDown className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];
  
  // Mostrar reporte detallado de un formulario específico
  const handleViewDetailReport = (entry: FormEntry) => {
    const template = templates?.find(t => t.id === entry.formTemplateId);
    if (template) {
      setSelectedFormTemplate(template);
      // Filtrar entradas por este tipo de formulario
      setFormFilter(template.id.toString());
      setShowDetailReport(true);
    } else {
      toast({
        title: "Error",
        description: "No se pudo encontrar la plantilla para esta entrada",
        variant: "destructive",
      });
    }
  };
  
  // Ver detalles de una entrada específica
  const handleViewEntryDetails = (entry: FormEntry) => {
    setSelectedEntry(entry);
  };

  // Generar contenido CSV para Excel
  const generateCSV = (entries: FormEntry[], selectedColumns?: string[]) => {
    // Determinar las columnas a incluir
    const columnsToInclude = selectedColumns || ["formName", "userName", "department", "createdAt"];
    
    // Usar los nombres de columna como encabezados (ya son los nombres legibles personalizados)
    const headers = columnsToInclude.join(',');
    
    // Crear filas de datos
    const rows = entries.map(entry => {
      return columnsToInclude.map(col => {
        let value = "";
        
        // Obtener el ID del campo desde el mapeo de columnas
        const fieldId = columnMapping[col] || col;
        
        // Manejar columnas estándar
        if (fieldId === "formName" || col === "Formulario") {
          value = entry.formName || "";
        } else if (fieldId === "userName" || col === "Usuario") {
          value = entry.userName || "";
        } else if (fieldId === "department" || col === "Departamento") {
          value = entry.department || "";
        } else if (fieldId === "createdAt" || col === "Fecha") {
          value = new Date(entry.createdAt).toLocaleString("es-ES");
        } else if (col.startsWith("Personal: ") && entry.data?.employeeNames) {
          // Para campos de personal específicos
          const personnelName = col.replace("Personal: ", "");
          value = entry.data.employeeNames.includes(personnelName) ? "Sí" : "No";
        } else if (entry.data && entry.data[fieldId] !== undefined) {
          // Si existe el campo exacto en los datos usando su ID, usarlo directamente
          value = typeof entry.data[fieldId] === 'object' 
            ? JSON.stringify(entry.data[fieldId]) 
            : String(entry.data[fieldId]);
        } else {
          // Intentar buscar en data si no existe un mapeo directo
          // Este es un caso de respaldo en caso de que el mapeo no esté completo
          const fieldKey = Object.keys(entry.data || {}).find(
            key => formatFieldName(key) === col || displayNameMap[key] === col
          );
          
          if (fieldKey && entry.data) {
            value = typeof entry.data[fieldKey] === 'object' 
              ? JSON.stringify(entry.data[fieldKey]) 
              : String(entry.data[fieldKey]);
          }
        }
        
        // Escapar comillas y encerrar en comillas si contiene comas
        if (value && value.includes('"')) {
          value = value.replace(/"/g, '""');
        }
        if (value && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          value = `"${value}"`;
        }
        
        return value;
      }).join(',');
    }).join('\n');
    
    return `${headers}\n${rows}`;
  };
  
  // Generar HTML para PDF
  const generateHTML = (entries: FormEntry[], selectedColumns?: string[]) => {
    // Determinar las columnas a incluir
    const columnsToInclude = selectedColumns || ["formName", "userName", "department", "createdAt"];
    
    // Crear tabla HTML
    let htmlContent = `
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
          .company-info { text-align: right; font-size: 12px; color: #666; }
          .logo-container { display: flex; align-items: center; }
          .logo { height: 40px; margin-right: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 style="color: #E3174B;">GELAG S.A DE C.V.</h1>
            <h2>Reporte de Formularios</h2>
            <p>Fecha de generación: ${new Date().toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
          </div>
          <div class="company-info">
            <p><strong>GELAG S.A DE C.V.</strong></p>
            <p>BLVD. SANTA RITA #842</p>
            <p>PARQUE INDUSTRIAL SANTA RITA</p>
            <p>GOMEZ PALACIO, DGO.</p>
          </div>
        </div>
        <hr>
        <table>
          <thead>
            <tr>
    `;
    
    // Encabezados - usar los nombres legibles directamente
    columnsToInclude.forEach(col => {
      htmlContent += `<th>${col}</th>`;
    });
    
    htmlContent += `
            </tr>
          </thead>
          <tbody>
    `;
    
    // Filas de datos
    entries.forEach(entry => {
      htmlContent += '<tr>';
      
      columnsToInclude.forEach(col => {
        let value = "";
        
        // Obtener el ID del campo desde el mapeo de columnas
        const fieldId = columnMapping[col] || col;
        
        // Manejar columnas estándar
        if (fieldId === "formName" || col === "Formulario") {
          value = entry.formName || "";
        } else if (fieldId === "userName" || col === "Usuario") {
          value = entry.userName || "";
        } else if (fieldId === "department" || col === "Departamento") {
          value = entry.department || "";
        } else if (fieldId === "createdAt" || col === "Fecha") {
          value = new Date(entry.createdAt).toLocaleString("es-ES");
        } else if (col.startsWith("Personal: ") && entry.data?.employeeNames) {
          // Para campos de personal específicos
          const personnelName = col.replace("Personal: ", "");
          value = entry.data.employeeNames.includes(personnelName) ? "Sí" : "No";
        } else if (entry.data && entry.data[fieldId] !== undefined) {
          // Si existe el campo exacto en los datos, usarlo directamente
          if (typeof entry.data[fieldId] === 'object') {
            value = JSON.stringify(entry.data[fieldId]);
          } else {
            value = String(entry.data[fieldId]);
          }
        } else {
          // Caso de respaldo: Buscar en data si no existe un mapeo directo
          const fieldKey = Object.keys(entry.data || {}).find(
            key => formatFieldName(key) === col || displayNameMap[key] === col
          );
          
          if (fieldKey && entry.data) {
            if (typeof entry.data[fieldKey] === 'object') {
              value = JSON.stringify(entry.data[fieldKey]);
            } else {
              value = String(entry.data[fieldKey]);
            }
          }
        }
        
        htmlContent += `<td>${value}</td>`;
      });
      
      htmlContent += '</tr>';
    });
    
    htmlContent += `
          </tbody>
        </table>
      </body>
      </html>
    `;
    
    return htmlContent;
  };
  
  // Descargar archivo
  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Mostrar vista previa de PDF
  const showPDFPreview = (htmlContent: string) => {
    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
      previewWindow.document.write(htmlContent);
      previewWindow.document.close();
    } else {
      toast({
        title: "Error",
        description: "El navegador ha bloqueado la ventana emergente. Asegúrate de permitir ventanas emergentes para esta aplicación.",
        variant: "destructive",
      });
    }
  };

  // Handle export
  // Función para abrir el selector de campos
  const handleConfigureFields = (entries: FormEntry[], format: "pdf" | "excel") => {
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
    setEntriesForExport(entries);
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
    exportWithFieldConfig(entriesForExport, templateForFields!, selectedFieldIds, fieldOrdering, exportFormat);
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
      
      // Usar la API de servidor para exportación consolidada
      if (entries.length > 1) {
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
        
        // Procesar la respuesta según el formato
        if (format === "pdf") {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
        } else {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${payload.fileName}.xlsx`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
        
        toast({
          title: "Exportación completada",
          description: `Documento ${format.toUpperCase()} generado correctamente`,
        });
      } 
      // Para entradas individuales, usar el método local
      else if (entries.length === 1) {
        const entry = entries[0];
        if (format === "excel") {
          const csvContent = generateCSV([entry], selectedFieldIds);
          const filename = `entrada_formulario_${entry.id}_${format}_${new Date().toISOString().split('T')[0]}.csv`;
          
          // Descargar el archivo
          downloadFile(csvContent, filename, "text/csv;charset=utf-8");
          
          toast({
            title: "Exportación completada",
            description: "El archivo CSV ha sido generado y descargado correctamente",
          });
        } else {
          // Generar contenido HTML para PDF con campos seleccionados
          const htmlContent = generateHTML([entry], selectedFieldIds);
          
          // Mostrar vista previa antes de descargar
          showPDFPreview(htmlContent);
          
          toast({
            title: "Vista previa generada",
            description: "Se ha abierto una vista previa del PDF. Puedes imprimirlo o guardarlo como PDF desde el navegador.",
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Error en la exportación",
        description: error.message || "Ocurrió un problema al generar el archivo",
        variant: "destructive",
      });
    }
  };

  const handleExport = (entry: FormEntry, format: "pdf" | "excel") => {
    // Si el usuario es Admin o SuperAdmin, ofrecer la configuración de campos
    if (isAdmin) {
      handleConfigureFields([entry], format);
    } else {
      // Comportamiento original para otros usuarios
      toast({
        title: `Preparando exportación`,
        description: `Preparando los datos para exportar a ${format.toUpperCase()}`,
      });
      
      // Exportar solo la entrada seleccionada como un array de una entrada
      if (format === "excel") {
        const csvContent = generateCSV([entry]);
        const filename = `entrada_formulario_${entry.id}_${format}_${new Date().toISOString().split('T')[0]}.csv`;
        
        // Descargar el archivo
        downloadFile(csvContent, filename, "text/csv;charset=utf-8");
        
        toast({
          title: "Exportación completada",
          description: "El archivo CSV ha sido generado y descargado correctamente",
        });
      } else {
        // Generar contenido HTML para PDF
        const htmlContent = generateHTML([entry]);
        
        // Mostrar vista previa antes de descargar
        showPDFPreview(htmlContent);
        
        toast({
          title: "Vista previa generada",
          description: "Se ha abierto una vista previa del PDF. Puedes imprimirlo o guardarlo como PDF desde el navegador.",
        });
      }
    }
  };

  // Export all results
  const handleExportAll = (format: "pdf" | "excel") => {
    if (filteredEntries.length === 0) {
      toast({
        title: "No hay datos para exportar",
        description: "No hay entradas que coincidan con los filtros actuales.",
        variant: "destructive",
      });
      return;
    }
    
    // Si el usuario es Admin o SuperAdmin, ofrecer la configuración de campos
    if (isAdmin) {
      // Verificar que todas las entradas sean del mismo tipo
      const templateIds = new Set(filteredEntries.map(entry => entry.formTemplateId));
      
      if (templateIds.size > 1) {
        toast({
          title: "Múltiples tipos de formulario",
          description: "Para configurar los campos, filtra por un único tipo de formulario",
          variant: "destructive",
        });
        
        // Proceder con la exportación estándar
        performStandardExport(filteredEntries, format);
      } else {
        // Si todas las entradas son del mismo tipo, permitir la configuración de campos
        handleConfigureFields(filteredEntries, format);
      }
    } else {
      // Para usuarios no administradores, usar la exportación estándar
      performStandardExport(filteredEntries, format);
    }
  };
  
  // Función de exportación estándar sin configuración de campos
  const performStandardExport = (entries: FormEntry[], format: "pdf" | "excel") => {
    toast({
      title: `Preparando exportación`,
      description: `Exportando ${entries.length} entradas a ${format.toUpperCase()}`,
    });
    
    if (format === "excel") {
      const csvContent = generateCSV(entries);
      const filename = `reporte_formularios_${format}_${new Date().toISOString().split('T')[0]}.csv`;
      
      // Descargar el archivo
      downloadFile(csvContent, filename, "text/csv;charset=utf-8");
      
      toast({
        title: "Exportación completada",
        description: `Se han exportado ${entries.length} entradas a CSV correctamente`,
      });
    } else {
      // Generar contenido HTML para PDF
      const htmlContent = generateHTML(entries);
      
      // Mostrar vista previa antes de descargar
      showPDFPreview(htmlContent);
      
      toast({
        title: "Vista previa generada",
        description: "Se ha abierto una vista previa del PDF. Puedes imprimirlo o guardarlo como PDF desde el navegador.",
      });
    }
  };
  
  // Función para generar reporte personalizado por personal y fechas
  const handleGenerateCustomReport = () => {
    setCustomReport(true);
    // Analizar la estructura de los datos para extraer campos disponibles
    const allFields = new Set<string>();
    
    // Crear un nuevo mapeo de columnas basado en el estado actual
    // pero añadiendo los campos estándar por si acaso
    const newColumnMapping: Record<string, string> = {
      ...columnMapping,
      "Formulario": "formName",
      "Departamento": "department",
      "Usuario": "userName",
      "Fecha": "createdAt"
    };
    
    // Añadir campos estándar básicos con nombres legibles
    allFields.add("Formulario");
    allFields.add("Departamento");
    allFields.add("Usuario");
    allFields.add("Fecha");
    
    // Recorrer todas las plantillas para extraer campos y sus displayNames
    if (templates) {
      templates.forEach(template => {
        // Procesar campos en la raíz de la estructura
        if (template.structure?.fields) {
          template.structure.fields.forEach(field => {
            if (field.displayName && field.id) {
              // Usar el displayName como nombre de columna
              allFields.add(field.displayName);
              newColumnMapping[field.displayName] = field.id;
            } else if (field.label && field.id) {
              // Si no hay displayName, usar la etiqueta
              allFields.add(field.label);
              newColumnMapping[field.label] = field.id;
            }
          });
        }
        
        // Procesar campos en secciones si existen
        if (template.structure?.sections) {
          template.structure.sections.forEach(section => {
            if (section.fields) {
              section.fields.forEach(field => {
                if (field.displayName && field.id) {
                  // Usar el displayName como nombre de columna
                  allFields.add(field.displayName);
                  newColumnMapping[field.displayName] = field.id;
                } else if (field.label && field.id) {
                  // Si no hay displayName, usar la etiqueta
                  allFields.add(field.label);
                  newColumnMapping[field.label] = field.id;
                }
              });
            }
          });
        }
      });
    }
    
    // Ahora procesar los datos para campos que podrían no estar en la estructura
    processedEntries.forEach(entry => {
      if (entry.data) {
        // Extraer campos de los datos con nombres más legibles
        Object.keys(entry.data).forEach(field => {
          // Comprobar si el campo ya está en el mapeo por su ID
          let alreadyMapped = false;
          for (const [displayName, id] of Object.entries(newColumnMapping)) {
            if (id === field) {
              alreadyMapped = true;
              break;
            }
          }
          
          // Si el campo no está en el mapeo, añadirlo
          if (!alreadyMapped) {
            // Intentar usar displayName si existe, o formatear el nombre
            let displayName = "";
            
            if (displayNameMap[field]) {
              // Usar displayName personalizado si existe
              displayName = displayNameMap[field];
            } else {
              // Usar la función de formateo como respaldo
              displayName = formatFieldName(field);
            }
            
            // Guardar el mapeo entre el nombre legible y el ID interno
            newColumnMapping[displayName] = field;
            
            // Añadir a campos disponibles
            allFields.add(displayName);
          }
        });
        
        // Para el caso especial de Buenas Prácticas, buscar el personal
        if (entry.data.employeeNames && Array.isArray(entry.data.employeeNames)) {
          entry.data.employeeNames.forEach((name: string) => {
            if (name && name.trim()) {
              const fieldName = `Personal: ${name}`;
              newColumnMapping[fieldName] = fieldName;
              allFields.add(fieldName);
            }
          });
        }
      }
    });
    
    // Actualizar el mapeo de columnas para usar en exportaciones
    setColumnMapping(newColumnMapping);
    console.log("Mapeo de columnas actualizado:", newColumnMapping);
    
    setAvailableColumns(Array.from(allFields));
    setCustomColumns([
      "Formulario", 
      "Usuario", 
      "Departamento", 
      "Fecha"
    ]);
  };
  
  // Exportar reporte personalizado
  const handleExportCustomReport = (format: "pdf" | "excel") => {
    if (filteredEntries.length === 0) {
      toast({
        title: "No hay datos para exportar",
        description: "No hay entradas que coincidan con los filtros actuales.",
        variant: "destructive",
      });
      return;
    }
    
    if (customColumns.length === 0) {
      toast({
        title: "No hay columnas seleccionadas",
        description: "Debes seleccionar al menos una columna para generar el reporte.",
        variant: "destructive",
      });
      return;
    }
    
    // Filtrar los datos por nombre de personal si está configurado
    let reportEntries = [...filteredEntries];
    if (customPersonnelFilter) {
      reportEntries = reportEntries.filter(entry => {
        if (!entry.data?.employeeNames) return false;
        return entry.data.employeeNames.some((name: string) => 
          name.toLowerCase().includes(customPersonnelFilter.toLowerCase())
        );
      });
    }
    
    // Si el usuario es Admin o SuperAdmin y todas las entradas son del mismo tipo, ofrecer configuración avanzada
    if (isAdmin) {
      // Verificar que todas las entradas sean del mismo tipo
      const templateIds = new Set(reportEntries.map(entry => entry.formTemplateId));
      
      if (templateIds.size === 1) {
        // Si todas las entradas son del mismo tipo, permitir la configuración de campos
        handleConfigureFields(reportEntries, format);
        return;
      }
      // Si hay múltiples tipos, proceder con la exportación estándar pero mostrar info
      if (templateIds.size > 1) {
        toast({
          title: "Múltiples tipos de formulario",
          description: "Se usará la configuración de columnas estándar. Para una configuración avanzada, filtra por un único tipo de formulario.",
          variant: "destructive",
        });
      }
    }
    
    // Comportamiento estándar para usuarios no admin o reportes con múltiples tipos de formulario
    toast({
      title: `Preparando exportación personalizada`,
      description: `Exportando reporte personalizado a ${format.toUpperCase()}`,
    });
    
    if (format === "excel") {
      const csvContent = generateCSV(reportEntries, customColumns);
      const filename = `reporte_personalizado_${format}_${new Date().toISOString().split('T')[0]}.csv`;
      
      // Descargar el archivo
      downloadFile(csvContent, filename, "text/csv;charset=utf-8");
      
      toast({
        title: "Exportación completada",
        description: `Se ha generado tu reporte personalizado con ${reportEntries.length} entradas y ${customColumns.length} columnas`,
      });
    } else {
      // Generar contenido HTML para PDF
      const htmlContent = generateHTML(reportEntries, customColumns);
      
      // Mostrar vista previa antes de descargar
      showPDFPreview(htmlContent);
      
      toast({
        title: "Vista previa generada",
        description: "Se ha abierto una vista previa del PDF. Puedes imprimirlo o guardarlo como PDF desde el navegador.",
      });
    }
  };

  // Prepare chart data
  const departmentData = processedEntries.reduce((acc, entry) => {
    const dept = entry.department || "Sin departamento";
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieChartData = Object.entries(departmentData).map(([name, value]) => ({
    name,
    value
  }));

  // Format a date to YYYY-MM-DD string
  const formatDateString = (date: Date) => {
    return format(date, "yyyy-MM-dd");
  };
  
  // Limpiar filtros
  const handleClearFilters = () => {
    setSearchTerm("");
    setDepartmentFilter("all");
    setFormFilter("all");
    setUserFilter("all");
    setDateRange(undefined);
    setCustomReport(false);
    setCustomColumns([]);
    setCustomPersonnelFilter("");
  };
  
  // Abrir diálogo para guardar un reporte
  const handleSaveReport = () => {
    saveReportForm.reset({
      name: "",
      description: "",
      isPublic: false
    });
    setIsEditingReport(false);
    setSaveReportDialogOpen(true);
  };

  // Guardar un reporte
  const handleSubmitSaveReport = (data: z.infer<typeof saveReportSchema>) => {
    const reportConfig = {
      name: data.name,
      description: data.description || "",
      isPublic: data.isPublic,
      configuration: {
        searchTerm,
        departmentFilter,
        formFilter,
        userFilter,
        dateRange,
        customReport,
        customColumns,
        customPersonnelFilter
      }
    };

    if (isEditingReport && selectedReport) {
      updateReportMutation.mutate({
        id: selectedReport.id,
        data: reportConfig
      });
    } else {
      createReportMutation.mutate(reportConfig);
    }
  };

  // Función para eliminar reportes
  const handleDeleteReport = () => {
    if (selectedReport) {
      if (window.confirm(`¿Está seguro de eliminar el reporte "${selectedReport.name}"?`)) {
        deleteReportMutation.mutate(selectedReport.id);
        setSelectedReport(null);
        setLoadReportDialogOpen(false);
      }
    }
  };

  // Cargar un reporte guardado
  const handleLoadReport = (report: SavedReport) => {
    setSelectedReport(report);
    
    // Aplicar configuración del reporte
    const config = report.configuration as any;
    if (config) {
      setSearchTerm(config.searchTerm || "");
      setDepartmentFilter(config.departmentFilter || "all");
      setFormFilter(config.formFilter || "all");
      setUserFilter(config.userFilter || "all");
      if (config.dateRange) {
        // Convertir fechas de string a objetos Date
        const dateRange: DateRange = {
          from: config.dateRange.from ? new Date(config.dateRange.from) : undefined,
          to: config.dateRange.to ? new Date(config.dateRange.to) : undefined
        };
        setDateRange(dateRange);
      } else {
        setDateRange(undefined);
      }
      setCustomReport(config.customReport || false);
      
      if (config.customColumns) {
        setCustomColumns(config.customColumns);
      }
      
      if (config.customPersonnelFilter) {
        setCustomPersonnelFilter(config.customPersonnelFilter);
      }
    }
    
    toast({
      title: "Reporte cargado",
      description: `Se ha cargado el reporte "${report.name}"`,
    });
    
    setLoadReportDialogOpen(false);
  };

  // Editar un reporte guardado
  const handleEditReport = () => {
    if (selectedReport) {
      saveReportForm.reset({
        name: selectedReport.name,
        description: selectedReport.description || "",
        isPublic: selectedReport.isPublic || false
      });
      setIsEditingReport(true);
      setSaveReportDialogOpen(true);
    }
  };
  
  // Submissions by date (last 7 days)
  const getDateRangeData = () => {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    
    const dateMap: Record<string, number> = {};
    
    // Initialize all dates in range
    for (let d = new Date(sevenDaysAgo); d <= now; d.setDate(d.getDate() + 1)) {
      dateMap[formatDateString(new Date(d))] = 0;
    }
    
    // Count submissions by date
    processedEntries.forEach(entry => {
      const entryDate = formatDateString(new Date(entry.createdAt));
      if (new Date(entryDate) >= sevenDaysAgo && new Date(entryDate) <= now) {
        dateMap[entryDate] = (dateMap[entryDate] || 0) + 1;
      }
    });
    
    return Object.entries(dateMap).map(([date, count]) => ({
      date: format(new Date(date), "dd MMM", { locale: es }),
      count
    }));
  };

  // Forms by usage
  const getFormUsageData = () => {
    const formMap: Record<string, number> = {};
    
    processedEntries.forEach(entry => {
      const formName = entry.formName || `Formulario ${entry.formTemplateId}`;
      formMap[formName] = (formMap[formName] || 0) + 1;
    });
    
    return Object.entries(formMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 forms
  };

  // Submissions by user
  const getUserActivityData = () => {
    const userMap: Record<string, number> = {};
    
    processedEntries.forEach(entry => {
      const userName = entry.userName || `Usuario ${entry.createdBy}`;
      userMap[userName] = (userMap[userName] || 0) + 1;
    });
    
    return Object.entries(userMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 users
  };

  const lineData = getDateRangeData();
  const barData = getFormUsageData();
  const userActivityData = getUserActivityData();

  return (
    <MainLayout title="Reportes">
      <div className="space-y-6">
        {/* Botones para guardar/cargar reportes */}
        <div className="flex justify-end space-x-2">
          <Button 
            variant="outline" 
            onClick={() => setLoadReportDialogOpen(true)}
          >
            <FolderOpen className="h-4 w-4 mr-2" />
            Cargar reporte guardado
          </Button>
          <Button 
            variant="default" 
            onClick={handleSaveReport}
          >
            <Save className="h-4 w-4 mr-2" />
            Guardar reporte actual
          </Button>
        </div>
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Búsqueda</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-neutral-400" />
                  <Input
                    placeholder="Buscar..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Departamento</Label>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los departamentos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los departamentos</SelectItem>
                    {Array.from(new Set(processedEntries.map(e => e.department))).map(dept => (
                      <SelectItem key={dept} value={dept || ""}>
                        {dept || "Sin departamento"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Formulario</Label>
                <Select value={formFilter} onValueChange={setFormFilter}>
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
                <Label>Usuario</Label>
                <Select value={userFilter} onValueChange={setUserFilter}>
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
                <Label>Rango de fechas</Label>
                <div className="grid gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateRange && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "LLL dd, y", { locale: es })} -{" "}
                              {format(dateRange.to, "LLL dd, y", { locale: es })}
                            </>
                          ) : (
                            format(dateRange.from, "LLL dd, y", { locale: es })
                          )
                        ) : (
                          <span>Seleccionar fechas</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        locale={es}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              <div className="flex items-end space-x-2">
                <Button 
                  variant="default"
                  className="bg-primary"
                  onClick={() => {
                    toast({
                      title: "Filtros aplicados",
                      description: "Los datos han sido actualizados según los filtros seleccionados",
                    });
                  }}
                >
                  Procesar filtros
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setDepartmentFilter("all");
                    setFormFilter("all");
                    setUserFilter("all");
                    setDateRange(undefined);
                    toast({
                      title: "Filtros limpiados",
                      description: "Se han restablecido todos los filtros",
                    });
                  }}
                >
                  Limpiar filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Report Type Tabs */}
        <Tabs value={reportType} onValueChange={setReportType}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="submissions">Entradas de Formularios</TabsTrigger>
            <TabsTrigger value="analytics">Análisis y Gráficos</TabsTrigger>
          </TabsList>
          
          {/* Submissions Tab */}
          <TabsContent value="submissions">
            {selectedEntry ? (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Detalles de Entrada</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Formulario: {selectedEntry.formName}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={() => {
                      setSelectedEntry(null);
                    }}>
                      Volver
                    </Button>
                    <Button variant="outline" onClick={() => handleExport(selectedEntry, "excel")}>
                      <Download className="mr-2 h-4 w-4" />
                      Excel
                    </Button>
                    <Button variant="outline" onClick={() => handleExport(selectedEntry, "pdf")}>
                      <Download className="mr-2 h-4 w-4" />
                      PDF
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Información General</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Creado por</p>
                              <p>{selectedEntry.userName}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Departamento</p>
                              <p>{selectedEntry.department}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Fecha de creación</p>
                              <p>{new Date(selectedEntry.createdAt).toLocaleDateString("es-ES", {
                                year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                              })}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">ID de entrada</p>
                              <p>#{selectedEntry.id}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Acciones</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <Button className="w-full" onClick={() => handleExport(selectedEntry, "pdf")}>
                              <FileDown className="mr-2 h-4 w-4" />
                              Exportar a PDF
                            </Button>
                            <Button className="w-full" variant="outline" onClick={() => handleExport(selectedEntry, "excel")}>
                              <FileDown className="mr-2 h-4 w-4" />
                              Exportar a Excel
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Datos del Formulario</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="border rounded-md">
                        <div className="p-4 space-y-4">
                          {Object.entries(selectedEntry.data).map(([key, value]) => {
                            let displayValue = value;
                            
                            // Intentar formatear el valor de forma amigable
                            if (typeof value === 'object' && value !== null) {
                              if (Array.isArray(value)) {
                                displayValue = value.join(', ');
                              } else {
                                // Intentar extraer pares clave-valor
                                try {
                                  displayValue = Object.entries(value)
                                    .map(([k, v]) => `${k}: ${v}`)
                                    .join(', ');
                                } catch (e) {
                                  displayValue = JSON.stringify(value);
                                }
                              }
                            }
                            
                            // Obtener un nombre legible para la clave
                            const readableKey = formatFieldName(key);
                            
                            return (
                              <div key={key} className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2 border-b last:border-0">
                                <p className="font-medium">{readableKey}</p>
                                <p className="whitespace-pre-wrap">{String(displayValue)}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            ) : customReport ? (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Reporte Personalizado</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Configura las columnas y filtros específicos para tu reporte
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={() => setCustomReport(false)}>
                      Volver
                    </Button>
                    <Button variant="outline" onClick={() => handleExportCustomReport("excel")}>
                      <Download className="mr-2 h-4 w-4" />
                      Excel
                    </Button>
                    <Button variant="outline" onClick={() => handleExportCustomReport("pdf")}>
                      <Download className="mr-2 h-4 w-4" />
                      PDF
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Columnas a mostrar</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Selecciona las columnas que deseas incluir en el reporte personalizado
                        </p>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex flex-wrap gap-2">
                            {availableColumns.sort().map(column => (
                              <Badge 
                                key={column}
                                variant={customColumns.includes(column) ? "default" : "outline"}
                                className={cn(
                                  "cursor-pointer text-sm py-1.5 px-3",
                                  customColumns.includes(column) 
                                    ? "bg-primary hover:bg-primary/90" 
                                    : "hover:bg-secondary"
                                )}
                                onClick={() => {
                                  if (customColumns.includes(column)) {
                                    setCustomColumns(customColumns.filter(c => c !== column));
                                  } else {
                                    setCustomColumns([...customColumns, column]);
                                  }
                                }}
                              >
                                {column}
                                {customColumns.includes(column) && (
                                  <span className="ml-1.5">✓</span>
                                )}
                              </Badge>
                            ))}
                          </div>
                          <div className="mt-4">
                            <p className="text-sm font-medium mb-2">Columnas seleccionadas: {customColumns.length}</p>
                            <div className="flex justify-end space-x-2">
                              <Button 
                                variant="outline"
                                size="sm"
                                onClick={() => setCustomColumns([])}
                              >
                                Limpiar selección
                              </Button>
                              <Button 
                                variant="outline"
                                size="sm"
                                onClick={() => setCustomColumns(Array.from(availableColumns))}
                              >
                                Seleccionar todas
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Filtros específicos</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Filtrar por nombre de personal</Label>
                            <Input
                              placeholder="Nombre del personal"
                              value={customPersonnelFilter}
                              onChange={(e) => setCustomPersonnelFilter(e.target.value)}
                            />
                            <p className="text-sm text-muted-foreground">
                              Ingresa el nombre exacto del personal para filtrar los datos
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>Vista previa del reporte</CardTitle>
                      <Button 
                        variant="default"
                        className="bg-primary"
                        onClick={() => {
                          toast({
                            title: "Reporte actualizado",
                            description: "Los datos se han filtrado según los criterios seleccionados",
                          });
                        }}
                      >
                        Procesar reporte
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <DataTable
                        columns={columns}
                        data={filteredEntries}
                        searchPlaceholder="Filtrar entradas..."
                        searchColumn="formName"
                      />
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            ) : showDetailReport && selectedFormTemplate ? (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Reporte Detallado: {selectedFormTemplate.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Departamento: {selectedFormTemplate.department}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={() => {
                      setShowDetailReport(false);
                      setSelectedFormTemplate(null);
                      setFormFilter("all");
                    }}>
                      Volver
                    </Button>
                    <Button variant="outline" onClick={() => handleExportAll("excel")}>
                      <Download className="mr-2 h-4 w-4" />
                      Excel
                    </Button>
                    <Button variant="outline" onClick={() => handleExportAll("pdf")}>
                      <Download className="mr-2 h-4 w-4" />
                      PDF
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={columns}
                    data={filteredEntries}
                    searchPlaceholder="Filtrar entradas..."
                    searchColumn="formName"
                  />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Entradas de Formularios</CardTitle>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={handleGenerateCustomReport}
                      className="mr-2"
                    >
                      <Settings2 className="mr-2 h-4 w-4" />
                      Reporte Personalizado
                    </Button>
                    <Button variant="outline" onClick={() => handleExportAll("excel")}>
                      <Download className="mr-2 h-4 w-4" />
                      Excel
                    </Button>
                    <Button variant="outline" onClick={() => handleExportAll("pdf")}>
                      <Download className="mr-2 h-4 w-4" />
                      PDF
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={columns}
                    data={filteredEntries}
                    searchPlaceholder="Filtrar entradas..."
                    searchColumn="formName"
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Submissions by Department */}
              <Card>
                <CardHeader>
                  <CardTitle>Entradas por Departamento</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <div className="w-full max-w-xs h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Submissions by Date */}
              <Card>
                <CardHeader>
                  <CardTitle>Entradas Diarias (Últimos 7 días)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={lineData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="count" 
                          name="Entradas" 
                          stroke="#1976d2" 
                          strokeWidth={2} 
                          activeDot={{ r: 8 }} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Top Forms by Usage */}
              <Card>
                <CardHeader>
                  <CardTitle>Formularios Más Utilizados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={barData}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          width={150}
                          tickFormatter={(value) => 
                            value.length > 15 ? `${value.substring(0, 15)}...` : value
                          }
                        />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" name="Entradas" fill="#4caf50" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* User Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Usuarios Más Activos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={userActivityData}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          width={100}
                        />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" name="Entradas" fill="#f50057" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Diálogo para guardar reporte */}
      <Dialog open={saveReportDialogOpen} onOpenChange={setSaveReportDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isEditingReport ? "Editar reporte guardado" : "Guardar configuración de reporte"}</DialogTitle>
            <DialogDescription>
              Guarda la configuración actual del reporte para utilizarla más tarde.
            </DialogDescription>
          </DialogHeader>
          <Form {...saveReportForm}>
            <form onSubmit={saveReportForm.handleSubmit(handleSubmitSaveReport)} className="space-y-4">
              <FormField
                control={saveReportForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre del reporte" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={saveReportForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Descripción breve" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={saveReportForm.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Público</FormLabel>
                      <FormDescription>
                        Permite que otros usuarios vean este reporte guardado
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setSaveReportDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {isEditingReport ? "Actualizar" : "Guardar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo para cargar reporte guardado */}
      <Dialog open={loadReportDialogOpen} onOpenChange={setLoadReportDialogOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Reportes guardados</DialogTitle>
            <DialogDescription>
              Selecciona un reporte guardado para cargarlo
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingSavedReports ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : !savedReports || savedReports.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">No hay reportes guardados</p>
            </div>
          ) : (
            <div className="max-h-[400px] overflow-auto pr-2">
              {savedReports.map(report => (
                <Card key={report.id} className="mb-3">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{report.name}</CardTitle>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLoadReport(report)}
                          title="Cargar reporte"
                        >
                          <FolderOpen className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedReport(report);
                            handleEditReport();
                          }}
                          title="Editar reporte"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedReport(report);
                            handleDeleteReport();
                          }}
                          title="Eliminar reporte"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    {report.description && (
                      <p className="text-sm text-muted-foreground mb-2">{report.description}</p>
                    )}
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <span>Creado: {new Date(report.createdAt || "").toLocaleDateString("es-ES")}</span>
                      {report.isPublic && <Badge variant="outline">Público</Badge>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal para selección de campos */}
      {fieldSelectorOpen && templateForFields && (
        <FieldsSelectorModal 
          isOpen={fieldSelectorOpen}
          onClose={() => setFieldSelectorOpen(false)}
          template={templateForFields}
          onSave={handleFieldSelection}
          initialSelectedFields={selectedFields}
        />
      )}
    </MainLayout>
  );
}