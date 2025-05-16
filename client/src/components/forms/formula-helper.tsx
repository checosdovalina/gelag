import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { calculateIngredientAmounts, productFormulas } from '@/data/product-formulas';

interface FormulaHelperProps {
  productId: string;
  literValueId: string;
  tableData: Record<string, any>[];
  onUpdateTableData: (newData: Record<string, any>[]) => void;
}

export default function FormulaHelper({ 
  productId, 
  literValueId, 
  tableData, 
  onUpdateTableData 
}: FormulaHelperProps) {
  const { toast } = useToast();
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [liters, setLiters] = useState<number>(0);

  // Buscar el producto y litros actuales en los datos de la tabla
  useEffect(() => {
    if (tableData && tableData.length > 0) {
      const firstRow = tableData[0];
      if (firstRow && firstRow[productId]) {
        setSelectedProduct(firstRow[productId]);
      }
      if (firstRow && firstRow[literValueId]) {
        const literValue = parseFloat(firstRow[literValueId]);
        if (!isNaN(literValue)) {
          setLiters(literValue);
        }
      }
    }
  }, [tableData, productId, literValueId]);

  const applyFormula = () => {
    if (!selectedProduct || liters <= 0) {
      toast({
        title: "Error al aplicar fórmula",
        description: "Selecciona un producto y especifica los litros",
        variant: "destructive"
      });
      return;
    }

    try {
      // Calcular cantidades según la fórmula
      const calculatedAmounts = calculateIngredientAmounts(selectedProduct, liters);
      
      if (Object.keys(calculatedAmounts).length === 0) {
        toast({
          title: "Fórmula no encontrada",
          description: `No se encontró una fórmula para el producto "${selectedProduct}"`,
          variant: "destructive"
        });
        return;
      }

      // Crear una copia de los datos actuales para no modificar directamente los datos de referencia
      const updatedData = [...tableData];
      
      // Actualizar datos
      // Primero, asegurarse de que el producto y los litros estén actualizados en la primera fila
      if (updatedData.length > 0) {
        updatedData[0] = {
          ...updatedData[0],
          [productId]: selectedProduct,
          [literValueId]: liters.toString()
        };
      }

      // Luego, recorrer las filas y actualizar las cantidades de materias primas
      // buscando coincidencias entre los nombres de ingredientes y los valores en la tabla
      updatedData.forEach((row, index) => {
        // Buscar el valor de "Materia Prima" en esta fila
        const mpColumn = Object.keys(row).find(key => {
          return row[key] && typeof row[key] === 'string' && 
            Object.keys(calculatedAmounts).includes(row[key]);
        });

        if (mpColumn) {
          const ingredientName = row[mpColumn];
          if (ingredientName && calculatedAmounts[ingredientName] !== undefined) {
            // Buscar la columna de kilos (normalmente la columna siguiente a la materia prima)
            const kilosColumn = Object.keys(row).find(key => key.includes('e62b'));
            
            if (kilosColumn) {
              // Actualizar el valor de kilos con el calculado
              updatedData[index] = {
                ...row,
                [kilosColumn]: calculatedAmounts[ingredientName].toFixed(3)
              };
            }
          }
        }
      });

      // Aplicar los cambios
      onUpdateTableData(updatedData);
      
      toast({
        title: "Fórmula aplicada",
        description: `Se han calculado las cantidades para ${liters} litros de ${selectedProduct}`,
      });
    } catch (error) {
      console.error("Error al aplicar fórmula:", error);
      toast({
        title: "Error al aplicar fórmula",
        description: "Ocurrió un error al calcular las cantidades",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-md bg-slate-50">
      <h3 className="text-lg font-semibold">Asistente de fórmulas</h3>
      <p className="text-sm text-muted-foreground">
        Esta herramienta calcula automáticamente las cantidades de materia prima
        basándose en el producto seleccionado y los litros especificados.
      </p>
      
      <div className="grid grid-cols-1 gap-4">
        <div>
          <Label htmlFor="productName">Producto actual</Label>
          <div className="text-sm font-medium mt-1">{selectedProduct || 'No seleccionado'}</div>
        </div>
        
        <div>
          <Label htmlFor="liters">Litros</Label>
          <Input
            id="liters"
            type="number"
            value={liters}
            onChange={(e) => setLiters(parseFloat(e.target.value) || 0)}
            min="0"
            className="mt-1"
          />
        </div>
      </div>
      
      <Button 
        type="button" 
        onClick={applyFormula}
        className="w-full"
      >
        Aplicar fórmula
      </Button>
      
      <div className="text-xs text-muted-foreground">
        <p>Fórmulas disponibles:</p>
        <ul className="list-disc list-inside mt-1">
          {productFormulas.map(formula => (
            <li key={formula.productName}>{formula.productName}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}