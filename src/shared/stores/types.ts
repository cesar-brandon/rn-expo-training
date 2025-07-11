import type { AppConfig, AuthSession, AuthUser, NetworkState, NotificationData, SyncAction, SyncStatus } from '../types/entities/database';
import type { Todo, TodoFilters } from '../validations/schemas';

// Tipos para AppStore
export interface AppState {
  config: AppConfig;
  isInitialized: boolean;
  isLoading: boolean;
  notifications: NotificationData[];
  unreadNotifications: number;
  isDarkMode: boolean;
  keyboardHeight: number;
  setConfig: (config: Partial<AppConfig>) => void;
  setInitialized: (initialized: boolean) => void;
  setLoading: (loading: boolean) => void;
  addNotification: (notification: Omit<NotificationData, 'id' | 'timestamp'>) => void;
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;
  setDarkMode: (isDark: boolean) => void;
  setKeyboardHeight: (height: number) => void;
  reset: () => void;
}

// Tipos para AuthStore
export interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoggingIn: boolean;
  isRegistering: boolean;
  loginError: string | null;
  registerError: string | null;
  setUser: (user: AuthUser | null) => void;
  setSession: (session: AuthSession | null) => void;
  setLoading: (loading: boolean) => void;
  setLoginState: (isLogging: boolean, error?: string | null) => void;
  setRegisterState: (isRegistering: boolean, error?: string | null) => void;
  login: (session: AuthSession) => void;
  logout: () => void;
  updateUser: (updates: Partial<AuthUser>) => void;
  isSessionValid: () => boolean;
  getToken: () => string | null;
  reset: () => void;
}

// Tipos para TodoStore
export interface OptimisticTodo extends Todo {
  _isOptimistic?: boolean;
  _originalId?: string;
}

export interface TodoState {
  todos: OptimisticTodo[];
  filters: TodoFilters;
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  error: string | null;
  stats: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
  };
  setTodos: (todos: Todo[]) => void;
  addTodo: (todo: Todo) => void;
  updateTodo: (id: string, updates: Partial<Todo>) => void;
  deleteTodo: (id: string) => void;
  optimisticAdd: (todo: Omit<Todo, 'id' | 'created_at' | 'updated_at' | 'synced'>) => string;
  optimisticUpdate: (id: string, updates: Partial<Todo>) => void;
  optimisticDelete: (id: string) => void;
  revertOptimistic: (tempId: string) => void;
  confirmOptimistic: (tempId: string, realTodo: Todo) => void;
  setFilters: (filters: Partial<TodoFilters>) => void;
  clearFilters: () => void;
  setLoading: (loading: boolean) => void;
  setCreating: (creating: boolean) => void;
  setUpdating: (updating: boolean) => void;
  setDeleting: (deleting: boolean) => void;
  setError: (error: string | null) => void;
  getTodoById: (id: string) => OptimisticTodo | undefined;
  getFilteredTodos: () => OptimisticTodo[];
  updateStats: () => void;
  reset: () => void;
}

// Tipos para SyncStore
export interface SyncState {
  status: SyncStatus;
  queue: SyncAction[];
  autoSyncEnabled: boolean;
  syncInterval: number;
  totalSynced: number;
  totalErrors: number;
  lastSyncDuration: number;
  setStatus: (status: Partial<SyncStatus>) => void;
  setLastSyncTime: (time: number) => void;
  setSyncing: (isSyncing: boolean) => void;
  setError: (error: string | null) => void;
  addToQueue: (action: Omit<SyncAction, 'id' | 'timestamp'>) => string;
  removeFromQueue: (actionId: string) => void;
  clearQueue: () => void;
  incrementRetries: (actionId: string) => void;
  setAutoSync: (enabled: boolean) => void;
  setSyncInterval: (interval: number) => void;
  incrementSynced: () => void;
  incrementErrors: () => void;
  setSyncDuration: (duration: number) => void;
  getPendingActions: () => SyncAction[];
  getFailedActions: () => SyncAction[];
  getQueueStats: () => {
    total: number;
    pending: number;
    failed: number;
    retrying: number;
  };
  reset: () => void;
}

// Tipos para NetworkStore
export interface NetworkStoreState {
  networkState: NetworkState;
  connectionHistory: Array<{
    timestamp: number;
    connected: boolean;
    type: string | null;
  }>;
  totalDisconnections: number;
  lastDisconnectionTime: number | null;
  totalConnectedTime: number;
  sessionStartTime: number;
  setNetworkState: (state: NetworkState) => void;
  addConnectionEvent: (connected: boolean, type: string | null) => void;
  isOffline: () => boolean;
  isOnline: () => boolean;
  hasStableConnection: () => boolean;
  getConnectionDuration: () => number;
  getDisconnectionDuration: () => number;
  getConnectionStats: () => {
    uptime: number;
    downtime: number;
    disconnections: number;
    averageConnectionDuration: number;
    currentConnectionDuration: number;
  };
  reset: () => void;
}