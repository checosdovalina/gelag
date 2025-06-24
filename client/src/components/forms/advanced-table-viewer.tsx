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
import { Plus, Trash, Save, AlertCircle, Info, MoveHorizontal, Calculator } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import FormulaHelper from "./formula-helper";
import FormulaCalculator from "./formula-calculator";
import { calculateIngredientAmounts } from "@/data/product-formulas";

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
  columns?: ColumnDefinition[];
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
  
  // Identificar si es una tabla de horarios (sin auto-guardado)
  const fieldId = (field as any).id;
  const isScheduleTable = fieldId === 'muestreo_table' || fieldId === 'revision_table';
  
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
  
  // Si no hay configuración, mostrar mensaje simplificado
  if (!config || (!config.sections && !config.columns) || (config.sections && config.sections.length === 0) || (config.columns && config.columns.length === 0)) {
    console.warn("Error en configuración de tabla avanzada:", field);
    return (
      <div className="text-red-500 p-4 border border-red-200 rounded bg-red-50">
        <div className="flex items-center mb-2">
          <AlertCircle className="h-4 w-4 mr-2" />
          <p className="font-semibold">Error: Tabla no configurada correctamente</p>
        </div>
        <p className="text-sm text-red-700 mt-2">
          Por favor elimina este campo e intenta crear uno nuevo con la plantilla "Microbiología".
        </p>
      </div>
    );
  }

  // Debug logging para identificar tipos de columnas
  console.log('[TABLE-DEBUG] Columnas disponibles:', config.columns?.map(c => `${c.id}:${c.type}`).join(', ') || 'No hay columnas');
  config.columns?.forEach(col => {
    if (col.type === 'checkbox') {
      console.log(`[CHECKBOX-COLUMN] ✅ Encontrada columna checkbox: ${col.id}`);
    }
    if (col.type === 'select' && col.options?.some(opt => opt.value === 'SI' || opt.value === 'NO')) {
      console.log(`[CHECKBOX-SELECT-COLUMN] ✅ Encontrada columna select SI/NO (será checkbox): ${col.id}`);
    }
  });

  // Inicializar datos si están vacíos - Versión robusta que evita problemas de referencia
  useEffect(() => {
    console.log("AdvancedTableViewer useEffect - Valor recibido:", value);
    
    try {
      // Crear un objeto vacío para usar como plantilla de fila
      const defaultRowTemplate: Record<string, any> = {};
      
      // Para mayor robustez, pre-inicializamos todas las columnas con valores vacíos apropiados
      const columnsToProcess = config.sections ? 
        config.sections.flatMap(section => section.columns || []) :
        config.columns || [];
      
      columnsToProcess.forEach(column => {
        // Asignamos valores por defecto según el tipo
        switch(column.type) {
          case "number":
            defaultRowTemplate[column.id] = null;
            break;
          case "checkbox":
            defaultRowTemplate[column.id] = false;
            break;
          case "select":
            defaultRowTemplate[column.id] = "";
            break;
          default:
            defaultRowTemplate[column.id] = "";
        }
      });
      
      // Use initialData if available and no value is provided
      if ((!value || !Array.isArray(value) || value.length === 0)) {
        if (config.initialData && config.initialData.length > 0) {
          // Use initialData from configuration
          const initialData = config.initialData.map(row => ({...defaultRowTemplate, ...row}));
          console.log("Inicializando tabla con initialData:", initialData);
          setTableData(initialData);
          onChange(JSON.parse(JSON.stringify(initialData)));
        } else if (config.rows && config.rows > 0) {
          // Crear filas iniciales vacías con todas las columnas pre-inicializadas
          const initialData = Array(config.rows).fill(0).map(() => ({...defaultRowTemplate}));
          console.log("Inicializando tabla con filas pre-inicializadas:", initialData);
          setTableData(initialData);
          onChange(JSON.parse(JSON.stringify(initialData)));
        }
      } else if (value && Array.isArray(value) && value.length > 0) {
        // Actualizar si el valor externo cambia pero asegurando que cada fila tenga todas las propiedades
        console.log("Actualizando tableData con valor externo:", value);
        const normalizedData = value.map(row => ({...defaultRowTemplate, ...row}));
        setTableData(normalizedData);
      }
    } catch (error) {
      console.error("Error al inicializar tabla avanzada:", error);
      // En caso de error, inicializamos con datos vacíos
      setTableData([{}]);
    }
  }, [config.rows, config.sections, config.columns, config.initialData, value]);
  
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

  // Obtener todas las columnas de todas las secciones o directamente de columns
  const allColumns = config.sections ? 
    config.sections.flatMap(section => section.columns) : 
    config.columns || [];

  // Detectar si hay alguna columna con dependencias
  const hasDependentColumns = allColumns.some(col => col.dependency);
  
  // Función para calcular porcentaje de cumplimiento
  const calculateCompliancePercentage = (tableData: Record<string, any>[], fieldId: string) => {
    try {
      console.log(`[PERCENTAGE] Calculando para fieldId: ${fieldId}, datos:`, tableData);
      
      // Contar total de elementos y elementos marcados como "SI"
      const totalItems = tableData.length;
      const siItems = tableData.filter(row => {
        const hasSi = row.revision_visual_si === 'si';
        console.log(`[PERCENTAGE] Fila: ${row.actividad}, SI: ${row.revision_visual_si}, cuenta: ${hasSi}`);
        return hasSi;
      }).length;
      
      // Calcular porcentaje
      const percentage = totalItems > 0 ? Math.round((siItems / totalItems) * 100) : 0;
      
      console.log(`[PERCENTAGE] ${fieldId}: ${siItems}/${totalItems} = ${percentage}%`);
      
      // Mapear field IDs a los campos de porcentaje correspondientes
      let percentageFieldId = '';
      if (fieldId.includes('marmitas')) {
        percentageFieldId = 'porcentaje_cumplimiento_marmitas';
      } else if (fieldId.includes('dulces')) {
        percentageFieldId = 'porcentaje_cumplimiento_dulces';
      } else if (fieldId.includes('produccion')) {
        percentageFieldId = 'porcentaje_cumplimiento_produccion';
      } else if (fieldId.includes('reposo')) {
        percentageFieldId = 'porcentaje_cumplimiento_reposo';
      } else if (fieldId.includes('limpieza')) {
        percentageFieldId = 'porcentaje_cumplimiento_limpieza';
      }
      
      if (percentageFieldId) {
        console.log(`[PERCENTAGE] Enviando evento para actualizar ${percentageFieldId} a ${percentage}%`);
        // Crear evento personalizado para actualizar el campo de porcentaje
        const event = new CustomEvent('updatePercentage', {
          detail: { fieldId: percentageFieldId, value: `${percentage}%` }
        });
        window.dispatchEvent(event);
      }
      
    } catch (error) {
      console.error("Error calculando porcentaje:", error);
    }
  };

  // Identificar columnas importantes para el cálculo
  const productColumn = allColumns.find(col => col.type === 'product');
  const litersColumn = allColumns.find(col => 
    col.header?.toLowerCase().includes('litro') || 
    col.id.toLowerCase().includes('litro')
  );

  // Función para actualizar solo localmente sin auto-guardado (para navegación)
  const updateCellLocally = (rowIndex: number, columnId: string, value: any) => {
    const newData = JSON.parse(JSON.stringify(tableData));
    
    if (!newData[rowIndex]) {
      newData[rowIndex] = {};
    }
    
    if (typeof value === "string" && !isNaN(Number(value))) {
      newData[rowIndex][columnId] = Number(value);
    } else {
      newData[rowIndex][columnId] = value;
    }
    
    // Solo actualizar estado local, NO propagar cambios
    setTableData(newData);
  };

  // Actualizar una celda
  const updateCell = (rowIndex: number, columnId: string, value: any) => {
    try {
      console.log("[updateCell] 🔄 Actualizando celda en fila", rowIndex, "columna", columnId, "valor:", value, "tipo:", typeof value);
      
      // Si es una tabla de horarios, solo actualizar localmente sin propagación
      if (isScheduleTable) {
        console.log("[updateCell] ⏰ Tabla de horarios - solo actualización local");
        updateCellLocally(rowIndex, columnId, value);
        return;
      }
      
      setIsSaving(true);
      
      // Realizar una copia profunda de los datos actuales
      const newData = JSON.parse(JSON.stringify(tableData));
      
      // Asegurarnos de que la fila existe
      if (!newData[rowIndex]) {
        newData[rowIndex] = {};
      }
      
      // Actualizar el valor en la celda 
      // No convertir a número si es un valor de checkbox o campo específico
      if (columnId.includes('revision_visual') || value === 'si' || value === 'no' || value === 'vacio') {
        // Mantener valores de checkbox como strings
        newData[rowIndex][columnId] = value;
        console.log(`[updateCell] Checkbox value preserved: ${columnId} = ${value}`);
      } else if (typeof value === "string" && !isNaN(Number(value)) && value !== '') {
        // Solo convertir a número si no es un valor de checkbox y es un número válido
        newData[rowIndex][columnId] = Number(value);
      } else {
        newData[rowIndex][columnId] = value;
      }
      
      console.log("[updateCell] ⚠️ FORZANDO actualización de datos de tabla");
      
      // Calcular porcentaje de cumplimiento automáticamente para formularios de Liberación Preoperativa
      const fieldId = (field as any).id;
      if (fieldId && fieldId.includes('checklist') && (columnId === 'revision_visual_si' || columnId === 'revision_visual_no')) {
        console.log(`[PERCENTAGE] Calculando porcentaje para ${fieldId}, columna: ${columnId}, valor: ${value}`);
        
        // Limpiar la selección opuesta cuando se selecciona una opción
        if (columnId === 'revision_visual_si' && value === 'si') {
          newData[rowIndex]['revision_visual_no'] = 'vacio';
        } else if (columnId === 'revision_visual_no' && value === 'no') {
          newData[rowIndex]['revision_visual_si'] = 'vacio';
        }
        
        // Calcular porcentaje inmediatamente
        calculateCompliancePercentage(newData, fieldId);
      }
      
      // Verificar si es un campo de proceso o litros para actualizar las materias primas
      const column = allColumns.find(col => col.id === columnId);
      if (column) {
        // Si es columna de producto, recalcular ingredientes automáticamente
        if (column.type === 'product' && rowIndex === 0) {
          // Buscar columna de litros (asumiendo que tiene "litros" en el nombre)
          const litersColumn = allColumns.find(col => 
            col.header?.toLowerCase().includes('litro') || 
            col.id.toLowerCase().includes('litro')
          );
          
          if (litersColumn) {
            // Obtener valor actual de litros
            const litersValue = newData[rowIndex][litersColumn.id];
            const litersNum = parseFloat(litersValue);
            
            // Si hay un valor válido de litros, calcular automáticamente según la fórmula
            if (!isNaN(litersNum) && litersNum > 0) {
              console.log(`Aplicando fórmula para ${value} con ${litersNum} litros`);
              
              try {
                // Calcular cantidades según fórmula
                const calculatedAmounts = calculateIngredientAmounts(value, litersNum);
                
                if (Object.keys(calculatedAmounts).length > 0) {
                  // Buscar la sección de Materia Prima
                  const materiaPrimaSection = config.sections?.find(section => 
                    section.title.toLowerCase().includes('materia') || 
                    section.title.toLowerCase().includes('prima')
                  );
                  
                  if (materiaPrimaSection) {
                    // Obtener columnas de materia prima y kilos
                    const mpColumn = materiaPrimaSection.columns.find(col => 
                      col.header.toLowerCase().includes('materia') || 
                      col.header.toLowerCase().includes('prima')
                    );
                    
                    const kilosColumn = materiaPrimaSection.columns.find(col => 
                      col.header.toLowerCase().includes('kilo')
                    );
                    
                    if (mpColumn && kilosColumn) {
                      // Recorrer las filas y actualizar cantidades
                      newData.forEach((row: any, idx: number) => {
                        if (idx === 0) return; // Saltamos la primera fila (proceso)
                        
                        const ingredientName = row[mpColumn.id];
                        if (ingredientName && calculatedAmounts[ingredientName] !== undefined) {
                          // Actualizar kilos según la fórmula
                          newData[idx][kilosColumn.id] = calculatedAmounts[ingredientName].toFixed(3);
                        }
                      });
                      
                      // Notificación
                      notifyTableUpdate(`Cantidades actualizadas automáticamente para ${value}`, 'info');
                    }
                  }
                }
              } catch (error) {
                console.error("Error al aplicar fórmula:", error);
              }
            }
            const liters = parseFloat(newData[0]?.[litersColumn.id] || '0');
            if (!isNaN(liters) && liters > 0) {
              // Actualizar todas las filas de materia prima basado en el producto y litros
              console.log("[updateCell] Calculando materias primas para producto:", value, "litros:", liters);
              
              // Calcular cantidades según fórmula
              try {
                const calculatedAmounts = calculateIngredientAmounts(value, liters);
                
                if (Object.keys(calculatedAmounts).length > 0) {
                  // Buscar la sección de Materia Prima
                  const materiaPrimaSection = config.sections?.find(section => 
                    section.title.toLowerCase().includes('materia') || 
                    section.title.toLowerCase().includes('prima')
                  );
                  
                  if (materiaPrimaSection) {
                    // Obtener columnas de materia prima y kilos
                    const mpColumn = materiaPrimaSection.columns.find(col => 
                      col.header.toLowerCase().includes('materia') || 
                      col.header.toLowerCase().includes('prima')
                    );
                    
                    const kilosColumn = materiaPrimaSection.columns.find(col => 
                      col.header.toLowerCase().includes('kilo')
                    );
                    
                    if (mpColumn && kilosColumn) {
                      // Recorrer las filas y actualizar cantidades
                      for (let idx = 1; idx < newData.length; idx++) {
                        const row = newData[idx];
                        const ingredientName = row[mpColumn.id];
                        if (ingredientName && calculatedAmounts[ingredientName] !== undefined) {
                          // Actualizar kilos según la fórmula
                          newData[idx][kilosColumn.id] = calculatedAmounts[ingredientName].toFixed(3);
                        }
                      }
                      
                      // Notificación
                      notifyTableUpdate(`Cantidades actualizadas automáticamente para ${value}`, 'info');
                    }
                  }
                }
              } catch (error) {
                console.error("Error al aplicar fórmula:", error);
              }
              // Guardar los cambios después de aplicar la fórmula
              setTableData(newData);
              // Programar guardado con retardo para dar tiempo a React
              setTimeout(() => {
                console.log("[updateCell] ⚠️ Programando guardado de datos");
                setIsSaving(true);
                // Manualmente propagar actualización al componente padre
                onChange(JSON.parse(JSON.stringify(newData)));
              }, 300);
              return;
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
              
              try {
                // Calcular cantidades según fórmula
                const calculatedAmounts = calculateIngredientAmounts(productValue, liters);
                
                if (Object.keys(calculatedAmounts).length > 0) {
                  // Buscar la sección de Materia Prima
                  const materiaPrimaSection = config.sections?.find(section => 
                    section.title.toLowerCase().includes('materia') || 
                    section.title.toLowerCase().includes('prima')
                  );
                  
                  if (materiaPrimaSection) {
                    // Obtener columnas de materia prima y kilos
                    const mpColumn = materiaPrimaSection.columns.find(col => 
                      col.header.toLowerCase().includes('materia') || 
                      col.header.toLowerCase().includes('prima')
                    );
                    
                    const kilosColumn = materiaPrimaSection.columns.find(col => 
                      col.header.toLowerCase().includes('kilo')
                    );
                    
                    if (mpColumn && kilosColumn) {
                      // Recorrer las filas y actualizar cantidades
                      for (let idx = 1; idx < newData.length; idx++) {
                        const row = newData[idx];
                        const ingredientName = row[mpColumn.id];
                        if (ingredientName && calculatedAmounts[ingredientName] !== undefined) {
                          // Actualizar kilos según la fórmula
                          newData[idx][kilosColumn.id] = calculatedAmounts[ingredientName].toFixed(3);
                        }
                      }
                      
                      // Guardar los cambios después de aplicar la fórmula
                      setTableData(newData);
                      
                      // Programar guardado con retardo para dar tiempo a React
                      setTimeout(() => {
                        console.log("[updateCell] ⚠️ Programando guardado de datos");
                        setIsSaving(true);
                        // Manualmente propagar actualización al componente padre
                        onChange(JSON.parse(JSON.stringify(newData)));
                      }, 300);
                      
                      // Notificación
                      notifyTableUpdate(`Cantidades actualizadas automáticamente para ${productValue}`, 'info');
                      return;
                    }
                  }
                }
              } catch (error) {
                console.error("Error al aplicar fórmula:", error);
              }
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
          
          // Para formularios de Liberación Preoperativa, actualizar porcentajes cuando se guarda cualquier tabla de checklist
          const fieldId = (field as any).id;
          console.log("[PERCENTAGE-DEBUG] Campo actualizado:", fieldId);
          
          if (fieldId && (fieldId.includes('checklist') || fieldId.includes('_checklist'))) {
            console.log("[PERCENTAGE-CHECK] ✅ Detectado campo de checklist, calculando porcentaje...");
            console.log(`[PERCENTAGE-CHECK] Campo: ${fieldId}, Datos:`, finalData);
            
            // Contar selecciones SI en todas las columnas relevantes
            let siCount = 0;
            let totalValidSelections = 0;
            
            let totalPercentage = 0;
            let completedActivities = 0;
            
            finalData.forEach((row: any, index: number) => {
              console.log(`[PERCENTAGE-COUNT] Fila ${index}:`, row);
              
              // Verificar si hay una selección SI marcada en esta fila
              const hasSiSelected = row.revision_visual_si && row.revision_visual_si !== 'vacio';
              
              if (hasSiSelected) {
                // Obtener el porcentaje de esta actividad
                const percentageText = row.porcentaje || '';
                const percentageValue = parseFloat(percentageText.replace('%', ''));
                
                if (!isNaN(percentageValue)) {
                  totalPercentage += percentageValue;
                  completedActivities++;
                  console.log(`[PERCENTAGE-COUNT] ✅ Actividad "${row.actividad}": ${percentageValue}% sumado`);
                } else {
                  console.log(`[PERCENTAGE-COUNT] ⚠️ Actividad "${row.actividad}": porcentaje inválido "${percentageText}"`);
                }
              } else {
                console.log(`[PERCENTAGE-COUNT] ⚪ Actividad "${row.actividad}": no completada (SI no marcado)`);
              }
            });
            
            // El porcentaje final es la suma de los porcentajes de las actividades completadas
            const percentage = Math.round(totalPercentage);
            console.log(`[PERCENTAGE-RESULT] Total: ${totalPercentage}% de ${completedActivities} actividades completadas = ${percentage}%`);
            
            // Mapear al campo de porcentaje correspondiente
            let percentageFieldName = '';
            if (fieldId.includes('marmitas')) {
              percentageFieldName = 'porcentaje_cumplimiento_marmitas';
            } else if (fieldId.includes('dulces')) {
              percentageFieldName = 'porcentaje_cumplimiento_dulces';
            } else if (fieldId.includes('produccion') || fieldId.includes('area_produccion')) {
              percentageFieldName = 'porcentaje_cumplimiento_produccion';
            } else if (fieldId.includes('reposo') || fieldId.includes('area_reposo')) {
              percentageFieldName = 'porcentaje_cumplimiento_reposo';
            } else if (fieldId.includes('limpieza') || fieldId.includes('estacion_limpieza')) {
              percentageFieldName = 'porcentaje_cumplimiento_limpieza';
            }
            
            console.log(`[PERCENTAGE-FIELD] Campo objetivo: ${percentageFieldName}`);
            
            if (percentageFieldName && percentage >= 0) {
              // Actualizar directamente el campo de porcentaje
              setTimeout(() => {
                const percentageField = document.querySelector(`input[name="${percentageFieldName}"]`) as HTMLInputElement;
                if (percentageField) {
                  percentageField.value = `${percentage}%`;
                  console.log(`[DOM-SUCCESS] ✅ Campo ${percentageFieldName} actualizado a ${percentage}%`);
                  
                  // Disparar eventos para React
                  percentageField.dispatchEvent(new Event('input', { bubbles: true }));
                  percentageField.dispatchEvent(new Event('change', { bubbles: true }));
                } else {
                  console.log(`[DOM-ERROR] ❌ No se encontró ${percentageFieldName}`);
                  
                  // Debug: mostrar todos los campos disponibles
                  const allInputs = document.querySelectorAll('input');
                  console.log('[DEBUG] Todos los campos disponibles:', Array.from(allInputs).map(i => i.name).filter(n => n));
                }
              }, 300);
            }
          }
          
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
        // Propagar una copia limpia al componente padre
        const jsonString = JSON.stringify(newData);
        const finalData = JSON.parse(jsonString);
        onChange(finalData);
        notifyTableUpdate("Materias primas actualizadas", "success");
      } catch (error) {
        console.error("[updateRawMaterials] Error al propagar cambios:", error);
        notifyTableUpdate("Error al actualizar materias primas", "error");
      }
    }, 150);
  };
  
  // Agregar una fila
  const addRow = () => {
    try {
      console.log("[addRow] Añadiendo fila a la tabla...");
      
      setIsSaving(true);
      
      // Crear una nueva fila vacía
      const newRow = {};
      
      // Realizar una copia profunda de los datos actuales
      const newData = JSON.parse(JSON.stringify(tableData));
      
      // Agregar la nueva fila
      newData.push(newRow);
      
      // Actualizar estado y propagar cambios
      console.log("[addRow] Actualizando datos de tabla:", newData);
      setTableData(newData);
      
      // Importante: usamos un retraso para asegurar que la actualización se haga correctamente
      setTimeout(() => {
        try {
          // Propagar una copia limpia al componente padre
          const jsonString = JSON.stringify(newData);
          const finalData = JSON.parse(jsonString);
          onChange(finalData);
          
          notifyTableUpdate("Fila agregada", "success");
          setIsSaving(false);
        } catch (error) {
          console.error("[addRow] Error crítico al agregar fila:", error);
          notifyTableUpdate("Error crítico al agregar fila", "error");
          setIsSaving(false);
        }
      }, 150); // Aumentado a 150ms para mayor seguridad
    } catch (error) {
      console.error("[addRow] ❌ Error crítico en la función:", error);
      notifyTableUpdate("Error crítico al agregar fila", "error");
      setIsSaving(false);
    }
  };
  
  // Eliminar una fila
  const removeRow = (rowIndex: number) => {
    try {
      console.log("[removeRow] Eliminando fila", rowIndex);
      
      if (tableData.length <= 1) {
        console.log("[removeRow] No se puede eliminar la última fila");
        notifyTableUpdate("No se puede eliminar la última fila", "info");
        return;
      }
      
      setIsSaving(true);
      
      // Realizar una copia profunda de los datos actuales
      const newData = JSON.parse(JSON.stringify(tableData));
      
      // Eliminar la fila
      newData.splice(rowIndex, 1);
      
      // Actualizar estado y propagar cambios
      console.log("[removeRow] Actualizando datos de tabla:", newData);
      setTableData(newData);
      
      // Importante: usamos un retraso para asegurar que la actualización se haga correctamente
      setTimeout(() => {
        try {
          // Propagar una copia limpia al componente padre
          const jsonString = JSON.stringify(newData);
          const finalData = JSON.parse(jsonString);
          onChange(finalData);
          
          notifyTableUpdate("Fila eliminada", "success");
          setIsSaving(false);
        } catch (error) {
          console.error("[removeRow] Error crítico al eliminar fila:", error);
          notifyTableUpdate("Error crítico al eliminar fila", "error");
          setIsSaving(false);
        }
      }, 150); // Aumentado a 150ms para mayor seguridad
    } catch (error) {
      console.error("[removeRow] ❌ Error crítico en la función:", error);
      notifyTableUpdate("Error crítico al eliminar fila", "error");
      setIsSaving(false);
    }
  };

  return (
    <div className="border rounded-md w-full">
      {hasDependentColumns && (
        <div className="p-2 bg-blue-50 border-b text-sm text-blue-700 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Los campos con fondo azul claro se completarán automáticamente. Al modificar el proceso o los litros a producción, 
          se calcularán los kilos de materia prima correspondientes.
        </div>
      )}
      
      {/* Botón para calcular automáticamente las cantidades según fórmula */}
      {!readOnly && hasDependentColumns && (
        <div className="px-2 py-2 border-b">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-md border">
            <div className="text-sm">
              <span className="text-muted-foreground">
                Seleccione un producto e ingrese los litros para calcular las cantidades automáticamente
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                // Obtener la primera fila (encabezado)
                const firstRow = tableData[0] || {};
                const productName = firstRow[productColumn?.id || ''];
                const litersValue = parseFloat(firstRow[litersColumn?.id || ''] || '0');
                
                if (!productName || isNaN(litersValue) || litersValue <= 0) {
                  notifyTableUpdate("Por favor seleccione un producto y especifique los litros", "error");
                  return;
                }
                
                try {
                  // Calcular cantidades según fórmula
                  const calculatedAmounts = calculateIngredientAmounts(productName, litersValue);
                  
                  if (Object.keys(calculatedAmounts).length === 0) {
                    notifyTableUpdate(`No se encontró una fórmula para ${productName}`, "error");
                    return;
                  }
                  
                  // Buscar la sección de Materia Prima
                  const materiaPrimaSection = config.sections?.find(section => 
                    section.title.toLowerCase().includes('materia') || 
                    section.title.toLowerCase().includes('prima')
                  );
                  
                  // Obtener columnas de materia prima y kilos
                  const mpColumn = materiaPrimaSection?.columns.find(col => 
                    col.header.toLowerCase().includes('materia') || 
                    col.header.toLowerCase().includes('prima')
                  );
                  
                  const kilosColumn = materiaPrimaSection?.columns.find(col => 
                    col.header.toLowerCase().includes('kilo')
                  );
                  
                  if (!mpColumn || !kilosColumn) {
                    notifyTableUpdate("No se encontraron las columnas necesarias", "error");
                    return;
                  }
                  
                  // Crear copia de los datos
                  const newData = JSON.parse(JSON.stringify(tableData));
                  
                  // Recorrer las filas y actualizar cantidades
                  let updatedCount = 0;
                  for (let idx = 1; idx < newData.length; idx++) {
                    const row = newData[idx];
                    const ingredientName = row[mpColumn.id];
                    if (ingredientName && calculatedAmounts[ingredientName] !== undefined) {
                      // Actualizar kilos según la fórmula
                      newData[idx][kilosColumn.id] = calculatedAmounts[ingredientName].toFixed(3);
                      updatedCount++;
                    }
                  }
                  
                  if (updatedCount > 0) {
                    // Actualizar datos
                    setTableData(newData);
                    setIsSaving(true);
                    setTimeout(() => {
                      onChange(JSON.parse(JSON.stringify(newData)));
                    }, 300);
                    
                    notifyTableUpdate(`Se actualizaron ${updatedCount} ingredientes según la fórmula de ${productName}`, "success");
                  } else {
                    notifyTableUpdate("No se encontraron ingredientes que coincidan con la fórmula", "error");
                  }
                } catch (error) {
                  console.error("Error al aplicar fórmula:", error);
                  notifyTableUpdate("Error al calcular ingredientes", "error");
                }
              }}
              className="flex items-center"
            >
              <Calculator className="h-4 w-4 mr-1" />
              <span>Calcular ingredientes</span>
            </Button>
          </div>
        </div>
      )}
      <div className="relative mb-1 text-xs text-muted-foreground flex justify-end pr-3">
        <span>
          <MoveHorizontal className="h-3 w-3 inline mr-1" />
          Desliza horizontalmente para ver más columnas
        </span>
      </div>
      <div className="w-full overflow-x-auto overflow-y-auto max-h-[600px] relative border border-border rounded-md" style={{ minWidth: "100%" }}>
        <Table className="border-collapse relative" style={{ minWidth: "1200px", width: "100%" }}>
          {/* Encabezados de sección - solo si hay secciones */}
          <TableHeader>
            {config.sections && (
              <TableRow>
                {config.sections.map((section, idx) => (
                  <TableHead
                    key={idx}
                    colSpan={section.colspan || section.columns.length}
                    className="text-center bg-primary text-primary-foreground font-bold py-2 border border-border"
                  >
                    <div className="py-2">{section.title}</div>
                  </TableHead>
                ))}
                {config.dynamicRows && !readOnly && (
                  <TableHead className="w-10 bg-primary border border-border"></TableHead>
                )}
              </TableRow>
            )}

            {/* Encabezados de columna */}
            <TableRow>
              {allColumns.map((column) => (
                <TableHead
                  key={column.id}
                  colSpan={column.span || 1}
                  rowSpan={column.rowspan || 1}
                  style={{ 
                    width: column.width || '180px',
                    minWidth: column.type === 'text' ? '180px' : 
                            column.type === 'select' ? '180px' : 
                            column.type === 'number' ? '130px' : 
                            column.type === 'date' ? '180px' : '180px'
                  }}
                  className="text-center bg-muted border border-border"
                >
                  <div className="py-2 px-2 whitespace-normal text-sm">{column.header}</div>
                </TableHead>
              ))}
              {config.dynamicRows && !readOnly && (
                <TableHead className="w-10 bg-muted border border-border"></TableHead>
              )}
            </TableRow>
          </TableHeader>

          <TableBody>
            {/* Datos de la tabla */}
            {tableData.map((rowData, rowIndex) => (
              <TableRow key={rowIndex} className="hover:bg-muted/30">
                {allColumns.map((column) => (
                  <TableCell 
                    key={`${rowIndex}-${column.id}`} 
                    className={`p-1 border border-border ${column.dependency ? 'bg-blue-50' : ''}`}
                    style={{ 
                      width: column.width || '180px',
                      minWidth: column.type === 'text' ? '180px' : 
                               column.type === 'select' ? '180px' : 
                               column.type === 'number' ? '130px' : 
                               column.type === 'date' ? '180px' : '180px'
                    }}
                  >
                    {column.type === 'text' && (
                      <Input
                        type="text"
                        value={rowData[column.id] || ''}
                        onChange={(e) => updateCellLocally(rowIndex, column.id, e.target.value)}
                        readOnly={readOnly || column.readOnly}
                        className="h-8 w-full"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            // Encontrar la tabla más cercana
                            const tableElement = e.currentTarget.closest('table');
                            if (!tableElement) return;
                            
                            // Encontrar todos los inputs dentro de la tabla
                            const tableInputs = tableElement.querySelectorAll(
                              'input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
                            );
                            
                            const currentElement = e.target as HTMLElement;
                            const currentIndex = Array.from(tableInputs).indexOf(currentElement);
                            
                            if (currentIndex >= 0 && currentIndex < tableInputs.length - 1) {
                              const nextElement = tableInputs[currentIndex + 1] as HTMLElement;
                              nextElement.focus();
                            } else if (currentIndex === tableInputs.length - 1) {
                              // Si estamos en el último campo, ir al primer campo de la siguiente fila
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
                        }}
                      />
                    )}
                    {column.type === 'number' && (
                      <Input
                        type="number"
                        value={rowData[column.id] || ''}
                        onChange={(e) => updateCellLocally(rowIndex, column.id, e.target.value)}
                        readOnly={readOnly || column.readOnly}
                        className="h-8 w-full"
                        min={column.validation?.min}
                        max={column.validation?.max}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            // Encontrar la tabla más cercana
                            const tableElement = e.currentTarget.closest('table');
                            if (!tableElement) return;
                            
                            // Encontrar todos los inputs dentro de la tabla
                            const tableInputs = tableElement.querySelectorAll(
                              'input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
                            );
                            
                            const currentElement = e.target as HTMLElement;
                            const currentIndex = Array.from(tableInputs).indexOf(currentElement);
                            
                            if (currentIndex >= 0 && currentIndex < tableInputs.length - 1) {
                              const nextElement = tableInputs[currentIndex + 1] as HTMLElement;
                              nextElement.focus();
                            } else if (currentIndex === tableInputs.length - 1) {
                              // Si estamos en el último campo, ir al primer campo de la siguiente fila
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
                        }}
                      />
                    )}
                    {column.type === 'select' && !(column.options?.some(opt => opt.value === 'SI' || opt.value === 'NO')) && (
                      <Select
                        defaultValue={rowData[column.id] || ''}
                        onValueChange={(val) => updateCellLocally(rowIndex, column.id, val)}
                        disabled={readOnly || column.readOnly}
                      >
                        <SelectTrigger className="h-8 w-full border-muted min-w-[80px]">
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
                    {(column.type === 'select' && column.options?.some(opt => opt.value === 'SI' || opt.value === 'NO')) && (() => {
                      console.log(`[CHECKBOX-SELECT] 🔧 Renderizando checkbox para select SI/NO ${column.id} fila ${rowIndex}, valor: ${rowData[column.id]}`);
                      return (
                        <div className="flex items-center justify-center p-2" style={{border: '2px solid red'}}>
                          <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log(`[CHECKBOX-SELECT] 🎯 CLIC DETECTADO! ${column.id} fila ${rowIndex}`);
                            console.log(`[CHECKBOX-SELECT] Valor actual en datos:`, rowData[column.id]);
                            
                            if (readOnly || column.readOnly) {
                              console.log(`[CHECKBOX-SELECT] ⛔ Campo bloqueado`);
                              return;
                            }
                            
                            const currentValue = rowData[column.id];
                            const newValue = currentValue === 'SI' ? 'vacio' : 'SI';
                            
                            console.log(`[CHECKBOX-SELECT] Cambiando de '${currentValue}' a '${newValue}'`);
                            
                            // Para checkboxes SI/NO mutuamente excluyentes
                            if (column.id.includes('revision_visual')) {
                              if (newValue === 'SI') {
                                console.log(`[CHECKBOX-SELECT] ✅ Marcando ${column.id} como 'SI'`);
                                updateCell(rowIndex, column.id, 'SI');
                                
                                // Limpiar la opción opuesta
                                const oppositeId = column.id.includes('_si') ? 
                                  column.id.replace('_si', '_no') : 
                                  column.id.replace('_no', '_si');
                                console.log(`[CHECKBOX-SELECT] Limpiando campo opuesto: ${oppositeId}`);
                                updateCell(rowIndex, oppositeId, 'vacio');
                              } else {
                                console.log(`[CHECKBOX-SELECT] ❌ Desmarcando ${column.id} como 'vacio'`);
                                updateCell(rowIndex, column.id, 'vacio');
                              }
                            } else {
                              updateCell(rowIndex, column.id, newValue);
                            }
                          }}
                          disabled={readOnly || column.readOnly}
                          className={`h-5 w-5 border-2 rounded-sm flex items-center justify-center cursor-pointer transition-colors ${
                            rowData[column.id] === 'SI' 
                              ? 'bg-primary border-primary text-white' 
                              : 'border-gray-300 hover:border-gray-400'
                          } ${(readOnly || column.readOnly) ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-50'}`}
                        >
                          {rowData[column.id] === 'SI' && (
                            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                        </div>
                      );
                    })()}
                    {column.type === 'checkbox' && (() => {
                      console.log(`[CHECKBOX-RENDER] 🔧 Renderizando checkbox ${column.id} fila ${rowIndex}, valor: ${rowData[column.id]}, readOnly: ${readOnly}, column.readOnly: ${column.readOnly}`);
                      return (
                        <div className="flex items-center justify-center p-2" style={{border: '2px solid red'}}>
                          <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log(`[CHECKBOX] 🎯 CLIC DETECTADO! ${column.id} fila ${rowIndex}`);
                            console.log(`[CHECKBOX] Valor actual en datos:`, rowData[column.id]);
                            console.log(`[CHECKBOX] Datos completos de la fila:`, rowData);
                            
                            if (readOnly || column.readOnly) {
                              console.log(`[CHECKBOX] ⛔ Campo bloqueado - readOnly:${readOnly} column.readOnly:${column.readOnly}`);
                              return;
                            }
                            
                            const currentValue = rowData[column.id];
                            const newValue = currentValue === 'si' ? 'vacio' : 'si';
                            
                            console.log(`[CHECKBOX] Cambiando de '${currentValue}' a '${newValue}'`);
                            
                            // Para checkboxes SI/NO mutuamente excluyentes
                            if (column.id.includes('revision_visual')) {
                              if (newValue === 'si') {
                                console.log(`[CHECKBOX] ✅ Marcando ${column.id} como 'si'`);
                                updateCell(rowIndex, column.id, 'si');
                                
                                // Limpiar la opción opuesta
                                const oppositeId = column.id.includes('_si') ? 
                                  column.id.replace('_si', '_no') : 
                                  column.id.replace('_no', '_si');
                                console.log(`[CHECKBOX] Limpiando campo opuesto: ${oppositeId}`);
                                updateCell(rowIndex, oppositeId, 'vacio');
                              } else {
                                console.log(`[CHECKBOX] ❌ Desmarcando ${column.id} como 'vacio'`);
                                updateCell(rowIndex, column.id, 'vacio');
                              }
                            } else {
                              updateCell(rowIndex, column.id, newValue);
                            }
                            
                            // Verificar que se aplicó el cambio
                            setTimeout(() => {
                              console.log(`[CHECKBOX-VERIFY] Valor después de updateCell:`, tableData[rowIndex]?.[column.id]);
                            }, 100);
                          }}
                          disabled={readOnly || column.readOnly}
                          className={`h-5 w-5 border-2 rounded-sm flex items-center justify-center cursor-pointer transition-colors ${
                            rowData[column.id] === 'si' 
                              ? 'bg-primary border-primary text-white' 
                              : 'border-gray-300 hover:border-gray-400'
                          } ${(readOnly || column.readOnly) ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-50'}`}
                        >
                          {rowData[column.id] === 'si' && (
                            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                        </div>
                      );
                    })()}
                    {column.type === 'date' && (
                      <Input
                        type="date"
                        value={rowData[column.id] || ''}
                        onChange={(e) => updateCellLocally(rowIndex, column.id, e.target.value)}
                        readOnly={readOnly || column.readOnly}
                        className="h-8 w-full"
                      />
                    )}
                    {column.type === 'employee' && (
                      <Select
                        defaultValue={rowData[column.id] || ''}
                        onValueChange={(val) => updateCellLocally(rowIndex, column.id, val)}
                        disabled={readOnly || column.readOnly || loadingEmployees}
                      >
                        <SelectTrigger className="h-8 w-full border-muted min-w-[80px]">
                          <SelectValue placeholder="Seleccionar empleado..." />
                        </SelectTrigger>
                        <SelectContent>
                          {loadingEmployees ? (
                            <div className="p-2">
                              <Skeleton className="h-4 w-full" />
                            </div>
                          ) : (
                            employees
                              // Filtrar por tipo de empleado si es necesario
                              .filter(emp => !column.employeeType || emp.type === column.employeeType)
                              .map((employee) => (
                                <SelectItem key={employee.id} value={employee.id.toString()}>
                                  {employee.name}
                                </SelectItem>
                              ))
                          )}
                        </SelectContent>
                      </Select>
                    )}
                    {column.type === 'product' && (
                      <Select
                        defaultValue={rowData[column.id] || ''}
                        onValueChange={(val) => updateCell(rowIndex, column.id, val)}
                        disabled={readOnly || column.readOnly || loadingProducts}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Seleccionar producto..." />
                        </SelectTrigger>
                        <SelectContent>
                          {loadingProducts ? (
                            <div className="p-2">
                              <Skeleton className="h-4 w-full" />
                            </div>
                          ) : (
                            products.map((product) => (
                              <SelectItem key={product.id} value={product.name}>
                                {product.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                ))}
                {/* Botón para eliminar fila */}
                {config.dynamicRows && !readOnly && (
                  <TableCell className="p-1 w-10 border border-border">
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => removeRow(rowIndex)}
                      disabled={isSaving}
                      className="h-8 w-8 rounded-none"
                    >
                      <Trash className="h-4 w-4" />
                      <span className="sr-only">Eliminar fila</span>
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            
            {/* Botones para agregar fila y guardar */}
            {config.dynamicRows && !readOnly && (
              <TableRow>
                <TableCell colSpan={allColumns.length + 1} className="p-2 border border-border">
                  <div className="flex justify-between items-center">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={addRow}
                      disabled={isSaving}
                      className="h-9 px-4"
                    >
                      <Plus className="h-4 w-4 mr-2" /> Agregar Fila
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => {
                        try {
                          setIsSaving(true);
                          
                          // Propagar el cambio actual al componente padre
                          const jsonString = JSON.stringify(tableData);
                          const finalData = JSON.parse(jsonString);
                          onChange(finalData);
                          
                          notifyTableUpdate("Tabla guardada", "success");
                          setIsSaving(false);
                        } catch (error) {
                          console.error("[saveTable] Error crítico al guardar tabla:", error);
                          notifyTableUpdate("Error crítico al guardar tabla", "error");
                          setIsSaving(false);
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4"
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