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
import { Loader2, Save, Download, FileDown, FilePen } from "lucide-react";
import { FormStructure } from "@shared/schema";
import type { FormField as IFormField } from "@shared/schema";
import { useEffect, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface FormViewerProps {
  formTemplate: FormStructure;
  initialData?: any;
  onSubmit: (data: any) => void;
  onExport?: (format: "pdf" | "excel") => void;
  isReadOnly?: boolean;
  isLoading?: boolean;
}

export default function FormViewer({
  formTemplate,
  initialData,
  onSubmit,
  onExport,
  isReadOnly = false,
  isLoading = false,
}: FormViewerProps) {
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
        default:
          fieldSchema = z.string().optional();
      }
      
      if (field.required) {
        if (field.type === "checkbox") {
          fieldSchema = z.array(z.string()).min(1, "Este campo es requerido");
        } else if (field.type === "table") {
          fieldSchema = z.array(z.record(z.string(), z.any())).min(1, "Se requiere al menos una fila");
        } else {
          fieldSchema = fieldSchema.min(1, "Este campo es requerido");
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
  
  // Handle table fields initialization
  useEffect(() => {
    formTemplate.fields.forEach((field) => {
      if (field.type === "table" && !form.getValues()[field.id]) {
        form.setValue(field.id, [{}]);
      }
    });
  }, [formTemplate, form]);
  
  // Render field based on its type
  const renderField = (field: IFormField) => {
    switch (field.type) {
      case "text":
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
                    placeholder={field.placeholder || ""}
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
        
      case "number":
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
                    type="number"
                    placeholder={field.placeholder || ""}
                    {...formField}
                    value={formField.value === undefined ? "" : formField.value}
                    onChange={e => formField.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                    disabled={isReadOnly}
                  />
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
          <CardHeader>
            <CardTitle>{formTemplate.title}</CardTitle>
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
