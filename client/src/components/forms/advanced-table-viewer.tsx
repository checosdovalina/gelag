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
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

// Interfaces para productos y empleados
interface Product {
  id: number;
  name: string;
  code?: string;
  description?: string;
  price?: number;
  weight?: number;
  category?: string;
}

interface Employee {
  id: number;
  name: string;
  employeeId?: string;
  type?: string;
  position?: string;
  department?: string;
}

// Reutilizamos los tipos de AdvancedTableEditor
interface ColumnDefinition {
  id: string;
  header: string;
  width?: string;
  type: "text" | "number" | "select" | "checkbox" | "date" | "employee" | "product";
  span?: number;
  rowspan?: number;
  readOnly?: boolean;
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
  
  // Obtener la lista de empleados y productos para selectores
  const { data: employees = [], isLoading: loadingEmployees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    enabled: true,
  });
  
  const { data: products = [], isLoading: loadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    enabled: true,
  });
  
  // Si no hay configuración, mostrar mensaje de error
  if (!config || !config.sections || config.sections.length === 0) {
    return <div className="text-red-500">Error: Tabla no configurada correctamente</div>;
  }

  // Inicializar datos si están vacíos
  useEffect(() => {
    console.log("AdvancedTableViewer useEffect - Valor recibido:", value);
    
    if (!tableData.length && config.rows && config.rows > 0) {
      // Crear filas iniciales vacías
      const initialData = Array(config.rows).fill().map(() => ({}));
      console.log("Inicializando tabla con filas vacías:", initialData);
      setTableData(initialData);
      onChange(JSON.parse(JSON.stringify(initialData)));
    } else if (value && Array.isArray(value) && value.length > 0 && 
               JSON.stringify(value) !== JSON.stringify(tableData)) {
      // Actualizar si el valor externo cambia
      console.log("Actualizando tableData con valor externo:", value);
      setTableData(JSON.parse(JSON.stringify(value)));
    }
  }, [config.rows, value]);
  
  // Obtener el valor de referencia de otra columna para cálculos automáticos
  const getSourceValue = (rowIndex: number, sourceColumnId: string) => {
    if (!tableData[rowIndex]) return null;
    return tableData[rowIndex][sourceColumnId];
  };
  
  // Encontrar el producto por ID
  const findProductById = (productId: string) => {
    return products.find((product) => product.id.toString() === productId.toString());
  };
  

  
  // Calcular valor automático basado en la dependencia
  const calculateDependentValue = (rowIndex: number, column: ColumnDefinition) => {
    if (!column.dependency || !column.dependency.sourceColumn) return '';
    
    const sourceValue = getSourceValue(rowIndex, column.dependency.sourceColumn);
    if (!sourceValue) return '';
    
    const factor = column.dependency.factor || 1;
    
    // Si es basado en un producto, buscar información del producto
    if (column.dependency.sourceType === 'product') {
      const product = findProductById(sourceValue);
      if (!product) return '';
      
      // Retornar el tipo de valor basado en el tipo de cálculo
      switch (column.dependency.calculationType) {
        case 'price':
          return product.price ? (product.price * factor).toFixed(2) : '';
        case 'weight':
          return product.weight ? (product.weight * factor).toFixed(2) : '';
        case 'tax':
          return product.price ? (product.price * factor).toFixed(2) : '';
        case 'total':
          // Para total, necesitamos encontrar la columna de cantidad
          const quantityColumns = config.sections?.flatMap(section => 
            section.columns.filter(col => col.type === 'number' && !col.dependency)
          ) || [];
          
          // Buscar una columna que parezca de cantidad
          const quantityCol = quantityColumns.length > 0 ? quantityColumns[0].id : null;
          if (quantityCol) {
            const quantity = parseFloat(getSourceValue(rowIndex, quantityCol) || '0');
            return product.price ? (product.price * quantity * factor).toFixed(2) : '';
          }
          return '';
        default:
          return '';
      }
    }
    
    // Si es basado en cantidad, calcular según el tipo
    if (column.dependency.sourceType === 'quantity') {
      const quantity = parseFloat(sourceValue);
      if (isNaN(quantity)) return '';
      
      // Buscar el ID del producto en esta fila
      const productColumns = config.sections?.flatMap(section => 
        section.columns.filter(col => col.type === 'product')
      ) || [];
      
      if (productColumns.length > 0) {
        const productId = getSourceValue(rowIndex, productColumns[0].id);
        const product = findProductById(productId);
        
        if (product) {
          switch (column.dependency.calculationType) {
            case 'total':
              return product.price ? (product.price * quantity * factor).toFixed(2) : '';
            case 'weight':
              return product.weight ? (product.weight * quantity * factor).toFixed(2) : '';
            default:
              return '';
          }
        }
      }
      
      return '';
    }
    
    return '';
  };

  // Actualizar celdas automáticamente cuando cambian productos o cantidades
  useEffect(() => {
    // Obtener columnas con dependencias
    const dependentColumns = config.sections?.flatMap(section => 
      section.columns.filter(col => col.dependency && col.dependency.sourceColumn)
    ) || [];
    
    if (dependentColumns.length === 0) return;
    
    // Para cada fila, actualizar los valores calculados
    const updatedData = [...tableData];
    let hasChanges = false;
    
    updatedData.forEach((rowData, rowIndex) => {
      dependentColumns.forEach(column => {
        const calculatedValue = calculateDependentValue(rowIndex, column);
        
        // Solo actualizar si el valor calculado es diferente
        if (calculatedValue !== '' && rowData[column.id] !== calculatedValue) {
          if (!updatedData[rowIndex]) updatedData[rowIndex] = {};
          updatedData[rowIndex][column.id] = calculatedValue;
          hasChanges = true;
        }
      });
    });
    
    // Actualizar datos si hay cambios
    if (hasChanges) {
      setTableData(updatedData);
      onChange(updatedData);
    }
  }, [tableData, products]);

  // Actualizar una celda
  const updateCell = (rowIndex: number, columnId: string, value: any) => {
    console.log("[updateCell] Actualizando celda en fila", rowIndex, "columna", columnId, "valor:", value, "tipo:", typeof value);
    
    // Realizar una copia profunda de los datos actuales
    const newData = JSON.parse(JSON.stringify(tableData));
    
    // Asegurarnos de que la fila existe
    if (!newData[rowIndex]) {
      newData[rowIndex] = {};
    }
    
    // Actualizar el valor en la celda
    newData[rowIndex][columnId] = value;
    
    // Guardar esto para determinar si necesitamos actualizar el estado
    const prevData = JSON.stringify(tableData);
    const updatedData = JSON.stringify(newData);
    const hasDataChanged = prevData !== updatedData;
    
    console.log("[updateCell] Datos cambiados:", hasDataChanged);
    
    // Verificar si es un campo de proceso o litros para actualizar las materias primas
    const column = allColumns.find(col => col.id === columnId);
    if (column) {
      // Si es columna de producto y el valor ha cambiado, recalcular
      if (column.type === 'product') {
        // Buscar columna de litros (asumiendo que tiene "litros" en el nombre)
        const litersColumn = allColumns.find(col => 
          col.header?.toLowerCase().includes('litro') || 
          col.id.toLowerCase().includes('litro')
        );
        
        if (litersColumn) {
          const liters = parseFloat(newData[0]?.[litersColumn.id] || '0');
          if (!isNaN(liters) && liters > 0) {
            // Actualizar todas las filas de materia prima basado en el producto y litros
            console.log("[updateCell] Calculando materias primas para producto:", value, "litros:", liters);
            updateRawMaterials(value, liters);
            return; // Permitimos que updateRawMaterials actualice los datos
          }
        }
      } 
      // Si es columna de litros y el valor ha cambiado, recalcular
      else if (column.header?.toLowerCase().includes('litro') || column.id.toLowerCase().includes('litro')) {
        const liters = parseFloat(value || '0');
        
        // Buscar columna de producto
        const productColumn = allColumns.find(col => col.type === 'product');
        if (productColumn && !isNaN(liters) && liters > 0) {
          const productValue = newData[0]?.[productColumn.id];
          if (productValue) {
            // Actualizar todas las filas de materia prima basado en el producto y litros
            console.log("[updateCell] Calculando materias primas para producto:", productValue, "litros:", liters);
            updateRawMaterials(productValue, liters);
            return; // Permitimos que updateRawMaterials actualice los datos
          }
        }
      }
    }
    
    // Si los datos han cambiado realmente, actualizar el estado
    if (hasDataChanged) {
      console.log("[updateCell] Actualizando datos de tabla:", newData);
      
      // Actualizamos los datos locales
      setTableData(newData);
      
      // Importante: usamos un retraso para asegurar que la actualización 
      // suceda después de que React haya procesado los cambios de estado
      setTimeout(() => {
        try {
          // Asegurarnos de propagar una copia profunda al componente padre
          const finalData = JSON.parse(JSON.stringify(newData));
          console.log("[updateCell] Propagando cambios al componente padre:", finalData);
          onChange(finalData);
        } catch (error) {
          console.error("[updateCell] Error al propagar cambios:", error);
        }
      }, 50);
    } else {
      console.log("[updateCell] No se detectaron cambios en los datos, omitiendo actualización");
    }
  };
  
  // Función para actualizar las filas de materias primas basado en producto y litros
  const updateRawMaterials = (productName: string, liters: number) => {
    console.log("Actualizando materias primas para:", productName, "litros:", liters);
    
    // Solo proceder si tenemos secciones configuradas
    if (!config.sections || config.sections.length < 2) return;
    
    // Asumimos que la segunda sección contiene las materias primas
    const rawMaterialsSection = config.sections[1];
    if (!rawMaterialsSection || !rawMaterialsSection.columns) return;
    
    // Buscar la columna para los kilos (puede ser la segunda columna en la sección)
    const kilosColumn = rawMaterialsSection.columns.find(col => 
      col.header?.toLowerCase().includes('kilo') || 
      col.id.toLowerCase().includes('kilo')
    );
    
    if (!kilosColumn) return;
    
    // Nombres de materias primas y sus valores relativos para cálculo (basados en la imagen)
    // Esto debería venir de la base de datos en una aplicación real
    const materialsRelations: Record<string, Record<string, number>> = {
      "Mielmex 65° Brix": {
        "Leche de Vaca": 0,
        "Leche de Cabra": 1, // 1:1 ratio
        "Azúcar": 0.18, // 18% de los litros
        "Glucosa": 0,
        "Malto": 0,
        "Bicarbonato": 0.0016, // 0.16% de los litros
        "Sorbato": 0.0006, // 0.06% de los litros
        "Lecitina": 0,
        "Carrogenina": 0,
        "Grasa": 0,
        "Pasta": 0,
        "Antiespumante": 0,
        "Nuez": 0
      }
    };
    
    // Verificar si tenemos relaciones para este producto
    const relations = materialsRelations[productName];
    if (!relations) return;
    
    // Obtener los nombres de las materias primas de la primera columna
    const nameColumn = rawMaterialsSection.columns[0];
    if (!nameColumn) return;
    
    // Crear una nueva copia de los datos
    const newData = [...tableData];
    
    // Para cada fila, buscar el nombre de la materia prima y actualizar su valor
    for (let rowIndex = 0; rowIndex < newData.length; rowIndex++) {
      const materialName = newData[rowIndex]?.[nameColumn.id];
      
      // Si encontramos el nombre en nuestras relaciones, actualizamos su valor
      if (materialName && relations[materialName] !== undefined) {
        const calculatedValue = liters * relations[materialName];
        newData[rowIndex][kilosColumn.id] = calculatedValue === 0 ? "0" : calculatedValue.toString();
      }
    }
    
    // Actualizar los datos
    console.log("[updateRawMaterials] Actualizando datos de tabla:", newData);
    setTableData(newData);
    
    // Propagar el cambio con un pequeño retraso para asegurar que React haya actualizado el estado
    setTimeout(() => {
      try {
        // Asegurarnos de propagar una copia profunda al componente padre
        const finalData = JSON.parse(JSON.stringify(newData));
        console.log("[updateRawMaterials] Propagando cambios al componente padre:", finalData);
        onChange(finalData);
      } catch (error) {
        console.error("[updateRawMaterials] Error al propagar cambios:", error);
      }
    }, 50);
  };

  // Agregar una nueva fila (si está habilitado)
  const addRow = () => {
    if (!config.dynamicRows) return;
    
    // Crear una copia profunda para evitar referencias
    const currentData = JSON.parse(JSON.stringify(tableData));
    const newRow = {};
    
    // Agregar la nueva fila y actualizar los datos locales
    const newData = [...currentData, newRow];
    console.log("Añadiendo nueva fila. Datos actualizados:", newData);
    
    // Actualizar el estado local
    setTableData(newData);
    
    // Notificar al componente padre con una pequeña demora
    setTimeout(() => {
      onChange(JSON.parse(JSON.stringify(newData)));
    }, 0);
  };

  // Eliminar una fila (si está habilitado y hay más de una fila)
  const removeRow = (index: number) => {
    if (!config.dynamicRows || tableData.length <= 1) return;
    
    // Crear una copia profunda para evitar referencias
    const currentData = JSON.parse(JSON.stringify(tableData));
    const newData = currentData.filter((_, i) => i !== index);
    
    console.log("Eliminando fila", index, "Datos actualizados:", newData);
    
    // Actualizar los datos locales
    setTableData(newData);
    
    // Notificar al componente padre con una pequeña demora
    setTimeout(() => {
      onChange(JSON.parse(JSON.stringify(newData)));
    }, 0);
  };

  // Obtener todas las columnas de todas las secciones
  const allColumns = config.sections?.flatMap(section => section.columns) || [];

  // Detectar si hay alguna columna con dependencias
  const hasDependentColumns = allColumns.some(col => col.dependency);
  
  // Identificar columnas importantes para el cálculo
  const productColumn = allColumns.find(col => col.type === 'product');
  const litersColumn = allColumns.find(col => 
    col.header?.toLowerCase().includes('litro') || 
    col.id.toLowerCase().includes('litro')
  );

  return (
    <div className="border rounded-md w-full overflow-auto">
      {(hasDependentColumns || (productColumn && litersColumn)) && (
        <div className="p-2 bg-blue-50 border-b text-sm text-blue-700 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Los campos con fondo azul claro se completarán automáticamente. Al modificar el proceso o los litros a producción, 
          se calcularán los kilos de materia prima correspondientes.
        </div>
      )}
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
                  <TableCell 
                    key={`${rowIndex}-${column.id}`} 
                    className={`p-1 ${column.dependency ? 'bg-blue-50' : ''}`}>
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
                    {column.type === 'product' && (
                      loadingProducts ? (
                        <Skeleton className="h-8 w-full" />
                      ) : (
                        <Select
                          defaultValue={rowData[column.id] || ''}
                          onValueChange={(val) => updateCell(rowIndex, column.id, val)}
                          disabled={readOnly || column.readOnly}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Seleccionar producto..." />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id.toString()}>
                                {product.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )
                    )}
                    {column.type === 'employee' && (
                      loadingEmployees ? (
                        <Skeleton className="h-8 w-full" />
                      ) : (
                        <Select
                          defaultValue={rowData[column.id] || ''}
                          onValueChange={(val) => updateCell(rowIndex, column.id, val)}
                          disabled={readOnly || column.readOnly}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Seleccionar empleado..." />
                          </SelectTrigger>
                          <SelectContent>
                            {employees
                              .filter((emp) => !column.employeeType || emp.type === column.employeeType)
                              .map((employee) => (
                                <SelectItem key={employee.id} value={employee.id.toString()}>
                                  {employee.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      )
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