export interface ProductionIngredient {
  name: string;
  quantity: number;
  unit: string;
}

// La pasta es opcional: no se le asigna una cantidad calculada ni se modifica la receta de leche.
export function withPastaIngredient(ingredients: ProductionIngredient[]): ProductionIngredient[] {
  if (ingredients.some((ingredient) => ingredient.name.trim().toLowerCase() === "pasta")) {
    return ingredients;
  }
  return [...ingredients, { name: "Pasta", quantity: 0, unit: "kg" }];
}