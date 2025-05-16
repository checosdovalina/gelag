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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormDescription, FormField as UIFormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Type, 
  Hash, 
  Calendar, 
  Clock,
  List, 
  CheckSquare, 
  Radio as RadioIcon, 
  AlignLeft, 
  Table as TableIcon,
  LayoutGrid,
  Package, 
  UserCircle,
  Users 
} from "lucide-react";
import { FieldType, formFieldSchema, formStructureSchema } from "@shared/schema";
import type { FormField } from "@shared/schema";
import AdvancedTableEditor from "./advanced-table-editor";

interface FormBuilderProps {
  initialFormData?: z.infer<typeof formStructureSchema>;
  onSave: (data: z.infer<typeof formStructureSchema>) => void;
  isLoading?: boolean;
}

const defaultField: FormField = {
  id: "",
  type: "text",
  label: "",
  displayName: "",  // Añadimos el campo displayName para que se incluya en el formulario
  displayOrder: 0,  // Y también displayOrder para controlar el orden en reportes
  features: [],     // Características especiales como autocompletado de recetas
  required: false,
  placeholder: "",
};

// Options for select/radio/checkbox fields
const defaultOptions = [
  { label: "Opción 1", value: "option1" },
  { label: "Opción 2", value: "option2" },
];

// Schema for form builder
const formBuilderSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  fields: z.array(formFieldSchema).min(1, "Se requiere al menos un campo"),
});

export default function FormBuilder({ initialFormData, onSave, isLoading = false }: FormBuilderProps) {
  // Inicializar formulario con valores por defecto o datos proporcionados
  const processedFormData = useMemo(() => {
    if (!initialFormData) {
      return {
        title: "",
        fields: [{ ...defaultField, id: uuidv4() }],
      };
    }
    
    // Asegurarnos de que todos los campos tengan displayName y displayOrder
    const processedFields = initialFormData.fields.map(field => ({
      ...field,
      displayName: field.displayName || field.label || "",
      displayOrder: field.displayOrder !== undefined ? field.displayOrder : 0
    }));
    
    return {
      ...initialFormData,
      fields: processedFields
    };
  }, [initialFormData]);
  
  const form = useForm<z.infer<typeof formBuilderSchema>>({
    resolver: zodResolver(formBuilderSchema),
    defaultValues: processedFormData
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "fields"
  });
  
  // Function to add a new field
  const addField = () => {
    const newField: FormField = {
      ...defaultField,
      id: uuidv4(),
    };
    append(newField);
  };

  // Function to duplicate a field
  const duplicateField = (index: number) => {
    const fieldToDuplicate = fields[index];
    const duplicatedField: FormField = {
      ...fieldToDuplicate,
      id: uuidv4(), // Generar un nuevo ID único
      label: `${fieldToDuplicate.label} (copia)`, // Modificar el label para indicar que es una copia
    };
    
    // Crear un nuevo array con todos los campos actuales
    const newFields = [...fields];
    // Insertar el campo duplicado justo después del original (index + 1)
    newFields.splice(index + 1, 0, duplicatedField);
    
    // Actualizar los campos
    form.setValue('fields', newFields);
  };

  // Function to remove a field
  const removeField = (index: number) => {
    remove(index);
  };

  // Handle form submission
  const onSubmit = (data: z.infer<typeof formBuilderSchema>) => {
    // Asegurar que todos los campos tengan sus propiedades completas
    const fieldsWithDisplayProps = data.fields.map(field => {
      // Si no tiene displayName, usar el label como valor predeterminado
      if (!field.displayName || field.displayName === '') {
        field.displayName = field.label;
      }
      // Asignar displayOrder si no existe
      if (field.displayOrder === undefined || field.displayOrder === null) {
        field.displayOrder = 0;
      }
      
      // Asegurarse de que todos los campos sean del tipo esperado
      return {
        ...field,
        displayName: String(field.displayName),
        displayOrder: Number(field.displayOrder)
      };
    });
    
    // Enviar los datos actualizados
    try {
      const processedFields = fieldsWithDisplayProps.map(field => {
        // Procesar especialmente los campos de tabla avanzada
        if (field.type === 'advancedTable' && field.advancedTableConfig) {
          console.log(`Procesando tabla avanzada para guardar: ${field.id}`);
          
          // Crear una copia profunda para evitar problemas de referencia
          return {
            ...field,
            advancedTableConfig: JSON.parse(JSON.stringify(field.advancedTableConfig))
          };
        }
        return field;
      });
      
      const updatedData = {
        ...data,
        fields: processedFields
      };
      
      // Crear una versión final segura con copia profunda
      const safeData = JSON.parse(JSON.stringify(updatedData));
      
      console.log('Enviando formulario con datos procesados:', safeData);
      
      // Log detallado para debugging
      console.log('Campos enviados al servidor:');
      safeData.fields.forEach((field: any, index: number) => {
        console.log(`Campo #${index+1} - ID: ${field.id}, Tipo: ${field.type}`);
        console.log(`  Label: ${field.label}`);
        console.log(`  DisplayName: ${field.displayName}`);
        console.log(`  DisplayOrder: ${field.displayOrder}`);
        if (field.type === 'advancedTable') {
          console.log(`  Tabla avanzada con ${field.advancedTableConfig?.sections?.length || 0} secciones`);
        }
      });
      
      // Enviar con un pequeño retraso para garantizar que todo esté listo
      setTimeout(() => {
        onSave(safeData);
      }, 100);
    } catch (error) {
      console.error("Error al procesar el formulario para guardar:", error);
      // Intentar un enfoque alternativo en caso de error
      onSave({
        title: data.title,
        fields: fieldsWithDisplayProps
      });
    }
  };

  // Handle drag and drop reordering
  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    
    if (sourceIndex === destinationIndex) return;
    
    // Update form fields order using move provided by useFieldArray
    move(sourceIndex, destinationIndex);
  };

  // Get field icon based on type
  const getFieldIcon = (type: FieldType) => {
    switch (type) {
      case "text": return <Type className="h-4 w-4" />;
      case "number": return <Hash className="h-4 w-4" />;
      case "date": return <Calendar className="h-4 w-4" />;
      case "select": return <List className="h-4 w-4" />;
      case "checkbox": return <CheckSquare className="h-4 w-4" />;
      case "radio": return <RadioIcon className="h-4 w-4" />;
      case "textarea": return <AlignLeft className="h-4 w-4" />;
      case "table": return <TableIcon className="h-4 w-4" />;
      case "advancedTable": return <LayoutGrid className="h-4 w-4" />;
      case "employee": return <UserCircle className="h-4 w-4" />;
      case "employeeByType": return <Users className="h-4 w-4" />;
      case "product": return <Package className="h-4 w-4" />;
      default: return <Type className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <UIFormField
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
              </CardContent>
            </Card>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Campos del Formulario</h3>
                <Button 
                  type="button" 
                  onClick={addField} 
                  variant="outline" 
                  size="sm"
                  className="flex items-center"
                >
                  <Plus className="h-4 w-4 mr-1" /> Agregar Campo
                </Button>
              </div>

              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="fields">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-4"
                    >
                      {fields.map((field, index) => (
                        <Draggable key={field.id} draggableId={field.id} index={index}>
                          {(provided) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className="relative"
                            >
                              <div
                                {...provided.dragHandleProps}
                                className="absolute left-3 top-3 cursor-move text-gray-400"
                              >
                                <GripVertical className="h-5 w-5" />
                              </div>
                              <CardContent className="pt-6 pl-10">
                                <div className="grid gap-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <UIFormField
                                      control={form.control}
                                      name={`fields.${index}.label`}
                                      render={({ field }) => {
                                        const isEditable = form.watch(`fields.${index}.editable`) !== false;
                                        return (
                                          <FormItem>
                                            <FormLabel>Etiqueta</FormLabel>
                                            <FormControl>
                                              <Input 
                                                placeholder="Etiqueta del campo" 
                                                {...field} 
                                                disabled={!isEditable}
                                              />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        );
                                      }}
                                    />
                                    
                                    <UIFormField
                                      control={form.control}
                                      name={`fields.${index}.displayName`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Nombre para Reportes</FormLabel>
                                          <FormControl>
                                            <div className="space-y-1">
                                              <Input 
                                                placeholder="Ej: Nombre Empleado, Departamento" 
                                                {...field} 
                                                value={field.value || ''}
                                                onChange={(e) => {
                                                  const newValue = e.target.value;
                                                  // Actualizar directamente utilizando la API de React Hook Form
                                                  form.setValue(`fields.${index}.displayName`, newValue, {
                                                    shouldValidate: true,
                                                    shouldDirty: true,
                                                    shouldTouch: true
                                                  });
                                                  console.log(`DisplayName para campo ${index} actualizado:`, newValue);
                                                }}
                                              />
                                              <div className="text-xs text-muted-foreground">
                                                <span className="text-amber-600 font-medium">Importante:</span> Si tiene problemas para guardar este campo, 
                                                utilice la opción "Editar nombres" en la vista previa del formulario.
                                              </div>
                                            </div>
                                          </FormControl>
                                          <FormDescription>
                                            Nombre personalizado que aparecerá en los reportes
                                          </FormDescription>
                                        </FormItem>
                                      )}
                                    />
                                    
                                    <UIFormField
                                      control={form.control}
                                      name={`fields.${index}.displayOrder`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Orden en Reportes</FormLabel>
                                          <FormControl>
                                            <Input 
                                              type="number" 
                                              placeholder="Ej: 1, 2, 3..." 
                                              {...field} 
                                              value={field.value === undefined ? '' : field.value}
                                              onChange={(e) => {
                                                const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                                                // Actualizar directamente utilizando la API de React Hook Form
                                                form.setValue(`fields.${index}.displayOrder`, value, {
                                                  shouldValidate: true,
                                                  shouldDirty: true,
                                                  shouldTouch: true
                                                });
                                                console.log(`DisplayOrder para campo ${index} actualizado:`, value);
                                              }}
                                            />
                                          </FormControl>
                                          <FormDescription>
                                            Posición del campo en los reportes (menor número = aparece primero)
                                          </FormDescription>
                                        </FormItem>
                                      )}
                                    />

                                    <UIFormField
                                      control={form.control}
                                      name={`fields.${index}.type`}
                                      render={({ field }) => {
                                        const isEditable = form.watch(`fields.${index}.editable`) !== false;
                                        return (
                                          <FormItem>
                                            <FormLabel>Tipo</FormLabel>
                                            <Select
                                              value={field.value}
                                              onValueChange={field.onChange}
                                              disabled={!isEditable}
                                            >
                                              <FormControl>
                                                <SelectTrigger>
                                                  <SelectValue placeholder="Seleccione un tipo" />
                                                </SelectTrigger>
                                              </FormControl>
                                              <SelectContent>
                                                <SelectItem value="text">
                                                  <div className="flex items-center">
                                                    <Type className="h-4 w-4 mr-2" /> Texto
                                                  </div>
                                                </SelectItem>
                                                <SelectItem value="number">
                                                  <div className="flex items-center">
                                                    <Hash className="h-4 w-4 mr-2" /> Número
                                                  </div>
                                                </SelectItem>
                                                <SelectItem value="date">
                                                  <div className="flex items-center">
                                                    <Calendar className="h-4 w-4 mr-2" /> Fecha
                                                  </div>
                                                </SelectItem>
                                                <SelectItem value="time">
                                                  <div className="flex items-center">
                                                    <Clock className="h-4 w-4 mr-2" /> Hora
                                                  </div>
                                                </SelectItem>
                                                <SelectItem value="select">
                                                  <div className="flex items-center">
                                                    <List className="h-4 w-4 mr-2" /> Lista desplegable
                                                  </div>
                                                </SelectItem>
                                                <SelectItem value="checkbox">
                                                  <div className="flex items-center">
                                                    <CheckSquare className="h-4 w-4 mr-2" /> Casilla de verificación
                                                  </div>
                                                </SelectItem>
                                                <SelectItem value="radio">
                                                  <div className="flex items-center">
                                                    <RadioIcon className="h-4 w-4 mr-2" /> Opción única
                                                  </div>
                                                </SelectItem>
                                                <SelectItem value="textarea">
                                                  <div className="flex items-center">
                                                    <AlignLeft className="h-4 w-4 mr-2" /> Área de texto
                                                  </div>
                                                </SelectItem>
                                                <SelectItem value="table">
                                                  <div className="flex items-center">
                                                    <TableIcon className="h-4 w-4 mr-2" /> Tabla
                                                  </div>
                                                </SelectItem>
                                                <SelectItem value="advancedTable">
                                                  <div className="flex items-center">
                                                    <LayoutGrid className="h-4 w-4 mr-2" /> Tabla Avanzada
                                                  </div>
                                                </SelectItem>
                                                <SelectItem value="employee">
                                                  <div className="flex items-center">
                                                    <UserCircle className="h-4 w-4 mr-2" /> Seleccionar Empleado
                                                  </div>
                                                </SelectItem>
                                                <SelectItem value="employeeByType">
                                                  <div className="flex items-center">
                                                    <UserCircle className="h-4 w-4 mr-2" /> Empleado por Tipo
                                                  </div>
                                                </SelectItem>
                                                <SelectItem value="product">
                                                  <div className="flex items-center">
                                                    <Package className="h-4 w-4 mr-2" /> Seleccionar Producto
                                                  </div>
                                                </SelectItem>
                                              </SelectContent>
                                            </Select>
                                            <FormMessage />
                                          </FormItem>
                                        );
                                      }}
                                    />
                                  </div>

                                  {(form.watch(`fields.${index}.type`) === "text" || 
                                    form.watch(`fields.${index}.type`) === "number" || 
                                    form.watch(`fields.${index}.type`) === "textarea") && (
                                    <UIFormField
                                      control={form.control}
                                      name={`fields.${index}.placeholder`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Placeholder</FormLabel>
                                          <FormControl>
                                            <Input placeholder="Placeholder del campo" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  )}

                                  {form.watch(`fields.${index}.type`) === "select" && (
                                    <div>
                                      <UIFormField
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
                                                      placeholder="Etiqueta"
                                                      value={typeof option === 'string' ? option : option.label}
                                                      onChange={(e) => {
                                                        const newOptions = [...field.value];
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
                                                    <Input
                                                      placeholder="Valor"
                                                      value={typeof option === 'string' ? option : option.value}
                                                      onChange={(e) => {
                                                        const newOptions = [...field.value];
                                                        if (typeof option === 'string') {
                                                          newOptions[optionIndex] = e.target.value;
                                                        } else {
                                                          newOptions[optionIndex] = { ...option, value: e.target.value };
                                                        }
                                                        form.setValue(`fields.${index}.options`, newOptions);
                                                      }}
                                                    />
                                                    <Button
                                                      type="button"
                                                      variant="ghost"
                                                      size="sm"
                                                      onClick={() => {
                                                        const newOptions = [...field.value];
                                                        newOptions.splice(optionIndex, 1);
                                                        form.setValue(`fields.${index}.options`, newOptions);
                                                      }}
                                                      disabled={field.value && field.value.length <= 1}
                                                    >
                                                      <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                  </div>
                                                ))}
                                                <Button
                                                  type="button"
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={() => {
                                                    const newOption = { label: `Opción ${field.value ? field.value.length + 1 : 1}`, value: `option${field.value ? field.value.length + 1 : 1}` };
                                                    const newOptions = [...(field.value || []), newOption];
                                                    form.setValue(`fields.${index}.options`, newOptions);
                                                  }}
                                                >
                                                  <Plus className="h-4 w-4 mr-1" /> Agregar Opción
                                                </Button>
                                              </div>
                                            </FormItem>
                                          );
                                        }}
                                      />
                                    </div>
                                  )}

                                  {form.watch(`fields.${index}.type`) === "employeeByType" && (
                                    <div>
                                      <UIFormField
                                        control={form.control}
                                        name={`fields.${index}.employeeType`}
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Tipo de Empleado</FormLabel>
                                            <FormControl>
                                              <Select
                                                value={field.value || 'operativo'}
                                                onValueChange={field.onChange}
                                              >
                                                <SelectTrigger>
                                                  <SelectValue placeholder="Seleccionar tipo" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="operativo">Operativo</SelectItem>
                                                  <SelectItem value="calidad">Calidad</SelectItem>
                                                  <SelectItem value="produccion">Producción</SelectItem>
                                                  <SelectItem value="administrativo">Administrativo</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </FormControl>
                                            <FormDescription>
                                              El campo mostrará una lista desplegable con empleados de este tipo
                                            </FormDescription>
                                          </FormItem>
                                        )}
                                      />
                                    </div>
                                  )}
                                  
                                  {form.watch(`fields.${index}.type`) === "product" && (
                                    <div className="space-y-4">
                                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                        <div className="space-y-0.5">
                                          <FormLabel>Autocompletado de Recetas</FormLabel>
                                          <FormDescription>
                                            Habilitar el autocompletado de ingredientes cuando se selecciona un producto
                                          </FormDescription>
                                        </div>
                                        <UIFormField
                                          control={form.control}
                                          name={`fields.${index}.features`}
                                          render={({ field }) => {
                                            // Asegurarse de que features sea siempre un array
                                            const features = Array.isArray(field.value) ? field.value : [];
                                            const hasRecipeAutocomplete = features.includes('recipeAutocomplete');
                                            
                                            return (
                                              <FormControl>
                                                <Switch
                                                  checked={hasRecipeAutocomplete}
                                                  onCheckedChange={(checked) => {
                                                    let newFeatures = [...features];
                                                    if (checked && !hasRecipeAutocomplete) {
                                                      newFeatures.push('recipeAutocomplete');
                                                    } else if (!checked && hasRecipeAutocomplete) {
                                                      newFeatures = newFeatures.filter(f => f !== 'recipeAutocomplete');
                                                    }
                                                    field.onChange(newFeatures);
                                                  }}
                                                />
                                              </FormControl>
                                            );
                                          }}
                                        />
                                      </FormItem>
                                    </div>
                                  )}

                                  {form.watch(`fields.${index}.type`) === "advancedTable" && (
                                    <div>
                                      <UIFormField
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
                                                value={field.value}
                                                onChange={(newConfig) => {
                                                  // Asegurarse de que el campo esté correctamente configurado
                                                  try {
                                                    console.log("FormBuilder: recibiendo nueva configuración de tabla avanzada", newConfig);
                                                    
                                                    // ENFOQUE ULTRA SIMPLIFICADO Y ROBUSTO
                                                    // Verificar si la configuración tiene secciones, si no, proporcionarle una configuración básica
                                                    let configToSave = { ...newConfig };
                                                    
                                                    // FLUJO REVISADO: Primero verificar si hay datos iniciales, en cuyo caso preservar estructura existente
                                                    
                                                    // 1. Verificar si tiene datos iniciales (incluso si no tiene secciones)
                                                    const hasInitialData = configToSave.initialData && Array.isArray(configToSave.initialData) && configToSave.initialData.length > 0;
                                                    
                                                    // 2. Obtener configuración actual (si existe)
                                                    const currentConfig = field.value || {};
                                                    const hasCurrentSections = currentConfig && currentConfig.sections && currentConfig.sections.length > 0;
                                                    
                                                    // Caso 1: Tiene datos iniciales y hay una estructura existente - preservar estructura, actualizar datos
                                                    if (hasInitialData && hasCurrentSections) {
                                                      console.log("Actualizando datos iniciales manteniendo estructura existente");
                                                      configToSave = {
                                                        ...currentConfig,
                                                        initialData: configToSave.initialData,
                                                        rows: Math.max(currentConfig.rows || 3, configToSave.initialData.length)
                                                      };
                                                    }
                                                    // Caso 2: No tiene secciones propias pero hay datos iniciales - usar estructura existente
                                                    else if (hasInitialData && (!configToSave.sections || configToSave.sections.length === 0)) {
                                                      console.log("Recibidos solo datos iniciales, verificando estructura existente");
                                                      
                                                      // MODIFICACIÓN CRÍTICA: Tratar de encontrar la estructura en el formulario completo, no solo en este campo
                                                      // Asumimos que estamos recibiendo materias primas que deben aplicarse a la tabla avanzada existente
                                                      
                                                      // Primero buscamos en este campo
                                                      if (hasCurrentSections) {
                                                        // Usar estructura actual con nuevos datos
                                                        configToSave = {
                                                          ...currentConfig,
                                                          initialData: configToSave.initialData,
                                                          rows: Math.max(currentConfig.rows || 3, configToSave.initialData.length)
                                                        };
                                                        console.log("Aplicando nuevos datos iniciales a estructura existente");
                                                      } 
                                                      // Si no encontramos estructura aquí, buscar en el formulario completo 
                                                      else {
                                                        // SOLUCIÓN ALTERNATIVA: Intentar recuperar la estructura desde otra parte del form
                                                        const formData = form.getValues();
                                                        
                                                        // Verificar si hay una tabla avanzada en el formulario
                                                        let foundStructure = false;
                                                        
                                                        // Buscar un campo existente con estructura de tabla avanzada
                                                        if (formData && typeof formData === 'object') {
                                                          for (const key in formData) {
                                                            const item = formData[key];
                                                            if (item && 
                                                                typeof item === 'object' && 
                                                                item.sections && 
                                                                Array.isArray(item.sections) && 
                                                                item.sections.length > 0) {
                                                              
                                                              // Encontramos una estructura de tabla, usarla como base
                                                              configToSave = {
                                                                ...item,
                                                                initialData: configToSave.initialData,
                                                                rows: Math.max(item.rows || 3, configToSave.initialData.length)
                                                              };
                                                              
                                                              console.log("Recuperada estructura desde otro campo del formulario");
                                                              foundStructure = true;
                                                              break;
                                                            }
                                                          }
                                                        }
                                                        
                                                        // Si tampoco encontramos estructura en el form, último recurso
                                                        if (!foundStructure) {
                                                          console.log("Ninguna estructura encontrada, creando por defecto");
                                                          configToSave = {
                                                            rows: configToSave.initialData.length || 3,
                                                            dynamicRows: true,
                                                            sections: [
                                                              {
                                                                title: "Materia Prima",
                                                                columns: [
                                                                  { id: "materia", header: "Materia Prima", type: "text", width: "200px", readOnly: true },
                                                                  { id: "cantidad", header: "Cantidad", type: "number", width: "100px" }
                                                                ]
                                                              }
                                                            ],
                                                            initialData: configToSave.initialData
                                                          };
                                                        }
                                                      }
                                                    }
                                                    // Caso 3: Tiene su propia estructura de secciones - usarla directamente
                                                    else if (configToSave.sections && configToSave.sections.length > 0) {
                                                      console.log("Usando configuración con estructura propia");
                                                      // No hacer nada, usar la configuración tal cual viene
                                                    }
                                                    // Caso 4: No tiene secciones ni datos iniciales - usar plantilla por defecto
                                                    else {
                                                      console.log("Configuración sin secciones detectada, aplicando configuración por defecto");
                                                      configToSave = {
                                                        rows: configToSave.rows || 3,
                                                        dynamicRows: configToSave.dynamicRows !== undefined ? configToSave.dynamicRows : true,
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
                                                    
                                                    // Crear un clon simplificado que solo contenga las propiedades esenciales
                                                    const basicConfig = {
                                                      rows: configToSave.rows || 3,
                                                      dynamicRows: configToSave.dynamicRows !== undefined ? configToSave.dynamicRows : true,
                                                      sections: configToSave.sections || []
                                                    };
                                                    
                                                    // 2. Convertir a JSON y de vuelta para romper cualquier referencia
                                                    const cleanConfig = JSON.parse(JSON.stringify(basicConfig));
                                                    
                                                    console.log("FormBuilder: configuración limpia preparada para guardar", cleanConfig);
                                                    
                                                    // 3. Aplicar con un retraso mayor
                                                    setTimeout(() => {
                                                      // Eliminar cualquier configuración anterior
                                                      const allFields = form.getValues("fields");
                                                      if (allFields && allFields[index]) {
                                                        // Crear un campo completamente nuevo
                                                        const updatedField = { 
                                                          ...allFields[index],
                                                          advancedTableConfig: cleanConfig
                                                        };
                                                        
                                                        // Actualizar el campo completo
                                                        const allFieldsUpdated = [...allFields];
                                                        allFieldsUpdated[index] = updatedField;
                                                        
                                                        // Aplicar la actualización completa
                                                        form.setValue("fields", allFieldsUpdated, {
                                                          shouldDirty: true,
                                                          shouldTouch: true,
                                                          shouldValidate: true
                                                        });
                                                        
                                                        console.log("FormBuilder: actualización aplicada con éxito");
                                                      } else {
                                                        // Método alternativo si falla
                                                        form.setValue(`fields.${index}.advancedTableConfig`, cleanConfig, {
                                                          shouldDirty: true,
                                                          shouldTouch: true,
                                                          shouldValidate: true
                                                        });
                                                        console.log("FormBuilder: actualización con método alternativo");
                                                      }
                                                      form.trigger();
                                                    }, 300); // Retraso más largo para asegurar que todo esté listo
                                                  } catch (error) {
                                                    console.error("FormBuilder: Error al actualizar configuración de tabla", error);
                                                    // Intento de recuperación
                                                    form.setValue(`fields.${index}.advancedTableConfig`, newConfig);
                                                  }
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
                                      <UIFormField
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
                                                      placeholder="Etiqueta"
                                                      value={typeof option === 'string' ? option : option.label}
                                                      onChange={(e) => {
                                                        const newOptions = [...field.value];
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
                                                    <Input
                                                      placeholder="Valor"
                                                      value={typeof option === 'string' ? option : option.value}
                                                      onChange={(e) => {
                                                        const newOptions = [...field.value];
                                                        if (typeof option === 'string') {
                                                          newOptions[optionIndex] = e.target.value;
                                                        } else {
                                                          newOptions[optionIndex] = { ...option, value: e.target.value };
                                                        }
                                                        form.setValue(`fields.${index}.options`, newOptions);
                                                      }}
                                                    />
                                                    <Button
                                                      type="button"
                                                      variant="ghost"
                                                      size="sm"
                                                      onClick={() => {
                                                        const newOptions = [...field.value];
                                                        newOptions.splice(optionIndex, 1);
                                                        form.setValue(`fields.${index}.options`, newOptions);
                                                      }}
                                                      disabled={field.value && field.value.length <= 1}
                                                    >
                                                      <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                  </div>
                                                ))}
                                                <Button
                                                  type="button"
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={() => {
                                                    const newOption = { label: `Opción ${field.value ? field.value.length + 1 : 1}`, value: `option${field.value ? field.value.length + 1 : 1}` };
                                                    const newOptions = [...(field.value || []), newOption];
                                                    form.setValue(`fields.${index}.options`, newOptions);
                                                  }}
                                                >
                                                  <Plus className="h-4 w-4 mr-1" /> Agregar Opción
                                                </Button>
                                              </div>
                                            </FormItem>
                                          );
                                        }}
                                      />
                                    </div>
                                  )}

                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center space-x-2">
                                      <UIFormField
                                        control={form.control}
                                        name={`fields.${index}.required`}
                                        render={({ field }) => {
                                          const isEditable = form.watch(`fields.${index}.editable`) !== false;
                                          return (
                                            <FormItem className="flex items-center space-x-2">
                                              <FormControl>
                                                <Switch
                                                  checked={field.value}
                                                  onCheckedChange={field.onChange}
                                                  disabled={!isEditable}
                                                />
                                              </FormControl>
                                              <FormLabel className="m-0">Campo requerido</FormLabel>
                                            </FormItem>
                                          );
                                        }}
                                      />
                                    </div>
                                    <div className="flex space-x-2">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => duplicateField(index)}
                                        className="text-blue-500 hover:text-blue-700"
                                      >
                                        <Plus className="h-4 w-4 mr-1" /> Duplicar
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeField(index)}
                                        disabled={fields.length <= 1}
                                        className="text-red-500 hover:text-red-700"
                                      >
                                        <Trash2 className="h-4 w-4 mr-1" /> Eliminar
                                      </Button>
                                    </div>
                                  </div>
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
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Guardando...' : 'Guardar Formulario'}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}