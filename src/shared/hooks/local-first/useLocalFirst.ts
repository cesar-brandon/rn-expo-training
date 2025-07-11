import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { migrator } from '../../../database/migrator';
import { dbService } from '../../services/database';
import { networkService } from '../../services/network';
import { syncService } from '../../services/sync';
import { useAppStore, useNetworkStore, useSyncStore } from '../../stores';

interface LocalFirstConfig {
  enableAutoSync?: boolean;
  syncInterval?: number;
  enableOfflineMode?: boolean;
  enableOptimisticUpdates?: boolean;
}

interface LocalFirstState {
  isInitialized: boolean;
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;
  pendingChanges: number;
  hasError: boolean;
  error: string | null;
}

/**
 * Hook principal para manejo de funcionalidad local-first
 * Integra base de datos local, sincronización y manejo de estados offline
 */
export function useLocalFirst(config: LocalFirstConfig = {}) {
  const queryClient = useQueryClient();
  const networkStore = useNetworkStore();
  const syncStore = useSyncStore();
  const appStore = useAppStore();

  const [state, setState] = useState<LocalFirstState>({
    isInitialized: false,
    isOnline: false,
    isSyncing: false,
    lastSyncTime: null,
    pendingChanges: 0,
    hasError: false,
    error: null,
  });

  // Configuración por defecto
  const {
    enableAutoSync = true,
    syncInterval = 5 * 60 * 1000, // 5 minutos
    enableOfflineMode = true,
    enableOptimisticUpdates = true,
  } = config;

  /**
   * Inicializa toda la infraestructura local-first
   */
  const initializeLocalFirst = useCallback(async () => {
    try {
      appStore.setLoading(true);
      console.log('🚀 Inicializando arquitectura local-first...');

      // 1. Inicializar base de datos
      await dbService.init();
      console.log('✅ Base de datos inicializada');

      // 2. Ejecutar migraciones
      await migrator.init(dbService.getDatabase());
      await migrator.migrate();
      console.log('✅ Migraciones ejecutadas');

      // 3. Inicializar servicios de red y sincronización
      await networkService.init();
      await syncService.init();
      console.log('✅ Servicios de red y sincronización inicializados');

      // 4. Actualizar estado
      setState(prev => ({
        ...prev,
        isInitialized: true,
        hasError: false,
        error: null,
      }));

      appStore.setInitialized(true);
      console.log('🎉 Arquitectura local-first inicializada correctamente');

    } catch (error) {
      console.error('❌ Error inicializando local-first:', error);
      setState(prev => ({
        ...prev,
        hasError: true,
        error: error instanceof Error ? error.message : 'Error desconocido',
      }));
    } finally {
      appStore.setLoading(false);
    }
  }, [appStore]);

  /**
   * Fuerza una sincronización completa
   */
  const forceSyncMutation = useMutation({
    mutationFn: async () => {
      const success = await syncService.forcSync();
      if (!success) {
        throw new Error('Error durante la sincronización');
      }
      return success;
    },
    onSuccess: () => {
      // Invalidar todas las queries para refrescar datos
      queryClient.invalidateQueries();
      appStore.addNotification({
        type: 'success',
        title: 'Sincronización completada',
        message: 'Todos los datos han sido sincronizados correctamente',
        read: false,
      });
    },
    onError: (error) => {
      appStore.addNotification({
        type: 'error',
        title: 'Error en sincronización',
        message: error instanceof Error ? error.message : 'Error desconocido',
        read: false,
      });
    },
  });

  /**
   * Reset completo de la aplicación
   */
  const resetAppMutation = useMutation({
    mutationFn: async () => {
      await dbService.clearAll();
      queryClient.clear();
      appStore.reset();
      syncStore.reset();
      networkStore.reset();
    },
    onSuccess: () => {
      appStore.addNotification({
        type: 'info',
        title: 'Aplicación reiniciada',
        message: 'Todos los datos locales han sido limpiados',
        read: false,
      });
    },
  });

  // Efecto para sincronizar estado con stores
  useEffect(() => {
    setState(prev => ({
      ...prev,
      isOnline: networkStore.isOnline(),
      isSyncing: syncStore.status.is_syncing,
      lastSyncTime: syncStore.status.last_sync_time,
      pendingChanges: syncStore.status.pending_actions,
    }));
  }, [
    networkStore.networkState,
    syncStore.status.is_syncing,
    syncStore.status.last_sync_time,
    syncStore.status.pending_actions,
  ]);

  // Efecto para inicialización automática
  useEffect(() => {
    if (!state.isInitialized && !appStore.isLoading) {
      initializeLocalFirst();
    }
  }, [state.isInitialized, appStore.isLoading, initializeLocalFirst]);

  // Efecto para configurar auto-sync
  useEffect(() => {
    if (enableAutoSync && state.isInitialized) {
      syncStore.setAutoSync(true);
      syncStore.setSyncInterval(syncInterval);
    }
  }, [enableAutoSync, syncInterval, state.isInitialized, syncStore]);

  // Efecto para manejar cambios de conectividad
  useEffect(() => {
    if (state.isOnline && state.pendingChanges > 0) {
      // Sincronizar automáticamente cuando se recupere la conexión
      console.log('🔄 Conexión recuperada, sincronizando cambios pendientes...');
      forceSyncMutation.mutate();
    }
  }, [state.isOnline, state.pendingChanges, forceSyncMutation]);

  /**
   * Obtiene estadísticas de la aplicación
   */
  const getAppStats = useCallback(async () => {
    if (!state.isInitialized) return null;

    try {
      const [users, todos] = await Promise.all([
        dbService.getAllUsers(),
        dbService.getAllTodos(),
      ]);

      const queueStats = syncStore.getQueueStats();
      
      return {
        totalUsers: users.length,
        totalTodos: todos.length,
        unsynced: queueStats.pending + queueStats.retrying,
        failed: queueStats.failed,
        lastSyncTime: state.lastSyncTime,
        connectionStats: networkStore.getConnectionStats(),
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      return null;
    }
  }, [state.isInitialized, state.lastSyncTime, syncStore, networkStore]);

  /**
   * Query para estadísticas de la app
   */
  const { data: appStats } = useQuery({
    queryKey: ['app-stats'],
    queryFn: getAppStats,
    enabled: state.isInitialized,
    refetchInterval: 30000, // Refrescar cada 30 segundos
  });

  /**
   * Verifica si la app está funcionando en modo offline
   */
  const isOfflineMode = useCallback(() => {
    return !state.isOnline || appStore.config.offline_mode;
  }, [state.isOnline, appStore.config.offline_mode]);

  /**
   * Verifica si las actualizaciones optimistas están habilitadas
   */
  const canUseOptimisticUpdates = useCallback(() => {
    return enableOptimisticUpdates && state.isInitialized;
  }, [enableOptimisticUpdates, state.isInitialized]);

  return {
    // Estado
    ...state,
    appStats,
    
    // Configuración
    config: {
      enableAutoSync,
      syncInterval,
      enableOfflineMode,
      enableOptimisticUpdates,
    },
    
    // Acciones
    initialize: initializeLocalFirst,
    forceSync: forceSyncMutation.mutate,
    resetApp: resetAppMutation.mutate,
    
    // Estado de mutaciones
    isForcesyncing: forceSyncMutation.isPending,
    isResetting: resetAppMutation.isPending,
    
    // Utilidades
    isOfflineMode,
    canUseOptimisticUpdates,
    getAppStats,
    
    // Stores (para acceso directo si es necesario)
    stores: {
      network: networkStore,
      sync: syncStore,
      app: appStore,
    },
  };
}