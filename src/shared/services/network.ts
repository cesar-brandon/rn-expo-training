import NetInfo, { NetInfoState, NetInfoSubscription } from '@react-native-community/netinfo';

export type NetworkConnectionType = 'wifi' | 'cellular' | 'bluetooth' | 'ethernet' | 'other' | 'unknown' | 'none';
export type NetworkQuality = 'excellent' | 'good' | 'poor' | 'offline';

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: NetworkConnectionType;
  quality: NetworkQuality;
  isMetered?: boolean;
  details?: any;
}

export interface NetworkStats {
  uptime: number;
  downtime: number;
  reconnections: number;
  lastConnectedAt: number | null;
  lastDisconnectedAt: number | null;
}

class NetworkService {
  private isInitialized = false;
  private currentState: NetworkState = {
    isConnected: false,
    isInternetReachable: null,
    type: 'unknown',
    quality: 'offline',
  };
  
  private stats: NetworkStats = {
    uptime: 0,
    downtime: 0,
    reconnections: 0,
    lastConnectedAt: null,
    lastDisconnectedAt: null,
  };
  
  private subscribers = new Set<(state: NetworkState) => void>();
  private unsubscribeNetInfo: NetInfoSubscription | null = null;
  private statsInterval: number | null = null;
  
  async init(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Obtener estado inicial
      const initialState = await NetInfo.fetch();
      this.updateState(initialState);
      
      // Suscribirse a cambios
      this.unsubscribeNetInfo = NetInfo.addEventListener(this.updateState.bind(this));
      
      // Iniciar seguimiento de estadísticas
      this.startStatsTracking();
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing NetworkService:', error);
    }
  }
  
  private updateState(netInfoState: NetInfoState): void {
    const wasConnected = this.currentState.isConnected;
    
    const newState: NetworkState = {
      isConnected: netInfoState.isConnected ?? false,
      isInternetReachable: netInfoState.isInternetReachable,
      type: this.mapConnectionType(netInfoState.type),
      quality: this.calculateQuality(netInfoState),
      isMetered: (netInfoState as any).isConnectionExpensive ?? false,
      details: netInfoState.details,
    };
    
    // Actualizar estadísticas de conexión
    this.updateConnectionStats(wasConnected, newState.isConnected);
    
    this.currentState = newState;
    
    // Notificar a suscriptores
    this.notifySubscribers();
  }
  
  private mapConnectionType(type: string): NetworkConnectionType {
    switch (type) {
      case 'wifi': return 'wifi';
      case 'cellular': return 'cellular';
      case 'bluetooth': return 'bluetooth';
      case 'ethernet': return 'ethernet';
      case 'other': return 'other';
      case 'none': return 'none';
      default: return 'unknown';
    }
  }
  
  private calculateQuality(state: NetInfoState): NetworkQuality {
    if (!state.isConnected) return 'offline';
    
    const details = state.details as any;
    
    // Para WiFi, usar la fuerza de la señal si está disponible
    if (state.type === 'wifi' && details?.strength !== undefined) {
      if (details.strength > 70) return 'excellent';
      if (details.strength > 40) return 'good';
      return 'poor';
    }
    
    // Para cellular, usar información de generación si está disponible
    if (state.type === 'cellular' && details?.cellularGeneration) {
      if (details.cellularGeneration === '5g') return 'excellent';
      if (details.cellularGeneration === '4g') return 'good';
      return 'poor';
    }
    
    // Por defecto, asumir buena calidad si está conectado
    return state.isInternetReachable ? 'good' : 'poor';
  }
  
  private updateConnectionStats(wasConnected: boolean, isConnected: boolean): void {
    const now = Date.now();
    
    if (!wasConnected && isConnected) {
      // Se conectó
      this.stats.reconnections++;
      this.stats.lastConnectedAt = now;
    } else if (wasConnected && !isConnected) {
      // Se desconectó
      this.stats.lastDisconnectedAt = now;
    }
  }
  
  private startStatsTracking(): void {
    this.statsInterval = setInterval(() => {
      if (this.currentState.isConnected) {
        this.stats.uptime += 1000; // Incrementar en 1 segundo
      } else {
        this.stats.downtime += 1000;
      }
    }, 1000);
  }
  
  private notifySubscribers(): void {
    this.subscribers.forEach(callback => {
      try {
        callback(this.currentState);
      } catch (error) {
        console.error('Error notifying network subscriber:', error);
      }
    });
  }
  
  // Métodos públicos
  isConnected(): boolean {
    return this.currentState.isConnected;
  }
  
  hasInternetAccess(): boolean {
    return this.currentState.isInternetReachable === true;
  }
  
  getConnectionType(): NetworkConnectionType {
    return this.currentState.type;
  }
  
  getConnectionQuality(): NetworkQuality {
    return this.currentState.quality;
  }
  
  getNetworkState(): NetworkState {
    return { ...this.currentState };
  }
  
  getConnectionStats(): NetworkStats {
    return { ...this.stats };
  }
  
  isMetered(): boolean {
    return this.currentState.isMetered === true;
  }
  
  isOptimalForSync(): boolean {
    return this.hasInternetAccess() && 
           this.currentState.quality !== 'poor' &&
           (this.currentState.type === 'wifi' || !this.isMetered());
  }
  
  subscribe(callback: (state: NetworkState) => void): () => void {
    this.subscribers.add(callback);
    
    // Enviar estado actual inmediatamente
    callback(this.currentState);
    
    // Retornar función de desuscripción
    return () => {
      this.subscribers.delete(callback);
    };
  }
  
  getRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (!this.isConnected()) {
      recommendations.push('Sin conexión a internet');
      return recommendations;
    }
    
    if (this.currentState.quality === 'poor') {
      recommendations.push('Conexión lenta - considera esperar a mejor señal');
    }
    
    if (this.isMetered() && this.currentState.type === 'cellular') {
      recommendations.push('Usando datos móviles - sincronización limitada');
    }
    
    if (this.currentState.type === 'wifi' && this.currentState.quality === 'excellent') {
      recommendations.push('Conexión WiFi excelente - ideal para sincronización');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Conexión estable');
    }
    
    return recommendations;
  }
  
  async refresh(): Promise<NetworkState> {
    try {
      const state = await NetInfo.fetch();
      this.updateState(state);
      return this.currentState;
    } catch (error) {
      console.error('Error refreshing network state:', error);
      return this.currentState;
    }
  }
  
  destroy(): void {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
      this.unsubscribeNetInfo = null;
    }
    
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
    
    this.subscribers.clear();
    this.isInitialized = false;
  }
}

// Singleton instance
export const networkService = new NetworkService();

// Auto-initialize
networkService.init().catch(console.error);

export default networkService; 