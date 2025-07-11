import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dbService } from '../../lib/database';
import { networkService } from '../../lib/network';
import { invalidateQueries, queryConfig, queryKeys } from '../../lib/react-query/setup';
import { syncService } from '../../lib/sync';
import type { CreateTodoInput, TodoFilters, UpdateTodoInput } from '../../types/database';

// ============================================
// FUNCIONES DE API
// ============================================

const todoApi = {
  // Obtener todos con filtros
  async getTodos(filters: TodoFilters = {}) {
    // Si hay conexión, usar API remota
    if (networkService.hasInternetAccess()) {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
      
      const response = await fetch(`/api/todos?${params}`);
      if (!response.ok) {
        throw new Error(`Error fetching todos: ${response.statusText}`);
      }
      return response.json();
    }
    
    // Si no hay conexión, usar base de datos local
    const todos = await dbService.getAllTodos();
    
    // Aplicar filtros localmente
    let filteredTodos = todos;
    
    if (filters.completed !== undefined) {
      filteredTodos = filteredTodos.filter(todo => todo.completed === filters.completed);
    }
    
    if (filters.priority) {
      filteredTodos = filteredTodos.filter(todo => todo.priority === filters.priority);
    }
    
    if (filters.user_id) {
      filteredTodos = filteredTodos.filter(todo => todo.user_id === filters.user_id);
    }
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredTodos = filteredTodos.filter(todo => 
        todo.title.toLowerCase().includes(searchLower) ||
        (todo.description && todo.description.toLowerCase().includes(searchLower))
      );
    }

    // Simular formato de API
    return {
      success: true,
      data: filteredTodos,
      pagination: {
        total: filteredTodos.length,
        limit: filters.limit || 20,
        offset: filters.offset || 0,
        has_next: false,
        has_prev: false,
      },
    };
  },

  // Crear nuevo todo
  async createTodo(todoData: CreateTodoInput) {
    // Siempre crear primero en local
    const localTodo = await dbService.createTodo(todoData);
    
    // Si hay conexión, intentar sincronizar inmediatamente
    if (networkService.hasInternetAccess()) {
      try {
        const response = await fetch('/api/todos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(todoData),
        });
        
        if (response.ok) {
          // Marcar como sincronizado
          await dbService.updateTodo(localTodo.id, { synced: true });
          return { success: true, data: localTodo };
        }
      } catch (error) {
        console.log('Error sincronizando todo, se guardará para sync posterior');
      }
    }
    
    // Agregar a cola de sincronización si no se pudo sincronizar
    syncService.addToSyncQueue('CREATE', 'todos', localTodo);
    
    return { success: true, data: localTodo };
  },

  // Actualizar todo
  async updateTodo(id: string, updates: UpdateTodoInput) {
    // Actualizar primero en local
    await dbService.updateTodo(id, updates);
    const updatedTodo = await dbService.getTodo(id);
    
    if (!updatedTodo) {
      throw new Error('Todo no encontrado');
    }
    
    // Si hay conexión, intentar sincronizar
    if (networkService.hasInternetAccess()) {
      try {
        const response = await fetch(`/api/todos/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        
        if (response.ok) {
          await dbService.updateTodo(id, { synced: true });
          return { success: true, data: updatedTodo };
        }
      } catch (error) {
        console.log('Error sincronizando actualización');
      }
    }
    
    // Agregar a cola de sincronización
    syncService.addToSyncQueue('UPDATE', 'todos', updatedTodo);
    
    return { success: true, data: updatedTodo };
  },

  // Eliminar todo
  async deleteTodo(id: string) {
    // Eliminar de local
    await dbService.deleteTodo(id);
    
    // Si hay conexión, intentar sincronizar
    if (networkService.hasInternetAccess()) {
      try {
        const response = await fetch(`/api/todos/${id}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          return { success: true };
        }
      } catch (error) {
        console.log('Error sincronizando eliminación');
      }
    }
    
    // Agregar a cola de sincronización
    syncService.addToSyncQueue('DELETE', 'todos', { id });
    
    return { success: true };
  },
};

// ============================================
// HOOKS DE REACT QUERY
// ============================================

// Hook para obtener lista de todos
export const useTodos = (filters: TodoFilters = {}) => {
  return useQuery({
    queryKey: queryKeys.todos.list(filters),
    queryFn: () => todoApi.getTodos(filters),
    ...queryConfig.normal,
    // Configuración específica para todos
    refetchOnMount: true,
    refetchInterval: networkService.isConnected() ? 30000 : false, // Refetch cada 30s si hay conexión
  });
};

// Hook para obtener un todo específico
export const useTodo = (id: string) => {
  return useQuery({
    queryKey: queryKeys.todos.detail(id),
    queryFn: async () => {
      // Buscar primero en local
      const localTodo = await dbService.getTodo(id);
      if (localTodo) {
        return { success: true, data: localTodo };
      }
      
      // Si no está en local y hay conexión, buscar en remoto
      if (networkService.hasInternetAccess()) {
        const response = await fetch(`/api/todos/${id}`);
        if (response.ok) {
          return response.json();
        }
      }
      
      throw new Error('Todo no encontrado');
    },
    ...queryConfig.normal,
    enabled: !!id,
  });
};

// Hook para crear todos
export const useCreateTodo = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: todoApi.createTodo,
    onSuccess: (data) => {
      // Invalidar y refetch de listas de todos
      invalidateQueries.todos();
      
      // Optimistic update - agregar el nuevo todo a las queries existentes
      queryClient.setQueriesData(
        { queryKey: queryKeys.todos.lists() },
        (oldData: any) => {
          if (!oldData) return oldData;
          
          return {
            ...oldData,
            data: [data.data, ...(oldData.data || [])],
          };
        }
      );
    },
    onError: (error) => {
      console.error('Error creando todo:', error);
    },
  });
};

// Hook para actualizar todos
export const useUpdateTodo = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateTodoInput }) => 
      todoApi.updateTodo(id, updates),
    onSuccess: (data, variables) => {
      // Invalidar queries relacionadas
      invalidateQueries.todos();
      
      // Optimistic update del todo específico
      queryClient.setQueryData(
        queryKeys.todos.detail(variables.id),
        { success: true, data: data.data }
      );
      
      // Actualizar en listas de todos
      queryClient.setQueriesData(
        { queryKey: queryKeys.todos.lists() },
        (oldData: any) => {
          if (!oldData?.data) return oldData;
          
          return {
            ...oldData,
            data: oldData.data.map((todo: any) =>
              todo.id === variables.id ? { ...todo, ...variables.updates } : todo
            ),
          };
        }
      );
    },
  });
};

// Hook para eliminar todos
export const useDeleteTodo = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: todoApi.deleteTodo,
    onSuccess: (_, deletedId) => {
      // Invalidar queries
      invalidateQueries.todos();
      
      // Remover de todas las listas
      queryClient.setQueriesData(
        { queryKey: queryKeys.todos.lists() },
        (oldData: any) => {
          if (!oldData?.data) return oldData;
          
          return {
            ...oldData,
            data: oldData.data.filter((todo: any) => todo.id !== deletedId),
          };
        }
      );
      
      // Remover query específica
      queryClient.removeQueries({
        queryKey: queryKeys.todos.detail(deletedId),
      });
    },
  });
};

// Hook para alternar estado completado
export const useToggleTodo = () => {
  const updateTodo = useUpdateTodo();
  
  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      return updateTodo.mutateAsync({ id, updates: { completed } });
    },
  });
};

// Hook para estadísticas de todos
export const useTodoStats = (userId?: string) => {
  return useQuery({
    queryKey: queryKeys.stats.user(userId || 'current'),
    queryFn: async () => {
      const todos = await dbService.getAllTodos();
      
      // Convertir tipos legacy a nuevos tipos si es necesario
      const userTodos = userId ? todos.filter((t: any) => t.user_id === userId) : todos;
      
      return {
        success: true,
        data: {
          total_todos: userTodos.length,
          completed_todos: userTodos.filter((t: any) => t.completed).length,
          pending_todos: userTodos.filter((t: any) => !t.completed).length,
          overdue_todos: userTodos.filter((t: any) => 
            t.due_date && t.due_date < Date.now() && !t.completed
          ).length,
          todos_by_priority: {
            low: userTodos.filter((t: any) => t.priority === 'low').length,
            medium: userTodos.filter((t: any) => t.priority === 'medium').length,
            high: userTodos.filter((t: any) => t.priority === 'high').length,
          },
        },
      };
    },
    ...queryConfig.static,
  });
}; 