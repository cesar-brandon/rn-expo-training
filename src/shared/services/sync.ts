import { MMKV } from 'react-native-mmkv';
import type { SyncAction, Todo, User } from '../types/database';
import { dbService } from './database';
import { networkService } from './network';

// Instancia de MMKV para sincronización
const syncStorage = new MMKV({
  id: 'sync-storage',
  encryptionKey: 'sync-key-change-in-production',
});

interface SyncOptions {
  forceSync?: boolean;
  timeout?: number;
  retryAttempts?: number;
}

// Funciones helper para reemplazar StorageService
const SyncStorageService = {
  getAppConfig: () => {
    try {
      const config = syncStorage.getString('app_config');
      return config ? JSON.parse(config) : { lastSyncTime: null };
    } catch {
      return { lastSyncTime: null };
    }
  },

  setAppConfig: (config: any) => {
    syncStorage.set('app_config', JSON.stringify(config));
  },

  getSyncQueue: (): SyncAction[] => {
    try {
      const queue = syncStorage.getString('sync_queue');
      return queue ? JSON.parse(queue) : [];
    } catch {
      return [];
    }
  },

  setSyncQueue: (queue: SyncAction[]) => {
    syncStorage.set('sync_queue', JSON.stringify(queue));
  },

  addToSyncQueue: (action: SyncAction) => {
    const queue = SyncStorageService.getSyncQueue();
    queue.push(action);
    SyncStorageService.setSyncQueue(queue);
  },

  removeFromSyncQueue: (actionId: string) => {
    const queue = SyncStorageService.getSyncQueue();
    const filteredQueue = queue.filter(action => action.id !== actionId);
    SyncStorageService.setSyncQueue(filteredQueue);
  },
};

class SyncService {
  private isSyncing = false;
  private syncIntervalId: ReturnType<typeof setInterval> | null = null;
  private readonly API_BASE_URL = 'http://localhost:8081/api'; // API local

  async init(): Promise<void> {
    // Configurar sincronización automática cada 5 minutos si hay conexión
    this.setupAutoSync();
    
    // Suscribirse a cambios de conectividad
    networkService.subscribe((networkState) => {
      if (networkState.isConnected && networkState.isInternetReachable) {
        // Sincronizar cuando se recupere la conexión
        this.syncPendingChanges();
      }
    });

    console.log('Servicio de sincronización inicializado');
  }

  private setupAutoSync(): void {
    // Limpiar interval anterior si existe
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
    }

    // Sincronizar cada 5 minutos
    this.syncIntervalId = setInterval(() => {
      if (networkService.hasInternetAccess() && !this.isSyncing) {
        this.syncPendingChanges();
      }
    }, 5 * 60 * 1000); // 5 minutos
  }

  async syncPendingChanges(options: SyncOptions = {}): Promise<boolean> {
    if (this.isSyncing && !options.forceSync) {
      console.log('Sincronización ya en progreso');
      return false;
    }

    if (!networkService.hasInternetAccess()) {
      console.log('No hay conexión a internet para sincronizar');
      return false;
    }

    this.isSyncing = true;

    try {
      console.log('Iniciando sincronización...');

      // 1. Procesar cola de sincronización
      await this.processSyncQueue();

      // 2. Subir datos no sincronizados
      await this.uploadUnsyncedData();

      // 3. Descargar datos del servidor (en una app real)
      // await this.downloadServerData();

      // 4. Actualizar timestamp de última sincronización
      const config = SyncStorageService.getAppConfig();
      config.lastSyncTime = Date.now();
      SyncStorageService.setAppConfig(config);

      console.log('Sincronización completada exitosamente');
      return true;

    } catch (error) {
      console.error('Error durante la sincronización:', error);
      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  private async processSyncQueue(): Promise<void> {
    const queue = SyncStorageService.getSyncQueue();
    
    for (const action of queue) {
      try {
        const success = await this.processAction(action);
        if (success) {
          SyncStorageService.removeFromSyncQueue(action.id);
        } else {
          // Incrementar intentos
          action.retries = (action.retries || 0) + 1;
          if (action.retries >= 3) {
            // Remover después de 3 intentos fallidos
            SyncStorageService.removeFromSyncQueue(action.id);
            console.warn('Acción removida de la cola después de 3 intentos:', action);
          }
        }
      } catch (error) {
        console.error('Error procesando acción de sincronización:', error);
      }
    }
  }

  private async processAction(action: SyncAction): Promise<boolean> {
    try {
      switch (action.type) {
        case 'CREATE':
          return await this.createOnServer(action.table, action.data);
        case 'UPDATE':
          return await this.updateOnServer(action.table, action.data);
        case 'DELETE':
          return await this.deleteOnServer(action.table, action.data.id);
        default:
          console.warn('Tipo de acción desconocido:', action.type);
          return false;
      }
    } catch (error) {
      console.error('Error procesando acción:', error);
      return false;
    }
  }

  private async uploadUnsyncedData(): Promise<void> {
    try {
      // Subir usuarios no sincronizados
      const unsyncedUsers = await dbService.getUnsyncedUsers();
      for (const user of unsyncedUsers) {
        const success = await this.uploadUser(user);
        if (success) {
          await dbService.markAsSynced('users', user.id);
        }
      }

      // Subir todos no sincronizados
      const unsyncedTodos = await dbService.getUnsyncedTodos();
      for (const todo of unsyncedTodos) {
        const success = await this.uploadTodo(todo);
        if (success) {
          await dbService.markAsSynced('todos', todo.id);
        }
      }
    } catch (error) {
      console.error('Error subiendo datos no sincronizados:', error);
    }
  }

  // Métodos de API usando nuestros Expo API routes
  private async uploadUser(user: User): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(user),
      });

      return response.ok;
    } catch (error) {
      console.error('Error subiendo usuario:', error);
      return false;
    }
  }

  private async uploadTodo(todo: Todo): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/todos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(todo),
      });

      return response.ok;
    } catch (error) {
      console.error('Error subiendo todo:', error);
      return false;
    }
  }

  private async createOnServer(table: string, data: any): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/${table}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      return response.ok;
    } catch (error) {
      console.error('Error creando en servidor:', error);
      return false;
    }
  }

  private async updateOnServer(table: string, data: any): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/${table}/${data.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      return response.ok;
    } catch (error) {
      console.error('Error actualizando en servidor:', error);
      return false;
    }
  }

  private async deleteOnServer(table: string, id: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/${table}/${id}`, {
        method: 'DELETE',
      });

      return response.ok;
    } catch (error) {
      console.error('Error eliminando en servidor:', error);
      return false;
    }
  }

  // Métodos públicos
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  getLastSyncTime(): number | null {
    const config = SyncStorageService.getAppConfig();
    return config.lastSyncTime || null;
  }

  async forcSync(): Promise<boolean> {
    return this.syncPendingChanges({ forceSync: true });
  }

  addToSyncQueue(type: SyncAction['type'], table: string, data: any): void {
    const action: SyncAction = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      table,
      data,
      timestamp: Date.now(),
      retries: 0,
    };
    
    SyncStorageService.addToSyncQueue(action);
    console.log('Acción agregada a cola de sincronización:', action);
  }

  destroy(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
    console.log('Servicio de sincronización destruido');
  }
}

export const syncService = new SyncService(); 