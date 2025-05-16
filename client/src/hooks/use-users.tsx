import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { User } from "@shared/schema";

// Hook para obtener todos los usuarios
export function useUsers() {
  // Obtener todos los usuarios
  const {
    data: users,
    isLoading,
    error,
  } = useQuery<User[]>({
    queryKey: ['/api/users'],
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  return {
    users,
    isLoading,
    error,
  };
}