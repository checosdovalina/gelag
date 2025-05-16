// Repositorio de fórmulas para cada tipo de producto
// Las cantidades se expresan como proporción por cada litro de producción

export interface ProductFormulaIngredient {
  name: string;
  amount: number;
  unit: string;
}

export interface ProductFormula {
  productName: string;
  baseUnit: string;
  ingredients: ProductFormulaIngredient[];
}

export const productFormulas: ProductFormula[] = [
  {
    productName: "Mielmex 65° Brix",
    baseUnit: "litros",
    ingredients: [
      { name: "Leche de Vaca", amount: 0, unit: "kg" },
      { name: "Leche de Cabra", amount: 1, unit: "kg" }, // 500kg / 500L = 1kg por litro
      { name: "Azúcar", amount: 0.18, unit: "kg" }, // 90kg / 500L = 0.18kg por litro
      { name: "Glucosa", amount: 0, unit: "kg" },
      { name: "Malto", amount: 0, unit: "kg" },
      { name: "Bicarbonato", amount: 0.0016, unit: "kg" }, // 0.80kg / 500L = 0.0016kg por litro
      { name: "Sorbato", amount: 0.00062, unit: "kg" }, // 0.31kg / 500L = 0.00062kg por litro
      { name: "Lecitina", amount: 0, unit: "kg" },
      { name: "Carragenina", amount: 0, unit: "kg" },
      { name: "Grasa", amount: 0, unit: "kg" },
      { name: "Pasta", amount: 0, unit: "kg" },
      { name: "Antiespumante", amount: 0, unit: "kg" },
      { name: "Nuez", amount: 0, unit: "kg" }
    ]
  },
  {
    productName: "Coro 68° Brix",
    baseUnit: "litros",
    ingredients: [
      { name: "Leche de Vaca", amount: 0.2, unit: "kg" }, // 100kg / 500L = 0.2kg por litro
      { name: "Leche de Cabra", amount: 0.8, unit: "kg" }, // 400kg / 500L = 0.8kg por litro
      { name: "Azúcar", amount: 0.18, unit: "kg" }, // 90kg / 500L = 0.18kg por litro
      { name: "Glucosa", amount: 0, unit: "kg" },
      { name: "Malto", amount: 0, unit: "kg" },
      { name: "Bicarbonato", amount: 0.0016, unit: "kg" }, // 0.80kg / 500L = 0.0016kg por litro
      { name: "Sorbato", amount: 0, unit: "kg" },
      { name: "Lecitina", amount: 0, unit: "kg" },
      { name: "Carragenina", amount: 0, unit: "kg" },
      { name: "Grasa", amount: 0, unit: "kg" },
      { name: "Pasta", amount: 0, unit: "kg" },
      { name: "Antiespumante", amount: 0, unit: "kg" },
      { name: "Nuez", amount: 0, unit: "kg" }
    ]
  },
  {
    productName: "Cajeton Tradicional",
    baseUnit: "litros",
    ingredients: [
      { name: "Leche de Vaca", amount: 0, unit: "kg" },
      { name: "Leche de Cabra", amount: 1, unit: "kg" }, // 500kg / 500L = 1kg por litro
      { name: "Azúcar", amount: 0.2, unit: "kg" }, // 100kg / 500L = 0.2kg por litro
      { name: "Glucosa", amount: 0.27, unit: "kg" }, // 135kg / 500L = 0.27kg por litro
      { name: "Malto", amount: 0.05, unit: "kg" }, // 25kg / 500L = 0.05kg por litro
      { name: "Bicarbonato", amount: 0.0016, unit: "kg" }, // 0.8kg / 500L = 0.0016kg por litro
      { name: "Sorbato", amount: 0.001, unit: "kg" }, // 0.5kg / 500L = 0.001kg por litro
      { name: "Lecitina", amount: 0, unit: "kg" },
      { name: "Carragenina", amount: 0, unit: "kg" },
      { name: "Grasa", amount: 0, unit: "kg" },
      { name: "Pasta", amount: 0, unit: "kg" },
      { name: "Antiespumante", amount: 0, unit: "kg" },
      { name: "Nuez", amount: 0, unit: "kg" }
    ]
  },
  {
    productName: "Cajeton Espesa",
    baseUnit: "litros",
    ingredients: [
      { name: "Leche de Vaca", amount: 0, unit: "kg" },
      { name: "Leche de Cabra", amount: 1, unit: "kg" }, // 500kg / 500L = 1kg por litro
      { name: "Azúcar", amount: 0.2, unit: "kg" }, // 100kg / 500L = 0.2kg por litro
      { name: "Glucosa", amount: 0.27, unit: "kg" }, // 135kg / 500L = 0.27kg por litro
      { name: "Malto", amount: 0.05, unit: "kg" }, // 25kg / 500L = 0.05kg por litro
      { name: "Bicarbonato", amount: 0.0016, unit: "kg" }, // 0.8kg / 500L = 0.0016kg por litro
      { name: "Sorbato", amount: 0.001, unit: "kg" }, // 0.5kg / 500L = 0.001kg por litro
      { name: "Lecitina", amount: 0, unit: "kg" },
      { name: "Carragenina", amount: 0, unit: "kg" },
      { name: "Grasa", amount: 0, unit: "kg" },
      { name: "Pasta", amount: 0, unit: "kg" },
      { name: "Antiespumante", amount: 0, unit: "kg" },
      { name: "Nuez", amount: 0, unit: "kg" }
    ]
  },
  {
    productName: "Cajeton Esp Chepo",
    baseUnit: "litros",
    ingredients: [
      { name: "Leche de Vaca", amount: 0, unit: "kg" },
      { name: "Leche de Cabra", amount: 1, unit: "kg" }, // 500kg / 500L = 1kg por litro
      { name: "Azúcar", amount: 0.2, unit: "kg" }, // 100kg / 500L = 0.2kg por litro
      { name: "Glucosa", amount: 0.27, unit: "kg" }, // 135kg / 500L = 0.27kg por litro
      { name: "Malto", amount: 0.05, unit: "kg" }, // 25kg / 500L = 0.05kg por litro
      { name: "Bicarbonato", amount: 0.0018, unit: "kg" }, // 0.9kg / 500L = 0.0018kg por litro
      { name: "Sorbato", amount: 0, unit: "kg" },
      { name: "Lecitina", amount: 0, unit: "kg" },
      { name: "Carragenina", amount: 0, unit: "kg" },
      { name: "Grasa", amount: 0, unit: "kg" },
      { name: "Pasta", amount: 0, unit: "kg" },
      { name: "Antiespumante", amount: 0, unit: "kg" },
      { name: "Nuez", amount: 0, unit: "kg" }
    ]
  },
  {
    productName: "Cabri Tradicional",
    baseUnit: "litros",
    ingredients: [
      { name: "Leche de Vaca", amount: 0, unit: "kg" },
      { name: "Leche de Cabra", amount: 0, unit: "kg" },
      { name: "Azúcar", amount: 0.2, unit: "kg" }, // 100kg / 500L = 0.2kg por litro
      { name: "Glucosa", amount: 0.45, unit: "kg" }, // 225kg / 500L = 0.45kg por litro
      { name: "Malto", amount: 0.05, unit: "kg" }, // 25kg / 500L = 0.05kg por litro
      { name: "Bicarbonato", amount: 0.0016, unit: "kg" }, // 0.8kg / 500L = 0.0016kg por litro
      { name: "Sorbato", amount: 0.001, unit: "kg" }, // 0.5kg / 500L = 0.001kg por litro
      { name: "Lecitina", amount: 0, unit: "kg" },
      { name: "Carragenina", amount: 0, unit: "kg" },
      { name: "Grasa", amount: 0, unit: "kg" },
      { name: "Pasta", amount: 0, unit: "kg" },
      { name: "Antiespumante", amount: 0, unit: "kg" },
      { name: "Nuez", amount: 0, unit: "kg" }
    ]
  },
  {
    productName: "Cabri Espesa",
    baseUnit: "litros",
    ingredients: [
      { name: "Leche de Vaca", amount: 0, unit: "kg" },
      { name: "Leche de Cabra", amount: 0, unit: "kg" },
      { name: "Azúcar", amount: 0.2, unit: "kg" }, // 100kg / 500L = 0.2kg por litro
      { name: "Glucosa", amount: 0.45, unit: "kg" }, // 225kg / 500L = 0.45kg por litro
      { name: "Malto", amount: 0.05, unit: "kg" }, // 25kg / 500L = 0.05kg por litro
      { name: "Bicarbonato", amount: 0.0016, unit: "kg" }, // 0.8kg / 500L = 0.0016kg por litro
      { name: "Sorbato", amount: 0.001, unit: "kg" }, // 0.5kg / 500L = 0.001kg por litro
      { name: "Lecitina", amount: 0, unit: "kg" },
      { name: "Carragenina", amount: 0, unit: "kg" },
      { name: "Grasa", amount: 0, unit: "kg" },
      { name: "Pasta", amount: 0, unit: "kg" },
      { name: "Antiespumante", amount: 0, unit: "kg" },
      { name: "Nuez", amount: 0, unit: "kg" }
    ]
  },
  {
    productName: "Horneable",
    baseUnit: "litros",
    ingredients: [
      { name: "Leche de Vaca", amount: 1, unit: "kg" }, // 500kg / 500L = 1kg por litro
      { name: "Leche de Cabra", amount: 0, unit: "kg" },
      { name: "Azúcar", amount: 0.2, unit: "kg" }, // 100kg / 500L = 0.2kg por litro
      { name: "Glucosa", amount: 0.026, unit: "kg" }, // 13kg / 500L = 0.026kg por litro
      { name: "Malto", amount: 0.02, unit: "kg" }, // 10kg / 500L = 0.02kg por litro
      { name: "Bicarbonato", amount: 0.001, unit: "kg" }, // 0.5kg / 500L = 0.001kg por litro
      { name: "Sorbato", amount: 0.0006, unit: "kg" }, // 0.3kg / 500L = 0.0006kg por litro
      { name: "Lecitina", amount: 0.0006, unit: "kg" }, // 0.3kg / 500L = 0.0006kg por litro
      { name: "Carragenina", amount: 0.0036, unit: "kg" }, // 1.8kg / 500L = 0.0036kg por litro
      { name: "Grasa", amount: 0, unit: "kg" },
      { name: "Pasta", amount: 0, unit: "kg" },
      { name: "Antiespumante", amount: 0, unit: "kg" },
      { name: "Nuez", amount: 0, unit: "kg" }
    ]
  },
  {
    productName: "Gloria untable 78° Brix",
    baseUnit: "litros",
    ingredients: [
      { name: "Leche de Vaca", amount: 0, unit: "kg" },
      { name: "Leche de Cabra", amount: 0, unit: "kg" },
      { name: "Azúcar", amount: 0, unit: "kg" },
      { name: "Glucosa", amount: 0, unit: "kg" },
      { name: "Malto", amount: 0, unit: "kg" },
      { name: "Bicarbonato", amount: 0, unit: "kg" },
      { name: "Sorbato", amount: 0, unit: "kg" },
      { name: "Lecitina", amount: 0, unit: "kg" },
      { name: "Carragenina", amount: 0, unit: "kg" },
      { name: "Grasa", amount: 0, unit: "kg" },
      { name: "Pasta", amount: 0, unit: "kg" },
      { name: "Antiespumante", amount: 0, unit: "kg" },
      { name: "Nuez", amount: 0, unit: "kg" }
    ]
  },
  {
    productName: "Gloria untable 80° Brix",
    baseUnit: "litros",
    ingredients: [
      { name: "Leche de Vaca", amount: 0, unit: "kg" },
      { name: "Leche de Cabra", amount: 0, unit: "kg" },
      { name: "Azúcar", amount: 0, unit: "kg" },
      { name: "Glucosa", amount: 0, unit: "kg" },
      { name: "Malto", amount: 0, unit: "kg" },
      { name: "Bicarbonato", amount: 0, unit: "kg" },
      { name: "Sorbato", amount: 0, unit: "kg" },
      { name: "Lecitina", amount: 0, unit: "kg" },
      { name: "Carragenina", amount: 0, unit: "kg" },
      { name: "Grasa", amount: 0, unit: "kg" },
      { name: "Pasta", amount: 0, unit: "kg" },
      { name: "Antiespumante", amount: 0, unit: "kg" },
      { name: "Nuez", amount: 0, unit: "kg" }
    ]
  },
  {
    productName: "Pasta Oblea Coro",
    baseUnit: "litros",
    ingredients: [
      { name: "Leche de Vaca", amount: 0, unit: "kg" },
      { name: "Leche de Cabra", amount: 0, unit: "kg" },
      { name: "Azúcar", amount: 0, unit: "kg" },
      { name: "Glucosa", amount: 0, unit: "kg" },
      { name: "Malto", amount: 0, unit: "kg" },
      { name: "Bicarbonato", amount: 0, unit: "kg" },
      { name: "Sorbato", amount: 0, unit: "kg" },
      { name: "Lecitina", amount: 0, unit: "kg" },
      { name: "Carragenina", amount: 0, unit: "kg" },
      { name: "Grasa", amount: 0, unit: "kg" },
      { name: "Pasta", amount: 0, unit: "kg" },
      { name: "Antiespumante", amount: 0, unit: "kg" },
      { name: "Nuez", amount: 0, unit: "kg" }
    ]
  },
  {
    productName: "Pasta Oblea Cajeton",
    baseUnit: "litros",
    ingredients: [
      { name: "Leche de Vaca", amount: 0, unit: "kg" },
      { name: "Leche de Cabra", amount: 0, unit: "kg" },
      { name: "Azúcar", amount: 0, unit: "kg" },
      { name: "Glucosa", amount: 0, unit: "kg" },
      { name: "Malto", amount: 0, unit: "kg" },
      { name: "Bicarbonato", amount: 0, unit: "kg" },
      { name: "Sorbato", amount: 0, unit: "kg" },
      { name: "Lecitina", amount: 0, unit: "kg" },
      { name: "Carragenina", amount: 0, unit: "kg" },
      { name: "Grasa", amount: 0, unit: "kg" },
      { name: "Pasta", amount: 0, unit: "kg" },
      { name: "Antiespumante", amount: 0, unit: "kg" },
      { name: "Nuez", amount: 0, unit: "kg" }
    ]
  }
];

// Función utilitaria para obtener una fórmula por nombre de producto
export function getFormulaByProductName(productName: string): ProductFormula | undefined {
  return productFormulas.find(formula => formula.productName === productName);
}

// Función para calcular cantidades basadas en litros de producción
export function calculateIngredientAmounts(productName: string, liters: number): Record<string, number> {
  const formula = getFormulaByProductName(productName);
  if (!formula) return {};
  
  const result: Record<string, number> = {};
  
  formula.ingredients.forEach(ingredient => {
    // Multiplicamos la proporción por litro por el total de litros
    result[ingredient.name] = parseFloat((ingredient.amount * liters).toFixed(3));
  });
  
  return result;
}