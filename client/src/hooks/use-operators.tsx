import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { User } from "@shared/schema";

// Hook para obtener usuarios con rol de operador (producción)
export function useOperators() {
  // Obtener usuarios con rol "produccion"
  const {
    data: operators,
    isLoading,
    error,
  } = useQuery<User[]>({
    queryKey: ['/api/users/by-role/produccion'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/users');
        const allUsers = await res.json();
        // Filtrar usuarios con rol "produccion" en el cliente
        return allUsers.filter((user: User) => 
          user.role.toLowerCase() === 'produccion' || 
          user.role.toLowerCase() === 'operador'
        );
      } catch (error) {
        console.error("Error al obtener operadores:", error);
        return [];
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  return {
    operators,
    isLoading,
    error,
  };
}