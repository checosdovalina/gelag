import { useQuery } from "@tanstack/react-query";
import type { Product } from "@shared/schema";

// Hook para gestionar productos
export function useProducts() {
  // Obtener todos los productos
  const {
    data: products,
    isLoading,
    error,
  } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Filtrar productos por categoría
  const getProductsByCategory = (category: string) => {
    if (!products) return [];
    return products.filter(product => product.category === category);
  };

  return {
    products: products || [],
    isLoading,
    error,
    getProductsByCategory
  };
}