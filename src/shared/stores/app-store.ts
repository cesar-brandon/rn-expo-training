import { MMKV } from 'react-native-mmkv';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { AppConfig, NotificationData } from '../types/entities/database';

// Storage instance para el store de app
const appStorage = new MMKV({
  id: 'app-store',
  encryptionKey: 'app-store-key-change-in-production',
});

// Zustand storage adapter para MMKV
const mmkvStorage = {
  getItem: (name: string) => {
    const value = appStorage.getString(name);
    return value ? JSON.parse(value) : null;
  },
  setItem: (name: string, value: string) => {
    appStorage.set(name, value);
  },
  removeItem: (name: string) => {
    appStorage.delete(name);
  },
};

interface AppState {
  // Configuración de la app
  config: AppConfig;
  
  // Estado de carga global
  isInitialized: boolean;
  isLoading: boolean;
  
  // Notificaciones
  notifications: NotificationData[];
  unreadNotifications: number;
  
  // Tema y UI
  isDarkMode: boolean;
  keyboardHeight: number;
  
  // Acciones
  setConfig: (config: Partial<AppConfig>) => void;
  setInitialized: (initialized: boolean) => void;
  setLoading: (loading: boolean) => void;
  addNotification: (notification: Omit<NotificationData, 'id' | 'timestamp'>) => void;
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;
  setDarkMode: (isDark: boolean) => void;
  setKeyboardHeight: (height: number) => void;
  
  // Acciones de reset
  reset: () => void;
}

const defaultConfig: AppConfig = {
  theme: 'system',
  language: 'es',
  notifications_enabled: true,
  sync_enabled: true,
  offline_mode: false,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      config: defaultConfig,
      isInitialized: false,
      isLoading: false,
      notifications: [],
      unreadNotifications: 0,
      isDarkMode: false,
      keyboardHeight: 0,

      // Acciones de configuración
      setConfig: (newConfig) =>
        set((state) => ({
          config: { ...state.config, ...newConfig },
        })),

      setInitialized: (initialized) => set({ isInitialized: initialized }),
      setLoading: (loading) => set({ isLoading: loading }),

      // Acciones de notificaciones
      addNotification: (notificationData) => {
        const notification: NotificationData = {
          ...notificationData,
          id: Math.random().toString(36).substr(2, 9),
          timestamp: Date.now(),
          read: false,
        };
        
        set((state) => ({
          notifications: [notification, ...state.notifications],
          unreadNotifications: state.unreadNotifications + 1,
        }));
      },

      markNotificationAsRead: (id) =>
        set((state) => {
          const notification = state.notifications.find(n => n.id === id);
          if (notification && !notification.read) {
            return {
              notifications: state.notifications.map(n =>
                n.id === id ? { ...n, read: true } : n
              ),
              unreadNotifications: Math.max(0, state.unreadNotifications - 1),
            };
          }
          return state;
        }),

      clearNotifications: () =>
        set({
          notifications: [],
          unreadNotifications: 0,
        }),

      // Acciones de UI
      setDarkMode: (isDark) => set({ isDarkMode: isDark }),
      setKeyboardHeight: (height) => set({ keyboardHeight: height }),

      // Reset
      reset: () =>
        set({
          config: defaultConfig,
          isInitialized: false,
          isLoading: false,
          notifications: [],
          unreadNotifications: 0,
          isDarkMode: false,
          keyboardHeight: 0,
        }),
    }),
    {
      name: 'app-store',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        config: state.config,
        isDarkMode: state.isDarkMode,
        notifications: state.notifications,
        unreadNotifications: state.unreadNotifications,
      }),
    }
  )
);