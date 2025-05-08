import React, { useState, useEffect } from "react";
import { 
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form";
import { Plus, Trash } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

// Reutilizamos los tipos de AdvancedTableEditor
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

interface AdvancedTableConfig {
  rows?: number;
  dynamicRows?: boolean;
  sections?: TableSection[];
  initialData?: Record<string, any>[];
}

interface AdvancedTableViewerProps {
  field: {
    advancedTableConfig?: AdvancedTableConfig;
  };
  value: Record<string, any>[];
  onChange: (value: Record<string, any>[]) => void;
  readOnly?: boolean;
}

const AdvancedTableViewer: React.FC<AdvancedTableViewerProps> = ({
  field,
  value = [],
  onChange,
  readOnly = false
}) => {
  const config = field.advancedTableConfig;
  const [tableData, setTableData] = useState<Record<string, any>[]>(value || []);
  
  // Si no hay configuración, mostrar mensaje de error
  if (!config || !config.sections || config.sections.length === 0) {
    return <div className="text-red-500">Error: Tabla no configurada correctamente</div>;
  }

  // Inicializar datos si están vacíos
  useEffect(() => {
    if (!tableData.length && config.rows && config.rows > 0) {
      // Crear filas iniciales vacías
      const initialData = Array(config.rows).fill({}).map(() => ({}));
      setTableData(initialData);
      onChange(initialData);
    } else if (value.length > 0 && JSON.stringify(value) !== JSON.stringify(tableData)) {
      // Actualizar si el valor externo cambia
      setTableData(value);
    }
  }, [config.rows, value]);

  // Actualizar una celda
  const updateCell = (rowIndex: number, columnId: string, value: any) => {
    const newData = [...tableData];
    if (!newData[rowIndex]) {
      newData[rowIndex] = {};
    }
    newData[rowIndex][columnId] = value;
    setTableData(newData);
    onChange(newData);
  };

  // Agregar una nueva fila (si está habilitado)
  const addRow = () => {
    if (!config.dynamicRows) return;
    
    const newData = [...tableData, {}];
    setTableData(newData);
    onChange(newData);
  };

  // Eliminar una fila (si está habilitado y hay más de una fila)
  const removeRow = (index: number) => {
    if (!config.dynamicRows || tableData.length <= 1) return;
    
    const newData = [...tableData];
    newData.splice(index, 1);
    setTableData(newData);
    onChange(newData);
  };

  // Obtener todas las columnas de todas las secciones
  const allColumns = config.sections?.flatMap(section => section.columns) || [];

  return (
    <div className="border rounded-md w-full overflow-auto">
      <ScrollArea className="max-h-[600px]">
        <Table>
          {/* Encabezados de sección */}
          <TableHeader>
            <TableRow>
              {config.sections?.map((section, idx) => (
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
              {allColumns.map((column) => (
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
              {config.dynamicRows && !readOnly && (
                <TableHead className="w-10"></TableHead>
              )}
            </TableRow>
          </TableHeader>

          <TableBody>
            {/* Datos de la tabla */}
            {tableData.map((rowData, rowIndex) => (
              <TableRow key={rowIndex}>
                {allColumns.map((column) => (
                  <TableCell key={`${rowIndex}-${column.id}`} className="p-1">
                    {column.type === 'text' && (
                      <Input
                        type="text"
                        value={rowData[column.id] || ''}
                        onChange={(e) => updateCell(rowIndex, column.id, e.target.value)}
                        readOnly={readOnly || column.readOnly}
                        className="h-8"
                      />
                    )}
                    {column.type === 'number' && (
                      <Input
                        type="number"
                        value={rowData[column.id] || ''}
                        onChange={(e) => updateCell(rowIndex, column.id, e.target.value)}
                        readOnly={readOnly || column.readOnly}
                        className="h-8"
                        min={column.validation?.min}
                        max={column.validation?.max}
                      />
                    )}
                    {column.type === 'select' && (
                      <Select
                        defaultValue={rowData[column.id] || ''}
                        onValueChange={(val) => updateCell(rowIndex, column.id, val)}
                        disabled={readOnly || column.readOnly}
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
                          checked={rowData[column.id] || false}
                          onCheckedChange={(checked) => 
                            updateCell(rowIndex, column.id, checked === true)
                          }
                          disabled={readOnly || column.readOnly}
                        />
                      </div>
                    )}
                    {column.type === 'date' && (
                      <Input
                        type="date"
                        value={rowData[column.id] || ''}
                        onChange={(e) => updateCell(rowIndex, column.id, e.target.value)}
                        readOnly={readOnly || column.readOnly}
                        className="h-8"
                      />
                    )}
                  </TableCell>
                ))}
                {config.dynamicRows && !readOnly && (
                  <TableCell className="p-1 w-10">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRow(rowIndex)}
                      className="h-8 w-8 text-red-500 hover:text-red-700"
                      tabIndex={-1}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            
            {/* Botón para agregar fila dinámica */}
            {config.dynamicRows && !readOnly && (
              <TableRow>
                <TableCell 
                  colSpan={allColumns.length + 1}
                  className="text-center p-2"
                >
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={addRow}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Agregar Fila
                  </Button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
};

export default AdvancedTableViewer;