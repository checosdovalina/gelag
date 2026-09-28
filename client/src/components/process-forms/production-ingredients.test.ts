import { strict as assert } from "node:assert";
import { test } from "node:test";
import { withPastaIngredient, withPastaGlucose, withRecipeGlucose } from "./production-ingredients";

test("adds an editable zero-kilo Pasta entry without changing the milk recipe", () => {
  const recipe = [{ name: "Leche de Cabra", quantity: 4000, unit: "kg" }];
  const result = withPastaIngredient(recipe);
  assert.deepEqual(result, [
    { name: "Leche de Cabra", quantity: 4000, unit: "kg" },
    { name: "Pasta", quantity: 0, unit: "kg" },
  ]);
  assert.equal(recipe.length, 1);
});

test("preserves saved Pasta quantities and avoids duplicate entries", () => {
  const saved = [
    { name: "Leche de Cabra", quantity: 0, unit: "kg" },
    { name: "Pasta", quantity: 198, unit: "kg" },
  ];
  assert.equal(withPastaIngredient(saved), saved);
});

test("replaces, rather than adds to, recipe glucose when pasta is entered", () => {
  const ingredients = [
    { name: "Leche de Vaca", quantity: 500, unit: "kg" },
    { name: "Glucosa", quantity: 13.4, unit: "kg" },
    { name: "Pasta", quantity: "528", unit: "kg" },
  ];
  const result = withPastaGlucose(ingredients);
  assert.deepEqual(result.map(ingredient => ingredient.quantity), [500, 105.6, "528"]);
  assert.equal(ingredients[1].quantity, 13.4);
  assert.equal(withPastaGlucose([{ ...ingredients[1] }, { ...ingredients[2], quantity: "2.33" }])[0].quantity, 0.466);
});

test("keeps recipe glucose with no pasta, and restores it when pasta is removed", () => {
  const ingredients = [
    { name: "Glucosa", quantity: 105.6, unit: "kg" },
    { name: "Pasta", quantity: 0, unit: "kg" },
  ];
  assert.equal(withPastaGlucose(ingredients), ingredients);
  assert.deepEqual(withRecipeGlucose(ingredients, 13.4), [
    { name: "Glucosa", quantity: 13.4, unit: "kg" },
    { name: "Pasta", quantity: 0, unit: "kg" },
  ]);
});