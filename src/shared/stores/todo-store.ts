import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Todo, TodoFilters } from '../types/entities/database';

interface OptimisticTodo extends Todo {
  _isOptimistic?: boolean;
  _originalId?: string;
}

interface TodoState {
  // Estado de datos
  todos: OptimisticTodo[];
  filters: TodoFilters;
  
  // Estado de UI
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  
  // Errores
  error: string | null;
  
  // Estadísticas rápidas
  stats: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
  };
  
  // Acciones de datos
  setTodos: (todos: Todo[]) => void;
  addTodo: (todo: Todo) => void;
  updateTodo: (id: string, updates: Partial<Todo>) => void;
  deleteTodo: (id: string) => void;
  
  // Acciones optimistas
  optimisticAdd: (todo: Omit<Todo, 'id' | 'created_at' | 'updated_at' | 'synced'>) => string;
  optimisticUpdate: (id: string, updates: Partial<Todo>) => void;
  optimisticDelete: (id: string) => void;
  revertOptimistic: (tempId: string) => void;
  confirmOptimistic: (tempId: string, realTodo: Todo) => void;
  
  // Filtros y búsqueda
  setFilters: (filters: Partial<TodoFilters>) => void;
  clearFilters: () => void;
  
  // Estado de UI
  setLoading: (loading: boolean) => void;
  setCreating: (creating: boolean) => void;
  setUpdating: (updating: boolean) => void;
  setDeleting: (deleting: boolean) => void;
  setError: (error: string | null) => void;
  
  // Utilidades
  getTodoById: (id: string) => OptimisticTodo | undefined;
  getFilteredTodos: () => OptimisticTodo[];
  updateStats: () => void;
  
  // Reset
  reset: () => void;
}

const defaultFilters: TodoFilters = {
  completed: undefined,
  priority: undefined,
  user_id: undefined,
  search: undefined,
  due_date_from: undefined,
  due_date_to: undefined,
  limit: 50,
  offset: 0,
};

export const useTodoStore = create<TodoState>()(
  immer((set, get) => ({
    // Estado inicial
    todos: [],
    filters: defaultFilters,
    isLoading: false,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    error: null,
    stats: {
      total: 0,
      completed: 0,
      pending: 0,
      overdue: 0,
    },

    // Acciones de datos
    setTodos: (todos) => set((state) => {
      state.todos = todos;
      const stats = calculateStats(todos);
      state.stats = stats;
    }),

    addTodo: (todo) => set((state) => {
      state.todos.unshift(todo);
      state.stats.total += 1;
      if (todo.completed) {
        state.stats.completed += 1;
      } else {
        state.stats.pending += 1;
      }
    }),

    updateTodo: (id, updates) => set((state) => {
      const index = state.todos.findIndex(t => t.id === id);
      if (index !== -1) {
        const oldCompleted = state.todos[index].completed;
        state.todos[index] = { ...state.todos[index], ...updates };
        
        // Actualizar stats si cambió el estado completed
        if (updates.completed !== undefined && updates.completed !== oldCompleted) {
          if (updates.completed) {
            state.stats.completed += 1;
            state.stats.pending -= 1;
          } else {
            state.stats.completed -= 1;
            state.stats.pending += 1;
          }
        }
      }
    }),

    deleteTodo: (id) => set((state) => {
      const index = state.todos.findIndex(t => t.id === id);
      if (index !== -1) {
        const todo = state.todos[index];
        state.todos.splice(index, 1);
        state.stats.total -= 1;
        if (todo.completed) {
          state.stats.completed -= 1;
        } else {
          state.stats.pending -= 1;
        }
      }
    }),

    // Acciones optimistas
    optimisticAdd: (todoData) => {
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const optimisticTodo: OptimisticTodo = {
        id: tempId,
        ...todoData,
        created_at: Date.now(),
        updated_at: Date.now(),
        synced: false,
        _isOptimistic: true,
      };
      
      set((state) => {
        state.todos.unshift(optimisticTodo);
        state.stats.total += 1;
        if (optimisticTodo.completed) {
          state.stats.completed += 1;
        } else {
          state.stats.pending += 1;
        }
      });
      
      return tempId;
    },

    optimisticUpdate: (id, updates) => set((state) => {
      const index = state.todos.findIndex(t => t.id === id);
      if (index !== -1) {
        const oldCompleted = state.todos[index].completed;
        state.todos[index] = { 
          ...state.todos[index], 
          ...updates,
          _isOptimistic: true,
          _originalId: state.todos[index]._originalId || state.todos[index].id,
        };
        
        // Actualizar stats si cambió el estado completed
        if (updates.completed !== undefined && updates.completed !== oldCompleted) {
          if (updates.completed) {
            state.stats.completed += 1;
            state.stats.pending -= 1;
          } else {
            state.stats.completed -= 1;
            state.stats.pending += 1;
          }
        }
      }
    }),

    optimisticDelete: (id) => set((state) => {
      const index = state.todos.findIndex(t => t.id === id);
      if (index !== -1) {
        const todo = state.todos[index];
        state.todos.splice(index, 1);
        state.stats.total -= 1;
        if (todo.completed) {
          state.stats.completed -= 1;
        } else {
          state.stats.pending -= 1;
        }
      }
    }),

    revertOptimistic: (tempId) => set((state) => {
      const index = state.todos.findIndex(t => t.id === tempId);
      if (index !== -1) {
        const todo = state.todos[index];
        state.todos.splice(index, 1);
        state.stats.total -= 1;
        if (todo.completed) {
          state.stats.completed -= 1;
        } else {
          state.stats.pending -= 1;
        }
      }
    }),

    confirmOptimistic: (tempId, realTodo) => set((state) => {
      const index = state.todos.findIndex(t => t.id === tempId);
      if (index !== -1) {
        state.todos[index] = realTodo;
      }
    }),

    // Filtros
    setFilters: (newFilters) => set((state) => {
      state.filters = { ...state.filters, ...newFilters };
    }),

    clearFilters: () => set((state) => {
      state.filters = defaultFilters;
    }),

    // Estado de UI
    setLoading: (loading) => set((state) => {
      state.isLoading = loading;
    }),

    setCreating: (creating) => set((state) => {
      state.isCreating = creating;
    }),

    setUpdating: (updating) => set((state) => {
      state.isUpdating = updating;
    }),

    setDeleting: (deleting) => set((state) => {
      state.isDeleting = deleting;
    }),

    setError: (error) => set((state) => {
      state.error = error;
    }),

    // Utilidades
    getTodoById: (id) => {
      return get().todos.find(t => t.id === id);
    },

    getFilteredTodos: () => {
      const { todos, filters } = get();
      return filterTodos(todos, filters);
    },

    updateStats: () => set((state) => {
      const stats = calculateStats(state.todos);
      state.stats = stats;
    }),

    // Reset
    reset: () => set((state) => {
      state.todos = [];
      state.filters = defaultFilters;
      state.isLoading = false;
      state.isCreating = false;
      state.isUpdating = false;
      state.isDeleting = false;
      state.error = null;
      state.stats = {
        total: 0,
        completed: 0,
        pending: 0,
        overdue: 0,
      };
    }),
  }))
);

// Funciones helper
function calculateStats(todos: OptimisticTodo[]) {
  const now = Date.now();
  const stats = {
    total: todos.length,
    completed: 0,
    pending: 0,
    overdue: 0,
  };

  todos.forEach(todo => {
    if (todo.completed) {
      stats.completed += 1;
    } else {
      stats.pending += 1;
      if (todo.due_date && todo.due_date < now) {
        stats.overdue += 1;
      }
    }
  });

  return stats;
}

function filterTodos(todos: OptimisticTodo[], filters: TodoFilters): OptimisticTodo[] {
  let filtered = [...todos];

  // Filtro por completed
  if (filters.completed !== undefined) {
    filtered = filtered.filter(todo => todo.completed === filters.completed);
  }

  // Filtro por prioridad
  if (filters.priority) {
    filtered = filtered.filter(todo => todo.priority === filters.priority);
  }

  // Filtro por usuario
  if (filters.user_id) {
    filtered = filtered.filter(todo => todo.user_id === filters.user_id);
  }

  // Filtro por búsqueda de texto
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(todo =>
      todo.title.toLowerCase().includes(searchLower) ||
      (todo.description && todo.description.toLowerCase().includes(searchLower))
    );
  }

  // Filtro por rango de fechas
  if (filters.due_date_from) {
    filtered = filtered.filter(todo => 
      todo.due_date && todo.due_date >= filters.due_date_from!
    );
  }

  if (filters.due_date_to) {
    filtered = filtered.filter(todo => 
      todo.due_date && todo.due_date <= filters.due_date_to!
    );
  }

  // Paginación
  if (filters.offset) {
    filtered = filtered.slice(filters.offset);
  }

  if (filters.limit) {
    filtered = filtered.slice(0, filters.limit);
  }

  return filtered;
}