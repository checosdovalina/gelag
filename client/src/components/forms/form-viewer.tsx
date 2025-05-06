import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Loader2, Save, Download, FileDown, FilePen, Pencil } from "lucide-react";
import { FormStructure, UserRole } from "@shared/schema";
import type { FormField as IFormField } from "@shared/schema";
import { useEffect, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import FieldDisplayNameEditor from "./field-display-name-editor";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface FormViewerProps {
  formTemplate: FormStructure;
  formTitle?: string;
  formDescription?: string;
  initialData?: any;
  onSubmit: (data: any) => void;
  onExport?: (format: "pdf" | "excel") => void;
  isReadOnly?: boolean;
  isLoading?: boolean;
  allowEditDisplayNames?: boolean;
  formId?: number;
}

export default function FormViewer({
  formTemplate,
  formTitle,
  formDescription,
  initialData,
  onSubmit,
  onExport,
  isReadOnly = false,
  isLoading = false,
  allowEditDisplayNames = false,
  formId
}: FormViewerProps) {
  // Para edición de nombres de campos
  const [isFieldNameEditorOpen, setIsFieldNameEditorOpen] = useState(false);
  const [selectedField, setSelectedField] = useState<IFormField | null>(null);
  const [updatedFormTemplate, setUpdatedFormTemplate] = useState<FormStructure>(formTemplate);
  const [nextFolioNumber, setNextFolioNumber] = useState<number | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Función para actualizar el displayName de un campo y guardar los cambios
  const handleFieldNameUpdate = async (fieldId: string, newDisplayName: string): Promise<boolean> => {
    // Usar el formId proporcionado en props o extraerlo de la URL como fallback
    const currentFormId = formId || parseInt(window.location.pathname.split("/forms/")[1]);
    
    if (isNaN(currentFormId) || currentFormId <= 0) {
      toast({
        title: "Error",
        description: "No se pudo determinar el ID del formulario",
        variant: "destructive"
      });
      return false;
    }
    
    try {
      console.log(`\n===== ACTUALIZANDO CAMPO =====`);
      console.log(`FormID: ${currentFormId}`);
      console.log(`FieldID: ${fieldId}`);
      console.log(`Nuevo DisplayName: "${newDisplayName}"`);
      console.log(`===============================\n`);
      
      // Verificar que el campo existe en el formulario antes de intentar actualizarlo
      const fieldExists = formTemplate.fields.find(field => field.id === fieldId);
      if (!fieldExists) {
        console.error(`El campo con ID ${fieldId} no existe en el formulario`);
        return false;
      }
      
      // Llamar a la API para actualizar el nombre del campo
      const response = await fetch(`/api/form-templates/${currentFormId}/field/${fieldId}/display-name`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ displayName: newDisplayName }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error en respuesta del servidor:', errorData);
        throw new Error('Error al actualizar el nombre del campo');
      }
      
      const responseData = await response.json();
      console.log("Respuesta del servidor:", responseData);
      
      // Después de actualizar, cargar el formulario actualizado para reflejar los cambios
      const templateResponse = await fetch(`/api/form-templates/${currentFormId}`);
      if (!templateResponse.ok) {
        throw new Error("No se pudo cargar el formulario actualizado");
      }
      
      const updatedTemplate = await templateResponse.json();
      console.log("Plantilla actualizada:", updatedTemplate);
      
      // Actualizar el estado local con la plantilla actualizada del servidor
      if (updatedTemplate && updatedTemplate.structure) {
        // Actualizamos directamente con la estructura recibida del servidor
        setUpdatedFormTemplate(updatedTemplate.structure);
        
        // También actualizamos el estado inicial para reflejar los cambios
        const updatedFields = [...formTemplate.fields];
        const fieldIndex = updatedFields.findIndex(f => f.id === fieldId);
        
        if (fieldIndex !== -1) {
          // Actualizamos el campo en la copia local
          updatedFields[fieldIndex] = {
            ...updatedFields[fieldIndex],
            displayName: newDisplayName
          };
          
          // Actualizamos formTemplate
          const updatedFormTemplate = {
            ...formTemplate,
            fields: updatedFields
          };
          
          // Esta línea forzará la actualización de la interfaz
          // NOTA: Esto es un poco hacky ya que formTemplate viene de props,
          // pero necesitamos forzar la actualización
          (formTemplate as any).fields = updatedFields;
        }
        
        // Verificamos que el campo se haya actualizado correctamente
        const updatedField = updatedTemplate.structure.fields?.find(
          (f: any) => f.id === fieldId
        );
        
        if (updatedField) {
          console.log(`Verificación: Campo actualizado en servidor: ${updatedField.displayName}`);
          if (updatedField.displayName !== newDisplayName) {
            console.warn(`ADVERTENCIA: El displayName no coincide con el enviado.`);
            console.warn(`Enviado: "${newDisplayName}", Recibido: "${updatedField.displayName}"`);
          }
        }
        
        // Recargar el modal para mostrar los cambios actualizados
        setIsFieldNameEditorOpen(false);
        setTimeout(() => setIsFieldNameEditorOpen(true), 10);
        
        return true;
      } else {
        throw new Error("La plantilla actualizada no tiene una estructura válida");
      }
    } catch (error) {
      console.error('Error al actualizar el campo:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al actualizar el campo",
        variant: "destructive"
      });
      return false;
    }
  };
  
  // Create a dynamic validation schema based on the form structure
  const [validationSchema, setValidationSchema] = useState<z.ZodTypeAny>(z.object({}));
  
  // Create validation schema dynamically based on form fields
  useEffect(() => {
    const schemaMap: Record<string, z.ZodTypeAny> = {};
    
    formTemplate.fields.forEach((field) => {
      let fieldSchema: z.ZodTypeAny;
      
      switch (field.type) {
        case "text":
          fieldSchema = z.string();
          break;
        case "number":
          fieldSchema = z.number().optional().or(z.string().transform((val) => val ? Number(val) : undefined));
          break;
        case "date":
          fieldSchema = z.string().optional();
          break;
        case "select":
          fieldSchema = z.string();
          break;
        case "checkbox":
          fieldSchema = z.array(z.string()).optional();
          break;
        case "radio":
          fieldSchema = z.string();
          break;
        case "textarea":
          fieldSchema = z.string();
          break;
        case "table":
          fieldSchema = z.array(z.record(z.string(), z.any())).optional();
          break;
        case "evaluationMatrix":
          fieldSchema = z.record(z.string(), z.string()).optional();
          break;
        default:
          fieldSchema = z.string().optional();
      }
      
      if (field.required) {
        if (field.type === "checkbox") {
          fieldSchema = z.array(z.string()).min(1, "Este campo es requerido");
        } else if (field.type === "table") {
          fieldSchema = z.array(z.record(z.string(), z.any())).min(1, "Se requiere al menos una fila");
        } else if (field.type === "text" || field.type === "textarea") {
          fieldSchema = z.string().min(1, "Este campo es requerido");
        } else if (field.type === "evaluationMatrix") {
          // Para matrices de evaluación, requerimos al menos una entrada en el objeto
          fieldSchema = z.record(z.string(), z.string()).refine(
            obj => Object.keys(obj).length > 0,
            "Este campo es requerido"
          );
        } else if (field.type === "select" || field.type === "radio") {
          fieldSchema = z.string().min(1, "Este campo es requerido");
        } else if (field.type === "number") {
          fieldSchema = z.number().or(z.string().transform(val => val ? Number(val) : undefined))
            .refine(val => val !== undefined, "Este campo es requerido");
        } else if (field.type === "date") {
          fieldSchema = z.string().min(1, "Este campo es requerido");
        } else {
          // Para otros tipos que no tienen .min()
          fieldSchema = z.any().refine(val => val !== undefined && val !== null && val !== '', 
            "Este campo es requerido");
        }
      } else {
        fieldSchema = fieldSchema.optional();
      }
      
      schemaMap[field.id] = fieldSchema;
    });
    
    setValidationSchema(z.object(schemaMap));
  }, [formTemplate]);
  
  // Initialize form
  const form = useForm({
    resolver: zodResolver(validationSchema),
    defaultValues: initialData || {},
    mode: "onChange",
  });
  
  // Reset form when template or initialData changes
  useEffect(() => {
    form.reset(initialData || {});
  }, [form, initialData, formTemplate.title]);
  
  // Handle table fields initialization
  useEffect(() => {
    formTemplate.fields.forEach((field) => {
      if (field.type === "table" && !form.getValues()[field.id]) {
        form.setValue(field.id, [{}]);
      }
    });
  }, [formTemplate, form]);
  
  // Cargar el próximo número de folio cuando el formulario se abre (solo si no es modo lectura)
  useEffect(() => {
    const fetchNextFolioNumber = async () => {
      if (formId && !isReadOnly && !initialData) {
        try {
          const response = await fetch(`/api/form-templates/${formId}/next-folio`);
          if (response.ok) {
            const data = await response.json();
            setNextFolioNumber(data.nextFolio);
            
            // Automáticamente establecer el valor en cualquier campo identificado como "folio"
            const folioField = isFolioField();
            if (folioField) {
              form.setValue(folioField.id, data.nextFolio.toString());
            }
          }
        } catch (error) {
          console.error("Error al obtener el próximo número de folio:", error);
        }
      }
    };
    
    fetchNextFolioNumber();
  }, [formId, isReadOnly, initialData, form]);
  
  // Función para identificar si un campo es de tipo folio
  const isFolioField = () => {
    return formTemplate.fields.find(field => 
      field.id.toLowerCase() === "folio" || 
      field.label.toLowerCase() === "folio" ||
      field.label.toLowerCase().includes("folio")
    );
  };
  
  // Renderiza la matriz de evaluación (días x empleados x criterios)
  const renderEvaluationMatrix = (field: IFormField) => {
    // Verificar que tenemos los datos necesarios
    if (!field.employeeNames || !field.criteria || !field.options) {
      return (
        <FormItem>
          <FormLabel>{field.label}</FormLabel>
          <div className="p-4 border rounded-md bg-muted/50">
            <p>No se pudieron cargar los datos para la matriz de evaluación.</p>
          </div>
        </FormItem>
      );
    }

    // Opciones que tenemos para cada celda de evaluación (C, NC, NA)
    const options = field.options;
    
    // Optionally get the value from the form or initialize if not set
    const formValue = form.getValues()[field.id] || {};
    
    return (
      <FormField
        key={field.id}
        control={form.control}
        name={field.id}
        render={({ field: formField }) => {
          // Inicializa los valores de formField si es necesario
          if (!formField.value) {
            const initialValue: any = {};
            formField.onChange(initialValue);
          }
          
          return (
            <FormItem className="w-full mb-8">
              <FormLabel className="text-lg font-bold">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </FormLabel>
              
              <div className="space-y-8 mt-4">
                {/* Iteramos por cada criterio */}
                {field.criteria.map((criterion, criterionIndex) => (
                  <div key={criterionIndex} className="space-y-4">
                    <h3 className="text-md font-medium border-b pb-2">{criterion}</h3>
                    
                    <div className="border rounded-md overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[200px]">Empleado</TableHead>
                            <TableHead>Lun</TableHead>
                            <TableHead>Mar</TableHead>
                            <TableHead>Mié</TableHead>
                            <TableHead>Jue</TableHead>
                            <TableHead>Vie</TableHead>
                            <TableHead>Sáb</TableHead>
                            <TableHead>Dom</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {field.employeeNames.map((employee, employeeIndex) => (
                            <TableRow key={employeeIndex}>
                              <TableCell className="font-medium">{employee}</TableCell>
                              
                              {/* Celdas para cada día */}
                              {["lun", "mar", "mie", "jue", "vie", "sab", "dom"].map((day, dayIndex) => {
                                const cellId = `${criterionIndex}_${employeeIndex}_${dayIndex}`;
                                const value = formField.value && formField.value[cellId] 
                                  ? formField.value[cellId] 
                                  : "";
                                
                                return (
                                  <TableCell key={dayIndex}>
                                    <Select
                                      value={value}
                                      onValueChange={(newValue) => {
                                        const updatedData = {
                                          ...formField.value,
                                          [cellId]: newValue
                                        };
                                        formField.onChange(updatedData);
                                      }}
                                      disabled={isReadOnly}
                                    >
                                      <SelectTrigger className="w-[80px]">
                                        <SelectValue placeholder="-" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {options.map((option: any, optionIndex: number) => (
                                          <SelectItem key={optionIndex} value={option.value}>
                                            {option.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          );
        }}
      />
    );
  };
  
  // Render field based on its type
  const renderField = (field: IFormField) => {
    switch (field.type) {
      case "evaluationMatrix":
        return renderEvaluationMatrix(field);
        
      case "text":
        // Verificar si este campo es un campo de folio
        const isFolio = field.id.toLowerCase() === "folio" || 
                        field.label.toLowerCase() === "folio" ||
                        field.label.toLowerCase().includes("folio");
        
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={field.id}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                  {isFolio && !isReadOnly && <span className="ml-2 text-sm text-blue-500 font-normal">(Auto-asignado)</span>}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={field.placeholder || ""}
                    {...formField}
                    value={formField.value || ""}
                    disabled={isReadOnly || isFolio}
                    className={isFolio ? "bg-blue-50 font-medium" : ""}
                  />
                </FormControl>
                {isFolio && !isReadOnly && (
                  <p className="text-sm text-muted-foreground mt-1">
                    El número de folio se asigna automáticamente y es único para este tipo de formulario.
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        );
        
      case "number":
        // Verificar si este campo es un campo de folio
        const isNumericFolio = field.id.toLowerCase() === "folio" || 
                               field.label.toLowerCase() === "folio" ||
                               field.label.toLowerCase().includes("folio");
        
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={field.id}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                  {isNumericFolio && !isReadOnly && <span className="ml-2 text-sm text-blue-500 font-normal">(Auto-asignado)</span>}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder={field.placeholder || ""}
                    {...formField}
                    value={formField.value === undefined ? "" : formField.value}
                    onChange={e => formField.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                    disabled={isReadOnly || isNumericFolio}
                    className={isNumericFolio ? "bg-blue-50 font-medium" : ""}
                  />
                </FormControl>
                {isNumericFolio && !isReadOnly && (
                  <p className="text-sm text-muted-foreground mt-1">
                    El número de folio se asigna automáticamente y es único para este tipo de formulario.
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        );
        
      case "date":
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={field.id}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>{field.label} {field.required && <span className="text-red-500">*</span>}</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...formField}
                    value={formField.value || ""}
                    disabled={isReadOnly}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
        
      case "select":
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={field.id}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>{field.label} {field.required && <span className="text-red-500">*</span>}</FormLabel>
                <Select
                  onValueChange={formField.onChange}
                  defaultValue={formField.value}
                  value={formField.value}
                  disabled={isReadOnly}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione una opción" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {field.options?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        );
        
      case "checkbox":
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={field.id}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>{field.label} {field.required && <span className="text-red-500">*</span>}</FormLabel>
                <div className="space-y-2">
                  {field.options?.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        checked={(formField.value || []).includes(option.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            formField.onChange([...(formField.value || []), option.value]);
                          } else {
                            formField.onChange(
                              (formField.value || []).filter((value: string) => value !== option.value)
                            );
                          }
                        }}
                        disabled={isReadOnly}
                      />
                      <Label htmlFor={option.value}>{option.label}</Label>
                    </div>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        );
        
      case "radio":
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={field.id}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>{field.label} {field.required && <span className="text-red-500">*</span>}</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={formField.onChange}
                    defaultValue={formField.value}
                    value={formField.value}
                    disabled={isReadOnly}
                    className="space-y-1"
                  >
                    {field.options?.map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={option.value} id={`${field.id}-${option.value}`} />
                        <Label htmlFor={`${field.id}-${option.value}`}>{option.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
        
      case "textarea":
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={field.id}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>{field.label} {field.required && <span className="text-red-500">*</span>}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={field.placeholder || ""}
                    {...formField}
                    value={formField.value || ""}
                    disabled={isReadOnly}
                    rows={4}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
        
      case "table":
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={field.id}
            render={({ field: formField }) => {
              const tableData = formField.value || [{}];
              
              const addRow = () => {
                const newData = [...tableData, {}];
                formField.onChange(newData);
              };
              
              const removeRow = (index: number) => {
                const newData = [...tableData];
                newData.splice(index, 1);
                formField.onChange(newData.length ? newData : [{}]);
              };
              
              return (
                <FormItem className="w-full">
                  <FormLabel>{field.label} {field.required && <span className="text-red-500">*</span>}</FormLabel>
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {field.columns?.map((column) => (
                            <TableHead key={column.id}>{column.header}</TableHead>
                          ))}
                          {!isReadOnly && <TableHead className="w-[80px]">Acciones</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tableData.map((row, rowIndex) => (
                          <TableRow key={rowIndex}>
                            {field.columns?.map((column) => (
                              <TableCell key={column.id}>
                                {column.type === "text" && (
                                  <Input
                                    value={row[column.id] || ""}
                                    onChange={(e) => {
                                      const newData = [...tableData];
                                      newData[rowIndex] = {
                                        ...newData[rowIndex],
                                        [column.id]: e.target.value,
                                      };
                                      formField.onChange(newData);
                                    }}
                                    disabled={isReadOnly}
                                  />
                                )}
                                {column.type === "number" && (
                                  <Input
                                    type="number"
                                    value={row[column.id] || ""}
                                    onChange={(e) => {
                                      const newData = [...tableData];
                                      newData[rowIndex] = {
                                        ...newData[rowIndex],
                                        [column.id]: e.target.value ? Number(e.target.value) : "",
                                      };
                                      formField.onChange(newData);
                                    }}
                                    disabled={isReadOnly}
                                  />
                                )}
                                {column.type === "select" && (
                                  <Select
                                    value={row[column.id] || ""}
                                    onValueChange={(value) => {
                                      const newData = [...tableData];
                                      newData[rowIndex] = {
                                        ...newData[rowIndex],
                                        [column.id]: value,
                                      };
                                      formField.onChange(newData);
                                    }}
                                    disabled={isReadOnly}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Seleccionar" />
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
                              </TableCell>
                            ))}
                            {!isReadOnly && (
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeRow(rowIndex)}
                                  disabled={tableData.length <= 1}
                                  className="h-8 w-8 p-0 text-red-500"
                                >
                                  &times;
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {!isReadOnly && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addRow}
                      className="mt-2"
                    >
                      + Agregar fila
                    </Button>
                  )}
                  <FormMessage />
                </FormItem>
              );
            }}
          />
        );
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{formTitle || formTemplate.title}</CardTitle>
              {formDescription && (
                <p className="text-sm text-muted-foreground mt-1">{formDescription}</p>
              )}
            </div>
            {/* Mostrar botón "Editar Nombres" si allowEditDisplayNames está activado o si el usuario es SuperAdmin */}
            {(allowEditDisplayNames || user?.role === UserRole.SUPERADMIN) && (
              <Dialog open={isFieldNameEditorOpen} onOpenChange={setIsFieldNameEditorOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar Nombres
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Editar Nombres para Reportes</DialogTitle>
                    <DialogDescription>
                      Configure los nombres que aparecerán en los reportes para cada campo.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4 max-h-[70vh] overflow-auto">
                    {formTemplate.fields.map((field) => (
                      <div key={field.id} className="grid gap-2">
                        <h3 className="font-medium text-sm text-slate-700">{field.label}</h3>
                        <FieldDisplayNameEditor
                          formId={formId || 0}
                          fieldId={field.id}
                          currentDisplayName={field.displayName || field.label}
                          fieldLabel={field.label}
                          onUpdate={handleFieldNameUpdate}
                        />
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {formTemplate.fields.map((field) => renderField(field))}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            {!isReadOnly ? (
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar
                  </>
                )}
              </Button>
            ) : (
              <div />
            )}
            
            {onExport && (
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onExport("excel")}
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Excel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onExport("pdf")}
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  PDF
                </Button>
              </div>
            )}
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
