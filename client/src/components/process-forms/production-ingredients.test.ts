import { strict as assert } from "node:assert";
import { test } from "node:test";
import { withPastaIngredient } from "./production-ingredients";

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