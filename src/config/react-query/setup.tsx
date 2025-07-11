import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { networkService } from '../network';

// Configuración del cliente de React Query
const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Configuración para funcionamiento offline
        retry: (failureCount, error: any) => {
          // No reintentar si estamos offline
          if (!networkService.isConnected()) {
            return false;
          }
          
          // Reintentar hasta 3 veces para errores de red
          if (error?.status >= 500 || !error?.status) {
            return failureCount < 3;
          }
          
          // No reintentar para errores de cliente (4xx)
          return false;
        },
        
        // Mantener datos en caché por 5 minutos
        staleTime: 5 * 60 * 1000,
        
        // Mantener datos inactivos por 10 minutos
        gcTime: 10 * 60 * 1000,
        
        // Refetch al recuperar la conexión
        refetchOnReconnect: true,
        
        // Refetch al enfocar la ventana
        refetchOnWindowFocus: false,
        
        // Configuración de red
        networkMode: 'offlineFirst', // Funciona offline-first
      },
      mutations: {
        // Para mutaciones, intentar solo si hay conexión
        networkMode: 'online',
        retry: (failureCount, error: any) => {
          // Reintentar mutaciones fallidas hasta 2 veces
          if (error?.status >= 500 || !error?.status) {
            return failureCount < 2;
          }
          return false;
        },
      },
    },
  });
};

// Cliente singleton
let queryClient: QueryClient | null = null;

export const getQueryClient = () => {
  if (!queryClient) {
    queryClient = createQueryClient();
  }
  return queryClient;
};

// Provider para React Query
interface ReactQueryProviderProps {
  children: React.ReactNode;
}

export const ReactQueryProvider: React.FC<ReactQueryProviderProps> = ({ children }) => {
  const client = getQueryClient();

  return (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  );
};

// Hook personalizado para estado de red en queries
export const useNetworkAwareQuery = () => {
  const queryClient = getQueryClient();
  
  React.useEffect(() => {
    // Suscribirse a cambios de red
    const unsubscribe = networkService.subscribe((networkState) => {
      if (networkState.isConnected && networkState.isInternetReachable) {
        // Cuando se recupera la conexión, refetch queries stale
        queryClient.refetchQueries({
          type: 'active',
          stale: true,
        });
      }
    });

    return unsubscribe;
  }, [queryClient]);
};

// Configuraciones específicas por tipo de dato
export const queryKeys = {
  // Claves para autenticación
  auth: {
    session: ['auth', 'session'] as const,
    user: ['auth', 'user'] as const,
  },
  
  // Claves para todos
  todos: {
    all: ['todos'] as const,
    lists: () => [...queryKeys.todos.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.todos.lists(), filters] as const,
    details: () => [...queryKeys.todos.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.todos.details(), id] as const,
  },
  
  // Claves para usuarios
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.users.lists(), filters] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
  },
  
  // Claves para estadísticas
  stats: {
    all: ['stats'] as const,
    user: (userId: string) => [...queryKeys.stats.all, 'user', userId] as const,
    app: () => [...queryKeys.stats.all, 'app'] as const,
  },
} as const;

// Configuraciones de tiempo específicas
export const queryConfig = {
  // Datos que cambian frecuentemente
  realtime: {
    staleTime: 30 * 1000, // 30 segundos
    gcTime: 2 * 60 * 1000, // 2 minutos
  },
  
  // Datos que cambian ocasionalmente
  normal: {
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  },
  
  // Datos que rara vez cambian
  static: {
    staleTime: 30 * 60 * 1000, // 30 minutos
    gcTime: 60 * 60 * 1000, // 1 hora
  },
  
  // Datos infinitos (listas paginadas)
  infinite: {
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 15 * 60 * 1000, // 15 minutos
  },
};

// Utilidades para invalidar queries
export const invalidateQueries = {
  todos: () => {
    const client = getQueryClient();
    client.invalidateQueries({ queryKey: queryKeys.todos.all });
  },
  
  users: () => {
    const client = getQueryClient();
    client.invalidateQueries({ queryKey: queryKeys.users.all });
  },
  
  stats: () => {
    const client = getQueryClient();
    client.invalidateQueries({ queryKey: queryKeys.stats.all });
  },
  
  all: () => {
    const client = getQueryClient();
    client.invalidateQueries();
  },
};

// Utilidades para prefetch
export const prefetchQueries = {
  todosList: async (filters: Record<string, any> = {}) => {
    const client = getQueryClient();
    await client.prefetchQuery({
      queryKey: queryKeys.todos.list(filters),
      queryFn: () => fetch('/api/todos' + new URLSearchParams(filters)).then(res => res.json()),
      ...queryConfig.normal,
    });
  },
  
  userStats: async (userId: string) => {
    const client = getQueryClient();
    await client.prefetchQuery({
      queryKey: queryKeys.stats.user(userId),
      queryFn: () => fetch(`/api/users/${userId}/stats`).then(res => res.json()),
      ...queryConfig.static,
    });
  },
};

export default ReactQueryProvider; 