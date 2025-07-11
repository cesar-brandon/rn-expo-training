import { z } from 'zod';

// Tipo para los todos
interface TodoItem {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  due_date?: number;
  created_at: number;
  updated_at: number;
  synced: boolean;
}

// Validación de entrada para crear todo
const createTodoSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  due_date: z.number().optional(),
});

// Validación para filtros
const todoFiltersSchema = z.object({
  completed: z.boolean().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  user_id: z.string().optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(100).default(20).optional(),
  offset: z.number().min(0).default(0).optional(),
});

// Mock de datos de todos
let mockTodos: TodoItem[] = [
  {
    id: '1',
    user_id: '1',
    title: 'Completar proyecto React Native',
    description: 'Finalizar la implementación de la arquitectura local-first',
    completed: false,
    priority: 'high',
    due_date: Date.now() + (7 * 24 * 60 * 60 * 1000), // En 7 días
    created_at: Date.now() - (2 * 24 * 60 * 60 * 1000), // Hace 2 días
    updated_at: Date.now(),
    synced: true,
  },
  {
    id: '2',
    user_id: '1',
    title: 'Revisar documentación de Expo',
    description: 'Estudiar las nuevas características de Expo SDK 53',
    completed: true,
    priority: 'medium',
    due_date: undefined,
    created_at: Date.now() - (5 * 24 * 60 * 60 * 1000), // Hace 5 días
    updated_at: Date.now() - (1 * 24 * 60 * 60 * 1000), // Hace 1 día
    synced: true,
  },
  {
    id: '3',
    user_id: '2',
    title: 'Configurar base de datos',
    description: 'Implementar migraciones y seeders',
    completed: false,
    priority: 'high',
    due_date: Date.now() + (3 * 24 * 60 * 60 * 1000), // En 3 días
    created_at: Date.now() - (1 * 24 * 60 * 60 * 1000), // Hace 1 día
    updated_at: Date.now(),
    synced: false,
  },
];

// GET - Obtener todos con filtros
export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);
    
    // Convertir strings a tipos apropiados
    const parsedParams = {
      ...queryParams,
      completed: queryParams.completed ? queryParams.completed === 'true' : undefined,
      limit: queryParams.limit ? parseInt(queryParams.limit) : undefined,
      offset: queryParams.offset ? parseInt(queryParams.offset) : undefined,
    };

    const validation = todoFiltersSchema.safeParse(parsedParams);
    if (!validation.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Parámetros inválidos',
          details: validation.error.issues,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const filters = validation.data;
    let filteredTodos = [...mockTodos];

    // Aplicar filtros
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

    // Ordenar por fecha de creación (más recientes primero)
    filteredTodos.sort((a, b) => b.created_at - a.created_at);

    // Paginación
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    const total = filteredTodos.length;
    const paginatedTodos = filteredTodos.slice(offset, offset + limit);

    return new Response(
      JSON.stringify({
        success: true,
        data: paginatedTodos,
        pagination: {
          total,
          limit,
          offset,
          has_next: offset + limit < total,
          has_prev: offset > 0,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error obteniendo todos:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Error interno del servidor',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// POST - Crear nuevo todo
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    
    // Validar entrada
    const validation = createTodoSchema.safeParse(body);
    if (!validation.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Datos inválidos',
          details: validation.error.issues,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const todoData = validation.data;
    
    // En una app real, obtendrías el user_id del token de autenticación
    const user_id = '1'; // Mock user ID

    const newTodo: TodoItem = {
      id: Math.random().toString(36).substr(2, 9),
      user_id,
      title: todoData.title,
      description: todoData.description,
      priority: todoData.priority,
      due_date: todoData.due_date,
      completed: false,
      created_at: Date.now(),
      updated_at: Date.now(),
      synced: true, // Se considera sincronizado porque se creó en el servidor
    };

    mockTodos.unshift(newTodo);

    return new Response(
      JSON.stringify({
        success: true,
        data: newTodo,
        message: 'Todo creado exitosamente',
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error creando todo:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Error interno del servidor',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
} 