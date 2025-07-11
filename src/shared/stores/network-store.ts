import { create } from 'zustand';
import type { NetworkState } from '../types/entities/database';

interface NetworkStoreState {
  // Estado de red
  networkState: NetworkState;
  
  // Histórico de conectividad
  connectionHistory: Array<{
    timestamp: number;
    connected: boolean;
    type: string | null;
  }>;
  
  // Estadísticas
  totalDisconnections: number;
  lastDisconnectionTime: number | null;
  totalConnectedTime: number;
  sessionStartTime: number;
  
  // Acciones
  setNetworkState: (state: NetworkState) => void;
  addConnectionEvent: (connected: boolean, type: string | null) => void;
  
  // Utilidades
  isOffline: () => boolean;
  isOnline: () => boolean;
  hasStableConnection: () => boolean;
  getConnectionDuration: () => number;
  getDisconnectionDuration: () => number;
  
  // Estadísticas
  getConnectionStats: () => {
    uptime: number;
    downtime: number;
    disconnections: number;
    averageConnectionDuration: number;
    currentConnectionDuration: number;
  };
  
  // Reset
  reset: () => void;
}

const defaultNetworkState: NetworkState = {
  isConnected: false,
  isInternetReachable: null,
  type: null,
};

export const useNetworkStore = create<NetworkStoreState>((set, get) => ({
  // Estado inicial
  networkState: defaultNetworkState,
  connectionHistory: [],
  totalDisconnections: 0,
  lastDisconnectionTime: null,
  totalConnectedTime: 0,
  sessionStartTime: Date.now(),

  // Acciones
  setNetworkState: (newState) => {
    const currentState = get().networkState;
    const wasConnected = currentState.isConnected;
    const isNowConnected = newState.isConnected;

    set((state) => ({
      networkState: newState
    }));

    // Si cambió el estado de conexión, registrar el evento
    if (wasConnected !== isNowConnected) {
      get().addConnectionEvent(isNowConnected, newState.type);
    }
  },

  addConnectionEvent: (connected, type) => set((state) => {
    const now = Date.now();
    const newEvent = {
      timestamp: now,
      connected,
      type,
    };

    // Calcular tiempo conectado si se está desconectando
    let updatedConnectedTime = state.totalConnectedTime;
    let updatedDisconnections = state.totalDisconnections;
    let updatedLastDisconnectionTime = state.lastDisconnectionTime;

    if (!connected) {
      // Se desconectó
      updatedDisconnections += 1;
      updatedLastDisconnectionTime = now;
      
      // Calcular tiempo que estuvo conectado en esta sesión
      const lastConnectionEvent = state.connectionHistory
        .slice()
        .reverse()
        .find(event => event.connected);
      
      if (lastConnectionEvent) {
        updatedConnectedTime += now - lastConnectionEvent.timestamp;
      }
    }

    return {
      connectionHistory: [...state.connectionHistory, newEvent].slice(-100), // Mantener solo los últimos 100 eventos
      totalDisconnections: updatedDisconnections,
      lastDisconnectionTime: updatedLastDisconnectionTime,
      totalConnectedTime: updatedConnectedTime,
    };
  }),

  // Utilidades
  isOffline: () => {
    const state = get().networkState;
    return !state.isConnected || state.isInternetReachable === false;
  },

  isOnline: () => {
    const state = get().networkState;
    return state.isConnected && state.isInternetReachable !== false;
  },

  hasStableConnection: () => {
    const state = get();
    if (!state.networkState.isConnected) return false;
    
    // Considerar estable si no ha habido desconexiones en los últimos 5 minutos
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const recentDisconnections = state.connectionHistory.filter(
      event => !event.connected && event.timestamp > fiveMinutesAgo
    );
    
    return recentDisconnections.length === 0;
  },

  getConnectionDuration: () => {
    const state = get();
    if (!state.networkState.isConnected) return 0;
    
    const lastConnectionEvent = state.connectionHistory
      .slice()
      .reverse()
      .find(event => event.connected);
    
    return lastConnectionEvent ? Date.now() - lastConnectionEvent.timestamp : 0;
  },

  getDisconnectionDuration: () => {
    const state = get();
    if (state.networkState.isConnected) return 0;
    
    return state.lastDisconnectionTime 
      ? Date.now() - state.lastDisconnectionTime
      : 0;
  },

  getConnectionStats: () => {
    const state = get();
    const now = Date.now();
    const sessionDuration = now - state.sessionStartTime;
    
    let currentConnectionDuration = 0;
    if (state.networkState.isConnected) {
      currentConnectionDuration = state.getConnectionDuration();
    }
    
    const totalUptime = state.totalConnectedTime + currentConnectionDuration;
    const totalDowntime = sessionDuration - totalUptime;
    
    // Calcular duración promedio de conexión
    const connectionEvents = state.connectionHistory.filter(event => event.connected);
    const disconnectionEvents = state.connectionHistory.filter(event => !event.connected);
    
    let averageConnectionDuration = 0;
    if (disconnectionEvents.length > 0 && connectionEvents.length > 0) {
      let totalConnectionDurations = 0;
      let connectionCount = 0;
      
      for (let i = 0; i < Math.min(connectionEvents.length, disconnectionEvents.length); i++) {
        const connectTime = connectionEvents[i].timestamp;
        const disconnectTime = disconnectionEvents[i].timestamp;
        if (disconnectTime > connectTime) {
          totalConnectionDurations += disconnectTime - connectTime;
          connectionCount++;
        }
      }
      
      if (connectionCount > 0) {
        averageConnectionDuration = totalConnectionDurations / connectionCount;
      }
    }
    
    return {
      uptime: totalUptime,
      downtime: totalDowntime,
      disconnections: state.totalDisconnections,
      averageConnectionDuration,
      currentConnectionDuration,
    };
  },

  // Reset
  reset: () => set({
    networkState: defaultNetworkState,
    connectionHistory: [],
    totalDisconnections: 0,
    lastDisconnectionTime: null,
    totalConnectedTime: 0,
    sessionStartTime: Date.now(),
  }),
}));