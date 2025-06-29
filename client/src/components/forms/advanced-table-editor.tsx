import React, { useState, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter 
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertCircle, 
  Plus, 
  Trash, 
  Pencil, 
  Save, 
  LayoutGrid, 
  CopyPlus, 
  Check, 
  Bookmark,
  ListChecks,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  LayoutTemplate,
  FileSpreadsheet,
  Thermometer
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";

// Tipos para la configuración de tabla avanzada 
interface ColumnDefinition {
  id: string;
  header: string;
  width?: string;
  type: "text" | "number" | "select" | "checkbox" | "date" | "time" | "employee" | "product";
  span?: number;
  rowspan?: number;
  readOnly?: boolean;
  calculated?: boolean; // Indica si el campo se calcula automáticamente
  employeeType?: string; // Para filtrar por tipo de empleado si es necesario
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    required?: boolean;
  };
  options?: {
    label: string;
    value: string;
  }[];
  // Configuración para campos auto-calculados
  dependency?: {
    sourceColumn?: string; // ID de la columna de la que depende
    sourceType?: "product" | "quantity"; // Tipo de dato fuente (producto o cantidad)
    calculationType?: "price" | "total" | "weight" | "tax"; // Tipo de cálculo a realizar
    factor?: number; // Factor opcional para multiplicar/dividir
  };
}

interface TableSection {
  title: string;
  colspan?: number;
  columns: ColumnDefinition[];
}

export interface AdvancedTableConfig {
  rows?: number;
  dynamicRows?: boolean;
  sections?: TableSection[];
  initialData?: Record<string, any>[];
}

interface AdvancedTableEditorProps {
  value: AdvancedTableConfig;
  onChange: (value: AdvancedTableConfig) => void;
  preview?: boolean;
}

// Definición de factores de conversión para cada producto
// Cada producto define cuántos kilos de cada materia prima se necesitan por 100 litros
// Los valores están basados en los ejemplos proporcionados por el usuario
const PRODUCT_MATERIALS = {
  "Mielmex 65° Brix": {
    "Leche de Vaca": 0,
    "Leche de Cabra": 1.0,  // 100/100 litros
    "Azúcar": 0.18,         // 18/100 litros
    "Glucosa": 0,
    "Malto": 0,
    "Bicarbonato": 0.0016,  // 0.16/100 litros
    "Sorbato": 0.0005,      // 0.05/100 litros
    "Lecitina": 0,
    "Carragenina": 0,
    "Grasa": 0,
    "Pasta": 0,
    "Antiespumante": 0,
    "Nuez": 0
  },
  "Coro 68° Brix": {
    "Leche de Vaca": 0.2,   // 20/100 litros
    "Leche de Cabra": 0.8,  // 80/100 litros
    "Azúcar": 0.18,         // 18/100 litros
    "Glucosa": 0,
    "Malto": 0,
    "Bicarbonato": 0.0016,  // 0.16/100 litros
    "Sorbato": 0,
    "Lecitina": 0,
    "Carragenina": 0,
    "Grasa": 0,
    "Pasta": 0,
    "Antiespumante": 0,
    "Nuez": 0
  },
  "Cajeton Esp Chepo": {
    "Leche de Vaca": 0,
    "Leche de Cabra": 1.0,  // 100/100 litros
    "Azúcar": 0.2,          // 20/100 litros
    "Glucosa": 0.27,        // 27/100 litros
    "Malto": 0.05,          // 5.0/100 litros
    "Bicarbonato": 0.0018,  // 0.18/100 litros
    "Sorbato": 0.0001,      // 0.01/100 litros  
    "Lecitina": 0.00001,    // 0.001/100 litros
    "Carragenina": 0.00001, // 0.001/100 litros
    "Grasa": 0.00001,       // 0.001/100 litros
    "Pasta": 0,
    "Antiespumante": 0,
    "Nuez": 0.00001         // 0.001/100 litros
  },
  "Cajeton Tradicional": {
    "Leche de Vaca": 0,
    "Leche de Cabra": 1.0,   // 100/100 litros
    "Azúcar": 0.2,           // 20/100 litros
    "Glucosa": 0.27,         // 27/100 litros
    "Malto": 0.05,           // 5.0/100 litros
    "Bicarbonato": 0.0016,   // 0.16/100 litros
    "Sorbato": 0.001,        // 0.10/100 litros
    "Lecitina": 0,
    "Carragenina": 0,
    "Grasa": 0,
    "Pasta": 0,
    "Antiespumante": 0,
    "Nuez": 0
  },
  "Cabri Tradicional": {
    "Leche de Vaca": 0,
    "Leche de Cabra": 1.0,
    "Azúcar": 0.20,
    "Glucosa": 0,
    "Malto": 0,
    "Bicarbonato": 0.01,
    "Sorbato": 0,
    "Lecitina": 0,
    "Carragenina": 0,
    "Grasa": 0,
    "Pasta": 0,
    "Antiespumante": 0,
    "Nuez": 0
  },
  "Cabri Espesa": {
    "Leche de Vaca": 0,
    "Leche de Cabra": 1.0,
    "Azúcar": 0.22,
    "Glucosa": 0.05,
    "Malto": 0,
    "Bicarbonato": 0.01,
    "Sorbato": 0,
    "Lecitina": 0,
    "Carragenina": 0,
    "Grasa": 0,
    "Pasta": 0,
    "Antiespumante": 0,
    "Nuez": 0
  },
  "Horneable": {
    "Leche de Vaca": 0.10,
    "Leche de Cabra": 0.10,
    "Azúcar": 0.22,
    "Glucosa": 0.10,
    "Malto": 0,
    "Bicarbonato": 0.01,
    "Sorbato": 0,
    "Lecitina": 0,
    "Carragenina": 0,
    "Grasa": 0,
    "Pasta": 0,
    "Antiespumante": 0,
    "Nuez": 0
  },
  "Gloria untable 78° Brix": {
    "Leche de Vaca": 0.90,
    "Leche de Cabra": 0,
    "Azúcar": 0.25,
    "Glucosa": 0.18,
    "Malto": 0,
    "Bicarbonato": 0.015,
    "Sorbato": 0,
    "Lecitina": 0,
    "Carragenina": 0.003,
    "Grasa": 0,
    "Pasta": 0,
    "Antiespumante": 0,
    "Nuez": 0
  },
  "Gloria untable 80° Brix": {
    "Leche de Vaca": 0.90,
    "Leche de Cabra": 0,
    "Azúcar": 0.28,
    "Glucosa": 0.20,
    "Malto": 0,
    "Bicarbonato": 0.015,
    "Sorbato": 0,
    "Lecitina": 0,
    "Carragenina": 0.004,
    "Grasa": 0,
    "Pasta": 0,
    "Antiespumante": 0,
    "Nuez": 0
  },
  "Pasta DGL": {
    "Leche de Vaca": 0.80,
    "Leche de Cabra": 0,
    "Azúcar": 0.25,
    "Glucosa": 0.15,
    "Malto": 0,
    "Bicarbonato": 0.02,
    "Sorbato": 0,
    "Lecitina": 0.006,
    "Carragenina": 0,
    "Grasa": 0,
    "Pasta": 0,
    "Antiespumante": 0,
    "Nuez": 0
  },
  "Conito": {
    "Leche de Vaca": 0.20,
    "Leche de Cabra": 0.75,
    "Azúcar": 0.22,
    "Glucosa": 0.12,
    "Malto": 0,
    "Bicarbonato": 0.01,
    "Sorbato": 0,
    "Lecitina": 0,
    "Carragenina": 0.003,
    "Grasa": 0,
    "Pasta": 0,
    "Antiespumante": 0,
    "Nuez": 0
  }
};

// Plantillas predefinidas para tipos comunes de tablas
const TABLE_TEMPLATES = [
  {
    name: "Tabla de Temperaturas",
    icon: <Thermometer className="h-4 w-4 mr-2" />,
    config: {
      rows: 7, 
      dynamicRows: false,
      sections: [
        {
          title: "Temperatura",
          colspan: 2,
          columns: [
            {
              id: "hora-column",
              header: "Hora",
              type: "text",
              width: "100px",
              readOnly: true
            },
            {
              id: "temp-column",
              header: "°C",
              type: "number",
              width: "80px",
              validation: {
                min: 0,
                max: 200
              }
            }
          ]
        }
      ],
      initialData: [
        { "hora-column": "Hora 0", "temp-column": "" },
        { "hora-column": "Hora 1", "temp-column": "" },
        { "hora-column": "Hora 2", "temp-column": "" },
        { "hora-column": "Hora 3", "temp-column": "" },
        { "hora-column": "Hora 4", "temp-column": "" }, 
        { "hora-column": "Hora 5", "temp-column": "" },
        { "hora-column": "Fin", "temp-column": "" }
      ]
    }
  },
  {
    name: "Análisis Microbiológico Horizontal",
    icon: <FileSpreadsheet className="h-4 w-4 mr-2" />,
    config: {
      rows: 3,
      dynamicRows: true,
      sections: [
        {
          title: "Análisis Microbiológico",
          columns: [
            {
              id: "a3e4f9fa-4e74-4964-8b55-932e45ffe3bd",
              header: "Fecha",
              type: "date",
              width: "120px"
            },
            {
              id: "a2a4db54-8b91-450e-abb2-56c5b5d35073",
              header: "Producto",
              type: "product",
              width: "150px"
            },
            {
              id: "c0a838ef-15a7-41fb-be00-d47bd19d0848",
              header: "Lote",
              type: "text",
              width: "100px"
            },
            {
              id: "a835a31b-235d-4f11-a4bf-66bd7e40afd7",
              header: "Fecha de caducidad",
              type: "date",
              width: "150px"
            },
            {
              id: "3084603f-e7b8-44c6-bde3-065b0c5b9dee",
              header: "Hongos y Levaduras",
              type: "select",
              width: "120px",
              options: [
                {
                  label: "Si",
                  value: "Si"
                },
                {
                  label: "No",
                  value: "No"
                },
                {
                  label: "NA",
                  value: "NA"
                }
              ]
            },
            {
              id: "ff43d9d4-165e-426c-a574-434da514d22a",
              header: "Coliformes",
              type: "select",
              width: "120px",
              options: [
                {
                  label: "Si",
                  value: "Si"
                },
                {
                  label: "No",
                  value: "No"
                },
                {
                  label: "NA",
                  value: "NA"
                }
              ]
            },
            {
              id: "28e24f6f-8a32-4ed4-9374-1ac60799bbde",
              header: "Staphylococos",
              type: "select",
              width: "120px",
              options: [
                {
                  label: "Si",
                  value: "Si"
                },
                {
                  label: "No",
                  value: "No"
                },
                {
                  label: "NA",
                  value: "NA"
                }
              ]
            },
            {
              id: "a4ce5ad3-2584-4049-8b59-a635f53da130",
              header: "Mesofilicos",
              type: "select",
              width: "120px",
              options: [
                {
                  label: "Si",
                  value: "Si"
                },
                {
                  label: "No",
                  value: "No"
                },
                {
                  label: "NA",
                  value: "NA"
                }
              ]
            },
            {
              id: "39c28f85-6d5b-4c00-9691-9e24197350fa",
              header: "Salmonella",
              type: "select",
              width: "120px",
              options: [
                {
                  label: "Si",
                  value: "Si"
                },
                {
                  label: "No",
                  value: "No"
                },
                {
                  label: "NA",
                  value: "NA"
                }
              ]
            }
          ]
        }
      ]
    }
  },
  {
    name: "Ficha Técnica de Producción",
    icon: <FileSpreadsheet className="h-4 w-4 mr-2" />,
    config: {
      rows: 13, // Para todas las materias primas
      dynamicRows: true,
      sections: [
        {
          title: "Proceso",
          columns: [
            { id: uuidv4(), header: "Proceso", type: "product", width: "200px" }
          ]
        },
        {
          title: "Materias Primas",
          columns: [
            { id: uuidv4(), header: "Materia Prima", type: "text", width: "200px", readOnly: true }
          ]
        }
      ]
    }
  },
  {
    name: "Ficha Técnica con Litros",
    icon: <FileSpreadsheet className="h-4 w-4 mr-2" />,
    config: {
      rows: 13, // Para todas las materias primas
      dynamicRows: false,
      sections: [
        {
          title: "Proceso general",
          columns: [
            { 
              id: uuidv4(), 
              header: "Proceso", 
              type: "product", 
              width: "200px"
            },
            { 
              id: uuidv4(), 
              header: "Litros", 
              type: "number", 
              width: "120px", 
              validation: { min: 0 } 
            }
          ]
        },
        {
          title: "Materia Prima",
          columns: [
            { 
              id: uuidv4(), 
              header: "Materia Prima", 
              type: "text", 
              width: "200px", 
              readOnly: true 
            },
            { 
              id: uuidv4(), 
              header: "Kilos", 
              type: "number", 
              width: "100px",
              dependency: {
                sourceType: "product", 
                calculationType: "weight"
              } 
            }
          ]
        }
      ]
    }
  },
  {
    name: "Análisis Microbiológico",
    icon: <Check className="h-4 w-4 mr-2" />,
    config: {
      rows: 5,
      dynamicRows: true,
      sections: [
        {
          title: "Información General",
          columns: [
            { 
              id: uuidv4(), 
              header: "Fecha", 
              type: "date", 
              width: "120px" 
            },
            { 
              id: uuidv4(), 
              header: "Producto", 
              type: "product", 
              width: "200px" 
            },
            { 
              id: uuidv4(), 
              header: "Folio", 
              type: "text", 
              width: "120px" 
            },
            { 
              id: uuidv4(), 
              header: "Fecha de Caducidad", 
              type: "date", 
              width: "150px" 
            }
          ]
        },
        {
          title: "Análisis Microbiológico",
          columns: [
            { 
              id: uuidv4(), 
              header: "Parámetro", 
              type: "text", 
              width: "200px",
              readOnly: true
            },
            { 
              id: uuidv4(), 
              header: "Resultado", 
              type: "select", 
              width: "120px",
              options: [
                { label: "Si", value: "Si" },
                { label: "No", value: "No" },
                { label: "NA", value: "NA" }
              ]
            },
            { 
              id: uuidv4(), 
              header: "Observaciones", 
              type: "text", 
              width: "300px" 
            }
          ]
        }
      ],
      initialData: []
    }
  },
  {
    name: "Tabla de Control de Proceso",
    icon: <ListChecks className="h-4 w-4 mr-2" />,
    config: {
      rows: 5,
      dynamicRows: true,
      sections: [
        {
          title: "Información",
          columns: [
            { id: uuidv4(), header: "Fecha", type: "date", width: "120px" },
            { id: uuidv4(), header: "Hora", type: "text", width: "100px" },
            { id: uuidv4(), header: "Responsable", type: "employee", width: "150px" }
          ]
        },
        {
          title: "Parámetros de Control",
          columns: [
            { id: uuidv4(), header: "pH", type: "number", validation: { min: 0, max: 14 } },
            { id: uuidv4(), header: "Temperatura (°C)", type: "number", validation: { min: 0, max: 100 } },
            { id: uuidv4(), header: "Observaciones", type: "text", width: "200px" }
          ]
        }
      ]
    }
  },
  {
    name: "Formato de Inspección",
    icon: <Check className="h-4 w-4 mr-2" />,
    config: {
      rows: 5,
      dynamicRows: true,
      sections: [
        {
          title: "Elemento",
          columns: [
            { id: uuidv4(), header: "Descripción", type: "text", width: "200px" }
          ]
        },
        {
          title: "Evaluación",
          columns: [
            { 
              id: uuidv4(), 
              header: "Cumple", 
              type: "select", 
              width: "100px",
              options: [
                { label: "Sí", value: "si" },
                { label: "No", value: "no" },
                { label: "N/A", value: "na" }
              ]
            },
            { id: uuidv4(), header: "Comentarios", type: "text", width: "250px" }
          ]
        }
      ]
    }
  },
  {
    name: "Tabla de Fermentación",
    icon: <Bookmark className="h-4 w-4 mr-2" />,
    config: {
      rows: 10,
      dynamicRows: true,
      sections: [
        {
          title: "Tiempo",
          columns: [
            { id: uuidv4(), header: "Fecha", type: "date", width: "120px" },
            { id: uuidv4(), header: "Hora", type: "text", width: "100px" }
          ]
        },
        {
          title: "Mediciones",
          columns: [
            { id: uuidv4(), header: "Temperatura (°C)", type: "number", validation: { min: 0, max: 100 } },
            { id: uuidv4(), header: "Densidad", type: "number", validation: { min: 0, max: 2 } },
            { id: uuidv4(), header: "pH", type: "number", validation: { min: 0, max: 14 } }
          ]
        },
        {
          title: "Control",
          columns: [
            { id: uuidv4(), header: "Responsable", type: "employee", width: "150px" },
            { id: uuidv4(), header: "Observaciones", type: "text", width: "200px" }
          ]
        }
      ]
    }
  }
];

// Pasos del asistente
const WIZARD_STEPS = [
  { id: "template", title: "Seleccionar Plantilla" },
  { id: "structure", title: "Estructura Básica" },
  { id: "columns", title: "Columnas" },
  { id: "preview", title: "Vista Previa" }
];

const AdvancedTableEditor: React.FC<AdvancedTableEditorProps> = ({
  value,
  onChange,
  preview = false
}) => {
  const { toast } = useToast();
  // Estado para el wizard
  const [wizardMode, setWizardMode] = useState<boolean>(true);
  const [currentStep, setCurrentStep] = useState<string>("template");
  
  // Estados tradicionales
  const [activeTab, setActiveTab] = useState<string>("templates");
  
  // Controla si cada pestaña ha sido cargada al menos una vez (para optimizar el rendimiento)
  const [tabsVisited, setTabsVisited] = useState<{[key: string]: boolean}>({
    templates: true,
    sections: false,
    preview: false,
    settings: false
  });
  
  // Referencia para el input de archivo de importación
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [editingSection, setEditingSection] = useState<number | null>(null);
  const [editingColumn, setEditingColumn] = useState<{sectionIndex: number, columnIndex: number} | null>(null);
  const [newSectionTitle, setNewSectionTitle] = useState<string>("");
  const [newColumnDetails, setNewColumnDetails] = useState<Partial<ColumnDefinition>>({
    id: uuidv4(),
    header: "",
    type: "text"
  });

  // Estado para la estructura básica en el wizard
  const [wizardBasicConfig, setWizardBasicConfig] = useState({
    tableName: "",
    numSections: 1,
    dynamicRows: true,
    initialRows: 3
  });

  // Estado para la vista previa
  const [previewData, setPreviewData] = useState<Record<string, any>[]>(
    (value && value.initialData) ? value.initialData : Array((value && value.rows) || 3).fill({}).map(() => ({}))
  );

  // Función para importar una plantilla JSON personalizada
  // Método para aplicar directamente la plantilla de Microbiología Horizontal
  // Versión súper simplificada que evita cualquier complejidad
  const handleApplyMicrobiologiaTemplate = () => {
    console.log("Aplicando plantilla de Microbiología - VERSIÓN SIMPLIFICADA EXTREMA");
    
    // Creamos objetos completamente nuevos en cada nivel para evitar referencias compartidas
    // y usamos tipos específicos en lugar de strings para evitar problemas de TypeScript
    const config = {
      rows: 3,
      dynamicRows: true,
      sections: [
        {
          title: "Análisis Microbiológico",
          columns: [
            { 
              id: "col1",
              header: "Fecha", 
              type: "date" as const, 
              width: "120px" 
            },
            { 
              id: "col2",
              header: "Producto", 
              type: "text" as const, 
              width: "150px" 
            },
            { 
              id: "col3",
              header: "Lote", 
              type: "text" as const, 
              width: "100px" 
            },
            { 
              id: "col4",
              header: "Hongos y Levaduras", 
              type: "select" as const, 
              width: "120px",
              options: [
                { label: "Si", value: "Si" },
                { label: "No", value: "No" },
                { label: "NA", value: "NA" }
              ]
            },
            { 
              id: "col5",
              header: "Coliformes", 
              type: "select" as const, 
              width: "120px",
              options: [
                { label: "Si", value: "Si" },
                { label: "No", value: "No" },
                { label: "NA", value: "NA" }
              ]
            }
          ]
        }
      ]
    };
    
    try {
      // Aplicamos la configuración directamente sin sanitización
      onChange(config);
      
      // Mensaje de éxito
      toast({
        title: "Plantilla aplicada",
        description: "Se aplicó la plantilla de Análisis Microbiológico exitosamente",
        variant: "default",
      });
      
      // Cambiar a la vista previa 
      setTimeout(() => {
        setActiveTab("preview");
        setTabsVisited(prev => ({...prev, preview: true}));
      }, 300); // Añadimos un pequeño retraso para mayor estabilidad
    } catch (error) {
      console.error("Error al aplicar plantilla:", error);
      toast({
        title: "Error",
        description: "No se pudo aplicar la plantilla. Intente de nuevo.",
        variant: "destructive",
      });
    }
  };
  
  const handleImportCustomTemplate = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Función para procesar el archivo seleccionado
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsedData = JSON.parse(content);
        
        // Intentar identificar la estructura correcta del archivo
        let config;
        
        if (parsedData && parsedData.advancedTableConfig) {
          // Formato 1: Objeto con propiedad advancedTableConfig
          config = parsedData.advancedTableConfig;
        } else if (parsedData && parsedData.sections) {
          // Formato 2: Configuración directa con secciones
          config = parsedData;
        } else if (Array.isArray(parsedData) && parsedData.length > 0 && parsedData[0].title) {
          // Formato 3: Array de secciones
          config = {
            rows: 5,
            dynamicRows: true,
            sections: parsedData
          };
        } else {
          throw new Error("Formato de archivo no reconocido");
        }
        
        // Asegurarse de hacer una copia profunda para evitar problemas de referencia
        const safeConfig = JSON.parse(JSON.stringify(config));
        
        // Aplicar la configuración importada y hacer una copia profunda
        // Sanitizar la configuración
        const sanitizedConfig = sanitizeTableConfig(safeConfig);
        
        console.log("Aplicando configuración sanitizada:", sanitizedConfig);
        
        // Aplicar usando updateValue con retraso
        setTimeout(() => {
          updateValue(sanitizedConfig);
        }, 150);
        
        toast({
          title: "Plantilla importada",
          description: `Se importó "${parsedData.name || 'Plantilla personalizada'}" exitosamente`,
          variant: "default",
        });
        
        // Cambiar a la vista previa
        setActiveTab("preview");
        setTabsVisited(prev => ({...prev, preview: true}));
      } catch (error) {
        console.error("Error al procesar el archivo:", error);
        toast({
          title: "Error al importar",
          description: "El archivo no tiene el formato correcto: " + (error instanceof Error ? error.message : "Error desconocido"),
          variant: "destructive",
        });
      }
      
      // Limpiar el input para permitir seleccionar el mismo archivo nuevamente
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    
    reader.readAsText(file);
  };
  
  // Función para limpiar y validar configuración de tabla
  const sanitizeTableConfig = useCallback((config: Partial<AdvancedTableConfig>): AdvancedTableConfig => {
    // Si no hay configuración, crear una por defecto
    if (!config) {
      return { 
        rows: 3, 
        dynamicRows: true, 
        sections: [{ 
          title: "Sección 1", 
          columns: [{ id: uuidv4(), header: "Columna 1", type: "text" }] 
        }] 
      };
    }
    
    try {
      // Crear copia profunda para evitar modificar el original
      const sanitized = JSON.parse(JSON.stringify(config));
      
      // Asegurar que properties requeridas existan
      sanitized.rows = sanitized.rows || 3;
      sanitized.dynamicRows = sanitized.dynamicRows !== undefined ? sanitized.dynamicRows : true;
      sanitized.sections = sanitized.sections || [];
      
      // Sanitizar cada sección
      sanitized.sections = sanitized.sections.map((section: TableSection) => {
        return {
          ...section,
          title: section.title || "Sección",
          columns: (section.columns || []).map((col: any) => ({
            id: col.id || uuidv4(),
            header: col.header || "Columna",
            type: col.type || "text",
            width: col.width || "150px",
            ...(col.options ? { options: col.options } : {}),
            ...(col.validation ? { validation: col.validation } : {})
          }))
        };
      });
      
      return sanitized as AdvancedTableConfig;
    } catch (error) {
      console.error("Error al sanitizar la configuración de la tabla:", error);
      // En caso de error, devolver una configuración básica
      return { 
        rows: 3, 
        dynamicRows: true, 
        sections: [{ 
          title: "Sección 1", 
          columns: [{ id: uuidv4(), header: "Columna 1", type: "text" }] 
        }] 
      };
    }
  }, []);
  
  // Función simple para establecer un valor de tabla predefinido
  const setFixedTemplateValue = useCallback((templateName: string) => {
    try {
      // Buscar la plantilla por nombre
      const template = TABLE_TEMPLATES.find(t => t.name === templateName);
      
      if (!template) {
        console.error(`Plantilla "${templateName}" no encontrada`);
        return;
      }
      
      // Crear una copia profunda de la configuración
      const config = JSON.parse(JSON.stringify(template.config));
      
      console.log(`Aplicando plantilla "${templateName}" directamente:`, config);
      
      // Enviar directamente la configuración al padre
      onChange(config);
      
      toast({
        title: "Plantilla aplicada",
        description: `Se ha aplicado la plantilla: ${templateName}`,
      });
      
      // Cambiar a la pestaña de secciones después de aplicar
      setActiveTab("preview");
      setTabsVisited(prev => ({...prev, preview: true}));
      
    } catch (error) {
      console.error("Error al aplicar plantilla fija:", error);
      toast({
        title: "Error al aplicar plantilla",
        description: "Ocurrió un error al aplicar la plantilla seleccionada",
        variant: "destructive",
      });
    }
  }, [onChange, toast, setActiveTab]);
  
  // Función para actualizar valor
  const updateValue = useCallback((newValue: Partial<AdvancedTableConfig>) => {
    try {
      // Modificación crítica: Ahora tomamos en cuenta los datos existentes
      // Si solo actualizamos initialData o ciertos campos, preservamos la estructura actual
      const currentValue = value || {};
      
      // Combinar con valores actuales cuando sea una actualización parcial
      // Si tiene initialData pero no sections, preservar la estructura existente
      const hasOnlyInitialData = newValue.initialData && !newValue.sections;
      
      let combinedValue: any;
      
      if (hasOnlyInitialData && currentValue.sections) {
        // Caso especial para cambios en solo initialData (mantener estructura)
        console.log("updateValue - Preservando estructura existente al actualizar datos");
        combinedValue = {
          ...currentValue,
          initialData: newValue.initialData,
          rows: newValue.rows || currentValue.rows,
        };
      } else {
        // Cualquier otro caso, usar el nuevo valor pero convertirlo en un valor completo de tabla
        console.log("updateValue - Usando nueva configuración completa");
        combinedValue = {
          rows: newValue.rows || currentValue.rows || 3,
          dynamicRows: newValue.dynamicRows !== undefined ? newValue.dynamicRows : currentValue.dynamicRows,
          sections: newValue.sections || currentValue.sections || [],
          initialData: newValue.initialData || currentValue.initialData
        };
      }
      
      // Crear una copia profunda del valor combinado
      const safeValue = JSON.parse(JSON.stringify(combinedValue));
      
      // Enviar directamente sin delay
      onChange(safeValue);
    } catch (error) {
      console.error("Error al actualizar el valor de la tabla:", error);
      // Intentar al menos establecer algo
      onChange(newValue);
    }
  }, [onChange, value]);

  // Agregar una nueva sección
  const addSection = () => {
    if (!newSectionTitle.trim()) return;
    
    const newSections = [...((value && value.sections) || []), {
      title: newSectionTitle,
      colspan: 1,
      columns: []
    }];
    
    updateValue({ sections: newSections });
    setNewSectionTitle("");
  };

  // Eliminar una sección
  const removeSection = (index: number) => {
    const newSections = [...((value && value.sections) || [])];
    newSections.splice(index, 1);
    updateValue({ sections: newSections });
  };

  // Actualizar sección
  const updateSection = (index: number, updates: Partial<TableSection>) => {
    // Verificar parámetros de entrada
    if (index === null || index === undefined) return;
    if (!updates) return;
    
    const newSections = [...((value && value.sections) || [])];
    if (!newSections[index]) return;
    
    // Crear copia profunda para asegurar que cambien todas las referencias
    newSections[index] = { 
      ...newSections[index], 
      ...updates,
      // Asegurar que estos campos estén definidos
      title: updates.title !== undefined ? updates.title : newSections[index].title,
      colspan: updates.colspan !== undefined ? updates.colspan : newSections[index].colspan
    };
    
    console.log("Actualizando sección:", index, updates, newSections);
    updateValue({ sections: newSections });
  };

  // Agregar columna a sección
  const addColumn = (sectionIndex: number) => {
    if (!newColumnDetails.header?.trim()) return;
    
    const newSections = [...((value && value.sections) || [])];
    const newColumn: ColumnDefinition = {
      id: newColumnDetails.id || uuidv4(),
      header: newColumnDetails.header || "Nueva columna",
      type: newColumnDetails.type || "text",
      width: newColumnDetails.width,
      span: newColumnDetails.span,
      rowspan: newColumnDetails.rowspan,
      readOnly: newColumnDetails.readOnly,
      validation: newColumnDetails.validation,
      options: newColumnDetails.options
    };
    
    if (!newSections[sectionIndex]) {
      newSections[sectionIndex] = {
        title: "Nueva Sección",
        columns: []
      };
    }
    
    newSections[sectionIndex].columns.push(newColumn);
    updateValue({ sections: newSections });
    
    // Resetear estado
    setNewColumnDetails({
      id: uuidv4(),
      header: "",
      type: "text"
    });
  };

  // Eliminar columna
  const removeColumn = (sectionIndex: number, columnIndex: number) => {
    const newSections = [...((value && value.sections) || [])];
    newSections[sectionIndex].columns.splice(columnIndex, 1);
    updateValue({ sections: newSections });
  };

  // Actualizar columna
  const updateColumn = (sectionIndex: number, columnIndex: number, updates: Partial<ColumnDefinition>) => {
    const newSections = [...((value && value.sections) || [])];
    newSections[sectionIndex].columns[columnIndex] = {
      ...newSections[sectionIndex].columns[columnIndex],
      ...updates
    };
    updateValue({ sections: newSections });
  };

  // Generar un template para la vista previa
  const handleUpdateRows = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rows = parseInt(e.target.value);
    if (!isNaN(rows) && rows > 0) {
      // Crear un objeto completamente nuevo con todas las propiedades actuales
      const newConfig = {
        ...value,  // Mantener todas las propiedades existentes
        rows: rows  // Sobrescribir solo el número de filas
      };
      
      // Usar directamente onChange en lugar de updateValue
      console.log("Cambiando número de filas a:", rows);
      onChange(newConfig);
      
      // Actualizar los datos de vista previa
      if (rows > previewData.length) {
        setPreviewData([...previewData, ...Array(rows - previewData.length).fill({})]);
      } else if (rows < previewData.length) {
        setPreviewData(previewData.slice(0, rows));
      }
    }
  };

  // Función auxiliar para actualizar materias primas basadas en producto y litros
  const updateMateriaPrimasByProductoLitros = (data: Record<string, any>[], sections: TableSection[]) => {
    if (!sections || sections.length < 2) return;
    
    // Obtenemos las secciones necesarias
    const procesoSection = sections[0];
    const materiaPrimaSection = sections[1];
    
    if (!procesoSection || !materiaPrimaSection) return;
    
    // Buscar columnas relevantes
    const productoColumn = procesoSection.columns.find(c => c.type === 'product');
    const litrosColumn = procesoSection.columns.find(c => 
      c.header.toLowerCase().includes('litro') || 
      c.header.toLowerCase().includes('liter')
    );
    
    if (!productoColumn || !litrosColumn) return;
    
    // Obtener valores actuales
    const productoValue = data[0]?.[productoColumn.id];
    const litrosValue = parseFloat(data[0]?.[litrosColumn.id] || '0');
    
    console.log("updateMateriaPrimasByProductoLitros", { productoValue, litrosValue });
    
    // Solo proceder si tenemos un producto válido y valor de litros positivo
    if (!productoValue || 
        litrosValue <= 0 || 
        typeof productoValue !== 'string' || 
        !(productoValue in PRODUCT_MATERIALS)) {
      return;
    }
    
    // Obtenemos las materias primas para este producto
    const materiaPrimasObj = PRODUCT_MATERIALS[productoValue as keyof typeof PRODUCT_MATERIALS];
    const materiasPrimas = Object.keys(materiaPrimasObj);
    
    // Columnas para materias primas
    const materiaPrimaColumn = materiaPrimaSection.columns[0];
    const kilosColumn = materiaPrimaSection.columns[1];
    
    if (!materiaPrimaColumn || !kilosColumn) return;
    
    // Actualizamos cada materia prima
    materiasPrimas.forEach((materiaPrima, idx) => {
      const rowIdx = idx + 1; // +1 porque la fila 0 es para el proceso
      
      // Crear la fila si no existe
      if (!data[rowIdx]) {
        data[rowIdx] = {};
      }
      
      // Coeficiente para este material
      const coeficiente = materiaPrimasObj[materiaPrima as keyof typeof materiaPrimasObj];
      
      // Actualizar valores
      data[rowIdx][materiaPrimaColumn.id] = materiaPrima;
      data[rowIdx][kilosColumn.id] = (coeficiente * litrosValue).toFixed(3);
    });
  };

  // Actualizar celda en la vista previa
  const updateCell = (rowIndex: number, columnId: string, value: any) => {
    console.log(`Actualizando celda en fila ${rowIndex}, columna ${columnId}`, value);
    
    const newData = [...previewData];
    if (!newData[rowIndex]) {
      newData[rowIndex] = {};
    }
    
    // Almacenar el valor original
    newData[rowIndex][columnId] = value;
    
    // Verificar si estamos en un formulario con secciones y tenemos que calcular dependencias
    const sections = value?.sections || (value && value.sections);
    
    if (sections && sections.length >= 2) {
      console.log("Procesando cálculo de materias primas en formulario multi-sección");
      
      // Si es un campo de tipo producto o litros, calculamos las materias primas
      const procesoSection = sections[0];
      const materiaPrimaSection = sections[1];
      
      if (procesoSection && materiaPrimaSection) {
        // Buscar índice de columnas de producto y litros
        const productoColIndex = procesoSection.columns.findIndex((c: ColumnDefinition) => c.type === "product");
        const litrosColIndex = procesoSection.columns.findIndex((c: ColumnDefinition) => 
          c.header.toLowerCase().includes("litro") || 
          c.header.toLowerCase().includes("liter")
        );
        
        console.log(`Encontradas columnas: Producto (${productoColIndex}), Litros (${litrosColIndex})`);
        
        // Solo si se actualizaron las columnas relevantes
        const productoColumn = productoColIndex >= 0 ? procesoSection.columns[productoColIndex] : null;
        const litrosColumn = litrosColIndex >= 0 ? procesoSection.columns[litrosColIndex] : null;
        
        if (productoColumn && litrosColumn) {
          // Obtenemos valores actuales de producto y litros
          const productoValue = newData[0]?.[productoColumn.id];
          const litrosValue = parseFloat(newData[0]?.[litrosColumn.id] || "0");
          
          console.log(`Valores actuales: Producto="${productoValue}", Litros=${litrosValue}`);
          
          // Si tenemos producto y litros, calculamos cada materia prima
          if (productoValue && litrosValue > 0 && typeof productoValue === 'string' && productoValue in PRODUCT_MATERIALS) {
            console.log(`Calculando materias primas para ${productoValue} con ${litrosValue} litros`);
            
            // Para cada materia prima en el producto
            const materiaPrimasObj = PRODUCT_MATERIALS[productoValue as keyof typeof PRODUCT_MATERIALS];
            const materiasPrimas = Object.keys(materiaPrimasObj);
            
            console.log(`Encontradas ${materiasPrimas.length} materias primas`);
            
            // Actualizar cada materia prima en la tabla
            let rowIdx = 0;
            materiasPrimas.forEach((materiaPrima) => {
              // Coeficiente para este material (kg por litro)
              const coeficiente = materiaPrimasObj[materiaPrima as keyof typeof materiaPrimasObj];
              
              // Columnas de materia prima y kilos
              const materiaPrimaColumn = materiaPrimaSection.columns[0];
              const kilosColumn = materiaPrimaSection.columns[1];
              
              // Si no existe esta fila, la creamos
              if (!newData[rowIdx + 1]) {
                newData[rowIdx + 1] = {};
              }
              
              // Actualizar nombre de materia prima y kilos calculados
              const kilosCalculados = (coeficiente * litrosValue).toFixed(3);
              console.log(`Materia prima: ${materiaPrima}, coeficiente: ${coeficiente}, kilos: ${kilosCalculados}`);
              
              newData[rowIdx + 1][materiaPrimaColumn.id] = materiaPrima;
              newData[rowIdx + 1][kilosColumn.id] = kilosCalculados;
              
              rowIdx++;
            });
            
            // Actualizar el número de filas si es necesario
            if (value && materiasPrimas.length + 1 > (value.rows || 0)) {
              updateValue({ rows: materiasPrimas.length + 1 });
            }
          }
        }
      }
    } else {
      // También verificar si un campo type="product" fue actualizado
      // Esta sección es para cuando se actualiza directamente una celda sin estar dentro de un objeto value
      const valueTable = value;
      if (valueTable && valueTable.sections && valueTable.sections.length >= 2) {
        // Verificar si la columna actual es de tipo "product" o "litros"
        let currentSection = -1;
        let currentColumnDef: ColumnDefinition | null = null;
        
        // Buscar la definición de la columna actual
        valueTable.sections.forEach((section: TableSection, sIdx: number) => {
          section.columns.forEach((column: ColumnDefinition, cIdx: number) => {
            if (column.id === columnId) {
              currentSection = sIdx;
              currentColumnDef = column;
            }
          });
        });
        
        // Si es columna de producto o litros, verificar y actualizar
        if (currentColumnDef) {
          // Caso especial: actualización directa de producto o litros
          updateMateriaPrimasByProductoLitros(newData, valueTable.sections);
        }
      }
    }
    
    // Actualizamos el estado y la configuración
    setPreviewData(newData);
    
    // También actualizar los datos iniciales en la configuración
    // CORRECCIÓN: Preservar estructura completa de la tabla
    const currentStructure = value || {};
    const completeValue = {
      ...currentStructure,    // Mantener toda la estructura existente
      initialData: newData    // Actualizar solo los datos
    };
    // Método seguro para enviar la estructura completa
    onChange(JSON.parse(JSON.stringify(completeValue)));
  };

  // Agregar fila en modo dinámico
  const addRow = () => {
    setPreviewData([...previewData, {}]);
    updateValue({ 
      initialData: [...previewData, {}],
      rows: ((value && value.rows) || previewData.length) + 1 
    });
  };

  // Eliminar fila en modo dinámico
  const removeRow = (index: number) => {
    const newData = [...previewData];
    newData.splice(index, 1);
    setPreviewData(newData);
    updateValue({ 
      initialData: newData,
      rows: Math.max(1, ((value && value.rows) || previewData.length) - 1)
    });
  };

  // Toggle para filas dinámicas
  const toggleDynamicRows = () => {
    // Crear un objeto completamente nuevo para evitar problemas de referencia
    const newConfig = {
      ...value,  // Copiamos todo el valor actual
      dynamicRows: !(value && value.dynamicRows) // Y sobrescribimos dynamicRows
    };
    
    // Usar directamente onChange en lugar de updateValue para garantizar que
    // se pase el objeto completo y no solo el campo dynamicRows
    console.log("Cambiando filas dinámicas a:", !(value && value.dynamicRows));
    onChange(newConfig);
  };

  // Duplicar columna
  const duplicateColumn = (sectionIndex: number, columnIndex: number) => {
    const newSections = [...((value && value.sections) || [])];
    const originalColumn = newSections[sectionIndex].columns[columnIndex];
    const newColumn = {
      ...originalColumn,
      id: uuidv4(),
      header: `${originalColumn.header} (copia)`
    };
    
    newSections[sectionIndex].columns.splice(columnIndex + 1, 0, newColumn);
    updateValue({ sections: newSections });
  };

  // Renderizar tabla especializada para proceso + materias primas
  const renderProcessMaterialsTable = () => {
    if (!value?.sections || value.sections.length !== 2) {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Configuración incorrecta</AlertTitle>
          <AlertDescription>
            Este formato requiere exactamente 2 secciones: Proceso y Materia Prima
          </AlertDescription>
        </Alert>
      );
    }
    
    const procesoSection = value.sections[0];
    const materiaPrimaSection = value.sections[1];
    
    if (!procesoSection || !materiaPrimaSection) return null;
    
    return (
      <div className="border rounded-md overflow-auto">
        <Table>
          <TableHeader>
            {/* Encabezados de sección */}
            <TableRow>
              <TableHead
                colSpan={procesoSection.columns.length}
                className="text-center bg-muted font-bold"
              >
                {procesoSection.title}
              </TableHead>
              <TableHead
                colSpan={materiaPrimaSection.columns.length}
                className="text-center bg-muted font-bold"
              >
                {materiaPrimaSection.title}
              </TableHead>
            </TableRow>
            
            {/* Encabezados de columnas */}
            <TableRow>
              {procesoSection.columns.map(column => (
                <TableHead
                  key={column.id}
                  style={{ width: column.width || 'auto' }}
                  className="text-center"
                >
                  {column.header}
                </TableHead>
              ))}
              {materiaPrimaSection.columns.map(column => (
                <TableHead
                  key={column.id}
                  style={{ width: column.width || 'auto' }}
                  className="text-center"
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          
          <TableBody>
            {/* Primera fila solo para proceso */}
            <TableRow>
              {/* Columnas de proceso */}
              {procesoSection.columns.map(column => (
                <TableCell key={`proceso-${column.id}`} className="p-1">
                  {column.type === 'product' && (
                    <Select
                      value={previewData[0]?.[column.id] || ''}
                      onValueChange={(productValue) => {
                        console.log("Seleccionado producto en vista previa:", productValue);
                        // Actualizar valor del producto
                        const newData = [...previewData];
                        if (!newData[0]) newData[0] = {};
                        newData[0][column.id] = productValue;
                        
                        // Buscar si hay un valor de litros ya ingresado
                        const litrosColumn = procesoSection.columns.find(c => 
                          c.header.toLowerCase().includes('litro') || 
                          c.id.toLowerCase().includes('litro')
                        );
                        
                        if (litrosColumn && litrosColumn.id) {
                          const litrosValue = parseFloat(newData[0][litrosColumn.id] || '0');
                          console.log("Valor de litros existente:", litrosValue);
                          
                          // Si ya hay litros y producto, calcular materias primas
                          if (litrosValue > 0 && productValue in PRODUCT_MATERIALS) {
                            const materiaPrimasObj = PRODUCT_MATERIALS[productValue as keyof typeof PRODUCT_MATERIALS];
                            const materiasPrimas = Object.keys(materiaPrimasObj);
                            
                            // Actualizamos cada materia prima
                            materiasPrimas.forEach((materiaPrima, idx) => {
                              const rowIdx = idx + 1; // +1 porque fila 0 es para proceso
                              if (!newData[rowIdx]) newData[rowIdx] = {};
                              
                              // Columnas de materia prima
                              const materiaPrimaColumn = materiaPrimaSection.columns[0];
                              const kilosColumn = materiaPrimaSection.columns[1];
                              
                              if (materiaPrimaColumn && kilosColumn) {
                                // Coeficiente para este material
                                const coeficiente = materiaPrimasObj[materiaPrima as keyof typeof materiaPrimasObj];
                                
                                // Actualizar valores en la vista previa
                                newData[rowIdx][materiaPrimaColumn.id] = materiaPrima;
                                newData[rowIdx][kilosColumn.id] = (coeficiente * litrosValue).toFixed(3);
                              }
                            });
                          }
                        }
                        
                        // Actualizar datos de la vista previa
                        setPreviewData(newData);
                        // También actualizar los datos iniciales
                        updateValue({ initialData: newData });
                      }}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Seleccionar producto..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pasta Oblea Coro">Pasta Oblea Coro</SelectItem>
                        <SelectItem value="Pasta Oblea Cajeton">Pasta Oblea Cajeton</SelectItem>
                        <SelectItem value="Coro 68° Brix">Coro 68° Brix</SelectItem>
                        <SelectItem value="Cajeton Tradicional">Cajeton Tradicional</SelectItem>
                        <SelectItem value="Mielmex 65° Brix">Mielmex 65° Brix</SelectItem>
                        <SelectItem value="Cabri Tradicional">Cabri Tradicional</SelectItem>
                        <SelectItem value="Cabri Espesa">Cabri Espesa</SelectItem>
                        <SelectItem value="Horneable">Horneable</SelectItem>
                        <SelectItem value="Gloria untable 78° Brix">Gloria untable 78° Brix</SelectItem>
                        <SelectItem value="Gloria untable 80° Brix">Gloria untable 80° Brix</SelectItem>
                        <SelectItem value="Pasta DGL">Pasta DGL</SelectItem>
                        <SelectItem value="Conito">Conito</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {column.type === 'number' && (
                    <Input
                      type="number"
                      value={previewData[0]?.[column.id] || ''}
                      onChange={(e) => {
                        const litrosValue = parseFloat(e.target.value || '0');
                        console.log("Valor de litros ingresado:", litrosValue);
                        
                        // Actualizar valor de litros
                        const newData = [...previewData];
                        if (!newData[0]) newData[0] = {};
                        newData[0][column.id] = e.target.value;
                        
                        // Buscar si hay un producto seleccionado
                        const productoColumn = procesoSection.columns.find(c => c.type === 'product');
                        
                        if (productoColumn && productoColumn.id) {
                          const productoValue = newData[0][productoColumn.id];
                          console.log("Producto seleccionado:", productoValue);
                          
                          // Si hay litros y producto, calcular materias primas
                          if (litrosValue > 0 && typeof productoValue === 'string' && productoValue in PRODUCT_MATERIALS) {
                            const materiaPrimasObj = PRODUCT_MATERIALS[productoValue as keyof typeof PRODUCT_MATERIALS];
                            const materiasPrimas = Object.keys(materiaPrimasObj);
                            
                            // Actualizamos cada materia prima
                            materiasPrimas.forEach((materiaPrima, idx) => {
                              const rowIdx = idx + 1; // +1 porque fila 0 es para proceso
                              if (!newData[rowIdx]) newData[rowIdx] = {};
                              
                              // Columnas de materia prima
                              const materiaPrimaColumn = materiaPrimaSection.columns[0];
                              const kilosColumn = materiaPrimaSection.columns[1];
                              
                              if (materiaPrimaColumn && kilosColumn) {
                                // Coeficiente para este material
                                const coeficiente = materiaPrimasObj[materiaPrima as keyof typeof materiaPrimasObj];
                                
                                // Actualizar valores en la vista previa
                                newData[rowIdx][materiaPrimaColumn.id] = materiaPrima;
                                newData[rowIdx][kilosColumn.id] = (coeficiente * litrosValue).toFixed(3);
                              }
                            });
                          }
                        }
                        
                        // Actualizar datos de la vista previa
                        setPreviewData(newData);
                        // También actualizar los datos iniciales
                        updateValue({ initialData: newData });
                      }}
                      readOnly={column.readOnly}
                      className="h-8"
                      min={column.validation?.min || 0}
                      max={column.validation?.max}
                    />
                  )}
                  {column.type !== 'product' && column.type !== 'number' && (
                    renderCellByType(column, 0)
                  )}
                </TableCell>
              ))}
              
              {/* Celdas de materia prima en la primera fila */}
              {materiaPrimaSection.columns.map(column => (
                <TableCell key={`mp-${column.id}`} className="p-1">
                  {column.type === 'text' && (
                    <Input
                      type="text"
                      value={previewData[0]?.[column.id] || ''}
                      onChange={(e) => updateCell(0, column.id, e.target.value)}
                      readOnly={column.readOnly}
                      className="h-8"
                    />
                  )}
                  {column.type === 'number' && (
                    <Input
                      type="number"
                      value={previewData[0]?.[column.id] || ''}
                      onChange={(e) => updateCell(0, column.id, e.target.value)}
                      readOnly={column.readOnly}
                      className="h-8"
                      min={column.validation?.min}
                      max={column.validation?.max}
                    />
                  )}
                </TableCell>
              ))}
            </TableRow>
            
            {/* Filas siguientes: celdas vacías para proceso y materias primas reales */}
            {Array(Math.max(0, ((value && value.rows) || 3) - 1)).fill(0).map((_, index) => {
              // El índice real es index + 1 porque empezamos desde la fila 2
              const rowIndex = index + 1;
              
              return (
                <TableRow key={`row-${rowIndex}`}>
                  {/* Columnas de proceso (vacías en las filas adicionales) */}
                  {procesoSection.columns.map(column => (
                    <TableCell key={`proceso-empty-${column.id}`} className="p-1 bg-gray-50">
                      {/* Vacío */}
                    </TableCell>
                  ))}
                  
                  {/* Columnas de materias primas */}
                  {materiaPrimaSection.columns.map(column => (
                    <TableCell key={`mp-${rowIndex}-${column.id}`} className="p-1">
                      {renderCellByType(column, rowIndex, 1)}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
            
            {/* Botón para agregar fila dinámica */}
            {(value && value.dynamicRows) && (
              <TableRow>
                <TableCell colSpan={procesoSection.columns.length + materiaPrimaSection.columns.length} className="text-center">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={addRow}
                    className="mt-2"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Agregar Fila
                  </Button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    );
  };
  
  // Renderiza el contenido de una celda según su tipo
  const renderCellByType = (column: ColumnDefinition, rowIndex: number, sectionIndex?: number) => {
    // Verificar si es un campo calculado (tiene dependencia)
    const isCalculated = !!column.dependency;
    const isReadOnly = column.readOnly || isCalculated;
    
    // Si el campo tiene dependencia calculada, aplicar estilo especial
    const calculatedClass = isCalculated ? "bg-blue-50" : "";
    
    switch (column.type) {
      case 'text':
        return (
          <Input
            type="text"
            value={previewData[rowIndex]?.[column.id] || ''}
            onChange={(e) => updateCell(rowIndex, column.id, e.target.value)}
            readOnly={isReadOnly}
            className={`h-8 ${calculatedClass}`}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={previewData[rowIndex]?.[column.id] || ''}
            onChange={(e) => {
              const newValue = e.target.value;
              updateCell(rowIndex, column.id, newValue);
              
              // Si es la columna de litros, hay que actualizar las materias primas
              if (column.header.toLowerCase().includes("litro") && value?.sections) {
                // Forzar la actualización de las materias primas
                updateCell(rowIndex, column.id, {
                  sections: value.sections,
                  ...value
                });
              }
            }}
            readOnly={isReadOnly}
            className={`h-8 ${calculatedClass}`}
            min={column.validation?.min}
            max={column.validation?.max}
          />
        );
      case 'select':
        return (
          <Select
            value={previewData[rowIndex]?.[column.id] || ''}
            onValueChange={(val) => updateCell(rowIndex, column.id, val)}
            disabled={isReadOnly}
          >
            <SelectTrigger className={`h-8 ${calculatedClass}`}>
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              {column.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'checkbox':
        return (
          <div className="flex justify-center">
            <Checkbox
              checked={previewData[rowIndex]?.[column.id] || false}
              onCheckedChange={(checked) => 
                updateCell(rowIndex, column.id, checked === true)
              }
              disabled={column.readOnly}
            />
          </div>
        );
      case 'date':
        return (
          <Input
            type="date"
            value={previewData[rowIndex]?.[column.id] || ''}
            onChange={(e) => updateCell(rowIndex, column.id, e.target.value)}
            readOnly={column.readOnly}
            className="h-8"
          />
        );
      case 'time':
        return (
          <Input
            type="time"
            value={previewData[rowIndex]?.[column.id] || ''}
            onChange={(e) => updateCell(rowIndex, column.id, e.target.value)}
            readOnly={column.readOnly}
            className="h-8"
          />
        );
      case 'product':
        return (
          <Select
            value={previewData[rowIndex]?.[column.id] || ''}
            onValueChange={(productValue) => {
              console.log("Seleccionado producto:", productValue);
              // Primero almacenamos el valor simple
              updateCell(rowIndex, column.id, productValue);
              
              // Luego verificamos si necesitamos actualizar materias primas
              if (value?.sections && value.sections.length >= 2) {
                // Obtenemos el valor actual de litros
                const litrosColumn = value.sections[0].columns.find(c => 
                  c.header.toLowerCase().includes('litro') || c.id.toLowerCase().includes('litro')
                );
                
                if (litrosColumn && litrosColumn.id) {
                  const litrosValue = parseFloat(previewData[rowIndex]?.[litrosColumn.id] || '0');
                  if (litrosValue > 0 && productValue in PRODUCT_MATERIALS) {
                    // Actualizamos directamente las materias primas con los valores actuales
                    updateMateriaPrimasByProductoLitros(previewData, value.sections);
                  }
                }
              }
            }}
            disabled={column.readOnly}
          >
            <SelectTrigger className={`h-8 ${calculatedClass}`}>
              <SelectValue placeholder="Seleccionar producto..." />
            </SelectTrigger>
            <SelectContent>
              {column.options?.length ? (
                column.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))
              ) : (
                <>
                  <SelectItem value="Pasta Oblea Coro">Pasta Oblea Coro</SelectItem>
                  <SelectItem value="Pasta Oblea Cajeton">Pasta Oblea Cajeton</SelectItem>
                  <SelectItem value="Coro 68° Brix">Coro 68° Brix</SelectItem>
                  <SelectItem value="Cajeton Tradicional">Cajeton Tradicional</SelectItem>
                  <SelectItem value="Mielmex 65° Brix">Mielmex 65° Brix</SelectItem>
                  <SelectItem value="Cabri Tradicional">Cabri Tradicional</SelectItem>
                  <SelectItem value="Cabri Espesa">Cabri Espesa</SelectItem>
                  <SelectItem value="Horneable">Horneable</SelectItem>
                  <SelectItem value="Gloria untable 78° Brix">Gloria untable 78° Brix</SelectItem>
                  <SelectItem value="Gloria untable 80° Brix">Gloria untable 80° Brix</SelectItem>
                  <SelectItem value="Pasta DGL">Pasta DGL</SelectItem>
                  <SelectItem value="Conito">Conito</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        );
      case 'employee':
        return (
          <Select
            value={previewData[rowIndex]?.[column.id] || ''}
            onValueChange={(val) => updateCell(rowIndex, column.id, val)}
            disabled={column.readOnly}
          >
            <SelectTrigger className={`h-8 ${calculatedClass}`}>
              <SelectValue placeholder="Seleccionar empleado..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ejemplo1">Empleado 1</SelectItem>
              <SelectItem value="ejemplo2">Empleado 2</SelectItem>
              <SelectItem value="ejemplo3">Empleado 3</SelectItem>
            </SelectContent>
          </Select>
        );
      default:
        return null;
    }
  };

  // Componente para renderizar la tabla de vista previa
  const TablePreview = () => {
    if (!value || !value.sections || value.sections.length === 0) {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Sin secciones</AlertTitle>
          <AlertDescription>
            Debe definir al menos una sección con columnas para visualizar la tabla.
          </AlertDescription>
        </Alert>
      );
    }
    
    // Verificar si tenemos exactamente dos secciones: proceso y materia prima
    const isProcessMaterialsTable = value.sections.length === 2 && 
      value.sections[0].title.toLowerCase().includes("proceso") && 
      value.sections[1].title.toLowerCase().includes("materia");
      
    // Si es una tabla especializada de proceso y materias primas, usar el renderizado especial
    if (isProcessMaterialsTable) {
      return renderProcessMaterialsTable();
    }

    const allColumns = value.sections.flatMap(section => section.columns);
    
    return (
      <div className="border rounded-md overflow-auto">
        <Table>
          {/* Encabezados de sección */}
          <TableHeader>
            <TableRow>
              {(value && value.sections) ? value.sections.map((section, idx) => (
                <TableHead
                  key={idx}
                  colSpan={section.colspan || section.columns.length}
                  className="text-center bg-muted font-bold"
                >
                  {section.title}
                </TableHead>
              )) : null}
            </TableRow>

            {/* Encabezados de columna */}
            <TableRow>
              {allColumns.map((column, idx) => (
                <TableHead
                  key={column.id}
                  colSpan={column.span || 1}
                  rowSpan={column.rowspan || 1}
                  style={{ width: column.width || 'auto' }}
                  className="text-center"
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {/* Filas de datos */}
            {Array((value && value.rows) || 3).fill(0).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                {allColumns.map((column) => (
                  <TableCell key={`${rowIndex}-${column.id}`} className="p-1">
                    {column.type === 'text' && (
                      <Input
                        type="text"
                        value={previewData[rowIndex]?.[column.id] || ''}
                        onChange={(e) => updateCell(rowIndex, column.id, e.target.value)}
                        readOnly={column.readOnly}
                        className="h-8"
                      />
                    )}
                    {column.type === 'number' && (
                      <Input
                        type="number"
                        value={previewData[rowIndex]?.[column.id] || ''}
                        onChange={(e) => updateCell(rowIndex, column.id, e.target.value)}
                        readOnly={column.readOnly}
                        className="h-8"
                        min={column.validation?.min}
                        max={column.validation?.max}
                      />
                    )}
                    {column.type === 'select' && (
                      <Select
                        value={previewData[rowIndex]?.[column.id] || ''}
                        onValueChange={(val) => updateCell(rowIndex, column.id, val)}
                        disabled={column.readOnly}
                      >
                        <SelectTrigger className={`h-8 ${column.calculated ? 'bg-blue-100' : ''}`}>
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          {column.options?.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {column.type === 'checkbox' && (
                      <div className="flex justify-center">
                        <Checkbox
                          checked={previewData[rowIndex]?.[column.id] || false}
                          onCheckedChange={(checked) => 
                            updateCell(rowIndex, column.id, checked === true)
                          }
                          disabled={column.readOnly}
                        />
                      </div>
                    )}
                    {column.type === 'date' && (
                      <Input
                        type="date"
                        value={previewData[rowIndex]?.[column.id] || ''}
                        onChange={(e) => updateCell(rowIndex, column.id, e.target.value)}
                        readOnly={column.readOnly}
                        className="h-8"
                      />
                    )}
                    {column.type === 'employee' && (
                      <Select
                        value={previewData[rowIndex]?.[column.id] || ''}
                        onValueChange={(val) => updateCell(rowIndex, column.id, val)}
                        disabled={column.readOnly}
                      >
                        <SelectTrigger className={`h-8 ${column.calculated ? 'bg-blue-100' : ''}`}>
                          <SelectValue placeholder="Seleccionar empleado..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ejemplo1">Empleado 1</SelectItem>
                          <SelectItem value="ejemplo2">Empleado 2</SelectItem>
                          <SelectItem value="ejemplo3">Empleado 3</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    {column.type === 'product' && (
                      <Select
                        value={previewData[rowIndex]?.[column.id] || ''}
                        onValueChange={(val) => updateCell(rowIndex, column.id, val)}
                        disabled={column.readOnly}
                      >
                        <SelectTrigger className={`h-8 ${column.calculated ? 'bg-blue-100' : ''}`}>
                          <SelectValue placeholder="Seleccionar producto..." />
                        </SelectTrigger>
                        <SelectContent>
                          {column.options?.length ? (
                            column.options.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))
                          ) : (
                            <>
                              <SelectItem value="Mielmex 65° Brix">Mielmex 65° Brix</SelectItem>
                              <SelectItem value="Coro 68° Brix">Coro 68° Brix</SelectItem>
                              <SelectItem value="Cajeton Tradicional">Cajeton Tradicional</SelectItem>
                              <SelectItem value="Cajeton Espesa">Cajeton Espesa</SelectItem>
                              <SelectItem value="Cajeton Esp Chepo">Cajeton Esp Chepo</SelectItem>
                              <SelectItem value="Cabri Tradicional">Cabri Tradicional</SelectItem>
                              <SelectItem value="Cabri Espesa">Cabri Espesa</SelectItem>
                              <SelectItem value="Horneable">Horneable</SelectItem>
                              <SelectItem value="Gloria untable 78° Brix">Gloria untable 78° Brix</SelectItem>
                              <SelectItem value="Gloria untable 80° Brix">Gloria untable 80° Brix</SelectItem>
                              <SelectItem value="Pasta Oblea Coro">Pasta Oblea Coro</SelectItem>
                              <SelectItem value="Pasta Oblea Cajeton">Pasta Oblea Cajeton</SelectItem>
                              <SelectItem value="Pasta DGL">Pasta DGL</SelectItem>
                              <SelectItem value="Conito">Conito</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            
            {/* Botón para agregar fila dinámica */}
            {(value && value.dynamicRows) && (
              <TableRow>
                <TableCell colSpan={allColumns.length} className="text-center">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={addRow}
                    className="mt-2"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Agregar Fila
                  </Button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Editor de Tabla Avanzada</CardTitle>
        <CardDescription>
          Configure una tabla con múltiples secciones y tipos de columnas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={activeTab} onValueChange={(value) => {
            setActiveTab(value);
            // Marcar esta pestaña como visitada
            setTabsVisited(prev => ({...prev, [value]: true}));
          }}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="templates">Plantillas</TabsTrigger>
            <TabsTrigger value="sections">Secciones</TabsTrigger>
            <TabsTrigger value="preview">Vista Previa</TabsTrigger>
            <TabsTrigger value="settings">Configuración</TabsTrigger>
          </TabsList>
          
          {/* Pestaña de Plantillas */}
          <TabsContent value="templates" className="space-y-4 mt-4">
            <div className="mb-4 flex justify-between items-center">
              <h3 className="text-lg font-medium">Plantillas disponibles</h3>
              <div className="flex items-center gap-2">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={handleImportCustomTemplate}
                  className="flex items-center gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" /> Importar Plantilla
                </Button>
                
                {/* Botón para aplicar directamente la plantilla de Microbiología */}
                <Button
                  type="button"
                  variant="default"
                  onClick={handleApplyMicrobiologiaTemplate}
                  className="flex items-center gap-2 ml-2 bg-green-600 hover:bg-green-700"
                >
                  <FileSpreadsheet className="h-4 w-4" /> Plantilla Microbiología
                </Button>
                
                <Button
                  type="button"
                  variant="default"
                  onClick={() => {
                    // Crear una tabla de horas
                    const horaColumnId = uuidv4();
                    const valorColumnId = uuidv4();
                    
                    const config = {
                      rows: 7,
                      dynamicRows: false,
                      sections: [
                        {
                          title: "Horas",
                          colspan: 2,
                          columns: [
                            {
                              id: horaColumnId,
                              header: "Hora",
                              type: "text",
                              width: "100px",
                              readOnly: true
                            },
                            {
                              id: valorColumnId,
                              header: "",
                              type: "text",
                              width: "150px"
                            }
                          ]
                        }
                      ],
                      initialData: [
                        { [horaColumnId]: "Hora 0", [valorColumnId]: "" },
                        { [horaColumnId]: "Hora 1", [valorColumnId]: "" },
                        { [horaColumnId]: "Hora 2", [valorColumnId]: "" },
                        { [horaColumnId]: "Hora 3", [valorColumnId]: "" },
                        { [horaColumnId]: "Hora 4", [valorColumnId]: "" }, 
                        { [horaColumnId]: "Hora 5", [valorColumnId]: "" },
                        { [horaColumnId]: "Fin", [valorColumnId]: "" }
                      ]
                    };
                    
                    onChange(config);
                    toast({
                      title: "Tabla de horas creada",
                      description: "Se ha agregado una tabla para registrar valores por hora",
                    });
                    setActiveTab("preview");
                    setTabsVisited(prev => ({...prev, preview: true}));
                  }}
                  className="flex items-center gap-2 ml-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Thermometer className="h-4 w-4" /> Tabla de Horas
                </Button>
                
                <Button
                  type="button"
                  variant="default"
                  onClick={() => {
                    // Crear una tabla de manómetros
                    const horaColumnId = uuidv4();
                    const psiColumnId = uuidv4();
                    
                    const config = {
                      rows: 7,
                      dynamicRows: false,
                      sections: [
                        {
                          title: "Manómetro",
                          colspan: 2,
                          columns: [
                            {
                              id: horaColumnId,
                              header: "Hora",
                              type: "text",
                              width: "100px",
                              readOnly: true
                            },
                            {
                              id: psiColumnId,
                              header: "PSI",
                              type: "number",
                              width: "100px",
                              validation: {
                                min: 0,
                                max: 1000
                              }
                            }
                          ]
                        }
                      ],
                      initialData: [
                        { [horaColumnId]: "Hora 0", [psiColumnId]: "" },
                        { [horaColumnId]: "Hora 1", [psiColumnId]: "" },
                        { [horaColumnId]: "Hora 2", [psiColumnId]: "" },
                        { [horaColumnId]: "Hora 3", [psiColumnId]: "" },
                        { [horaColumnId]: "Hora 4", [psiColumnId]: "" }, 
                        { [horaColumnId]: "Hora 5", [psiColumnId]: "" },
                        { [horaColumnId]: "Fin", [psiColumnId]: "" }
                      ]
                    };
                    
                    onChange(config);
                    toast({
                      title: "Tabla de manómetro creada",
                      description: "Se ha agregado una tabla para registrar presión (PSI) por hora",
                    });
                    setActiveTab("preview");
                    setTabsVisited(prev => ({...prev, preview: true}));
                  }}
                  className="flex items-center gap-2 ml-2 bg-green-600 hover:bg-green-700"
                >
                  <Thermometer className="h-4 w-4" /> Tabla de Manómetro
                </Button>
                
                <Button
                  type="button"
                  variant="default"
                  onClick={() => {
                    // Crear una tabla de verificación de calidad
                    // Crear IDs para cada columna
                    const horaColumnId = uuidv4();
                    const brixColumnId = uuidv4();
                    const tempColumnId = uuidv4();
                    const texturaColumnId = uuidv4();
                    const colorColumnId = uuidv4();
                    const viscosidadColumnId = uuidv4();
                    const olorColumnId = uuidv4();
                    const saborColumnId = uuidv4();
                    const materialColumnId = uuidv4();
                    const statusColumnId = uuidv4();
                    
                    const config = {
                      rows: 9,
                      dynamicRows: false,
                      sections: [
                        {
                          title: "Verificación de Calidad",
                          colspan: 10,
                          columns: [
                            {
                              id: horaColumnId,
                              header: "Hora",
                              type: "text",
                              width: "70px",
                              readOnly: true
                            },
                            {
                              id: brixColumnId,
                              header: "Grados Brix",
                              type: "text", 
                              width: "100px"
                            },
                            {
                              id: tempColumnId,
                              header: "Temperatura",
                              type: "text",
                              width: "100px"
                            },
                            {
                              id: texturaColumnId,
                              header: "Textura",
                              type: "text",
                              width: "100px"
                            },
                            {
                              id: colorColumnId,
                              header: "Color",
                              type: "text",
                              width: "100px"
                            },
                            {
                              id: viscosidadColumnId,
                              header: "Viscosidad",
                              type: "text",
                              width: "100px"
                            },
                            {
                              id: olorColumnId,
                              header: "Olor",
                              type: "text",
                              width: "100px"
                            },
                            {
                              id: saborColumnId,
                              header: "Sabor",
                              type: "text",
                              width: "100px"
                            },
                            {
                              id: materialColumnId,
                              header: "Material Extraño",
                              type: "text",
                              width: "120px",
                              readOnly: true
                            },
                            {
                              id: statusColumnId,
                              header: "Status",
                              type: "text",
                              width: "100px"
                            }
                          ]
                        }
                      ],
                      initialData: [
                        { 
                          [horaColumnId]: "Hora", 
                          [brixColumnId]: "65° a 68° Brix", 
                          [tempColumnId]: "70°C a 95°C",
                          [materialColumnId]: ""
                        },
                        { [horaColumnId]: "Hora 0", [materialColumnId]: "N/A" },
                        { [horaColumnId]: "Hora 1", [materialColumnId]: "N/A" },
                        { [horaColumnId]: "Hora 2", [materialColumnId]: "N/A" },
                        { [horaColumnId]: "Hora 3", [materialColumnId]: "N/A" },
                        { [horaColumnId]: "Hora 4", [materialColumnId]: "N/A" }, 
                        { [horaColumnId]: "Hora 5", [materialColumnId]: "N/A" },
                        { [horaColumnId]: "Fin", [materialColumnId]: "N/A" },
                        { [horaColumnId]: "", [materialColumnId]: "N/A" }
                      ]
                    };
                    
                    onChange(config);
                    toast({
                      title: "Tabla de verificación de calidad creada",
                      description: "Se ha agregado una tabla completa para el control de calidad",
                    });
                    setActiveTab("preview");
                    setTabsVisited(prev => ({...prev, preview: true}));
                  }}
                  className="flex items-center gap-2 ml-2 bg-yellow-600 hover:bg-yellow-700"
                >
                  <ListChecks className="h-4 w-4" /> Verificación de Calidad
                </Button>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".json"
                  className="hidden"
                />
              </div>
            </div>
            <ScrollArea className="h-[450px] pr-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TABLE_TEMPLATES.map((template, index) => (
                  <Card 
                    key={index} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      // Aplicar la plantilla seleccionada
                      onChange(template.config);
                      toast({
                        title: "Plantilla aplicada",
                        description: `Se ha aplicado la plantilla: ${template.name}`,
                      });
                      // Cambiar a la pestaña de secciones después de aplicar
                      setActiveTab("sections");
                      setTabsVisited(prev => ({...prev, sections: true}));
                    }}
                  >
                    <CardHeader className="py-4">
                      <CardTitle className="text-base flex items-center">
                        {template.icon} {template.name}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Contenedor para botones de acciones rápidas */}
          {value?.sections?.some(s => 
            s.title.toLowerCase().includes("proceso") && 
            s.columns?.some(c => c.type === "product")
          ) && (
            <div className="mt-4 mb-2 flex flex-wrap gap-2">
              <Button 
                type="button" 
                variant="outline"
                className="bg-amber-50 border-amber-200 hover:bg-amber-100 text-amber-700"
                onClick={() => {
                  // Listado de productos estándar
                  const productos = [
                    "Mielmex 65° Brix",
                    "Coro 68° Brix",
                    "Cajeton Tradicional",
                    "Cajeton Espesa",
                    "Cajeton Esp Chepo",
                    "Cabri Tradicional",
                    "Cabri Espesa",
                    "Horneable",
                    "Gloria untable 78° Brix",
                    "Gloria untable 80° Brix",
                    "Pasta Oblea Coro",
                    "Pasta Oblea Cajeton",
                    "Pasta DGL",
                    "Conito"
                  ];
                  
                  // Encontrar el índice de la sección de Proceso (más flexible con el nombre)
                  const procesoIndex = value?.sections?.findIndex(s => 
                    s.title.toLowerCase().includes("proceso")
                  ) || -1;
                  
                  console.log("Buscando sección de Proceso:", { 
                    secciones: value?.sections?.map(s => s.title),
                    procesoIndex 
                  });
                  
                  if (procesoIndex !== -1) {
                    // Encontrar la columna de producto
                    const productoColIndex = value?.sections?.[procesoIndex]?.columns?.findIndex(c => 
                      c.type === "product"
                    ) || -1;
                    
                    if (productoColIndex !== -1) {
                      // Definir los productos como opciones para la columna de producto
                      const newValue = { ...value };
                      
                      if (newValue.sections?.[procesoIndex]?.columns?.[productoColIndex]) {
                        // Crear opciones para cada producto en el formato requerido por el tipo "product"
                        const productOptions = productos.map(producto => ({
                          label: producto,
                          value: producto
                        }));
                        
                        // Actualizar las opciones de la columna
                        if (newValue.sections) {
                          newValue.sections = [...(newValue.sections || [])];
                          if (newValue.sections[procesoIndex]?.columns) {
                            newValue.sections[procesoIndex].columns = [...(newValue.sections[procesoIndex]?.columns || [])];
                            
                            // Si existe la columna, actualizar sus opciones
                            if (newValue.sections[procesoIndex]?.columns?.[productoColIndex]) {
                              newValue.sections[procesoIndex].columns[productoColIndex] = {
                                ...newValue.sections[procesoIndex].columns[productoColIndex],
                                options: productOptions
                              };
                            }
                          }
                        }
                        
                        // Notificar al usuario
                        toast({
                          title: "Productos configurados",
                          description: `Se han configurado ${productos.length} productos para selección`,
                        });
                        
                        // Actualizar el valor
                        onChange(newValue);
                      }
                    } else {
                      toast({
                        title: "No se encontró columna de producto",
                        description: "Asegúrate de tener una columna de tipo 'product' en la sección de Proceso",
                        variant: "destructive"
                      });
                    }
                  } else {
                    // Intentar detectar una sección que pueda servir como sección de proceso
                    // Por ejemplo, "Proceso general" o "Producción"
                    const posibleProcesoIndex = value?.sections?.findIndex(s => 
                      s.title.toLowerCase().includes("general") || 
                      s.title.toLowerCase().includes("producción") ||
                      s.title.toLowerCase().includes("produccion")
                    ) || -1;
                    
                    if (posibleProcesoIndex !== -1) {
                      // Podemos usar esta sección como sección de proceso
                      toast({
                        title: "Usando sección alternativa",
                        description: `Usando "${value?.sections?.[posibleProcesoIndex]?.title}" como sección de proceso`,
                      });
                      
                      // Continuar con esta sección
                      const productoColIndex = value?.sections?.[posibleProcesoIndex]?.columns?.findIndex(c => 
                        c.type === "product"
                      ) || -1;
                      
                      if (productoColIndex !== -1) {
                        // Definir los productos como opciones para la columna de producto
                        const newValue = { ...value };
                        
                        if (newValue.sections?.[posibleProcesoIndex]?.columns?.[productoColIndex]) {
                          // Crear opciones para cada producto 
                          const productOptions = productos.map(producto => ({
                            label: producto,
                            value: producto
                          }));
                          
                          // Actualizar las opciones de la columna
                          if (newValue.sections) {
                            newValue.sections = [...(newValue.sections || [])];
                            if (newValue.sections[posibleProcesoIndex]?.columns) {
                              newValue.sections[posibleProcesoIndex].columns = [...(newValue.sections[posibleProcesoIndex]?.columns || [])];
                              
                              // Si existe la columna, actualizar sus opciones
                              if (newValue.sections[posibleProcesoIndex]?.columns?.[productoColIndex]) {
                                newValue.sections[posibleProcesoIndex].columns[productoColIndex] = {
                                  ...newValue.sections[posibleProcesoIndex].columns[productoColIndex],
                                  options: productOptions
                                };
                              }
                            }
                          }
                          
                          // Notificar al usuario
                          toast({
                            title: "Productos configurados",
                            description: `Se han configurado ${productos.length} productos para selección`,
                          });
                          
                          // Actualizar el valor
                          onChange(newValue);
                        }
                      } else {
                        toast({
                          title: "No se encontró columna de producto",
                          description: "Asegúrate de tener una columna de tipo 'product' en la sección",
                          variant: "destructive"
                        });
                      }
                    } else {
                      toast({
                        title: "No se encontró sección de Proceso",
                        description: "Asegúrate de tener una sección llamada 'Proceso' o 'Proceso general'",
                        variant: "destructive"
                      });
                    }
                  }
                }}
              >
                <FileSpreadsheet className="h-4 w-4 mr-1" /> Configurar Productos
              </Button>
            </div>
          )}

          {/* Pestaña de Secciones */}
          <TabsContent value="sections" className="space-y-4 mt-4">
              <ScrollArea className="h-[500px] pr-4">
                {/* Lista de secciones existentes */}
                {((value && value.sections) || []).map((section, sectionIndex) => (
                <Card key={sectionIndex} className="mb-4">
                  <CardHeader className="py-3">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-base">
                        Sección: {section.title}
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingSection(sectionIndex)}
                        >
                          <Pencil className="h-4 w-4 mr-1" /> Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeSection(sectionIndex)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash className="h-4 w-4 mr-1" /> Eliminar
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Badge variant="outline">
                        {section.columns.length} Columnas
                      </Badge>
                      {section.colspan && (
                        <Badge variant="outline" className="ml-2">
                          Colspan: {section.colspan}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="py-2">
                    {/* Lista de columnas */}
                    <h4 className="font-medium text-sm mb-2">Columnas:</h4>
                    <div className="space-y-2">
                      {section.columns.map((column, columnIndex) => (
                        <div
                          key={column.id}
                          className="flex justify-between items-center border p-2 rounded-md"
                        >
                          <div>
                            <span className="font-medium">{column.header}</span>
                            <div className="flex gap-1 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {column.type}
                              </Badge>
                              {column.readOnly && (
                                <Badge variant="outline" className="text-xs">
                                  Solo lectura
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => duplicateColumn(sectionIndex, columnIndex)}
                            >
                              <CopyPlus className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingColumn({sectionIndex, columnIndex})}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeColumn(sectionIndex, columnIndex)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Formulario para agregar columna */}
                    <div className="mt-4 border-t pt-3">
                      <h4 className="font-medium text-sm mb-2">Agregar Nueva Columna:</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor={`column-header-${sectionIndex}`}>
                            Título de Columna
                          </Label>
                          <Input
                            id={`column-header-${sectionIndex}`}
                            value={newColumnDetails.header || ''}
                            onChange={(e) => setNewColumnDetails({
                              ...newColumnDetails,
                              header: e.target.value
                            })}
                            placeholder="Título de columna"
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label htmlFor={`column-type-${sectionIndex}`}>
                            Tipo de Columna
                          </Label>
                          <Select
                            value={newColumnDetails.type}
                            onValueChange={(value: any) => setNewColumnDetails({
                              ...newColumnDetails,
                              type: value
                            })}
                          >
                            <SelectTrigger id={`column-type-${sectionIndex}`} className="mt-1">
                              <SelectValue placeholder="Seleccione tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Texto</SelectItem>
                              <SelectItem value="number">Número</SelectItem>
                              <SelectItem value="select">Lista desplegable</SelectItem>
                              <SelectItem value="checkbox">Casilla de verificación</SelectItem>
                              <SelectItem value="date">Fecha</SelectItem>
                              <SelectItem value="time">Hora</SelectItem>
                              <SelectItem value="employee">Empleado</SelectItem>
                              <SelectItem value="product">Producto</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-3">
                        <Button
                          type="button"
                          onClick={() => addColumn(sectionIndex)}
                        >
                          <Plus className="h-4 w-4 mr-1" /> Agregar Columna
                        </Button>
                        
                        {/* Botón para añadir materias primas predefinidas */}
                        {section.title.toLowerCase().includes('materia') && (
                          <Button
                            type="button"
                            variant="secondary"
                            className="bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700"
                            onClick={() => {
                              // Generar filas de materias primas predefinidas
                              const materialNames = [
                                "Leche de Vaca",
                                "Leche de Cabra",
                                "Azúcar",
                                "Glucosa",
                                "Malto",
                                "Bicarbonato",
                                "Sorbato",
                                "Lecitina",
                                "Carrogenina",
                                "Grasa",
                                "Pasta",
                                "Antiespumante",
                                "Nuez"
                              ];
                              
                              // Solo proceder si hay al menos una columna
                              if (!section.columns?.length) {
                                toast({
                                  title: "Sin columnas",
                                  description: "Primero debes agregar al menos una columna para los nombres de materias primas",
                                  variant: "destructive"
                                });
                                return;
                              }
                              
                              // Crear datos iniciales para la tabla
                              const currentData = [...previewData];
                              
                              // Agregar filas con los nombres de materias primas en la primera columna
                              const newData = materialNames.map((material, idx) => {
                                // Inicializar o actualizar la fila
                                const row = currentData[idx] || {};
                                // Usar el ID de la primera columna para los nombres
                                const firstColumnId = section.columns[0].id;
                                return {
                                  ...row,
                                  [firstColumnId]: material
                                };
                              });
                              
                              // Actualizar los datos de preview y el valor del formulario
                              setPreviewData(newData);
                              
                              // CORRECCIÓN IMPORTANTE: Necesitamos preservar la estructura completa
                              // y pasar un objeto completo para evitar que se reemplace con plantilla predeterminada
                              const currentStructure = value || {};
                              const newValue = {
                                ...currentStructure,         // Mantener toda la estructura existente
                                initialData: newData,        // Actualizar solo los datos
                                rows: newData.length         // Y el número de filas
                              };
                              
                              // Método seguro para enviar la estructura completa
                              onChange(JSON.parse(JSON.stringify(newValue)));
                              
                              toast({
                                title: "Materias primas agregadas",
                                description: `Se han agregado ${materialNames.length} materias primas a la tabla`,
                              });
                            }}
                          >
                            <ListChecks className="h-4 w-4 mr-1" /> Añadir Materias Primas
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Formulario para agregar sección */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-base">Nueva Sección</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <Label htmlFor="new-section-title">Título de la Sección</Label>
                    <Input
                      id="new-section-title"
                      value={newSectionTitle}
                      onChange={(e) => setNewSectionTitle(e.target.value)}
                      placeholder="Ej: Información General"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" onClick={addSection}>
                      <Plus className="h-4 w-4 mr-1" /> Agregar Sección
                    </Button>
                    
                    {/* Botón para añadir sección de Materias Primas predefinida */}
                    <Button 
                      type="button" 
                      variant="secondary"
                      className="bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700"
                      onClick={() => {
                        // Crear una nueva sección para materias primas
                        const materiasSection = {
                          title: "Materia Prima",
                          columns: [
                            { 
                              id: uuidv4(), 
                              header: "Materia Prima", 
                              type: "text" as const, 
                              width: "200px",
                              readOnly: true 
                            },
                            { 
                              id: uuidv4(), 
                              header: "Kilos", 
                              type: "number" as const, 
                              width: "100px" 
                            }
                          ]
                        };
                        
                        const currentSections = value?.sections || [];
                        onChange({
                          ...value,
                          sections: [...currentSections, materiasSection]
                        });
                        
                        toast({
                          title: "Sección de Materias Primas agregada",
                          description: "Se ha añadido la sección con columnas para Materia Prima y Kilos",
                        });
                      }}
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-1" /> Agregar Sección Materias Primas
                    </Button>

                    {/* Botón para pre-llenar materias primas basado en productos */}
                    {value?.sections?.some(s => 
                      s.title.toLowerCase().includes("materia") || 
                      s.title.toLowerCase().includes("prima")) && (
                      <Button 
                        type="button" 
                        variant="outline"
                        className="bg-green-50 border-green-200 hover:bg-green-100 text-green-700"
                        onClick={() => {
                          // Listado de productos estándar
                          const productos = [
                            "Mielmex 65° Brix",
                            "Coro 68° Brix",
                            "Cajeton Tradicional",
                            "Cajeton Espesa",
                            "Cajeton Esp Chepo",
                            "Cabri Tradicional",
                            "Cabri Espesa",
                            "Horneable",
                            "Gloria untable 78° Brix",
                            "Gloria untable 80° Brix",
                            "Pasta Oblea Coro",
                            "Pasta Oblea Cajeton",
                            "Pasta DGL",
                            "Conito"
                          ];
                          
                          // Encontrar el índice de la sección de Materias Primas
                          const materiaPrimaIndex = value?.sections?.findIndex(s => 
                            s.title.toLowerCase().includes("materia") || 
                            s.title.toLowerCase().includes("prima")
                          ) || -1;
                          
                          if (materiaPrimaIndex !== -1) {
                            const currentRows = value.rows || 10;
                            const needsMore = productos.length > currentRows;
                            
                            // Crear filas para cada producto
                            const newValue = { ...value };
                            
                            // Si se necesitan más filas, ajustar
                            if (needsMore) {
                              newValue.rows = productos.length;
                            }
                            
                            // Simulamos la creación de un conjunto de datos para cada fila
                            const materiaPrimaColIndex = 0; // Primera columna - Materia Prima
                            
                            // Preparamos los datos iniciales (esto simula el llenado real de la tabla)
                            // Aseguramos que initialData sea un array de objetos
                            if (!Array.isArray(newValue.initialData)) {
                              newValue.initialData = [];
                            }
                            
                            // Obtenemos la columna donde pondremos los nombres de las materias primas
                            const materiaPrimaSection = newValue.sections?.[materiaPrimaIndex];
                            if (!materiaPrimaSection || !materiaPrimaSection.columns || materiaPrimaSection.columns.length === 0) {
                              toast({
                                title: "Error en configuración",
                                description: "La sección de materias primas no tiene columnas definidas",
                                variant: "destructive"
                              });
                              return;
                            }
                            
                            // Obtenemos el ID de la primera columna (para nombres de materias primas)
                            const materiaPrimaColumnId = materiaPrimaSection.columns[0].id;
                            
                            // Creamos un objeto por cada producto para añadir a initialData
                            const newData = productos.map(producto => {
                              return {
                                [materiaPrimaColumnId]: producto
                              };
                            });
                            
                            // CORRECCIÓN CRÍTICA: Asignamos los nuevos datos preservando estructura
                            const completeValue = {
                              ...newValue,                  // Mantener toda la estructura existente
                              initialData: newData,         // Actualizar solo los datos
                              rows: Math.max(newValue.rows || 3, newData.length),
                              // Siempre asegurarnos que tiene las secciones definidas
                              sections: newValue.sections || []
                            };
                            
                            // Simular la carga de datos con tiempo de espera para visualizar el proceso
                            toast({
                              title: "Cargando productos...",
                              description: "Añadiendo listado de productos a la tabla",
                            });
                            
                            // Copia profunda y uso de updateValue para preservar estructura
                            // Método seguro para enviar la estructura completa
                            updateValue({ initialData: newData });
                            
                            toast({
                              title: "Productos agregados",
                              description: `Se han añadido ${productos.length} productos a la tabla`,
                              variant: "default"
                            });
                          }
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Añadir Materias Primas
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </ScrollArea>
          </TabsContent>

          {/* Pestaña de Vista Previa - Solo renderizar si ha sido visitada */}
          <TabsContent value="preview" className="mt-4">
            <div className="space-y-4">
              {tabsVisited.preview && <TablePreview />}
            </div>
          </TabsContent>

          {/* Pestaña de Configuración - Solo renderizar si ha sido visitada */}
          <TabsContent value="settings" className="mt-4">
            {tabsVisited.settings && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rows-count">Número de Filas</Label>
                  <Input
                    id="rows-count"
                    type="number"
                    value={(value && value.rows) || 3}
                    onChange={handleUpdateRows}
                    min={1}
                    className="mt-1"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Define el número fijo de filas en la tabla
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex-1">
                    <Label htmlFor="dynamic-rows" className="block mb-2">
                      Filas Dinámicas
                    </Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="dynamic-rows"
                        checked={(value && value.dynamicRows) || false}
                        onCheckedChange={toggleDynamicRows}
                      />
                      <Label htmlFor="dynamic-rows" className="mt-0">
                        {(value && value.dynamicRows) ? "Activado" : "Desactivado"}
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            )}
          </TabsContent>
        </Tabs>
        
        {/* Botón para guardar la configuración de la tabla */}
        <div className="flex justify-end px-6 pb-6 pt-2 border-t">
          <Button
            type="button"
            onClick={() => {
              // Guardar la configuración actual
              const currentConfig = { ...value };
              onChange(currentConfig);
              toast({
                title: "Tabla guardada",
                description: "La configuración de la tabla ha sido guardada correctamente",
              });
            }}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Save className="mr-2 h-4 w-4" />
            Guardar Tabla
          </Button>
        </div>
      </CardContent>

      {/* Diálogo para editar sección */}
      {editingSection !== null && (
        <Dialog 
          open={editingSection !== null} 
          onOpenChange={(open) => {
            if (!open) {
              setEditingSection(null);
            }
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Sección</DialogTitle>
              <DialogDescription>
                Actualice las propiedades de esta sección
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              // Cerrar el diálogo cuando se envía el formulario
              setEditingSection(null);
            }}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-section-title">Título</Label>
                  <Input
                    id="edit-section-title"
                    value={(value?.sections?.[editingSection]?.title) || ""}
                    onChange={(e) => {
                      if (editingSection !== null && value?.sections?.[editingSection]) {
                        updateSection(editingSection, { title: e.target.value });
                      }
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-section-colspan">Ancho (Colspan)</Label>
                  <Input
                    id="edit-section-colspan"
                    type="number"
                    value={(value?.sections?.[editingSection]?.colspan) || ""}
                    min={1}
                    onChange={(e) => {
                      if (editingSection !== null && value?.sections?.[editingSection]) {
                        updateSection(editingSection, { 
                          colspan: parseInt(e.target.value) || undefined 
                        });
                      }
                    }}
                  />
                  <FormDescription>
                    Si se especifica, determina cuántas columnas abarca esta sección.
                    Por defecto, usa el número de columnas que contiene.
                  </FormDescription>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Guardar Cambios</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Diálogo para editar columna */}
      {editingColumn !== null && (
        <Dialog 
          open={editingColumn !== null} 
          onOpenChange={() => setEditingColumn(null)}
        >
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Columna</DialogTitle>
              <DialogDescription>
                Configure las propiedades de esta columna
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-column-header">Título</Label>
                  <Input
                    id="edit-column-header"
                    value={(value && value.sections)?.[editingColumn?.sectionIndex || 0]?.columns?.[editingColumn?.columnIndex || 0]?.header || ""}
                    onChange={(e) => {
                      if (editingColumn) {
                        updateColumn(
                          editingColumn.sectionIndex, 
                          editingColumn.columnIndex, 
                          { header: e.target.value }
                        );
                      }
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-column-type">Tipo</Label>
                  <Select
                    value={value.sections?.[editingColumn?.sectionIndex || 0]?.columns?.[editingColumn?.columnIndex || 0]?.type || "text"}
                    onValueChange={(val: any) => {
                      if (editingColumn) {
                        updateColumn(
                          editingColumn.sectionIndex, 
                          editingColumn.columnIndex, 
                          { type: val }
                        );
                      }
                    }}
                  >
                    <SelectTrigger id="edit-column-type">
                      <SelectValue placeholder="Seleccione tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Texto</SelectItem>
                      <SelectItem value="number">Número</SelectItem>
                      <SelectItem value="select">Lista desplegable</SelectItem>
                      <SelectItem value="checkbox">Casilla de verificación</SelectItem>
                      <SelectItem value="date">Fecha</SelectItem>
                      <SelectItem value="time">Hora</SelectItem>
                      <SelectItem value="employee">Empleado</SelectItem>
                      <SelectItem value="product">Producto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-column-width">Ancho</Label>
                  <Input
                    id="edit-column-width"
                    value={value.sections?.[editingColumn?.sectionIndex || 0]?.columns?.[editingColumn?.columnIndex || 0]?.width || ""}
                    onChange={(e) => {
                      if (editingColumn) {
                        updateColumn(
                          editingColumn.sectionIndex, 
                          editingColumn.columnIndex, 
                          { width: e.target.value }
                        );
                      }
                    }}
                    placeholder="100px, 25%, etc."
                  />
                </div>

                <div className="flex items-center space-x-2 mt-8">
                  <Checkbox
                    id="edit-column-readonly"
                    checked={value.sections?.[editingColumn?.sectionIndex || 0]?.columns?.[editingColumn?.columnIndex || 0]?.readOnly || false}
                    onCheckedChange={(checked) => {
                      if (editingColumn) {
                        updateColumn(
                          editingColumn.sectionIndex, 
                          editingColumn.columnIndex, 
                          { readOnly: checked === true }
                        );
                      }
                    }}
                  />
                  <Label htmlFor="edit-column-readonly">Solo lectura</Label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-column-span">Colspan</Label>
                  <Input
                    id="edit-column-span"
                    type="number"
                    min={1}
                    value={value.sections?.[editingColumn?.sectionIndex || 0]?.columns?.[editingColumn?.columnIndex || 0]?.span || ""}
                    onChange={(e) => {
                      if (editingColumn) {
                        updateColumn(
                          editingColumn.sectionIndex, 
                          editingColumn.columnIndex, 
                          { span: parseInt(e.target.value) || undefined }
                        );
                      }
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-column-rowspan">Rowspan</Label>
                  <Input
                    id="edit-column-rowspan"
                    type="number"
                    min={1}
                    value={value.sections?.[editingColumn?.sectionIndex || 0]?.columns?.[editingColumn?.columnIndex || 0]?.rowspan || ""}
                    onChange={(e) => {
                      if (editingColumn) {
                        updateColumn(
                          editingColumn.sectionIndex, 
                          editingColumn.columnIndex, 
                          { rowspan: parseInt(e.target.value) || undefined }
                        );
                      }
                    }}
                  />
                </div>
              </div>

              {/* Configuración específica para el tipo de columna */}
              {value.sections?.[editingColumn?.sectionIndex || 0]?.columns?.[editingColumn?.columnIndex || 0]?.type === "select" && (
                <div className="border p-3 rounded-md mt-2">
                  <Label>Opciones</Label>
                  <div className="space-y-2 mt-2">
                    {(value.sections?.[editingColumn?.sectionIndex || 0]?.columns?.[editingColumn?.columnIndex || 0]?.options || []).map((option, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          value={option.label}
                          placeholder="Etiqueta"
                          onChange={(e) => {
                            if (editingColumn) {
                              const newOptions = [...(value.sections?.[editingColumn.sectionIndex]?.columns?.[editingColumn.columnIndex]?.options || [])];
                              newOptions[idx] = { ...newOptions[idx], label: e.target.value };
                              updateColumn(
                                editingColumn.sectionIndex, 
                                editingColumn.columnIndex, 
                                { options: newOptions }
                              );
                            }
                          }}
                          className="flex-1"
                        />
                        <Input
                          value={option.value}
                          placeholder="Valor"
                          onChange={(e) => {
                            if (editingColumn) {
                              const newOptions = [...(value.sections?.[editingColumn.sectionIndex]?.columns?.[editingColumn.columnIndex]?.options || [])];
                              newOptions[idx] = { ...newOptions[idx], value: e.target.value };
                              updateColumn(
                                editingColumn.sectionIndex, 
                                editingColumn.columnIndex, 
                                { options: newOptions }
                              );
                            }
                          }}
                          className="flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (editingColumn) {
                              const newOptions = [...(value.sections?.[editingColumn.sectionIndex]?.columns?.[editingColumn.columnIndex]?.options || [])];
                              newOptions.splice(idx, 1);
                              updateColumn(
                                editingColumn.sectionIndex, 
                                editingColumn.columnIndex, 
                                { options: newOptions }
                              );
                            }
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (editingColumn) {
                          const newOptions = [...(value.sections?.[editingColumn.sectionIndex]?.columns?.[editingColumn.columnIndex]?.options || [])];
                          newOptions.push({ label: "", value: "" });
                          updateColumn(
                            editingColumn.sectionIndex, 
                            editingColumn.columnIndex, 
                            { options: newOptions }
                          );
                        }
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Agregar Opción
                    </Button>
                  </div>
                </div>
              )}

              {/* Validación para campos numéricos */}
              {value.sections?.[editingColumn?.sectionIndex || 0]?.columns?.[editingColumn?.columnIndex || 0]?.type === "number" && (
                <div className="border p-3 rounded-md mt-2">
                  <Label>Validación</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <Label htmlFor="validation-min">Valor Mínimo</Label>
                      <Input
                        id="validation-min"
                        type="number"
                        value={value.sections?.[editingColumn?.sectionIndex || 0]?.columns?.[editingColumn?.columnIndex || 0]?.validation?.min || ""}
                        onChange={(e) => {
                          if (editingColumn) {
                            const currentValidation = value.sections?.[editingColumn.sectionIndex]?.columns?.[editingColumn.columnIndex]?.validation || {};
                            updateColumn(
                              editingColumn.sectionIndex, 
                              editingColumn.columnIndex, 
                              { 
                                validation: {
                                  ...currentValidation,
                                  min: parseInt(e.target.value) || undefined
                                }
                              }
                            );
                          }
                        }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="validation-max">Valor Máximo</Label>
                      <Input
                        id="validation-max"
                        type="number"
                        value={value.sections?.[editingColumn?.sectionIndex || 0]?.columns?.[editingColumn?.columnIndex || 0]?.validation?.max || ""}
                        onChange={(e) => {
                          if (editingColumn) {
                            const currentValidation = value.sections?.[editingColumn.sectionIndex]?.columns?.[editingColumn.columnIndex]?.validation || {};
                            updateColumn(
                              editingColumn.sectionIndex, 
                              editingColumn.columnIndex, 
                              { 
                                validation: {
                                  ...currentValidation,
                                  max: parseInt(e.target.value) || undefined
                                }
                              }
                            );
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Configuración para columnas auto-calculadas */}
              <Card className="mt-2">
                <CardHeader className="bg-blue-50 border-b border-blue-100">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-medium text-blue-800">Valor Auto-calculado</h3>
                    <Badge variant="outline" className="ml-2 bg-blue-100 text-blue-800 border-blue-200">
                      Auto-rellenado
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <Alert className="bg-blue-50 border-blue-200 mb-4">
                    <AlertCircle className="h-4 w-4 text-blue-700" />
                    <AlertTitle className="text-blue-700">Auto-rellenado de campos</AlertTitle>
                    <AlertDescription className="text-blue-600 text-xs">
                      Al activar esta opción, el campo se auto-rellenará basado en la selección de producto/cantidad.
                      Los campos auto-rellenados aparecerán con fondo azul claro y no serán editables.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox
                      id="auto-calculated"
                      checked={!!(value && value.sections)?.[editingColumn?.sectionIndex || 0]?.columns?.[editingColumn?.columnIndex || 0]?.dependency}
                      onCheckedChange={(checked) => {
                      if (editingColumn) {
                        if (checked) {
                          updateColumn(
                            editingColumn.sectionIndex, 
                            editingColumn.columnIndex, 
                            { 
                              dependency: { sourceType: "product" },
                              readOnly: true // Auto-calculated fields are always read-only
                            }
                          );
                        } else {
                          updateColumn(
                            editingColumn.sectionIndex, 
                            editingColumn.columnIndex, 
                            { 
                              dependency: undefined,
                              readOnly: false
                            }
                          );
                        }
                      }
                    }}
                  />
                </div>
                
                {(value && value.sections)?.[editingColumn?.sectionIndex || 0]?.columns?.[editingColumn?.columnIndex || 0]?.dependency && (
                  <div className="space-y-3 mt-3">
                    <div>
                      <Label htmlFor="dependency-type">Tipo de Dependencia</Label>
                      <Select
                        value={(value && value.sections)?.[editingColumn?.sectionIndex || 0]?.columns?.[editingColumn?.columnIndex || 0]?.dependency?.sourceType || "product"}
                        onValueChange={(val: "product" | "quantity") => {
                          if (editingColumn) {
                            const currentDependency = (value && value.sections)?.[editingColumn.sectionIndex]?.columns?.[editingColumn.columnIndex]?.dependency || {};
                            updateColumn(
                              editingColumn.sectionIndex, 
                              editingColumn.columnIndex, 
                              { 
                                dependency: {
                                  ...currentDependency,
                                  sourceType: val
                                }
                              }
                            );
                          }
                        }}
                      >
                        <SelectTrigger id="dependency-type">
                          <SelectValue placeholder="Seleccione tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="product">Producto</SelectItem>
                          <SelectItem value="quantity">Cantidad</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="calculation-type">Tipo de Cálculo</Label>
                      <Select
                        value={(value && value.sections)?.[editingColumn?.sectionIndex || 0]?.columns?.[editingColumn?.columnIndex || 0]?.dependency?.calculationType || "price"}
                        onValueChange={(val: "price" | "total" | "weight" | "tax") => {
                          if (editingColumn) {
                            const currentDependency = (value && value.sections)?.[editingColumn.sectionIndex]?.columns?.[editingColumn.columnIndex]?.dependency || {};
                            updateColumn(
                              editingColumn.sectionIndex, 
                              editingColumn.columnIndex, 
                              { 
                                dependency: {
                                  ...currentDependency,
                                  calculationType: val
                                }
                              }
                            );
                          }
                        }}
                      >
                        <SelectTrigger id="calculation-type">
                          <SelectValue placeholder="Seleccione tipo de cálculo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="price">Precio</SelectItem>
                          <SelectItem value="total">Total (Precio × Cantidad)</SelectItem>
                          <SelectItem value="weight">Peso</SelectItem>
                          <SelectItem value="tax">Impuesto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="source-column">Columna Fuente</Label>
                      <Select
                        value={(value && value.sections)?.[editingColumn?.sectionIndex || 0]?.columns?.[editingColumn?.columnIndex || 0]?.dependency?.sourceColumn || ""}
                        onValueChange={(val) => {
                          if (editingColumn) {
                            const currentDependency = (value && value.sections)?.[editingColumn.sectionIndex]?.columns?.[editingColumn.columnIndex]?.dependency || {};
                            updateColumn(
                              editingColumn.sectionIndex, 
                              editingColumn.columnIndex, 
                              { 
                                dependency: {
                                  ...currentDependency,
                                  sourceColumn: val
                                }
                              }
                            );
                          }
                        }}
                      >
                        <SelectTrigger id="source-column">
                          <SelectValue placeholder="Seleccione columna fuente" />
                        </SelectTrigger>
                        <SelectContent>
                          {(value && value.sections)?.flatMap(section => 
                            section.columns
                              .filter(col => col.id !== ((value && value.sections)?.[editingColumn?.sectionIndex || 0]?.columns?.[editingColumn?.columnIndex || 0]?.id))
                              .map(col => (
                                <SelectItem key={col.id} value={col.id}>
                                  {col.header}
                                </SelectItem>
                              ))
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Esta es la columna que proporcionará el valor base (producto o cantidad)
                      </p>
                    </div>
                    
                    <div>
                      <Label htmlFor="factor">Factor de Cálculo (opcional)</Label>
                      <Input
                        id="factor"
                        type="number"
                        step="0.01"
                        value={(value && value.sections)?.[editingColumn?.sectionIndex || 0]?.columns?.[editingColumn?.columnIndex || 0]?.dependency?.factor || ""}
                        onChange={(e) => {
                          if (editingColumn) {
                            const currentDependency = (value && value.sections)?.[editingColumn.sectionIndex]?.columns?.[editingColumn.columnIndex]?.dependency || {};
                            updateColumn(
                              editingColumn.sectionIndex, 
                              editingColumn.columnIndex, 
                              { 
                                dependency: {
                                  ...currentDependency,
                                  factor: parseFloat(e.target.value) || undefined
                                }
                              }
                            );
                          }
                        }}
                        placeholder="Ej: 0.16 para IVA"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Útil para cálculos como impuestos o descuentos (ej: 0.16 para IVA del 16%)
                      </p>
                    </div>
                  </div>
                )}
                </CardContent>
              </Card>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button">Guardar Cambios</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
};

export default AdvancedTableEditor;