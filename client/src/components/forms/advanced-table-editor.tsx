import React, { useState, useCallback } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Plus, Trash, Pencil, Save, LayoutGrid, CopyPlus } from "lucide-react";
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

// Tipos para la configuración de tabla avanzada 
interface ColumnDefinition {
  id: string;
  header: string;
  width?: string;
  type: "text" | "number" | "select" | "checkbox" | "date";
  span?: number;
  rowspan?: number;
  readOnly?: boolean;
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

const AdvancedTableEditor: React.FC<AdvancedTableEditorProps> = ({
  value,
  onChange,
  preview = false
}) => {
  const [activeTab, setActiveTab] = useState<string>("sections");
  const [editingSection, setEditingSection] = useState<number | null>(null);
  const [editingColumn, setEditingColumn] = useState<{sectionIndex: number, columnIndex: number} | null>(null);
  const [newSectionTitle, setNewSectionTitle] = useState<string>("");
  const [newColumnDetails, setNewColumnDetails] = useState<Partial<ColumnDefinition>>({
    id: uuidv4(),
    header: "",
    type: "text"
  });

  // Estado para la vista previa
  const [previewData, setPreviewData] = useState<Record<string, any>[]>(
    value.initialData || Array(value.rows || 3).fill({}).map(() => ({}))
  );

  // Función para actualizar valor
  const updateValue = useCallback((newValue: Partial<AdvancedTableConfig>) => {
    onChange({
      ...value,
      ...newValue
    });
  }, [value, onChange]);

  // Agregar una nueva sección
  const addSection = () => {
    if (!newSectionTitle.trim()) return;
    
    const newSections = [...(value.sections || []), {
      title: newSectionTitle,
      colspan: 1,
      columns: []
    }];
    
    updateValue({ sections: newSections });
    setNewSectionTitle("");
  };

  // Eliminar una sección
  const removeSection = (index: number) => {
    const newSections = [...(value.sections || [])];
    newSections.splice(index, 1);
    updateValue({ sections: newSections });
  };

  // Actualizar sección
  const updateSection = (index: number, updates: Partial<TableSection>) => {
    const newSections = [...(value.sections || [])];
    newSections[index] = { ...newSections[index], ...updates };
    updateValue({ sections: newSections });
  };

  // Agregar columna a sección
  const addColumn = (sectionIndex: number) => {
    if (!newColumnDetails.header?.trim()) return;
    
    const newSections = [...(value.sections || [])];
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
    const newSections = [...(value.sections || [])];
    newSections[sectionIndex].columns.splice(columnIndex, 1);
    updateValue({ sections: newSections });
  };

  // Actualizar columna
  const updateColumn = (sectionIndex: number, columnIndex: number, updates: Partial<ColumnDefinition>) => {
    const newSections = [...(value.sections || [])];
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
      updateValue({ rows });
      
      // Actualizar los datos de vista previa
      if (rows > previewData.length) {
        setPreviewData([...previewData, ...Array(rows - previewData.length).fill({})]);
      } else if (rows < previewData.length) {
        setPreviewData(previewData.slice(0, rows));
      }
    }
  };

  // Actualizar celda en la vista previa
  const updateCell = (rowIndex: number, columnId: string, value: any) => {
    const newData = [...previewData];
    if (!newData[rowIndex]) {
      newData[rowIndex] = {};
    }
    newData[rowIndex][columnId] = value;
    setPreviewData(newData);
    
    // También actualizar los datos iniciales en la configuración
    updateValue({ initialData: newData });
  };

  // Agregar fila en modo dinámico
  const addRow = () => {
    setPreviewData([...previewData, {}]);
    updateValue({ 
      initialData: [...previewData, {}],
      rows: (value.rows || previewData.length) + 1 
    });
  };

  // Eliminar fila en modo dinámico
  const removeRow = (index: number) => {
    const newData = [...previewData];
    newData.splice(index, 1);
    setPreviewData(newData);
    updateValue({ 
      initialData: newData,
      rows: Math.max(1, (value.rows || previewData.length) - 1)
    });
  };

  // Toggle para filas dinámicas
  const toggleDynamicRows = () => {
    updateValue({ dynamicRows: !value.dynamicRows });
  };

  // Duplicar columna
  const duplicateColumn = (sectionIndex: number, columnIndex: number) => {
    const newSections = [...(value.sections || [])];
    const originalColumn = newSections[sectionIndex].columns[columnIndex];
    const newColumn = {
      ...originalColumn,
      id: uuidv4(),
      header: `${originalColumn.header} (copia)`
    };
    
    newSections[sectionIndex].columns.splice(columnIndex + 1, 0, newColumn);
    updateValue({ sections: newSections });
  };

  // Componente para renderizar la tabla de vista previa
  const TablePreview = () => {
    if (!value.sections || value.sections.length === 0) {
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

    const allColumns = value.sections.flatMap(section => section.columns);
    
    return (
      <div className="border rounded-md overflow-auto">
        <Table>
          {/* Encabezados de sección */}
          <TableHeader>
            <TableRow>
              {value.sections.map((section, idx) => (
                <TableHead
                  key={idx}
                  colSpan={section.colspan || section.columns.length}
                  className="text-center bg-muted font-bold"
                >
                  {section.title}
                </TableHead>
              ))}
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
            {Array(value.rows || 3).fill(0).map((_, rowIndex) => (
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
                        defaultValue={previewData[rowIndex]?.[column.id] || ''}
                        onValueChange={(val) => updateCell(rowIndex, column.id, val)}
                        disabled={column.readOnly}
                      >
                        <SelectTrigger className="h-8">
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
                  </TableCell>
                ))}
              </TableRow>
            ))}
            
            {/* Botón para agregar fila dinámica */}
            {value.dynamicRows && (
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
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sections">Secciones</TabsTrigger>
            <TabsTrigger value="preview">Vista Previa</TabsTrigger>
            <TabsTrigger value="settings">Configuración</TabsTrigger>
          </TabsList>

          {/* Pestaña de Secciones */}
          <TabsContent value="sections" className="space-y-4 mt-4">
            <ScrollArea className="h-[500px] pr-4">
              {/* Lista de secciones existentes */}
              {(value.sections || []).map((section, sectionIndex) => (
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
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <Button
                        type="button"
                        onClick={() => addColumn(sectionIndex)}
                        className="mt-3"
                      >
                        <Plus className="h-4 w-4 mr-1" /> Agregar Columna
                      </Button>
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
                  <Button type="button" onClick={addSection}>
                    <Plus className="h-4 w-4 mr-1" /> Agregar Sección
                  </Button>
                </CardContent>
              </Card>
            </ScrollArea>
          </TabsContent>

          {/* Pestaña de Vista Previa */}
          <TabsContent value="preview" className="mt-4">
            <div className="space-y-4">
              <TablePreview />
            </div>
          </TabsContent>

          {/* Pestaña de Configuración */}
          <TabsContent value="settings" className="mt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rows-count">Número de Filas</Label>
                  <Input
                    id="rows-count"
                    type="number"
                    value={value.rows || 3}
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
                        checked={value.dynamicRows || false}
                        onCheckedChange={toggleDynamicRows}
                      />
                      <Label htmlFor="dynamic-rows" className="mt-0">
                        {value.dynamicRows ? "Activado" : "Desactivado"}
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Diálogo para editar sección */}
      {editingSection !== null && (
        <Dialog open={editingSection !== null} onOpenChange={() => setEditingSection(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Sección</DialogTitle>
              <DialogDescription>
                Actualice las propiedades de esta sección
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-section-title">Título</Label>
                <Input
                  id="edit-section-title"
                  value={value.sections?.[editingSection]?.title || ""}
                  onChange={(e) => 
                    updateSection(editingSection, { title: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-section-colspan">Ancho (Colspan)</Label>
                <Input
                  id="edit-section-colspan"
                  type="number"
                  value={value.sections?.[editingSection]?.colspan || ""}
                  min={1}
                  onChange={(e) => 
                    updateSection(editingSection, { 
                      colspan: parseInt(e.target.value) || undefined 
                    })
                  }
                />
                <FormDescription>
                  Si se especifica, determina cuántas columnas abarca esta sección.
                  Por defecto, usa el número de columnas que contiene.
                </FormDescription>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button">Guardar Cambios</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Diálogo para editar columna */}
      {editingColumn !== null && (
        <Dialog 
          open={editingColumn !== null} 
          onOpenChange={() => setEditingColumn(null)}
        >
          <DialogContent className="max-w-xl">
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
                    value={value.sections?.[editingColumn?.sectionIndex || 0]?.columns?.[editingColumn?.columnIndex || 0]?.header || ""}
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