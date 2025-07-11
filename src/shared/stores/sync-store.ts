import { create } from 'zustand';
import type { SyncAction, SyncStatus } from '../types/entities/database';

interface SyncState {
  // Estado de sincronización
  status: SyncStatus;
  
  // Cola de acciones
  queue: SyncAction[];
  
  // Configuración
  autoSyncEnabled: boolean;
  syncInterval: number; // en milisegundos
  
  // Estadísticas
  totalSynced: number;
  totalErrors: number;
  lastSyncDuration: number;
  
  // Acciones de estado
  setStatus: (status: Partial<SyncStatus>) => void;
  setLastSyncTime: (time: number) => void;
  setSyncing: (isSyncing: boolean) => void;
  setError: (error: string | null) => void;
  
  // Acciones de cola
  addToQueue: (action: Omit<SyncAction, 'id' | 'timestamp'>) => string;
  removeFromQueue: (actionId: string) => void;
  clearQueue: () => void;
  incrementRetries: (actionId: string) => void;
  
  // Configuración
  setAutoSync: (enabled: boolean) => void;
  setSyncInterval: (interval: number) => void;
  
  // Estadísticas
  incrementSynced: () => void;
  incrementErrors: () => void;
  setSyncDuration: (duration: number) => void;
  
  // Utilidades
  getPendingActions: () => SyncAction[];
  getFailedActions: () => SyncAction[];
  getQueueStats: () => {
    total: number;
    pending: number;
    failed: number;
    retrying: number;
  };
  
  // Reset
  reset: () => void;
}

const defaultStatus: SyncStatus = {
  last_sync_time: null,
  pending_actions: 0,
  is_syncing: false,
  last_error: null,
};

export const useSyncStore = create<SyncState>((set, get) => ({
  // Estado inicial
  status: defaultStatus,
  queue: [],
  autoSyncEnabled: true,
  syncInterval: 5 * 60 * 1000, // 5 minutos
  totalSynced: 0,
  totalErrors: 0,
  lastSyncDuration: 0,

  // Acciones de estado
  setStatus: (statusUpdate) => set((state) => ({
    status: { ...state.status, ...statusUpdate }
  })),

  setLastSyncTime: (time) => set((state) => ({
    status: { ...state.status, last_sync_time: time }
  })),

  setSyncing: (isSyncing) => set((state) => ({
    status: { ...state.status, is_syncing: isSyncing }
  })),

  setError: (error) => set((state) => ({
    status: { ...state.status, last_error: error }
  })),

  // Acciones de cola
  addToQueue: (actionData) => {
    const action: SyncAction = {
      ...actionData,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      retries: 0,
    };

    set((state) => ({
      queue: [...state.queue, action],
      status: { 
        ...state.status, 
        pending_actions: state.queue.length + 1 
      }
    }));

    return action.id;
  },

  removeFromQueue: (actionId) => set((state) => {
    const newQueue = state.queue.filter(action => action.id !== actionId);
    return {
      queue: newQueue,
      status: { 
        ...state.status, 
        pending_actions: newQueue.length 
      }
    };
  }),

  clearQueue: () => set((state) => ({
    queue: [],
    status: { ...state.status, pending_actions: 0 }
  })),

  incrementRetries: (actionId) => set((state) => ({
    queue: state.queue.map(action =>
      action.id === actionId
        ? { ...action, retries: (action.retries || 0) + 1 }
        : action
    )
  })),

  // Configuración
  setAutoSync: (enabled) => set({ autoSyncEnabled: enabled }),

  setSyncInterval: (interval) => set({ syncInterval: interval }),

  // Estadísticas
  incrementSynced: () => set((state) => ({
    totalSynced: state.totalSynced + 1
  })),

  incrementErrors: () => set((state) => ({
    totalErrors: state.totalErrors + 1
  })),

  setSyncDuration: (duration) => set({ lastSyncDuration: duration }),

  // Utilidades
  getPendingActions: () => {
    return get().queue.filter(action => (action.retries || 0) < 3);
  },

  getFailedActions: () => {
    return get().queue.filter(action => (action.retries || 0) >= 3);
  },

  getQueueStats: () => {
    const queue = get().queue;
    const pending = queue.filter(action => (action.retries || 0) === 0).length;
    const failed = queue.filter(action => (action.retries || 0) >= 3).length;
    const retrying = queue.filter(action => {
      const retries = action.retries || 0;
      return retries > 0 && retries < 3;
    }).length;

    return {
      total: queue.length,
      pending,
      failed,
      retrying,
    };
  },

  // Reset
  reset: () => set({
    status: defaultStatus,
    queue: [],
    autoSyncEnabled: true,
    syncInterval: 5 * 60 * 1000,
    totalSynced: 0,
    totalErrors: 0,
    lastSyncDuration: 0,
  }),
}));