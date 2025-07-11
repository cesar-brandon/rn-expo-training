// ==========================================
// TIPOS PRINCIPALES DE LA BASE DE DATOS
// ==========================================

export interface User {
  id: string;
  email: string;
  name: string;
  password_hash?: string;
  avatar_url?: string;
  is_verified: boolean;
  role: 'user' | 'admin' | 'moderator';
  last_login_at?: number;
  created_at: number;
  updated_at: number;
  synced: boolean;
}

export interface Session {
  id: string;
  user_id: string;
  token: string;
  expires_at: number;
  created_at: number;
}

export interface Todo {
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

export interface Setting {
  id: string;
  user_id: string;
  key: string;
  value: string;
  created_at: number;
  updated_at: number;
}

// ==========================================
// TIPOS PARA CREACIÓN (sin campos generados)
// ==========================================

export type CreateUserInput = Omit<User, 'id' | 'created_at' | 'updated_at' | 'synced' | 'last_login_at'>;
export type CreateTodoInput = Omit<Todo, 'id' | 'created_at' | 'updated_at' | 'synced'>;
export type CreateSessionInput = Omit<Session, 'id' | 'created_at'>;
export type CreateSettingInput = Omit<Setting, 'id' | 'created_at' | 'updated_at'>;

// ==========================================
// TIPOS PARA ACTUALIZACIÓN (campos opcionales)
// ==========================================

export type UpdateUserInput = Partial<Omit<User, 'id' | 'created_at'>>;
export type UpdateTodoInput = Partial<Omit<Todo, 'id' | 'user_id' | 'created_at'>>;
export type UpdateSettingInput = Partial<Omit<Setting, 'id' | 'user_id' | 'key' | 'created_at'>>;

// ==========================================
// TIPOS PARA AUTENTICACIÓN
// ==========================================

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: User['role'];
  is_verified: boolean;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  expires_at: number;
}

// ==========================================
// TIPOS PARA API Y SINCRONIZACIÓN
// ==========================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface SyncAction {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  table: string;
  data: any;
  timestamp: number;
  retries?: number;
}

export interface SyncStatus {
  last_sync_time: number | null;
  pending_actions: number;
  is_syncing: boolean;
  last_error: string | null;
}

// ==========================================
// TIPOS PARA CONFIGURACIÓN DE LA APP
// ==========================================

export interface AppConfig {
  theme: 'light' | 'dark' | 'system';
  language: 'es' | 'en';
  notifications_enabled: boolean;
  sync_enabled: boolean;
  offline_mode: boolean;
}

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
}

// ==========================================
// TIPOS PARA STORES (REACT QUERY)
// ==========================================

export interface UserFilters {
  role?: User['role'];
  is_verified?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface TodoFilters {
  completed?: boolean;
  priority?: Todo['priority'];
  user_id?: string;
  search?: string;
  due_date_from?: number;
  due_date_to?: number;
  limit?: number;
  offset?: number;
}

// ==========================================
// TIPOS PARA ESTADÍSTICAS
// ==========================================

export interface UserStats {
  total_todos: number;
  completed_todos: number;
  pending_todos: number;
  overdue_todos: number;
  todos_by_priority: {
    low: number;
    medium: number;
    high: number;
  };
}

export interface AppStats {
  total_users: number;
  total_todos: number;
  unsynced_items: number;
  storage_used: number;
  last_sync_time: number | null;
}

// ==========================================
// UTILITARIOS DE VALIDACIÓN
// ==========================================

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ==========================================
// TIPOS PARA PAGINACIÓN
// ==========================================

export interface PaginationParams {
  page: number;
  limit: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// ==========================================
// TIPOS PARA NOTIFICACIONES
// ==========================================

export interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
  read: boolean;
  action_url?: string;
}

// ==========================================
// EXPORTAR TIPOS LEGACY (compatibilidad)
// ==========================================

// Los tipos legacy se mantienen aquí para compatibilidad
export type LegacyTodo = Todo;
export type LegacyUser = User;
