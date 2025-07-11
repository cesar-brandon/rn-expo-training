import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useAppStore, useSyncStore, useTodoStore } from '../../stores';
import type { CreateTodoInput, Todo, UpdateTodoInput } from '../../validations/schemas';

interface OptimisticMutationConfig {
  successMessage?: string;
  errorMessage?: string;
  enableNotifications?: boolean;
  autoSync?: boolean;
}

interface OptimisticMutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => void;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  reset: () => void;
}

/**
 * Hook para mutaciones optimistas con rollback automático
 * Actualiza inmediatamente el estado local y revierte si la operación remota falla
 */
export function useOptimisticMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  config: OptimisticMutationConfig = {}
): OptimisticMutationResult<TData, TVariables> {
  const queryClient = useQueryClient();
  const appStore = useAppStore();
  
  const {
    successMessage,
    errorMessage,
    enableNotifications = true,
    autoSync = true,
  } = config;

  const [optimisticState, setOptimisticState] = useState<{
    tempId?: string;
    originalData?: any;
  }>({});

  const mutation = useMutation({
    mutationFn,
    onSuccess: (data) => {
      if (enableNotifications && successMessage) {
        appStore.addNotification({
          type: 'success',
          title: 'Operación exitosa',
          message: successMessage,
          read: false,
        });
      }
      
      // Limpiar estado optimista
      setOptimisticState({});
    },
    onError: (error) => {
      if (enableNotifications) {
        appStore.addNotification({
          type: 'error',
          title: 'Error en operación',
          message: errorMessage || (error instanceof Error ? error.message : 'Error desconocido'),
          read: false,
        });
      }
      
      // Limpiar estado optimista
      setOptimisticState({});
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    reset: () => {
      mutation.reset();
      setOptimisticState({});
    },
  };
}

/**
 * Hook específico para mutaciones optimistas de TODOs
 */
export function useOptimisticTodoMutation() {
  const queryClient = useQueryClient();
  const todoStore = useTodoStore();
  const syncStore = useSyncStore();
  const appStore = useAppStore();

  /**
   * Crear TODO de forma optimista
   */
  const createTodo = useOptimisticMutation(
    async (data: CreateTodoInput): Promise<Todo> => {
      // Esta función simula el envío al servidor
      // En una app real, aquí harías la llamada a la API
      return new Promise((resolve) => {
        setTimeout(() => {
          const newTodo: Todo = {
            id: Math.random().toString(36).substr(2, 9),
            ...data,
            created_at: Date.now(),
            updated_at: Date.now(),
            synced: true,
          };
          resolve(newTodo);
        }, 1000);
      });
    },
    {
      successMessage: 'Tarea creada exitosamente',
      errorMessage: 'Error al crear la tarea',
    }
  );

  /**
   * Wrapper para crear TODO con optimistic update
   */
  const optimisticCreateTodo = useCallback((data: CreateTodoInput) => {
    // 1. Aplicar cambio optimista inmediatamente
    const tempId = todoStore.optimisticAdd(data);
    
    // 2. Agregar a cola de sincronización
    syncStore.addToQueue({
      type: 'CREATE',
      table: 'todos',
      data,
    });

    // 3. Ejecutar mutación real
    createTodo.mutateAsync(data)
      .then((realTodo) => {
        // Confirmar el cambio optimista con datos reales
        todoStore.confirmOptimistic(tempId, realTodo);
        // Invalidar queries relacionadas
        queryClient.invalidateQueries({ queryKey: ['todos'] });
      })
      .catch((error) => {
        // Revertir cambio optimista en caso de error
        todoStore.revertOptimistic(tempId);
        console.error('Error creando TODO:', error);
      });
  }, [todoStore, syncStore, createTodo, queryClient]);

  /**
   * Actualizar TODO de forma optimista
   */
  const updateTodo = useOptimisticMutation(
    async ({ id, updates }: { id: string; updates: UpdateTodoInput }): Promise<Todo> => {
      // Simular llamada a API
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          // Simular 10% de probabilidad de error para testing
          if (Math.random() < 0.1) {
            reject(new Error('Error simulado del servidor'));
            return;
          }
          
          const updatedTodo: Todo = {
            id,
            user_id: 'current-user', // En app real, obtener del contexto
            title: 'Updated title',
            ...updates,
            created_at: Date.now() - 86400000, // Hace 1 día
            updated_at: Date.now(),
            synced: true,
          } as Todo;
          
          resolve(updatedTodo);
        }, 800);
      });
    },
    {
      successMessage: 'Tarea actualizada exitosamente',
      errorMessage: 'Error al actualizar la tarea',
    }
  );

  /**
   * Wrapper para actualizar TODO con optimistic update
   */
  const optimisticUpdateTodo = useCallback((id: string, updates: UpdateTodoInput) => {
    // Guardar estado original para posible rollback
    const originalTodo = todoStore.getTodoById(id);
    
    if (!originalTodo) {
      appStore.addNotification({
        type: 'error',
        title: 'Error',
        message: 'Tarea no encontrada',
        read: false,
      });
      return;
    }

    // 1. Aplicar cambio optimista inmediatamente
    todoStore.optimisticUpdate(id, updates);
    
    // 2. Agregar a cola de sincronización
    syncStore.addToQueue({
      type: 'UPDATE',
      table: 'todos',
      data: { id, ...updates },
    });

    // 3. Ejecutar mutación real
    updateTodo.mutateAsync({ id, updates })
      .then((realTodo) => {
        // Confirmar el cambio optimista con datos reales
        todoStore.updateTodo(id, realTodo);
        queryClient.invalidateQueries({ queryKey: ['todos'] });
      })
      .catch((error) => {
        // Revertir al estado original
        todoStore.updateTodo(id, originalTodo);
        console.error('Error actualizando TODO:', error);
      });
  }, [todoStore, syncStore, updateTodo, queryClient, appStore]);

  /**
   * Eliminar TODO de forma optimista
   */
  const deleteTodo = useOptimisticMutation(
    async (id: string): Promise<void> => {
      // Simular llamada a API
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (Math.random() < 0.05) { // 5% de probabilidad de error
            reject(new Error('Error eliminando en el servidor'));
            return;
          }
          resolve();
        }, 500);
      });
    },
    {
      successMessage: 'Tarea eliminada exitosamente',
      errorMessage: 'Error al eliminar la tarea',
    }
  );

  /**
   * Wrapper para eliminar TODO con optimistic update
   */
  const optimisticDeleteTodo = useCallback((id: string) => {
    // Guardar estado original para posible rollback
    const originalTodo = todoStore.getTodoById(id);
    
    if (!originalTodo) {
      appStore.addNotification({
        type: 'error',
        title: 'Error',
        message: 'Tarea no encontrada',
        read: false,
      });
      return;
    }

    // 1. Aplicar cambio optimista inmediatamente
    todoStore.optimisticDelete(id);
    
    // 2. Agregar a cola de sincronización
    syncStore.addToQueue({
      type: 'DELETE',
      table: 'todos',
      data: { id },
    });

    // 3. Ejecutar mutación real
    deleteTodo.mutateAsync(id)
      .then(() => {
        // El cambio ya está aplicado, solo invalidar queries
        queryClient.invalidateQueries({ queryKey: ['todos'] });
      })
      .catch((error) => {
        // Restaurar el TODO eliminado
        todoStore.addTodo(originalTodo);
        console.error('Error eliminando TODO:', error);
      });
  }, [todoStore, syncStore, deleteTodo, queryClient, appStore]);

  return {
    // Acciones optimistas
    createTodo: optimisticCreateTodo,
    updateTodo: optimisticUpdateTodo,
    deleteTodo: optimisticDeleteTodo,
    
    // Estados de las mutaciones
    isCreating: createTodo.isPending,
    isUpdating: updateTodo.isPending,
    isDeleting: deleteTodo.isPending,
    
    // Errores
    createError: createTodo.error,
    updateError: updateTodo.error,
    deleteError: deleteTodo.error,
    
    // Reset
    resetCreateError: createTodo.reset,
    resetUpdateError: updateTodo.reset,
    resetDeleteError: deleteTodo.reset,
  };
}