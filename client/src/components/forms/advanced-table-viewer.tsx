import React, { useState, useEffect, useCallback } from "react";
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
import { Plus, Trash, Save, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const [tableData, setTableData] = useState<Record<string, any>[]>(value || []);
  const [isSaving, setIsSaving] = useState(false);
  
  // Función para notificaciones de actualización de tabla
  const notifyTableUpdate = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    toast({
      title: message,
      variant: type === 'error' ? 'destructive' : type === 'info' ? 'default' : 'default',
      description: type === 'error' ? 'Intente nuevamente' : '',
    });
  }, [toast]);
  
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
    try {
      console.log("[updateCell] 🔄 Actualizando celda en fila", rowIndex, "columna", columnId, "valor:", value, "tipo:", typeof value);
      
      setIsSaving(true);
      
      // Realizar una copia profunda de los datos actuales
      const newData = JSON.parse(JSON.stringify(tableData));
      
      // Asegurarnos de que la fila existe
      if (!newData[rowIndex]) {
        newData[rowIndex] = {};
      }
      
      // Actualizar el valor en la celda (convertir a número si es posible)
      if (typeof value === "string" && !isNaN(Number(value))) {
        newData[rowIndex][columnId] = Number(value);
      } else {
        newData[rowIndex][columnId] = value;
      }
      
      console.log("[updateCell] ⚠️ FORZANDO actualización de datos de tabla");
      
      // Verificar si es un campo de proceso o litros para actualizar las materias primas
      const column = allColumns.find(col => col.id === columnId);
      if (column) {
        // Si es columna de producto, recalcular
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
        // Si es columna de litros, recalcular
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
      
      // SIEMPRE actualizar el estado, independientemente de si cambiaron los datos
      console.log("[updateCell] ⚠️ Actualizando datos de tabla:", newData);
      
      // Actualizamos los datos locales inmediatamente
      setTableData(newData);
      
      // Importante: usamos un retraso mayor para asegurar que la actualización 
      // suceda después de que React haya procesado los cambios de estado
      setTimeout(() => {
        try {
          // Asegurarnos de propagar una copia TOTALMENTE nueva al componente padre
          // Esto rompe TODAS las referencias posibles
          const jsonString = JSON.stringify(newData);
          const finalData = JSON.parse(jsonString);
          
          console.log("[updateCell] ⚠️ FORZANDO propagación de cambios al componente padre:", finalData);
          onChange(finalData);
          
          // Uso del sistema de notificaciones de shadcn
          notifyTableUpdate("Celda actualizada", "success");
          
          setIsSaving(false);
        } catch (error) {
          console.error("[updateCell] ❌ Error al propagar cambios:", error);
          
          // Uso del sistema de notificaciones de shadcn
          notifyTableUpdate("Error al actualizar celda", "error");
          
          setIsSaving(false);
        }
      }, 150); // Aumentado a 150ms para mayor seguridad
    } catch (error) {
      console.error("[updateCell] ❌ Error crítico en la función:", error);
      notifyTableUpdate("Error crítico al actualizar", "error");
      setIsSaving(false);
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
    try {
      if (!config.dynamicRows) {
        console.log("[addRow] Filas dinámicas no están habilitadas, no se puede agregar fila");
        notifyTableUpdate("No se pueden añadir filas a esta tabla", "info");
        return;
      }
      
      setIsSaving(true);
      
      // Crear una copia profunda para evitar referencias
      const currentData = JSON.parse(JSON.stringify(tableData));
      const newRow = {};
      
      // Agregar la nueva fila y actualizar los datos locales
      const newData = [...currentData, newRow];
      console.log("[addRow] ⚠️ FORZANDO actualización con nueva fila. Datos:", newData);
      
      // Actualizar el estado local inmediatamente
      setTableData(newData);
      
      // Notificar al componente padre con una pequeña demora MAYOR
      setTimeout(() => {
        try {
          // Asegurarnos de propagar una copia TOTALMENTE nueva al componente padre
          const jsonString = JSON.stringify(newData);
          const finalData = JSON.parse(jsonString);
          
          console.log("[addRow] ⚠️ FORZANDO propagación al componente padre:", finalData);
          onChange(finalData);
          
          // Usar el sistema de notificaciones de shadcn
          notifyTableUpdate("Fila agregada correctamente", "success");
          
          setIsSaving(false);
        } catch (error) {
          console.error("[addRow] ❌ Error al propagar cambios:", error);
          
          // Usar el sistema de notificaciones de shadcn
          notifyTableUpdate("Error al agregar fila", "error");
          
          setIsSaving(false);
        }
      }, 150); // Aumentado a 150ms para mayor seguridad
    } catch (error) {
      console.error("[addRow] ❌ Error crítico en la función:", error);
      notifyTableUpdate("Error crítico al agregar fila", "error");
      setIsSaving(false);
    }
  };

  // Eliminar una fila (si está habilitado y hay más de una fila)
  const removeRow = (index: number) => {
    try {
      if (!config.dynamicRows) {
        console.log("[removeRow] Filas dinámicas no están habilitadas, no se puede eliminar fila");
        notifyTableUpdate("No se pueden eliminar filas de esta tabla", "info");
        return;
      }
      
      if (tableData.length <= 1) {
        console.log("[removeRow] No se puede eliminar la única fila de la tabla");
        notifyTableUpdate("Se requiere al menos una fila en la tabla", "info");
        return;
      }
      
      setIsSaving(true);
      
      // Crear una copia profunda para evitar referencias
      const currentData = JSON.parse(JSON.stringify(tableData));
      if (index < 0 || index >= currentData.length) {
        console.error("[removeRow] Índice fuera de rango:", index, "longitud:", currentData.length);
        notifyTableUpdate("Error: índice de fila fuera de rango", "error");
        setIsSaving(false);
        return;
      }
      
      const newData = currentData.filter((_: unknown, i: number) => i !== index);
      
      console.log("[removeRow] ⚠️ FORZANDO eliminación de fila", index, "Datos actualizados:", newData);
      
      // Actualizar los datos locales inmediatamente
      setTableData(newData);
      
      // Notificar al componente padre con una pequeña demora
      setTimeout(() => {
        try {
          // Asegurarnos de propagar una copia TOTALMENTE nueva al componente padre
          const jsonString = JSON.stringify(newData);
          const finalData = JSON.parse(jsonString);
          
          console.log("[removeRow] ⚠️ FORZANDO propagación al componente padre:", finalData);
          onChange(finalData);
          
          // Usar el sistema de notificaciones de shadcn
          notifyTableUpdate("Fila eliminada correctamente", "success");
          
          setIsSaving(false);
        } catch (error) {
          console.error("[removeRow] ❌ Error al propagar cambios:", error);
          
          // Usar el sistema de notificaciones de shadcn
          notifyTableUpdate("Error al eliminar fila", "error");
          
          setIsSaving(false);
        }
      }, 150); // Aumentado a 150ms para mayor seguridad
    } catch (error) {
      console.error("[removeRow] ❌ Error crítico en la función:", error);
      notifyTableUpdate("Error crítico al eliminar fila", "error");
      setIsSaving(false);
    }
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
    <div className="border rounded-md w-full">
      {(hasDependentColumns || (productColumn && litersColumn)) && (
        <div className="p-2 bg-blue-50 border-b text-sm text-blue-700 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Los campos con fondo azul claro se completarán automáticamente. Al modificar el proceso o los litros a producción, 
          se calcularán los kilos de materia prima correspondientes.
        </div>
      )}
      <div className="w-full overflow-x-auto max-h-[600px]">
        <Table className="min-w-full">
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
                      disabled={isSaving}
                      onClick={() => removeRow(rowIndex)}
                      className={`h-8 w-8 ${isSaving ? 'text-gray-400' : 'text-red-500 hover:text-red-700'}`}
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
                  <div className="flex justify-center space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      disabled={isSaving}
                      onClick={addRow}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Agregar Fila
                    </Button>
                    
                    <Button 
                      type="button" 
                      variant="default" 
                      size="sm"
                      disabled={isSaving} 
                      onClick={() => {
                        try {
                          setIsSaving(true);
                          
                          // Forzar una copia profunda y actualización
                          console.log("[saveTable] ⚠️ FORZANDO guardado de tabla con datos:", tableData);
                          
                          // Crear una copia totalmente independiente
                          const jsonString = JSON.stringify(tableData);
                          const copyData = JSON.parse(jsonString);
                          
                          // Dar tiempo al servidor para procesar
                          setTimeout(() => {
                            try {
                              // Actualizar los datos en el padre
                              console.log("[saveTable] Enviando datos:", copyData);
                              onChange(copyData);
                              
                              // Notificar éxito
                              notifyTableUpdate("Tabla guardada correctamente", "success");
                              
                              setIsSaving(false);
                            } catch (error) {
                              console.error("[saveTable] Error al guardar tabla:", error);
                              notifyTableUpdate("Error al guardar tabla", "error");
                              setIsSaving(false);
                            }
                          }, 150);
                        } catch (error) {
                          console.error("[saveTable] Error crítico al guardar tabla:", error);
                          notifyTableUpdate("Error crítico al guardar tabla", "error");
                          setIsSaving(false);
                        }
                      }}
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      {isSaving ? (
                        <>
                          <span className="animate-pulse mr-2 inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent"></span>
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-1" /> Guardar Tabla
                        </>
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdvancedTableViewer;