import { z } from 'zod';

// ==========================================
// SCHEMAS BÁSICOS
// ==========================================

export const timestampSchema = z.number().positive('Timestamp debe ser positivo');
export const idSchema = z.string().min(1, 'ID es requerido');
export const emailSchema = z.string().email('Email inválido');
export const passwordSchema = z.string().min(6, 'Contraseña debe tener al menos 6 caracteres');

// ==========================================
// SCHEMAS DE USUARIO
// ==========================================

export const userRoleSchema = z.enum(['user', 'admin', 'moderator'], {
  errorMap: () => ({ message: 'Rol debe ser user, admin o moderator' }),
});

export const createUserSchema = z.object({
  email: emailSchema,
  name: z.string().min(1, 'Nombre es requerido').max(100, 'Nombre muy largo'),
  password_hash: passwordSchema.optional(),
  avatar_url: z.string().url('URL de avatar inválida').optional(),
  is_verified: z.boolean().default(false),
  role: userRoleSchema.default('user'),
});

export const updateUserSchema = createUserSchema.partial().extend({
  last_login_at: timestampSchema.optional(),
});

export const userSchema = createUserSchema.extend({
  id: idSchema,
  created_at: timestampSchema,
  updated_at: timestampSchema,
  synced: z.boolean().default(false),
  last_login_at: timestampSchema.optional(),
});

// ==========================================
// SCHEMAS DE TODO
// ==========================================

export const todoPrioritySchema = z.enum(['low', 'medium', 'high'], {
  errorMap: () => ({ message: 'Prioridad debe ser low, medium o high' }),
});

export const createTodoSchema = z.object({
  user_id: idSchema,
  title: z.string().min(1, 'Título es requerido').max(200, 'Título muy largo'),
  description: z.string().max(1000, 'Descripción muy larga').optional(),
  completed: z.boolean().default(false),
  priority: todoPrioritySchema.default('medium'),
  due_date: timestampSchema.optional(),
});

export const updateTodoSchema = createTodoSchema.partial().omit({ user_id: true });

export const todoSchema = createTodoSchema.extend({
  id: idSchema,
  created_at: timestampSchema,
  updated_at: timestampSchema,
  synced: z.boolean().default(false),
});

// ==========================================
// SCHEMAS DE AUTENTICACIÓN
// ==========================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Contraseña es requerida'),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1, 'Nombre es requerido').max(100, 'Nombre muy largo'),
});

export const sessionSchema = z.object({
  id: idSchema,
  user_id: idSchema,
  token: z.string().min(1, 'Token es requerido'),
  expires_at: timestampSchema,
  created_at: timestampSchema,
});

// ==========================================
// SCHEMAS DE CONFIGURACIÓN
// ==========================================

export const themeSchema = z.enum(['light', 'dark', 'system'], {
  errorMap: () => ({ message: 'Tema debe ser light, dark o system' }),
});

export const languageSchema = z.enum(['es', 'en'], {
  errorMap: () => ({ message: 'Idioma debe ser es o en' }),
});

export const appConfigSchema = z.object({
  theme: themeSchema.default('system'),
  language: languageSchema.default('es'),
  notifications_enabled: z.boolean().default(true),
  sync_enabled: z.boolean().default(true),
  offline_mode: z.boolean().default(false),
});

// ==========================================
// SCHEMAS DE FILTROS
// ==========================================

export const todoFiltersSchema = z.object({
  completed: z.boolean().optional(),
  priority: todoPrioritySchema.optional(),
  user_id: idSchema.optional(),
  search: z.string().max(100, 'Búsqueda muy larga').optional(),
  due_date_from: timestampSchema.optional(),
  due_date_to: timestampSchema.optional(),
  limit: z.number().positive().max(100).default(50),
  offset: z.number().min(0).default(0),
});

export const userFiltersSchema = z.object({
  role: userRoleSchema.optional(),
  is_verified: z.boolean().optional(),
  search: z.string().max(100, 'Búsqueda muy larga').optional(),
  limit: z.number().positive().max(100).default(50),
  offset: z.number().min(0).default(0),
});

// ==========================================
// SCHEMAS DE SINCRONIZACIÓN
// ==========================================

export const syncActionTypeSchema = z.enum(['CREATE', 'UPDATE', 'DELETE'], {
  errorMap: () => ({ message: 'Tipo debe ser CREATE, UPDATE o DELETE' }),
});

export const syncActionSchema = z.object({
  id: idSchema,
  type: syncActionTypeSchema,
  table: z.string().min(1, 'Tabla es requerida'),
  data: z.record(z.any()).refine(
    (data) => Object.keys(data).length > 0,
    'Datos no pueden estar vacíos'
  ),
  timestamp: timestampSchema,
  retries: z.number().min(0).default(0),
});

// ==========================================
// SCHEMAS DE RED
// ==========================================

export const networkStateSchema = z.object({
  isConnected: z.boolean(),
  isInternetReachable: z.boolean().nullable(),
  type: z.string().nullable(),
});

// ==========================================
// SCHEMAS DE API
// ==========================================

export const apiErrorSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  field: z.string().optional(),
});

export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: apiErrorSchema.optional(),
  message: z.string().optional(),
});

// ==========================================
// SCHEMAS DE PAGINACIÓN
// ==========================================

export const paginationParamsSchema = z.object({
  page: z.number().positive().default(1),
  limit: z.number().positive().max(100).default(20),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

export const paginationResponseSchema = z.object({
  page: z.number().positive(),
  limit: z.number().positive(),
  total: z.number().min(0),
  pages: z.number().min(0),
  has_next: z.boolean(),
  has_prev: z.boolean(),
});

export const paginatedResponseSchema = <T>(dataSchema: z.ZodSchema<T>) =>
  z.object({
    data: z.array(dataSchema),
    pagination: paginationResponseSchema,
  });

// ==========================================
// TYPES DERIVADOS
// ==========================================

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type User = z.infer<typeof userSchema>;

export type CreateTodoInput = z.infer<typeof createTodoSchema>;
export type UpdateTodoInput = z.infer<typeof updateTodoSchema>;
export type Todo = z.infer<typeof todoSchema>;

export type LoginCredentials = z.infer<typeof loginSchema>;
export type RegisterCredentials = z.infer<typeof registerSchema>;
export type Session = z.infer<typeof sessionSchema>;

export type AppConfig = z.infer<typeof appConfigSchema>;
export type TodoFilters = z.infer<typeof todoFiltersSchema>;
export type UserFilters = z.infer<typeof userFiltersSchema>;

export type SyncAction = z.infer<typeof syncActionSchema>;
export type NetworkState = z.infer<typeof networkStateSchema>;
export type ApiResponse<T = any> = z.infer<typeof apiResponseSchema> & { data?: T };

export type PaginationParams = z.infer<typeof paginationParamsSchema>;
export type PaginationResponse = z.infer<typeof paginationResponseSchema>;
export type PaginatedResponse<T> = {
  data: T[];
  pagination: PaginationResponse;
};