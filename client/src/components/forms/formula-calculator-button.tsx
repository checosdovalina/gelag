import React from 'react';
import { Button } from "@/components/ui/button";
import { Calculator } from "lucide-react";
import { calculateIngredientAmounts } from "@/data/product-formulas";

interface FormulaCalculatorButtonProps {
  tableData: any[];
  productColumnId: string;
  litersColumnId: string;
  materiaPrimaColumnId: string;
  kilosColumnId: string;
  onUpdate: (newData: any[]) => void;
  onNotify: (message: string, type: 'default' | 'info' | 'destructive') => void;
}

const FormulaCalculatorButton: React.FC<FormulaCalculatorButtonProps> = ({
  tableData,
  productColumnId,
  litersColumnId,
  materiaPrimaColumnId,
  kilosColumnId,
  onUpdate,
  onNotify
}) => {
  if (!tableData || tableData.length === 0) {
    return null;
  }

  // Verificar si tenemos los datos necesarios para calcular
  const firstRow = tableData[0] || {};
  const productName = firstRow[productColumnId];
  const litersValue = parseFloat(firstRow[litersColumnId] || '0');

  const canCalculate = !!productName && !isNaN(litersValue) && litersValue > 0;

  const handleCalculate = () => {
    if (!canCalculate) {
      onNotify(
        "Seleccione un producto e ingrese la cantidad de litros", 
        "destructive"
      );
      return;
    }

    try {
      // Calcular cantidades según fórmula
      const calculatedAmounts = calculateIngredientAmounts(productName, litersValue);
      
      if (Object.keys(calculatedAmounts).length === 0) {
        onNotify(
          `No se encontró una fórmula para el producto "${productName}"`, 
          "destructive"
        );
        return;
      }
      
      // Crear copia profunda de los datos para no modificar el original
      const newData = JSON.parse(JSON.stringify(tableData));
      
      // Recorrer las filas y actualizar cantidades
      let updatedCount = 0;
      for (let idx = 1; idx < newData.length; idx++) {
        const row = newData[idx];
        const ingredientName = row[materiaPrimaColumnId];
        if (ingredientName && calculatedAmounts[ingredientName] !== undefined) {
          // Actualizar kilos según la fórmula
          newData[idx][kilosColumnId] = calculatedAmounts[ingredientName].toFixed(3);
          updatedCount++;
        }
      }
      
      if (updatedCount === 0) {
        onNotify(
          "No se encontraron ingredientes que coincidan con la fórmula", 
          "destructive"
        );
        return;
      }
      
      // Actualizar datos
      onUpdate(newData);
      
      onNotify(
        `Se actualizaron ${updatedCount} ingredientes según la fórmula de ${productName} (${litersValue} litros)`, 
        "info"
      );
    } catch (error) {
      console.error("Error al aplicar fórmula:", error);
      onNotify(
        "Error al aplicar la fórmula", 
        "destructive"
      );
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-md border">
      <div className="text-sm">
        {canCalculate ? (
          <span>
            Producto: <strong>{productName}</strong> | 
            Litros: <strong>{litersValue}</strong>
          </span>
        ) : (
          <span className="text-muted-foreground">
            Seleccione un producto e ingrese la cantidad de litros para calcular automáticamente
          </span>
        )}
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={handleCalculate}
        className="flex items-center space-x-1"
        disabled={!canCalculate}
      >
        <Calculator className="h-4 w-4 mr-1" />
        <span>Calcular ingredientes</span>
      </Button>
    </div>
  );
};

export default FormulaCalculatorButton;