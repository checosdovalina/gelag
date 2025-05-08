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
  List, 
  CheckSquare, 
  RadioIcon, 
  AlignLeft, 
  Table as TableIcon,
  Package, 
  UserCircle 
} from "lucide-react";
import { FieldType, formFieldSchema, formStructureSchema } from "@shared/schema";
import type { FormField } from "@shared/schema";

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
    const updatedData = {
      ...data,
      fields: fieldsWithDisplayProps
    };
    
    console.log('Enviando formulario con datos:', updatedData);
    
    // Log detallado para debugging
    console.log('Campos enviados al servidor:');
    updatedData.fields.forEach((field, index) => {
      console.log(`Campo #${index+1} - ID: ${field.id}`);
      console.log(`  Label: ${field.label}`);
      console.log(`  DisplayName: ${field.displayName}`);
      console.log(`  DisplayOrder: ${field.displayOrder}`);
    });
    
    onSave(updatedData);
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
      case "employee": return <UserCircle className="h-4 w-4" />;
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
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Etiqueta</FormLabel>
                                          <FormControl>
                                            <Input placeholder="Etiqueta del campo" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
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
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Tipo</FormLabel>
                                          <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
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
                                      )}
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

                                  {(form.watch(`fields.${index}.type`) === "select" || 
                                   form.watch(`fields.${index}.type`) === "radio" || 
                                   form.watch(`fields.${index}.type`) === "checkbox") && (
                                    <div>
                                      <UIFormField
                                        control={form.control}
                                        name={`fields.${index}.options`}
                                        render={({ field }) => {
                                          // Initialize options if they don't exist
                                          if (!field.value) {
                                            form.setValue(`fields.${index}.options`, defaultOptions);
                                          }
                                          
                                          return (
                                            <FormItem>
                                              <FormLabel>Opciones</FormLabel>
                                              <div className="space-y-2">
                                                {(field.value || []).map((option, optionIndex) => (
                                                  <div key={optionIndex} className="flex items-center gap-2">
                                                    <Input
                                                      placeholder="Etiqueta"
                                                      value={option.label}
                                                      onChange={(e) => {
                                                        const newOptions = [...(field.value || [])];
                                                        newOptions[optionIndex].label = e.target.value;
                                                        form.setValue(`fields.${index}.options`, newOptions);
                                                      }}
                                                    />
                                                    <Input
                                                      placeholder="Valor"
                                                      value={option.value}
                                                      onChange={(e) => {
                                                        const newOptions = [...(field.value || [])];
                                                        newOptions[optionIndex].value = e.target.value;
                                                        form.setValue(`fields.${index}.options`, newOptions);
                                                      }}
                                                    />
                                                    <Button
                                                      type="button"
                                                      variant="ghost"
                                                      size="icon"
                                                      onClick={() => {
                                                        const newOptions = [...(field.value || [])];
                                                        newOptions.splice(optionIndex, 1);
                                                        form.setValue(`fields.${index}.options`, newOptions);
                                                      }}
                                                      disabled={field.value?.length <= 1}
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
                                                    const newOptions = [...(field.value || [])];
                                                    newOptions.push({ 
                                                      label: `Opción ${newOptions.length + 1}`, 
                                                      value: `option${newOptions.length + 1}` 
                                                    });
                                                    form.setValue(`fields.${index}.options`, newOptions);
                                                  }}
                                                >
                                                  <Plus className="h-4 w-4 mr-1" /> Agregar Opción
                                                </Button>
                                              </div>
                                              <FormMessage />
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
                                              El campo mostrará solo empleados del tipo seleccionado
                                            </FormDescription>
                                          </FormItem>
                                        )}
                                      />
                                    </div>
                                  )}

                                  {form.watch(`fields.${index}.type`) === "table" && (
                                    <div>
                                      <UIFormField
                                        control={form.control}
                                        name={`fields.${index}.columns`}
                                        render={({ field }) => {
                                          // Initialize columns if they don't exist
                                          if (!field.value) {
                                            form.setValue(`fields.${index}.columns`, [
                                              { id: uuidv4(), header: "Columna 1", type: "text" },
                                              { id: uuidv4(), header: "Columna 2", type: "text" }
                                            ]);
                                          }
                                          
                                          return (
                                            <FormItem>
                                              <FormLabel>Columnas de la Tabla</FormLabel>
                                              <div className="space-y-2">
                                                {(field.value || []).map((column, colIndex) => (
                                                  <div key={column.id} className="flex items-center gap-2">
                                                    <Input
                                                      placeholder="Encabezado"
                                                      value={column.header}
                                                      onChange={(e) => {
                                                        const newColumns = [...(field.value || [])];
                                                        newColumns[colIndex].header = e.target.value;
                                                        form.setValue(`fields.${index}.columns`, newColumns);
                                                      }}
                                                    />
                                                    <Select
                                                      value={column.type}
                                                      onValueChange={(value) => {
                                                        const newColumns = [...(field.value || [])];
                                                        newColumns[colIndex].type = value as "text" | "number" | "select";
                                                        form.setValue(`fields.${index}.columns`, newColumns);
                                                      }}
                                                    >
                                                      <SelectTrigger className="w-[120px]">
                                                        <SelectValue placeholder="Tipo" />
                                                      </SelectTrigger>
                                                      <SelectContent>
                                                        <SelectItem value="text">Texto</SelectItem>
                                                        <SelectItem value="number">Número</SelectItem>
                                                        <SelectItem value="select">Lista</SelectItem>
                                                      </SelectContent>
                                                    </Select>
                                                    <Button
                                                      type="button"
                                                      variant="ghost"
                                                      size="icon"
                                                      onClick={() => {
                                                        const newColumns = [...(field.value || [])];
                                                        newColumns.splice(colIndex, 1);
                                                        form.setValue(`fields.${index}.columns`, newColumns);
                                                      }}
                                                      disabled={field.value?.length <= 1}
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
                                                    const newColumns = [...(field.value || [])];
                                                    newColumns.push({ 
                                                      id: uuidv4(),
                                                      header: `Columna ${newColumns.length + 1}`, 
                                                      type: "text" 
                                                    });
                                                    form.setValue(`fields.${index}.columns`, newColumns);
                                                  }}
                                                >
                                                  <Plus className="h-4 w-4 mr-1" /> Agregar Columna
                                                </Button>
                                              </div>
                                              <FormMessage />
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
                                        render={({ field }) => (
                                          <FormItem className="flex items-center space-x-2">
                                            <FormControl>
                                              <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                              />
                                            </FormControl>
                                            <FormLabel className="m-0">Campo requerido</FormLabel>
                                          </FormItem>
                                        )}
                                      />
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeField(index)}
                                      disabled={fields.length <= 1}
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      <Trash2 className="h-4 w-4 mr-1" /> Eliminar Campo
                                    </Button>
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

              {form.formState.errors.fields?.message && (
                <p className="text-sm font-medium text-red-500 mt-2">
                  {form.formState.errors.fields.message}
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Guardando..." : "Guardar Formulario"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
