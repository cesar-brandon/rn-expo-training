import * as Network from 'expo-network';
import { NetworkState } from '../types/database';
import { StorageService } from './storage';

type NetworkListener = (state: NetworkState) => void;

class NetworkService {
  private listeners: NetworkListener[] = [];
  private currentState: NetworkState = {
    isConnected: false,
    isInternetReachable: null,
    type: null,
  };

  async init(): Promise<void> {
    // Obtener estado inicial
    await this.updateNetworkState();
    
    // Monitorear cambios de conectividad
    this.startMonitoring();
    
    console.log('Servicio de red inicializado');
  }

  private async updateNetworkState(): Promise<void> {
    try {
      const networkState = await Network.getNetworkStateAsync();
      
      this.currentState = {
        isConnected: networkState.isConnected || false,
        isInternetReachable: networkState.isInternetReachable ?? null,
        type: networkState.type || null,
      };

      // Guardar estado en storage
      StorageService.setNetworkState(this.currentState.isConnected);
      
      // Notificar a todos los listeners
      this.notifyListeners();
      
    } catch (error) {
      console.error('Error actualizando estado de red:', error);
    }
  }

  private startMonitoring(): void {
    // Verificar conectividad cada 30 segundos
    setInterval(() => {
      this.updateNetworkState();
    }, 30000);

    // También verificar cuando la app se enfoca
    // (Esto se puede mover al App.tsx si prefieres)
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentState);
      } catch (error) {
        console.error('Error notificando listener de red:', error);
      }
    });
  }

  // Suscribirse a cambios de conectividad
  subscribe(listener: NetworkListener): () => void {
    this.listeners.push(listener);
    
    // Enviar estado actual inmediatamente
    listener(this.currentState);
    
    // Retornar función para desuscribirse
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Obtener estado actual
  getState(): NetworkState {
    return { ...this.currentState };
  }

  // Verificar si está conectado
  isConnected(): boolean {
    return this.currentState.isConnected;
  }

  // Verificar si tiene acceso a internet
  hasInternetAccess(): boolean {
    return this.currentState.isConnected && this.currentState.isInternetReachable === true;
  }

  // Verificar tipo de conexión
  getConnectionType(): string | null {
    return this.currentState.type;
  }

  // Forzar actualización del estado
  async refresh(): Promise<NetworkState> {
    await this.updateNetworkState();
    return this.getState();
  }

  // Verificar conectividad específica a una URL
  async checkConnectivity(url: string = 'https://www.google.com'): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos timeout

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.log('Error verificando conectividad:', error);
      return false;
    }
  }

  // Esperar a que haya conectividad
  async waitForConnection(timeout: number = 30000): Promise<boolean> {
    if (this.hasInternetAccess()) {
      return true;
    }

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        unsubscribe();
        resolve(false);
      }, timeout);

      const unsubscribe = this.subscribe((state) => {
        if (state.isConnected && state.isInternetReachable) {
          clearTimeout(timeoutId);
          unsubscribe();
          resolve(true);
        }
      });
    });
  }
}

// Singleton para el servicio de red
export const networkService = new NetworkService(); 