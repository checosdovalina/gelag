import { useState, useEffect } from 'react';
import { Package, Loader2 } from 'lucide-react';
import { FormControl, FormDescription, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from '@tanstack/react-query';
import { Toast } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

interface ProductRecipeSelectorProps {
  formField: any;
  field: any;
  isReadOnly?: boolean;
  onRecipeSelected?: (recipeData: any) => void;
}

export default function ProductRecipeSelector({
  formField,
  field,
  isReadOnly = false,
  onRecipeSelected
}: ProductRecipeSelectorProps) {
  const { toast } = useToast();
  
  // Consultar productos
  const { data: allProducts = [], isLoading: productsLoading } = useQuery({
    queryKey: ['/api/products'],
    queryFn: async () => {
      const response = await fetch('/api/products');
      if (!response.ok) {
        throw new Error('No se pudo cargar la lista de productos');
      }
      return response.json();
    }
  });

  // Filtrar productos para mostrar solo "Producto Terminado" cuando el campo es de selección de productos
  const products = field?.label?.includes('PRODUCTO') || field?.label?.includes('Producto')
    ? allProducts.filter(product => product.category === 'Producto Terminado')
    : allProducts;

  // Estado para controlar si se ha aplicado una receta
  const [recipeApplied, setRecipeApplied] = useState(false);

  // Función para cargar la receta asociada con un producto
  const loadRecipeForProduct = async (productId: number, productName: string) => {
    try {
      // Primero intentamos por ID
      let response = await fetch(`/api/products/${productId}/recipes`);
      
      if (!response.ok) {
        // Si no hay recetas por ID, intentamos por nombre
        response = await fetch(`/api/recipes/by-product-name/${encodeURIComponent(productName)}`);
      }
      
      if (!response.ok) {
        throw new Error('No se encontraron recetas para este producto');
      }
      
      const recipeData = await response.json();
      
      // Si tenemos multiples recetas, tomamos la primera
      const recipe = Array.isArray(recipeData) ? recipeData[0] : recipeData;
      
      // Notificar al componente padre para actualizar los valores de ingredientes
      if (onRecipeSelected && recipe) {
        onRecipeSelected(recipe);
        setRecipeApplied(true);
        
        toast({
          title: "Receta cargada",
          description: `Se cargó la receta para ${productName}`,
        });
      }
    } catch (error) {
      console.error('Error al cargar la receta:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se encontró una receta para este producto",
      });
    }
  };

  // Manejar cambio de producto
  const handleProductChange = (value: string) => {
    const productId = Number(value);
    formField.onChange(productId);
    
    // Resetear el estado de receta aplicada
    setRecipeApplied(false);
    
    // Buscar el producto seleccionado
    const selectedProduct = products.find((p: any) => p.id === productId);
    if (selectedProduct && selectedProduct.name) {
      // Intentar cargar la receta automáticamente
      loadRecipeForProduct(productId, selectedProduct.name);
    }
  };

  return (
    <FormItem>
      <div className="flex items-center justify-between">
        <FormLabel>
          {field.label} {field.required && <span className="text-red-500">*</span>}
        </FormLabel>
        {formField.value && !recipeApplied && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    const selectedProduct = products.find((p: any) => p.id === Number(formField.value));
                    if (selectedProduct && selectedProduct.id && selectedProduct.name) {
                      loadRecipeForProduct(selectedProduct.id, selectedProduct.name);
                    }
                  }}
                  disabled={isReadOnly}
                >
                  Cargar Receta
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Cargar ingredientes de la receta</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <Select
        value={formField.value ? formField.value.toString() : ""}
        onValueChange={handleProductChange}
        disabled={isReadOnly}
      >
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar producto" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {productsLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : products.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No hay productos disponibles
            </div>
          ) : (
            products.map((product) => (
              <SelectItem key={product.id} value={product.id.toString()}>
                <div className="flex items-center">
                  <Package className="h-4 w-4 mr-2 text-muted-foreground" />
                  {product.name} - {product.code}
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      <FormDescription>
        {formField.value && products.find((p: any) => p.id === Number(formField.value))?.description}
        {recipeApplied && <span className="ml-2 text-green-600">✓ Receta aplicada</span>}
      </FormDescription>
      <FormMessage />
    </FormItem>
  );
}