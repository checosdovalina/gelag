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
      { name: "Carrogenina", amount: 0, unit: "kg" },
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
      { name: "Leche de Vaca", amount: 1, unit: "kg" },
      { name: "Leche de Cabra", amount: 0, unit: "kg" },
      { name: "Azúcar", amount: 0.2, unit: "kg" },
      { name: "Glucosa", amount: 0.05, unit: "kg" },
      { name: "Malto", amount: 0, unit: "kg" },
      { name: "Bicarbonato", amount: 0.0015, unit: "kg" },
      { name: "Sorbato", amount: 0.0005, unit: "kg" },
      { name: "Lecitina", amount: 0.0002, unit: "kg" },
      { name: "Carrogenina", amount: 0, unit: "kg" },
      { name: "Grasa", amount: 0, unit: "kg" },
      { name: "Pasta", amount: 0, unit: "kg" },
      { name: "Antiespumante", amount: 0.0001, unit: "kg" },
      { name: "Nuez", amount: 0, unit: "kg" }
    ]
  },
  {
    productName: "Cajeton Tradicional",
    baseUnit: "litros",
    ingredients: [
      { name: "Leche de Vaca", amount: 1, unit: "kg" },
      { name: "Leche de Cabra", amount: 0, unit: "kg" },
      { name: "Azúcar", amount: 0.25, unit: "kg" },
      { name: "Glucosa", amount: 0.03, unit: "kg" },
      { name: "Malto", amount: 0, unit: "kg" },
      { name: "Bicarbonato", amount: 0.0015, unit: "kg" },
      { name: "Sorbato", amount: 0.0006, unit: "kg" },
      { name: "Lecitina", amount: 0, unit: "kg" },
      { name: "Carrogenina", amount: 0, unit: "kg" },
      { name: "Grasa", amount: 0, unit: "kg" },
      { name: "Pasta", amount: 0, unit: "kg" },
      { name: "Antiespumante", amount: 0.0001, unit: "kg" },
      { name: "Nuez", amount: 0, unit: "kg" }
    ]
  },
  // Aquí puedes añadir más fórmulas para los otros tipos de cajeta
  // siguiendo el mismo patrón
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