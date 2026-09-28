export interface ProductionIngredient {
  name: string;
  quantity: number | string;
  unit: string;
}

// La pasta es opcional: no se le asigna una cantidad calculada.
export function withPastaIngredient(ingredients: ProductionIngredient[]): ProductionIngredient[] {
  if (ingredients.some((ingredient) => ingredient.name.trim().toLowerCase() === "pasta")) {
    return ingredients;
  }
  return [...ingredients, { name: "Pasta", quantity: 0, unit: "kg" }];
}

export function withPastaGlucose(ingredients: ProductionIngredient[]): ProductionIngredient[] {
  const pasta = ingredients.find(ingredient => ingredient.name.trim().toLowerCase() === "pasta");
  const kilos = Number(pasta?.quantity);
  if (!Number.isFinite(kilos) || kilos <= 0) return ingredients;

  // La glucosa total sustituye a la de la receta: 528 kg de pasta -> 105.6 kg.
  const glucose = Math.round((kilos * 0.2 + Number.EPSILON) * 1000) / 1000;
  return ingredients.map(ingredient =>
    ingredient.name.trim().toLowerCase() === "glucosa"
      ? { ...ingredient, quantity: glucose }
      : ingredient
  );
}

export function withRecipeGlucose(
  ingredients: ProductionIngredient[],
  recipeGlucose: number
): ProductionIngredient[] {
  return ingredients.map(ingredient =>
    ingredient.name.trim().toLowerCase() === "glucosa"
      ? { ...ingredient, quantity: recipeGlucose }
      : ingredient
  );
}