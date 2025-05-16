import { useState, useMemo } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { AlertCircle, ArrowUpDown, Copy, Grip, Plus, Save, Trash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "react-beautiful-dnd";
import AdvancedTableEditor from "./advanced-table-editor";

// Field Types
export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "time"
  | "select"
  | "checkbox"
  | "radio"
  | "employee"
  | "employeeByType"
  | "file"
  | "signature"
  | "table"
  | "evaluationMatrix"
  | "advancedTable"
  | "group";

export interface OptionItem {
  value: string;
  label: string;
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  displayName?: string;
  displayOrder?: number;
  displayCondition?: string;
  options?: (string | OptionItem)[];
  tableColumns?: { id: string; header: string; type: FieldType; width?: string }[];
  tableRows?: number;
  columnSpan?: number;
  advancedTableConfig?: {
    rows?: number;
    dynamicRows?: boolean;
    sections?: {
      title: string;
      columns: {
        id: string;
        header: string;
        type: string;
        width: string;
        options?: { label: string; value: string }[];
      }[];
    }[];
    initialData?: any[];
  };
}

export interface FormStructure {
  title: string;
  fields: FormField[];
}

// Schema for form validation
export const formFieldSchema = z.object({
  id: z.string(),
  type: z.string() as z.ZodType<FieldType>,
  label: z.string().min(1, { message: "El nombre del campo es requerido" }),
  description: z.string().optional(),
  placeholder: z.string().optional(),
  required: z.boolean().optional(),
  displayName: z.string().optional(),
  displayOrder: z.number().optional(),
  displayCondition: z.string().optional(),
  options: z.array(z.union([z.string(), z.object({ value: z.string(), label: z.string() })])).optional(),
  tableColumns: z
    .array(
      z.object({
        id: z.string(),
        header: z.string(),
        type: z.string() as z.ZodType<FieldType>,
        width: z.string().optional(),
      })
    )
    .optional(),
  tableRows: z.number().optional(),
  columnSpan: z.number().optional(),
  advancedTableConfig: z.object({
    rows: z.number().optional().default(3),
    dynamicRows: z.boolean().optional().default(true),
    sections: z.array(
      z.object({
        title: z.string(),
        columns: z.array(
          z.object({
            id: z.string(),
            header: z.string(),
            type: z.string(),
            width: z.string(),
            options: z.array(
              z.object({
                label: z.string(),
                value: z.string(),
              })
            ).optional(),
          })
        ),
      })
    ).default([]),
    initialData: z.array(z.any()).optional(),
  }).optional(),
});

export const formStructureSchema = z.object({
  title: z.string().min(1, { message: "El título es requerido" }),
  fields: z.array(formFieldSchema),
});

// Default values for different field types
const defaultOptions = [
  { value: "option1", label: "Opción 1" },
  { value: "option2", label: "Opción 2" },
  { value: "option3", label: "Opción 3" },
];

const defaultTableColumns = [
  { id: "column1", header: "Columna 1", type: "text" as FieldType, width: "200px" },
  { id: "column2", header: "Columna 2", type: "text" as FieldType, width: "200px" },
];

// Default field for new fields
const defaultField: FormField = {
  id: "",
  type: "text",
  label: "Nuevo Campo",
  description: "",
  placeholder: "",
  required: false,
  columnSpan: 1,
};

interface FormBuilderProps {
  initialFormData?: z.infer<typeof formStructureSchema>;
  onSave: (data: z.infer<typeof formStructureSchema>) => void;
  isLoading?: boolean;
}

export default function FormBuilder({ initialFormData, onSave, isLoading = false }: FormBuilderProps) {
  const { toast } = useToast();
  const [showFieldSelector, setShowFieldSelector] = useState(false);

  // Pre-process fields to add proper display properties
  const fieldsWithDisplayProps = useMemo(() => {
    if (!initialFormData?.fields) return [];

    return initialFormData.fields.map((field, index) => ({
      ...field,
      displayName: field.displayName || field.label || `Campo ${index + 1}`,
      displayOrder: field.displayOrder || index,
    }));
  }, [initialFormData?.fields]);

  // Form setup
  const form = useForm<z.infer<typeof formStructureSchema>>({
    resolver: zodResolver(formStructureSchema),
    defaultValues: {
      title: initialFormData?.title || "",
      fields: fieldsWithDisplayProps.length > 0 ? fieldsWithDisplayProps : [],
    },
  });

  const { fields, append, remove, move, update } = useFieldArray({
    control: form.control,
    name: "fields",
  });

  // Function to add a new field
  const addField = (type: FieldType) => {
    const newField: FormField = {
      ...defaultField,
      id: uuidv4(),
      type,
    };

    // Add default options for select, radio, checkbox
    if (type === "select" || type === "radio") {
      newField.options = [...defaultOptions];
    }

    // Add default table columns for table
    if (type === "table") {
      newField.tableColumns = [...defaultTableColumns];
      newField.tableRows = 3;
    }

    // Add default advanced table config for advancedTable
    if (type === "advancedTable") {
      newField.advancedTableConfig = {
        rows: 3,
        dynamicRows: true,
        sections: [
          {
            title: "Tabla de Datos",
            columns: [
              { id: "fecha", header: "Fecha", type: "date", width: "120px" },
              { id: "descripcion", header: "Descripción", type: "text", width: "200px" },
              { id: "cantidad", header: "Cantidad", type: "number", width: "100px" }
            ]
          }
        ]
      };
    }

    // Add the new field
    append(newField);
    setShowFieldSelector(false);
  };

  // Handle saving the form
  const onSubmit = (data: z.infer<typeof formStructureSchema>) => {
    try {
      const processedFields = data.fields.map(field => {
        // Deep copy the field to ensure we have a clean object
        const cleanField = JSON.parse(JSON.stringify(field));
        
        // Special processing for advanced tables
        if (field.type === 'advancedTable' && field.advancedTableConfig) {
          console.log(`Procesando tabla avanzada para guardar: ${field.id}`);
          
          // Ensure we have a proper sections array
          if (!cleanField.advancedTableConfig.sections || !Array.isArray(cleanField.advancedTableConfig.sections)) {
            cleanField.advancedTableConfig.sections = [];
          }
          
          // Ensure we have proper rows and dynamicRows properties
          cleanField.advancedTableConfig.rows = cleanField.advancedTableConfig.rows || 3;
          cleanField.advancedTableConfig.dynamicRows = 
            typeof cleanField.advancedTableConfig.dynamicRows === 'boolean' 
              ? cleanField.advancedTableConfig.dynamicRows 
              : true;
        }
        
        return cleanField;
      });

      // Update the processed fields
      const finalData = {
        ...data,
        fields: processedFields
      };
      
      onSave(finalData);
      toast({
        title: "Formulario guardado",
        description: "Los cambios han sido guardados exitosamente",
      });
    } catch (error) {
      console.error("Error al guardar el formulario:", error);
      toast({
        title: "Error al guardar",
        description: "Ocurrió un error al guardar el formulario. Por favor intente de nuevo.",
        variant: "destructive",
      });
    }
  };

  // Handle drag & drop reordering
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    move(result.source.index, result.destination.index);
  };

  // Duplicate a field
  const duplicateField = (index: number) => {
    const fieldToDuplicate = form.getValues(`fields.${index}`);
    const duplicatedField: FormField = {
      ...JSON.parse(JSON.stringify(fieldToDuplicate)),
      id: uuidv4(),
      label: `${fieldToDuplicate.label} (copia)`,
    };
    append(duplicatedField);
  };

  const getFieldIcon = (type: FieldType) => {
    switch (type) {
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Título del Formulario</FormLabel>
                <FormControl>
                  <Input placeholder="Ingrese el título del formulario" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="border rounded-md p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Campos del Formulario</h3>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowFieldSelector(!showFieldSelector)}
              >
                {showFieldSelector ? "Cancelar" : "Agregar Campo"}
              </Button>
            </div>

            {showFieldSelector && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
                <Button variant="outline" onClick={() => addField("text")}>
                  Texto
                </Button>
                <Button variant="outline" onClick={() => addField("textarea")}>
                  Área de Texto
                </Button>
                <Button variant="outline" onClick={() => addField("number")}>
                  Número
                </Button>
                <Button variant="outline" onClick={() => addField("date")}>
                  Fecha
                </Button>
                <Button variant="outline" onClick={() => addField("time")}>
                  Hora
                </Button>
                <Button variant="outline" onClick={() => addField("select")}>
                  Desplegable
                </Button>
                <Button variant="outline" onClick={() => addField("checkbox")}>
                  Casilla
                </Button>
                <Button variant="outline" onClick={() => addField("radio")}>
                  Opción Múltiple
                </Button>
                <Button variant="outline" onClick={() => addField("employee")}>
                  Empleado
                </Button>
                <Button variant="outline" onClick={() => addField("employeeByType")}>
                  Empleado por Tipo
                </Button>
                <Button variant="outline" onClick={() => addField("file")}>
                  Archivo
                </Button>
                <Button variant="outline" onClick={() => addField("signature")}>
                  Firma
                </Button>
                <Button variant="outline" onClick={() => addField("table")}>
                  Tabla
                </Button>
                <Button variant="outline" onClick={() => addField("evaluationMatrix")}>
                  Matriz Evaluación
                </Button>
                <Button variant="outline" onClick={() => addField("advancedTable")}>
                  Tabla Avanzada
                </Button>
                <Button variant="outline" onClick={() => addField("group")}>
                  Grupo
                </Button>
                
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    // Crear una tabla de horas
                    const newField = {
                      id: uuidv4(),
                      type: "advancedTable",
                      label: "Tabla de Horas",
                      required: false,
                      advancedTableConfig: {
                        rows: 7,
                        dynamicRows: false,
                        sections: [
                          {
                            title: "Horas",
                            columns: [
                              {
                                id: uuidv4(),
                                header: "Hora",
                                type: "text",
                                width: "100px",
                                readOnly: true
                              },
                              {
                                id: uuidv4(),
                                header: "",
                                type: "text",
                                width: "150px"
                              }
                            ]
                          }
                        ],
                        initialData: [
                          { "__ROW_ID__": uuidv4(), "Hora": "Hora 0" },
                          { "__ROW_ID__": uuidv4(), "Hora": "Hora 1" },
                          { "__ROW_ID__": uuidv4(), "Hora": "Hora 2" },
                          { "__ROW_ID__": uuidv4(), "Hora": "Hora 3" },
                          { "__ROW_ID__": uuidv4(), "Hora": "Hora 4" },
                          { "__ROW_ID__": uuidv4(), "Hora": "Hora 5" },
                          { "__ROW_ID__": uuidv4(), "Hora": "Fin" }
                        ]
                      }
                    };
                    append(newField);
                  }}
                  className="flex items-center gap-2"
                >
                  <ArrowUpDown className="h-4 w-4" />
                  Tabla de Horas
                </Button>
                
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    // Crear una tabla de manómetro
                    const newField = {
                      id: uuidv4(),
                      type: "advancedTable",
                      label: "Tabla de Manómetro",
                      required: false,
                      advancedTableConfig: {
                        rows: 7,
                        dynamicRows: false,
                        sections: [
                          {
                            title: "Manómetro",
                            columns: [
                              {
                                id: uuidv4(),
                                header: "Hora",
                                type: "text",
                                width: "100px",
                                readOnly: true
                              },
                              {
                                id: uuidv4(),
                                header: "PSI",
                                type: "number",
                                width: "100px"
                              }
                            ]
                          }
                        ],
                        initialData: [
                          { "__ROW_ID__": uuidv4(), "Hora": "Hora 0" },
                          { "__ROW_ID__": uuidv4(), "Hora": "Hora 1" },
                          { "__ROW_ID__": uuidv4(), "Hora": "Hora 2" },
                          { "__ROW_ID__": uuidv4(), "Hora": "Hora 3" },
                          { "__ROW_ID__": uuidv4(), "Hora": "Hora 4" },
                          { "__ROW_ID__": uuidv4(), "Hora": "Hora 5" },
                          { "__ROW_ID__": uuidv4(), "Hora": "Fin" }
                        ]
                      }
                    };
                    append(newField);
                  }}
                  className="flex items-center gap-2"
                >
                  <ArrowUpDown className="h-4 w-4" />
                  Tabla de Manómetro
                </Button>
                
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    // Crear una tabla de verificación de calidad
                    const newField = {
                      id: uuidv4(),
                      type: "advancedTable",
                      label: "Verificación de Calidad",
                      required: false,
                      advancedTableConfig: {
                        rows: 9,
                        dynamicRows: false,
                        sections: [
                          {
                            title: "Verificación de Calidad",
                            columns: [
                              {
                                id: uuidv4(),
                                header: "Hora",
                                type: "text",
                                width: "70px",
                                readOnly: true
                              },
                              {
                                id: uuidv4(),
                                header: "Grados Brix",
                                type: "text", 
                                width: "100px"
                              },
                              {
                                id: uuidv4(),
                                header: "Temperatura",
                                type: "text",
                                width: "100px"
                              },
                              {
                                id: uuidv4(),
                                header: "Textura",
                                type: "text",
                                width: "100px"
                              },
                              {
                                id: uuidv4(),
                                header: "Color",
                                type: "text",
                                width: "100px"
                              },
                              {
                                id: uuidv4(),
                                header: "Viscosidad",
                                type: "text",
                                width: "100px"
                              },
                              {
                                id: uuidv4(),
                                header: "Olor",
                                type: "text",
                                width: "100px"
                              },
                              {
                                id: uuidv4(),
                                header: "Sabor",
                                type: "text",
                                width: "100px"
                              },
                              {
                                id: uuidv4(),
                                header: "Material Extraño",
                                type: "text",
                                width: "120px",
                                readOnly: true
                              },
                              {
                                id: uuidv4(),
                                header: "Status",
                                type: "text",
                                width: "100px"
                              }
                            ]
                          }
                        ],
                        initialData: [
                          { "__ROW_ID__": uuidv4(), "Hora": "Hora", "Grados Brix": "65° a 68° Brix", "Temperatura": "70°C a 95°C", "Material Extraño": "" },
                          { "__ROW_ID__": uuidv4(), "Hora": "Hora 0", "Material Extraño": "N/A" },
                          { "__ROW_ID__": uuidv4(), "Hora": "Hora 1", "Material Extraño": "N/A" },
                          { "__ROW_ID__": uuidv4(), "Hora": "Hora 2", "Material Extraño": "N/A" },
                          { "__ROW_ID__": uuidv4(), "Hora": "Hora 3", "Material Extraño": "N/A" },
                          { "__ROW_ID__": uuidv4(), "Hora": "Hora 4", "Material Extraño": "N/A" },
                          { "__ROW_ID__": uuidv4(), "Hora": "Hora 5", "Material Extraño": "N/A" },
                          { "__ROW_ID__": uuidv4(), "Hora": "Fin", "Material Extraño": "N/A" },
                          { "__ROW_ID__": uuidv4(), "Hora": "", "Material Extraño": "N/A" }
                        ]
                      }
                    };
                    append(newField);
                  }}
                  className="flex items-center gap-2"
                >
                  <ArrowUpDown className="h-4 w-4" />
                  Tabla de Verificación de Calidad
                </Button>
              </div>
            )}

            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="fields">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                    {fields.map((field, index) => (
                      <Draggable key={field.id} draggableId={field.id} index={index}>
                        {(provided) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="mb-2"
                          >
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center">
                                  <div
                                    {...provided.dragHandleProps}
                                    className="p-2 cursor-grab"
                                  >
                                    <Grip className="h-4 w-4" />
                                  </div>
                                  <div className="flex items-center ml-2">
                                    {getFieldIcon(field.type)}
                                    <span className="ml-2 font-semibold">
                                      {field.label || `Campo ${index + 1}`}
                                    </span>
                                    <span className="ml-2 text-muted-foreground text-sm">
                                      ({field.type})
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => duplicateField(index)}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => remove(index)}
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                  control={form.control}
                                  name={`fields.${index}.label`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Etiqueta</FormLabel>
                                      <FormControl>
                                        <Input {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name={`fields.${index}.description`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Descripción</FormLabel>
                                      <FormControl>
                                        <Input {...field} value={field.value || ""} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name={`fields.${index}.placeholder`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Placeholder</FormLabel>
                                      <FormControl>
                                        <Input {...field} value={field.value || ""} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name={`fields.${index}.required`}
                                  render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 mt-6">
                                      <div className="space-y-0.5">
                                        <FormLabel>Requerido</FormLabel>
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

                                <FormField
                                  control={form.control}
                                  name={`fields.${index}.columnSpan`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Ancho de Columna</FormLabel>
                                      <Select
                                        onValueChange={value => field.onChange(parseInt(value))}
                                        defaultValue={field.value?.toString() || "1"}
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Seleccione el ancho" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="1">1 columna</SelectItem>
                                          <SelectItem value="2">2 columnas</SelectItem>
                                          <SelectItem value="3">3 columnas</SelectItem>
                                          <SelectItem value="4">4 columnas</SelectItem>
                                          <SelectItem value="5">5 columnas</SelectItem>
                                          <SelectItem value="6">6 columnas</SelectItem>
                                          <SelectItem value="7">7 columnas</SelectItem>
                                          <SelectItem value="8">8 columnas</SelectItem>
                                          <SelectItem value="9">9 columnas</SelectItem>
                                          <SelectItem value="10">10 columnas</SelectItem>
                                          <SelectItem value="11">11 columnas</SelectItem>
                                          <SelectItem value="12">12 columnas</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                {form.watch(`fields.${index}.type`) === "advancedTable" && (
                                  <div>
                                    <FormField
                                      control={form.control}
                                      name={`fields.${index}.advancedTableConfig`}
                                      render={({ field }) => {
                                        // Initialize advanced table config if it doesn't exist
                                        if (!field.value || !field.value.sections || field.value.sections.length === 0) {
                                          console.log("Inicializando tabla avanzada con configuración robusta");
                                          const robustConfig = {
                                            rows: 3,
                                            dynamicRows: true,
                                            sections: [
                                              {
                                                title: "Tabla de Datos",
                                                columns: [
                                                  { id: "fecha", header: "Fecha", type: "date", width: "120px" },
                                                  { id: "descripcion", header: "Descripción", type: "text", width: "200px" },
                                                  { id: "cantidad", header: "Cantidad", type: "number", width: "100px" }
                                                ]
                                              }
                                            ]
                                          };
                                          
                                          // Aplicar configuración robusta
                                          form.setValue(`fields.${index}.advancedTableConfig`, robustConfig);
                                        }
                                        
                                        return (
                                          <FormItem>
                                            <FormLabel>Configuración de Tabla Avanzada</FormLabel>
                                            <FormDescription>
                                              Usa el editor para configurar las secciones y columnas de la tabla
                                            </FormDescription>
                                            <AdvancedTableEditor
                                              value={field.value || { rows: 3, dynamicRows: true, sections: [] }}
                                              onChange={(newConfig) => {
                                                console.log("FormBuilder: recibiendo nueva configuración de tabla", newConfig);
                                                form.setValue(`fields.${index}.advancedTableConfig`, newConfig);
                                              }}
                                            />
                                            <FormMessage />
                                          </FormItem>
                                        );
                                      }}
                                    />
                                  </div>
                                )}

                                {form.watch(`fields.${index}.type`) === "radio" && (
                                  <div>
                                    <FormField
                                      control={form.control}
                                      name={`fields.${index}.options`}
                                      render={({ field }) => {
                                        if (!field.value || !Array.isArray(field.value) || field.value.length === 0) {
                                          form.setValue(`fields.${index}.options`, defaultOptions);
                                        }
                                        return (
                                          <FormItem>
                                            <FormLabel>Opciones</FormLabel>
                                            <div className="space-y-2">
                                              {field.value && Array.isArray(field.value) && field.value.map((option, optionIndex) => (
                                                <div key={optionIndex} className="flex items-center space-x-2">
                                                  <Input
                                                    value={typeof option === 'string' ? option : option.label}
                                                    onChange={(e) => {
                                                      const newOptions = [...field.value as any[]];
                                                      if (typeof option === 'string') {
                                                        newOptions[optionIndex] = e.target.value;
                                                      } else {
                                                        newOptions[optionIndex] = {
                                                          ...option,
                                                          label: e.target.value,
                                                          value: e.target.value.toLowerCase().replace(/\s+/g, '_')
                                                        };
                                                      }
                                                      form.setValue(`fields.${index}.options`, newOptions);
                                                    }}
                                                  />
                                                  <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                      const newOptions = [...field.value as any[]];
                                                      newOptions.splice(optionIndex, 1);
                                                      form.setValue(`fields.${index}.options`, newOptions);
                                                    }}
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
                                                  const newOptions = [...(field.value as any[] || [])];
                                                  const newOption = typeof newOptions[0] === 'string'
                                                    ? `Opción ${newOptions.length + 1}`
                                                    : {
                                                        label: `Opción ${newOptions.length + 1}`,
                                                        value: `opcion_${newOptions.length + 1}`
                                                      };
                                                  newOptions.push(newOption);
                                                  form.setValue(`fields.${index}.options`, newOptions);
                                                }}
                                              >
                                                <Plus className="h-4 w-4 mr-2" /> Agregar Opción
                                              </Button>
                                            </div>
                                            <FormMessage />
                                          </FormItem>
                                        );
                                      }}
                                    />
                                  </div>
                                )}

                                {form.watch(`fields.${index}.type`) === "select" && (
                                  <div>
                                    <FormField
                                      control={form.control}
                                      name={`fields.${index}.options`}
                                      render={({ field }) => {
                                        if (!field.value || !Array.isArray(field.value) || field.value.length === 0) {
                                          form.setValue(`fields.${index}.options`, defaultOptions);
                                        }
                                        return (
                                          <FormItem>
                                            <FormLabel>Opciones</FormLabel>
                                            <div className="space-y-2">
                                              {field.value && Array.isArray(field.value) && field.value.map((option, optionIndex) => (
                                                <div key={optionIndex} className="flex items-center space-x-2">
                                                  <Input
                                                    value={typeof option === 'string' ? option : option.label}
                                                    onChange={(e) => {
                                                      const newOptions = [...field.value as any[]];
                                                      if (typeof option === 'string') {
                                                        newOptions[optionIndex] = e.target.value;
                                                      } else {
                                                        newOptions[optionIndex] = {
                                                          ...option,
                                                          label: e.target.value,
                                                          value: e.target.value.toLowerCase().replace(/\s+/g, '_')
                                                        };
                                                      }
                                                      form.setValue(`fields.${index}.options`, newOptions);
                                                    }}
                                                  />
                                                  <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                      const newOptions = [...field.value as any[]];
                                                      newOptions.splice(optionIndex, 1);
                                                      form.setValue(`fields.${index}.options`, newOptions);
                                                    }}
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
                                                  const newOptions = [...(field.value as any[] || [])];
                                                  const newOption = typeof newOptions[0] === 'string'
                                                    ? `Opción ${newOptions.length + 1}`
                                                    : {
                                                        label: `Opción ${newOptions.length + 1}`,
                                                        value: `opcion_${newOptions.length + 1}`
                                                      };
                                                  newOptions.push(newOption);
                                                  form.setValue(`fields.${index}.options`, newOptions);
                                                }}
                                              >
                                                <Plus className="h-4 w-4 mr-2" /> Agregar Opción
                                              </Button>
                                            </div>
                                            <FormMessage />
                                          </FormItem>
                                        );
                                      }}
                                    />
                                  </div>
                                )}

                                {form.watch(`fields.${index}.type`) === "table" && (
                                  <div>
                                    <FormField
                                      control={form.control}
                                      name={`fields.${index}.tableRows`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Filas</FormLabel>
                                          <FormControl>
                                            <Input
                                              type="number"
                                              min={1}
                                              {...field}
                                              value={field.value || 3}
                                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    <FormField
                                      control={form.control}
                                      name={`fields.${index}.tableColumns`}
                                      render={({ field }) => {
                                        if (!field.value || !Array.isArray(field.value) || field.value.length === 0) {
                                          form.setValue(`fields.${index}.tableColumns`, defaultTableColumns);
                                        }
                                        return (
                                          <FormItem>
                                            <FormLabel>Columnas</FormLabel>
                                            <div className="space-y-2">
                                              {field.value && Array.isArray(field.value) && field.value.map((column, colIndex) => (
                                                <div key={colIndex} className="grid grid-cols-3 gap-2">
                                                  <Input
                                                    placeholder="Título"
                                                    value={column.header}
                                                    onChange={(e) => {
                                                      const newColumns = [...field.value as any[]];
                                                      newColumns[colIndex] = {
                                                        ...column,
                                                        header: e.target.value,
                                                      };
                                                      form.setValue(`fields.${index}.tableColumns`, newColumns);
                                                    }}
                                                  />
                                                  <Select
                                                    value={column.type}
                                                    onValueChange={(value) => {
                                                      const newColumns = [...field.value as any[]];
                                                      newColumns[colIndex] = {
                                                        ...column,
                                                        type: value as FieldType,
                                                      };
                                                      form.setValue(`fields.${index}.tableColumns`, newColumns);
                                                    }}
                                                  >
                                                    <SelectTrigger>
                                                      <SelectValue placeholder="Tipo" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="text">Texto</SelectItem>
                                                      <SelectItem value="number">Número</SelectItem>
                                                      <SelectItem value="date">Fecha</SelectItem>
                                                      <SelectItem value="select">Desplegable</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                  <div className="flex items-center space-x-2">
                                                    <Input
                                                      placeholder="Ancho"
                                                      value={column.width || ""}
                                                      onChange={(e) => {
                                                        const newColumns = [...field.value as any[]];
                                                        newColumns[colIndex] = {
                                                          ...column,
                                                          width: e.target.value,
                                                        };
                                                        form.setValue(`fields.${index}.tableColumns`, newColumns);
                                                      }}
                                                    />
                                                    <Button
                                                      type="button"
                                                      variant="ghost"
                                                      size="sm"
                                                      onClick={() => {
                                                        const newColumns = [...field.value as any[]];
                                                        newColumns.splice(colIndex, 1);
                                                        form.setValue(`fields.${index}.tableColumns`, newColumns);
                                                      }}
                                                    >
                                                      <Trash className="h-4 w-4" />
                                                    </Button>
                                                  </div>
                                                </div>
                                              ))}
                                              <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                  const newColumns = [...(field.value as any[] || [])];
                                                  newColumns.push({
                                                    id: uuidv4(),
                                                    header: `Columna ${newColumns.length + 1}`,
                                                    type: "text" as FieldType,
                                                    width: "200px",
                                                  });
                                                  form.setValue(`fields.${index}.tableColumns`, newColumns);
                                                }}
                                              >
                                                <Plus className="h-4 w-4 mr-2" /> Agregar Columna
                                              </Button>
                                            </div>
                                            <FormMessage />
                                          </FormItem>
                                        );
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            {fields.length === 0 && (
              <div className="text-center py-10 border border-dashed rounded-md">
                <p className="text-muted-foreground">
                  No hay campos en el formulario. Haga clic en "Agregar Campo"
                  para comenzar.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" type="button">
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Guardando..." : "Guardar Formulario"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}