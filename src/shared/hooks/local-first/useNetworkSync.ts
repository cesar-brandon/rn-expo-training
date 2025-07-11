import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { syncService } from '../../services/sync';
import { useNetworkStore, useSyncStore } from '../../stores';

interface NetworkSyncConfig {
  syncOnReconnect?: boolean;
  syncOnlyOnWifi?: boolean;
  adaptiveSync?: boolean;
  minSyncInterval?: number;
  maxSyncInterval?: number;
}

interface NetworkSyncState {
  connectionType: string | null;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  isOptimalForSync: boolean;
  adaptiveSyncInterval: number;
  dataUsage: {
    sent: number;
    received: number;
    session: number;
  };
}

/**
 * Hook para sincronización inteligente basada en el estado de la red
 * Adapta la estrategia de sincronización según la calidad de conexión
 */
export function useNetworkSync(config: NetworkSyncConfig = {}) {
  const queryClient = useQueryClient();
  const networkStore = useNetworkStore();
  const syncStore = useSyncStore();

  const {
    syncOnReconnect = true,
    syncOnlyOnWifi = false,
    adaptiveSync = true,
    minSyncInterval = 30000, // 30 segundos
    maxSyncInterval = 300000, // 5 minutos
  } = config;

  const [state, setState] = useState<NetworkSyncState>({
    connectionType: null,
    connectionQuality: 'offline',
    isOptimalForSync: false,
    adaptiveSyncInterval: minSyncInterval,
    dataUsage: {
      sent: 0,
      received: 0,
      session: 0,
    },
  });

  /**
   * Evalúa la calidad de conexión basándose en métricas
   */
  const evaluateConnectionQuality = useCallback(() => {
    if (!networkStore.isOnline()) {
      return 'offline' as const;
    }

    const stats = networkStore.getConnectionStats();
    const recentDisconnections = stats.disconnections;
    const avgConnectionDuration = stats.averageConnectionDuration;

    // Lógica simple para evaluar calidad
    if (recentDisconnections === 0 && avgConnectionDuration > 60000) {
      return 'excellent' as const;
    } else if (recentDisconnections <= 2 && avgConnectionDuration > 30000) {
      return 'good' as const;
    } else if (networkStore.networkState.isConnected) {
      return 'poor' as const;
    } else {
      return 'offline' as const;
    }
  }, [networkStore]);

  /**
   * Calcula el intervalo de sincronización adaptativo
   */
  const calculateAdaptiveSyncInterval = useCallback(() => {
    const quality = evaluateConnectionQuality();
    const baseInterval = minSyncInterval;

    switch (quality) {
      case 'excellent':
        return baseInterval;
      case 'good':
        return baseInterval * 2;
      case 'poor':
        return Math.min(baseInterval * 4, maxSyncInterval);
      case 'offline':
      default:
        return maxSyncInterval;
    }
  }, [evaluateConnectionQuality, minSyncInterval, maxSyncInterval]);

  /**
   * Verifica si las condiciones son óptimas para sincronizar
   */
  const isOptimalForSync = useCallback(() => {
    const connectionType = networkStore.networkState.type;
    const quality = evaluateConnectionQuality();

    // Si solo queremos sincronizar en WiFi
    if (syncOnlyOnWifi && connectionType !== 'wifi') {
      return false;
    }

    // Solo sincronizar con conexión buena o excelente
    return quality === 'excellent' || quality === 'good';
  }, [networkStore.networkState.type, evaluateConnectionQuality, syncOnlyOnWifi]);

  /**
   * Sincronización inteligente que adapta la estrategia según la red
   */
  const intelligentSyncMutation = useMutation({
    mutationFn: async (options: { 
      priority?: 'high' | 'normal' | 'low';
      batchSize?: number;
    } = {}) => {
      const { priority = 'normal', batchSize } = options;
      
      if (!isOptimalForSync() && priority !== 'high') {
        throw new Error('Condiciones de red no óptimas para sincronización');
      }

      // Ajustar comportamiento según la calidad de conexión
      const quality = evaluateConnectionQuality();
      const syncOptions = {
        timeout: quality === 'poor' ? 30000 : 15000,
        retryAttempts: quality === 'poor' ? 1 : 3,
        batchSize: batchSize || (quality === 'poor' ? 5 : 20),
      };

      console.log(`🌐 Iniciando sincronización inteligente (${quality})`, syncOptions);
      
      // Registrar inicio de transferencia de datos
      const startTime = Date.now();
      
      const success = await syncService.syncPendingChanges(syncOptions);
      
      // Simular medición de datos transferidos
      const duration = Date.now() - startTime;
      const estimatedData = syncStore.queue.length * 1024; // 1KB por acción aproximadamente
      
      setState(prev => ({
        ...prev,
        dataUsage: {
          ...prev.dataUsage,
          sent: prev.dataUsage.sent + estimatedData / 2,
          received: prev.dataUsage.received + estimatedData / 2,
          session: prev.dataUsage.session + estimatedData,
        },
      }));

      if (!success) {
        throw new Error('Sincronización falló');
      }

      return { success, duration, dataTransferred: estimatedData };
    },
    onSuccess: (result) => {
      console.log('✅ Sincronización inteligente completada:', result);
      queryClient.invalidateQueries();
    },
    onError: (error) => {
      console.error('❌ Error en sincronización inteligente:', error);
    },
  });

  /**
   * Programa sincronización automática basada en condiciones de red
   */
  const scheduleAdaptiveSync = useCallback(() => {
    if (!adaptiveSync) return;

    const interval = calculateAdaptiveSyncInterval();
    const quality = evaluateConnectionQuality();

    setState(prev => ({
      ...prev,
      adaptiveSyncInterval: interval,
    }));

    // Solo programar si hay cambios pendientes y condiciones son buenas
    const hasPendingChanges = syncStore.queue.length > 0;
    if (hasPendingChanges && (quality === 'excellent' || quality === 'good')) {
      setTimeout(() => {
        if (networkStore.isOnline() && !syncStore.status.is_syncing) {
          intelligentSyncMutation.mutate({ priority: 'normal' });
        }
      }, interval);
    }
  }, [
    adaptiveSync,
    calculateAdaptiveSyncInterval,
    evaluateConnectionQuality,
    syncStore.queue.length,
    syncStore.status.is_syncing,
    networkStore,
    intelligentSyncMutation,
  ]);

  /**
   * Fuerza sincronización inmediata independiente de condiciones
   */
  const forceSyncNow = useCallback((priority: 'high' | 'normal' | 'low' = 'high') => {
    return intelligentSyncMutation.mutateAsync({ priority });
  }, [intelligentSyncMutation]);

  /**
   * Pausa temporalmente la sincronización automática
   */
  const pauseAutoSync = useCallback((durationMs: number = 300000) => {
    // Implementar lógica para pausar auto-sync temporalmente
    console.log(`⏸️ Auto-sync pausado por ${durationMs}ms`);
    // En una implementación real, esto se manejaría con el syncService
  }, []);

  // Efecto para actualizar estado de red
  useEffect(() => {
    const connectionType = networkStore.networkState.type;
    const quality = evaluateConnectionQuality();
    const isOptimal = isOptimalForSync();

    setState(prev => ({
      ...prev,
      connectionType,
      connectionQuality: quality,
      isOptimalForSync: isOptimal,
    }));
  }, [networkStore.networkState, evaluateConnectionQuality, isOptimalForSync]);

  // Efecto para sincronización en reconexión
  useEffect(() => {
    const wasOffline = !networkStore.networkState.isConnected;
    const isNowOnline = networkStore.isOnline();

    if (syncOnReconnect && wasOffline && isNowOnline && syncStore.queue.length > 0) {
      console.log('🔄 Reconectado, iniciando sincronización automática...');
      
      // Esperar un poco antes de sincronizar para que la conexión se estabilice
      setTimeout(() => {
        if (isOptimalForSync()) {
          intelligentSyncMutation.mutate({ priority: 'normal' });
        }
      }, 2000);
    }
  }, [
    networkStore.networkState.isConnected,
    networkStore.isOnline(),
    syncOnReconnect,
    syncStore.queue.length,
    isOptimalForSync,
    intelligentSyncMutation,
  ]);

  // Efecto para sincronización adaptativa
  useEffect(() => {
    if (adaptiveSync && state.isOptimalForSync) {
      scheduleAdaptiveSync();
    }
  }, [adaptiveSync, state.isOptimalForSync, scheduleAdaptiveSync]);

  /**
   * Obtiene recomendaciones de sincronización
   */
  const getSyncRecommendations = useCallback(() => {
    const quality = state.connectionQuality;
    const pendingCount = syncStore.queue.length;
    const connectionType = state.connectionType;

    const recommendations = [];

    if (quality === 'offline') {
      recommendations.push('Sin conexión. Los cambios se sincronizarán cuando se recupere la conexión.');
    } else if (quality === 'poor') {
      recommendations.push('Conexión inestable. Considera esperar a una mejor conexión para sincronizar.');
    }

    if (syncOnlyOnWifi && connectionType !== 'wifi') {
      recommendations.push('Configurado para sincronizar solo en WiFi. Conéctate a WiFi para sincronizar.');
    }

    if (pendingCount > 50) {
      recommendations.push(`Muchos cambios pendientes (${pendingCount}). Considera sincronizar pronto.`);
    }

    if (state.dataUsage.session > 10 * 1024 * 1024) { // 10MB
      recommendations.push('Alto uso de datos en esta sesión. Revisa tu configuración de sincronización.');
    }

    return recommendations;
  }, [
    state.connectionQuality,
    state.connectionType,
    state.dataUsage.session,
    syncStore.queue.length,
    syncOnlyOnWifi,
  ]);

  return {
    // Estado
    ...state,
    
    // Acciones
    syncNow: forceSyncNow,
    pauseAutoSync,
    
    // Estado de mutación
    isSyncing: intelligentSyncMutation.isPending,
    syncError: intelligentSyncMutation.error,
    
    // Utilidades
    getSyncRecommendations,
    isOptimalForSync,
    
    // Configuración
    config: {
      syncOnReconnect,
      syncOnlyOnWifi,
      adaptiveSync,
      minSyncInterval,
      maxSyncInterval,
    },
    
    // Métricas detalladas
    metrics: {
      queueLength: syncStore.queue.length,
      lastSyncTime: syncStore.status.last_sync_time,
      connectionUptime: networkStore.getConnectionStats().uptime,
      disconnectionCount: networkStore.getConnectionStats().disconnections,
    },
  };
}