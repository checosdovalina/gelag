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
import { Loader2, Save, Download, FileDown, FilePen, Pencil, Package, UserCircle, LayoutGrid, Users } from "lucide-react";
import { FormStructure, UserRole, Product, Employee } from "@shared/schema";
import type { FormField as IFormField } from "@shared/schema";
import AdvancedTableViewer from "./advanced-table-viewer";
import ProductRecipeSelector from "./product-recipe-selector";
import { useQuery } from "@tanstack/react-query";
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
  
  // Función para navegar al siguiente campo con Enter
  const handleEnterKeyNavigation = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      
      // Encontrar todos los elementos focusables en el formulario
      const formElement = event.currentTarget.closest('form');
      if (!formElement) return;
      
      const focusableElements = formElement.querySelectorAll(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
      );
      
      const currentElement = event.target as HTMLElement;
      const currentIndex = Array.from(focusableElements).indexOf(currentElement);
      
      if (currentIndex >= 0 && currentIndex < focusableElements.length - 1) {
        const nextElement = focusableElements[currentIndex + 1] as HTMLElement;
        nextElement.focus();
      }
    }
  };

  // Función especializada para navegación en tablas sin auto-guardado
  const handleTableEnterNavigation = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      
      // Encontrar la tabla más cercana
      const tableElement = event.currentTarget.closest('table');
      if (!tableElement) return;
      
      // Encontrar todos los inputs dentro de la tabla
      const tableInputs = tableElement.querySelectorAll(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
      );
      
      const currentElement = event.target as HTMLElement;
      const currentIndex = Array.from(tableInputs).indexOf(currentElement);
      
      if (currentIndex >= 0 && currentIndex < tableInputs.length - 1) {
        const nextElement = tableInputs[currentIndex + 1] as HTMLElement;
        nextElement.focus();
      } else if (currentIndex === tableInputs.length - 1) {
        // Si estamos en el último campo, ir al primer campo de la siguiente fila o crear nueva fila
        const currentRow = currentElement.closest('tr');
        const nextRow = currentRow?.nextElementSibling as HTMLTableRowElement;
        
        if (nextRow) {
          const nextRowFirstInput = nextRow.querySelector('input:not([disabled]), select:not([disabled]), textarea:not([disabled])') as HTMLElement;
          if (nextRowFirstInput) {
            nextRowFirstInput.focus();
          }
        }
      }
    }
  };
  
  // Cargar lista de productos
  const { data: allProducts = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    queryFn: async () => {
      const response = await fetch('/api/products');
      if (!response.ok) {
        throw new Error('Error al cargar productos');
      }
      return response.json();
    },
    enabled: formTemplate.fields ? formTemplate.fields.some(field => field.type === 'product' || field.type === 'productSelect') : 
             formTemplate.sections ? formTemplate.sections.some(section => 
               section.fields && section.fields.some(field => field.type === 'product' || field.type === 'productSelect')
             ) : false
  });

  // Filtrar productos para mostrar solo "Producto Terminado" en campos de selección de productos
  const products = allProducts.filter(product => product.category === 'Producto Terminado');
  
  // Cargar lista de empleados
  const { data: employees = [], isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ['/api/employees'],
    queryFn: async () => {
      const response = await fetch('/api/employees');
      if (!response.ok) {
        throw new Error('Error al cargar empleados');
      }
      return response.json();
    },
    enabled: formTemplate.fields ? formTemplate.fields.some(field => field.type === 'employee' || field.type === 'employeeByType') : 
             formTemplate.sections ? formTemplate.sections.some(section => 
               section.fields && section.fields.some(field => field.type === 'employee' || field.type === 'employeeByType')
             ) : false
  });

  // Cargar lista de usuarios
  const { data: users = [], isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Error al cargar usuarios');
      }
      return response.json();
    },
    enabled: formTemplate.fields ? formTemplate.fields.some(field => field.type === 'userByRole') : 
             formTemplate.sections ? formTemplate.sections.some(section => 
               section.fields && section.fields.some(field => field.type === 'userByRole')
             ) : false
  });
  
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
    
    const allFields = formTemplate.fields || 
      (formTemplate.sections ? formTemplate.sections.flatMap(section => section.fields || []) : []);
    
    allFields.forEach((field) => {
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
        case "advancedTable":
          fieldSchema = z.array(z.record(z.string(), z.any())).optional();
          break;
        case "evaluationMatrix":
          fieldSchema = z.record(z.string(), z.string()).optional();
          break;
        case "employee":
          fieldSchema = z.number().or(z.string().transform(val => val ? Number(val) : undefined));
          break;
        case "product":
          fieldSchema = z.number().or(z.string().transform(val => val ? Number(val) : undefined));
          break;
        default:
          fieldSchema = z.string().optional();
      }
      
      if (field.required) {
        if (field.type === "checkbox") {
          fieldSchema = z.array(z.string()).min(1, "Este campo es requerido");
        } else if (field.type === "table") {
          fieldSchema = z.array(z.record(z.string(), z.any())).min(1, "Se requiere al menos una fila");
        } else if (field.type === "advancedTable") {
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
    const allFields = formTemplate.fields || 
      (formTemplate.sections ? formTemplate.sections.flatMap(section => section.fields || []) : []);
    
    allFields.forEach((field) => {
      if (field.type === "table" && !form.getValues()[field.id]) {
        form.setValue(field.id, [{}]);
      }
      
      if (field.type === "advancedTable") {
        // Para tablas avanzadas, comprobamos si hay datos existentes
        const existingData = form.getValues()[field.id];
        
        // Si no hay datos o los datos están vacíos, inicializamos
        if (!existingData || !Array.isArray(existingData) || existingData.length === 0) {
          console.log(`Inicializando tabla avanzada ${field.id}`);
          
          // Usar los datos iniciales definidos en la configuración o crear filas vacías
          let initialData = [];
          
          if (field.advancedTableConfig && field.advancedTableConfig.initialData && 
              Array.isArray(field.advancedTableConfig.initialData) && 
              field.advancedTableConfig.initialData.length > 0) {
            // Usar los datos predefinidos en la configuración
            initialData = JSON.parse(JSON.stringify(field.advancedTableConfig.initialData));
            console.log(`Usando datos iniciales de la configuración:`, initialData);
          } else if (field.advancedTableConfig && field.advancedTableConfig.rows) {
            // Crear filas vacías basadas en la configuración
            initialData = Array(field.advancedTableConfig.rows).fill().map(() => ({}));
            console.log(`Creando ${field.advancedTableConfig.rows} filas vacías`);
          } else {
            // Si no hay configuración, crear al menos una fila vacía
            initialData = [{}];
            console.log(`Creando una fila vacía por defecto`);
          }
          
          // Establecer los datos iniciales
          form.setValue(field.id, initialData, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true
          });
        } else {
          console.log(`Tabla avanzada ${field.id} ya tiene datos:`, existingData);
        }
      }
    });
  }, [formTemplate, form]);
  
  // No inicializar folios automáticamente - permitir entrada manual
  useEffect(() => {
    // Los folios se introducirán manualmente por el usuario
    console.log('[FOLIO] Campos de folio disponibles para entrada manual');
  }, [formTemplate, isReadOnly, initialData, form]);
  
  // Función para identificar si un campo es de tipo folio
  const isFolioField = () => {
    // Obtener todos los campos de la estructura del formulario
    const allFields = formTemplate.fields || 
      (formTemplate.sections ? formTemplate.sections.flatMap(section => section.fields || []) : []);
    
    return allFields.find(field => 
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
  
  // Renderizar campo de selección de empleado
  const renderEmployeeField = (field: IFormField) => {
    return (
      <FormField
        key={field.id}
        control={form.control}
        name={field.id}
        render={({ field: formField }) => (
          <FormItem>
            <FormLabel>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </FormLabel>
            <Select
              value={formField.value ? formField.value.toString() : ""}
              onValueChange={(value) => {
                formField.onChange(Number(value));
              }}
              disabled={isReadOnly}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar empleado" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {employeesLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : employees.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No hay empleados disponibles
                  </div>
                ) : (
                  employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id.toString()}>
                      <div className="flex items-center">
                        <UserCircle className="h-4 w-4 mr-2 text-muted-foreground" />
                        {employee.name} - {employee.employeeId}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <FormDescription>
              {formField.value && employees.find(e => e.id === Number(formField.value))?.position}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };
  
  // Renderizar campo de selección de empleado por tipo
  const renderEmployeeByTypeField = (field: IFormField) => {
    // Filtramos los empleados por tipo seleccionado en la configuración del campo
    const filteredEmployees = employees.filter(
      employee => employee.employeeType === field.employeeType
    );
    
    console.log(`[EmployeeByType] Campo: ${field.label}`);
    console.log(`[EmployeeByType] Tipo esperado: ${field.employeeType}`);
    console.log(`[EmployeeByType] Total empleados: ${employees.length}`);
    console.log(`[EmployeeByType] Empleados filtrados: ${filteredEmployees.length}`);
    console.log(`[EmployeeByType] Empleados disponibles:`, employees.map(e => `${e.name} (${e.employeeType})`));
    
    return (
      <FormField
        key={field.id}
        control={form.control}
        name={field.id}
        render={({ field: formField }) => (
          <FormItem>
            <FormLabel>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </FormLabel>
            <Select
              value={formField.value ? formField.value.toString() : ""}
              onValueChange={(value) => {
                formField.onChange(Number(value));
              }}
              disabled={isReadOnly}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={`Seleccionar ${
                    field.employeeType === 'operativo' ? 'operativo' :
                    field.employeeType === 'calidad' ? 'calidad' :
                    field.employeeType === 'produccion' ? 'producción' :
                    'administrativo'
                  }`} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {employeesLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : filteredEmployees.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No hay empleados de este tipo disponibles
                  </div>
                ) : (
                  filteredEmployees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id.toString()}>
                      <div className="flex items-center">
                        <UserCircle className="h-4 w-4 mr-2 text-muted-foreground" />
                        {employee.name} - {employee.employeeId}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <FormDescription>
              {formField.value && employees.find(e => e.id === Number(formField.value))?.position}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  // Renderizar campo de selección de usuario por rol
  const renderUserByRoleField = (field: IFormField) => {
    // Filtramos los usuarios por rol seleccionado en la configuración del campo
    const filteredUsers = users.filter(
      user => user.role === field.userRole
    );
    
    console.log(`[UserByRole] Campo: ${field.label}`);
    console.log(`[UserByRole] Rol esperado: ${field.userRole}`);
    console.log(`[UserByRole] Total usuarios: ${users.length}`);
    console.log(`[UserByRole] Usuarios filtrados: ${filteredUsers.length}`);
    console.log(`[UserByRole] Usuarios disponibles:`, users.map(u => `${u.name} (${u.role})`));
    
    return (
      <FormField
        key={field.id}
        control={form.control}
        name={field.id}
        render={({ field: formField }) => (
          <FormItem>
            <FormLabel>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </FormLabel>
            <Select
              value={formField.value ? formField.value.toString() : ""}
              onValueChange={(value) => {
                formField.onChange(Number(value));
              }}
              disabled={isReadOnly}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={`Seleccionar ${
                    field.userRole === 'gerente_calidad' ? 'gerente de calidad' :
                    field.userRole === 'gerente_produccion' ? 'gerente de producción' :
                    field.userRole === 'admin' ? 'administrador' :
                    'usuario'
                  }`} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {usersLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No hay usuarios con este rol disponibles
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      <div className="flex items-center">
                        <UserCircle className="h-4 w-4 mr-2 text-muted-foreground" />
                        {user.name} - {user.username}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <FormDescription>
              {formField.value && users.find(u => u.id === Number(formField.value))?.role}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };
  
  // Renderizar campo de selección de producto
  // Renderizar campo de tabla avanzada
  const renderAdvancedTableField = (field: IFormField) => {
    // Verificamos que tengamos la configuración necesaria
    if (!field.advancedTableConfig) {
      return (
        <FormItem>
          <FormLabel>{field.label}</FormLabel>
          <div className="p-4 border rounded-md bg-muted/50">
            <p>No se pudo cargar la configuración de la tabla avanzada.</p>
          </div>
        </FormItem>
      );
    }

    return (
      <FormField
        key={field.id}
        control={form.control}
        name={field.id}
        render={({ field: formField }) => {
          // Asegurarnos de que siempre exista un valor para el campo
          let existingData = formField.value;
          
          // Si no hay datos o los datos están vacíos, inicializamos
          if (!existingData || !Array.isArray(existingData) || existingData.length === 0) {
            console.log(`Inicializando tabla avanzada ${field.id}`);
            
            // Usar los datos iniciales definidos en la configuración o crear filas vacías
            let initialData = [];
            
            if (field.advancedTableConfig && field.advancedTableConfig.initialData && 
                Array.isArray(field.advancedTableConfig.initialData) && 
                field.advancedTableConfig.initialData.length > 0) {
              // Usar los datos predefinidos en la configuración
              initialData = JSON.parse(JSON.stringify(field.advancedTableConfig.initialData));
              console.log(`Usando datos iniciales de la configuración:`, initialData);
            } else if (field.advancedTableConfig && field.advancedTableConfig.rows) {
              // Crear filas vacías basadas en la configuración
              initialData = Array(field.advancedTableConfig.rows).fill().map(() => ({}));
              console.log(`Creando ${field.advancedTableConfig.rows} filas vacías`);
            } else {
              // Si no hay configuración, crear al menos una fila vacía
              initialData = [{}];
              console.log(`Creando una fila vacía por defecto`);
            }
            
            // Establecer los datos iniciales
            form.setValue(field.id, initialData, {
              shouldDirty: true,
              shouldTouch: true,
              shouldValidate: true
            });
            
            existingData = initialData;
          }
          
          // Función para manejar cambios en la tabla y asegurar guardado
          const handleTableChange = (newData: Record<string, any>[]) => {
            console.log(`[renderAdvancedTableField] Actualizando tabla ${field.id} con datos:`, newData);
            
            // Crear copia profunda para evitar problemas de referencia
            const dataCopy = JSON.parse(JSON.stringify(newData));
            
            // Actualizar el formulario con los nuevos datos
            form.setValue(field.id, dataCopy, { 
              shouldDirty: true,
              shouldTouch: true,
              shouldValidate: true 
            });
            
            // También actualizamos el valor local del campo
            formField.onChange(dataCopy);
          };
          
          return (
            <FormItem className="w-full space-y-2">
              <FormLabel className="text-lg font-semibold">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </FormLabel>
              <div className="border rounded-lg overflow-hidden">
                <AdvancedTableViewer
                  field={field}
                  value={existingData}
                  onChange={handleTableChange}
                  readOnly={isReadOnly}
                />
              </div>
              {!isReadOnly && (
                <div className="flex justify-end">
                  <Button 
                    type="button" 
                    onClick={() => {
                      try {
                        // Forzar guardado de los datos actuales
                        const currentData = form.getValues(field.id);
                        console.log(`[Guardar Tabla] Guardando datos de tabla ${field.id}:`, currentData);
                        
                        // Hacer una copia profunda para asegurar que se rompen todas las referencias
                        const dataCopy = JSON.parse(JSON.stringify(currentData));
                        
                        // Actualizar el valor en el formulario
                        form.setValue(field.id, dataCopy, {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true
                        });
                        
                        // Mensaje de confirmación visual
                        const toast = document.createElement('div');
                        toast.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg z-50 flex items-center';
                        toast.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg> Tabla guardada correctamente';
                        document.body.appendChild(toast);
                        
                        // Eliminar mensaje después de 2 segundos
                        setTimeout(() => {
                          document.body.removeChild(toast);
                        }, 2000);
                      } catch (error) {
                        console.error(`[Guardar Tabla] Error al guardar tabla ${field.id}:`, error);
                        
                        // Mensaje de error visual
                        const toast = document.createElement('div');
                        toast.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg z-50 flex items-center';
                        toast.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg> Error al guardar tabla';
                        document.body.appendChild(toast);
                        
                        // Eliminar mensaje después de 2 segundos
                        setTimeout(() => {
                          document.body.removeChild(toast);
                        }, 2000);
                      }
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Tabla
                  </Button>
                </div>
              )}
              <FormMessage />
            </FormItem>
          );
        }}
      />
    );
  };
  
  const renderProductField = (field: IFormField) => {
    // Verificar si este campo tiene la característica "autocompletable" para recetas
    const hasRecipeAutocomplete = field.features?.includes('recipeAutocomplete');
    
    // Función para manejar cuando se selecciona una receta de producto
    const handleRecipeSelected = (recipeData: any) => {
      // Buscamos las correspondencias de campos en el formulario
      // "Leche" -> "campo_leche", "Azúcar" -> "campo_azucar", etc.
      
      const formValues = form.getValues();
      
      if (recipeData && recipeData.ingredients) {
        // Iteramos sobre cada ingrediente en la receta
        Object.entries(recipeData.ingredients).forEach(([ingredientName, quantity]) => {
          // Normalizamos el nombre del ingrediente (sin acentos, todo minúsculas)
          const normalizedName = ingredientName.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          
          // Buscamos campos que puedan corresponder con este ingrediente
          const possibleFieldIds = [
            `${normalizedName}`,
            `cantidad_${normalizedName}`,
            `campo_${normalizedName}`,
            ingredientName.toLowerCase()
          ];
          
          // Buscamos en los campos del formulario
          formTemplate.fields.forEach(formField => {
            const fieldIdLower = formField.id.toLowerCase();
            
            // Si el campo contiene el nombre del ingrediente
            if (possibleFieldIds.some(id => fieldIdLower.includes(id)) || 
                fieldIdLower.includes(normalizedName)) {
              
              // Actualizamos el valor del campo
              form.setValue(formField.id, quantity);
            }
          });
        });
      }
    };
    
    return (
      <FormField
        key={field.id}
        control={form.control}
        name={field.id}
        render={({ field: formField }) => (
          hasRecipeAutocomplete ? (
            <ProductRecipeSelector 
              formField={formField}
              field={field}
              isReadOnly={isReadOnly}
              onRecipeSelected={handleRecipeSelected}
            />
          ) : (
            <FormItem>
              <FormLabel>
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </FormLabel>
              <Select
                value={formField.value ? formField.value.toString() : ""}
                onValueChange={(value) => {
                  formField.onChange(Number(value));
                }}
                disabled={isReadOnly}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar producto" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {productsLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : products.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No hay productos disponibles
                    </div>
                  ) : (
                    products.map((product) => (
                      <SelectItem key={product.id} value={product.id.toString()}>
                        <div className="flex items-center">
                          <Package className="h-4 w-4 mr-2 text-muted-foreground" />
                          {product.name} - {product.code}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormDescription>
                {formField.value && products.find(p => p.id === Number(formField.value))?.description}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )
        )}
      />
    );
  };

  // Render field based on its type
  const renderField = (field: IFormField) => {
    switch (field.type) {
      case "evaluationMatrix":
        return renderEvaluationMatrix(field);
        
      case "employee":
        return renderEmployeeField(field);
        
      case "employeeByType":
        return renderEmployeeByTypeField(field);
        
      case "userByRole":
        return renderUserByRoleField(field);
        
      case "product":
        return renderProductField(field);
        
      case "advancedTable":
        return renderAdvancedTableField(field);
        
      case "text":
        // Verificar si este campo es un campo de folio
        const isFolio = field.id.toLowerCase() === "folio" || 
                        field.label.toLowerCase() === "folio" ||
                        field.label.toLowerCase().includes("folio");
        
        // Verificar si es uno de los campos específicos que deben ser editables
        const isEditableFolioFieldText = field.id === 'folio_liberacion' || 
                                       field.id === 'folio_baja_mp' || 
                                       field.id === 'folio_baja_empaque';
        
        // Permitir entrada manual para todos los campos folio
        const showAutoAssignedText = false;
        
        // Solo deshabilitar si está en modo de solo lectura
        const shouldDisable = isReadOnly;
        
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={field.id}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={field.placeholder || (isFolio ? "Ingresa el folio manualmente" : "")}
                    {...formField}
                    value={formField.value || ""}
                    disabled={shouldDisable}
                    onKeyDown={handleEnterKeyNavigation}
                  />
                </FormControl>
                {showAutoAssignedText && (
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
        
        // Verificar si es uno de los campos específicos que deben ser editables
        const isEditableFolioField = field.id === 'folio_liberacion' || 
                                   field.id === 'folio_baja_mp' || 
                                   field.id === 'folio_baja_empaque';
        
        // Para campos de folio con formato personalizado (como CA-RE-01-01-F1), usamos un input de texto
        // aunque el campo sea de tipo numérico
        const isFormattedFolio = isNumericFolio && formField.value && typeof formField.value === 'string' 
                               && formField.value.includes('-F');
        
        // Ya no mostrar auto-asignado - permitir entrada manual
        const showAutoAssigned = false;
        
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={field.id}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </FormLabel>
                <FormControl>
                  {isFormattedFolio ? (
                    <Input
                      placeholder={field.placeholder || ""}
                      {...formField}
                      value={formField.value || ""}
                      disabled={isReadOnly}
                      onKeyDown={handleEnterKeyNavigation}
                    />
                  ) : (
                    <Input
                      type="text"
                      placeholder={field.placeholder || "Ingresa el folio manualmente"}
                      {...formField}
                      value={formField.value || ""}
                      disabled={isReadOnly}
                      onKeyDown={handleEnterKeyNavigation}
                    />
                  )}
                </FormControl>

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
                    onKeyDown={handleEnterKeyNavigation}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      
      case "time":
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={field.id}
            render={({ field: formField }) => (
              <FormItem 
                style={{ 
                  backgroundColor: field.backgroundColor ? `${field.backgroundColor}40` : 'transparent',
                  padding: field.backgroundColor ? '12px' : '0',
                  borderRadius: field.backgroundColor ? '6px' : '0'
                }}
              >
                <FormLabel>{field.label} {field.required && <span className="text-red-500">*</span>}</FormLabel>
                <FormControl>
                  <Input
                    type="time"
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
              <FormItem
                style={{ 
                  backgroundColor: field.backgroundColor ? `${field.backgroundColor}40` : 'transparent',
                  padding: field.backgroundColor ? '12px' : '0',
                  borderRadius: field.backgroundColor ? '6px' : '0'
                }}
              >
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
              const tableData = formField.value || field.rows || [{}];
              
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
                            <TableHead key={column.id}>{column.header || column.label}</TableHead>
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
      <form onSubmit={(e) => {
        e.preventDefault();
        
        // Realizar una preparación especial para las tablas avanzadas
        const formValues = form.getValues();
        const formFields = formTemplate.fields || [];
        
        // Identificar todos los campos de tabla avanzada
        const tableCampos = formFields.filter(field => field.type === 'advancedTable');
        
        // Para cada campo de tabla, asegurarse de que se realiza una copia profunda
        if (tableCampos.length > 0) {
          console.log("[FormViewer] Preparando tablas avanzadas para envío...");
          let processingDelay = 0;
          
          // Procesar en secuencia con pequeños retrasos para evitar condiciones de carrera
          const processTablesSequentially = async () => {
            for (const campo of tableCampos) {
              try {
                const id = campo.id;
                const currentData = formValues[id];
                
                if (currentData) {
                  console.log(`[FormViewer] Procesando tabla ${id} con datos:`, currentData);
                  
                  // Realizar una copia profunda para romper referencias
                  const dataCopy = JSON.parse(JSON.stringify(currentData));
                  
                  // Forzar la actualización del valor en el formulario
                  form.setValue(id, dataCopy, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true
                  });
                  
                  // Esperar un momento para que React procese el cambio
                  await new Promise(resolve => setTimeout(resolve, 100));
                  
                  console.log(`[FormViewer] Tabla ${id} procesada correctamente`);
                }
              } catch (error) {
                console.error(`[FormViewer] Error al procesar tabla ${campo.id}:`, error);
              }
            }
            
            // Una vez procesadas todas las tablas, continuar con el envío
            console.log("[FormViewer] Todas las tablas procesadas. Enviando formulario...");
            form.handleSubmit(onSubmit)(new Event('submit') as any);
          };
          
          processTablesSequentially().catch(error => {
            console.error("[FormViewer] Error al procesar tablas:", error);
            // En caso de error, intentar enviar de todas formas
            form.handleSubmit(onSubmit)(e);
          });
        } else {
          // Si no hay tablas avanzadas, proceder directamente
          console.log("[FormViewer] No hay tablas avanzadas, enviando formulario directamente...");
          console.log("[FormViewer] Datos del formulario antes del envío:", form.getValues());
          
          // Obtener los datos del formulario
          const formData = form.getValues();
          console.log("[FormViewer] Llamando onSubmit directamente con datos:", formData);
          
          // Llamar onSubmit directamente
          try {
            onSubmit(formData);
          } catch (error) {
            console.error("[FormViewer] Error al ejecutar onSubmit:", error);
          }
        }
      }}>
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
                    {(formTemplate.fields || 
                      (formTemplate.sections ? formTemplate.sections.flatMap(section => section.fields || []) : [])
                    ).map((field) => (
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
            {/* Renderizar formularios con secciones */}
            {formTemplate.sections ? (
              <div className="space-y-6">
                {formTemplate.sections.map((section, sectionIndex) => (
                  <div key={sectionIndex} className="space-y-4">
                    {section.title && (
                      <h3 
                        className="text-lg font-semibold p-3 rounded text-white"
                        style={{ backgroundColor: section.backgroundColor || '#6B7280' }}
                      >
                        {section.title}
                      </h3>
                    )}
                    <div 
                      className="p-4 rounded border"
                      style={{ backgroundColor: section.backgroundColor ? `${section.backgroundColor}20` : 'transparent' }}
                    >
                      {section.fields && section.fields.map((field) => renderField(field))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Renderizar formularios tradicionales */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {formTemplate.fields?.map((field) => renderField(field))}
              </div>
            )}
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
