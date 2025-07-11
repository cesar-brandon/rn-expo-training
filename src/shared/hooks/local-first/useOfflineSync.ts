import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { syncService } from '../../services/sync';
import { useNetworkStore, useSyncStore } from '../../stores';

interface OfflineSyncConfig {
  autoRetry?: boolean;
  retryInterval?: number;
  maxRetries?: number;
  enableBatchSync?: boolean;
}

interface OfflineSyncState {
  isOffline: boolean;
  hasPendingChanges: boolean;
  syncProgress: number;
  lastSyncAttempt: number | null;
  nextRetry: number | null;
  errorCount: number;
}

/**
 * Hook para manejo de sincronización offline
 * Detecta cuando la app está offline y maneja la sincronización automática
 */
export function useOfflineSync(config: OfflineSyncConfig = {}) {
  const queryClient = useQueryClient();
  const networkStore = useNetworkStore();
  const syncStore = useSyncStore();

  const {
    autoRetry = true,
    retryInterval = 30000, // 30 segundos
    maxRetries = 5,
    enableBatchSync = true,
  } = config;

  const [state, setState] = useState<OfflineSyncState>({
    isOffline: false,
    hasPendingChanges: false,
    syncProgress: 0,
    lastSyncAttempt: null,
    nextRetry: null,
    errorCount: 0,
  });

  /**
   * Verifica si hay cambios pendientes de sincronizar
   */
  const checkPendingChanges = useCallback(() => {
    const queueStats = syncStore.getQueueStats();
    return queueStats.total > 0;
  }, [syncStore]);

  /**
   * Intenta sincronizar todos los cambios pendientes
   */
  const syncPendingChanges = useCallback(async () => {
    if (!networkStore.isOnline()) {
      console.log('📴 Sin conexión, no se puede sincronizar');
      return false;
    }

    setState(prev => ({
      ...prev,
      lastSyncAttempt: Date.now(),
      syncProgress: 0,
    }));

    try {
      const success = await syncService.syncPendingChanges();
      
      if (success) {
        setState(prev => ({
          ...prev,
          errorCount: 0,
          nextRetry: null,
          syncProgress: 100,
        }));
        
        // Invalidar queries para refrescar datos
        queryClient.invalidateQueries();
        console.log('✅ Sincronización offline completada');
        return true;
      } else {
        throw new Error('Sincronización falló');
      }
    } catch (error) {
      console.error('❌ Error en sincronización offline:', error);
      
      setState(prev => {
        const newErrorCount = prev.errorCount + 1;
        const shouldRetry = autoRetry && newErrorCount < maxRetries;
        
        return {
          ...prev,
          errorCount: newErrorCount,
          nextRetry: shouldRetry ? Date.now() + retryInterval : null,
          syncProgress: 0,
        };
      });
      
      return false;
    }
  }, [
    networkStore,
    syncService,
    queryClient,
    autoRetry,
    maxRetries,
    retryInterval,
  ]);

  /**
   * Programa un reintento de sincronización
   */
  const scheduleRetry = useCallback(() => {
    if (!autoRetry || state.errorCount >= maxRetries) {
      return;
    }

    const timeUntilRetry = retryInterval * Math.pow(2, state.errorCount); // Backoff exponencial
    const retryTime = Date.now() + timeUntilRetry;

    setState(prev => ({
      ...prev,
      nextRetry: retryTime,
    }));

    setTimeout(() => {
      if (networkStore.isOnline() && checkPendingChanges()) {
        console.log('🔄 Reintentando sincronización offline...');
        syncPendingChanges();
      }
    }, timeUntilRetry);
  }, [
    autoRetry,
    state.errorCount,
    maxRetries,
    retryInterval,
    networkStore,
    checkPendingChanges,
    syncPendingChanges,
  ]);

  /**
   * Fuerza una sincronización inmediata
   */
  const forceSync = useCallback(async () => {
    setState(prev => ({
      ...prev,
      errorCount: 0,
      nextRetry: null,
    }));
    
    return await syncPendingChanges();
  }, [syncPendingChanges]);

  /**
   * Limpia todos los cambios pendientes (usar con cuidado)
   */
  const clearPendingChanges = useCallback(() => {
    syncStore.clearQueue();
    setState(prev => ({
      ...prev,
      hasPendingChanges: false,
      errorCount: 0,
      nextRetry: null,
      syncProgress: 0,
    }));
  }, [syncStore]);

  // Efecto para detectar cambios de conectividad
  useEffect(() => {
    const isOffline = !networkStore.isOnline();
    const hasPending = checkPendingChanges();

    setState(prev => ({
      ...prev,
      isOffline,
      hasPendingChanges: hasPending,
    }));

    // Si se recuperó la conexión y hay cambios pendientes, sincronizar
    if (!isOffline && hasPending && state.isOffline) {
      console.log('🌐 Conexión recuperada, iniciando sincronización...');
      syncPendingChanges();
    }
  }, [networkStore.networkState, syncStore.queue]);

  // Efecto para manejar reintentos
  useEffect(() => {
    if (state.nextRetry && Date.now() >= state.nextRetry) {
      scheduleRetry();
    }
  }, [state.nextRetry, scheduleRetry]);

  /**
   * Query para monitorear el estado de sincronización
   */
  const { data: syncStats } = useQuery({
    queryKey: ['offline-sync-stats'],
    queryFn: () => ({
      queueStats: syncStore.getQueueStats(),
      connectionStats: networkStore.getConnectionStats(),
      lastSyncTime: syncStore.status.last_sync_time,
    }),
    refetchInterval: 5000, // Refrescar cada 5 segundos
  });

  /**
   * Calcula el tiempo hasta el próximo reintento
   */
  const getTimeUntilNextRetry = useCallback(() => {
    if (!state.nextRetry) return null;
    return Math.max(0, state.nextRetry - Date.now());
  }, [state.nextRetry]);

  /**
   * Verifica si puede realizar una sincronización
   */
  const canSync = useCallback(() => {
    return networkStore.isOnline() && 
           !syncStore.status.is_syncing && 
           state.errorCount < maxRetries;
  }, [networkStore, syncStore.status.is_syncing, state.errorCount, maxRetries]);

  return {
    // Estado
    ...state,
    syncStats,
    
    // Acciones
    syncPendingChanges,
    forceSync,
    clearPendingChanges,
    
    // Utilidades
    canSync,
    getTimeUntilNextRetry,
    checkPendingChanges,
    
    // Configuración
    config: {
      autoRetry,
      retryInterval,
      maxRetries,
      enableBatchSync,
    },
    
    // Estado de sincronización detallado
    syncDetails: {
      isPending: syncStore.status.is_syncing,
      queueLength: syncStore.queue.length,
      failedActions: syncStore.getFailedActions().length,
      lastError: syncStore.status.last_error,
    },
  };
}