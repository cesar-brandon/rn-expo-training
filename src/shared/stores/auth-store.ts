import { MMKV } from 'react-native-mmkv';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { AuthSession, AuthUser } from '../types/entities/database';

// Storage instance para autenticación
const authStorage = new MMKV({
  id: 'auth-store',
  encryptionKey: 'auth-store-key-change-in-production',
});

// Zustand storage adapter
const mmkvAuthStorage = {
  getItem: (name: string) => {
    const value = authStorage.getString(name);
    return value ? JSON.parse(value) : null;
  },
  setItem: (name: string, value: string) => {
    authStorage.set(name, value);
  },
  removeItem: (name: string) => {
    authStorage.delete(name);
  },
};

interface AuthState {
  // Estado de autenticación
  user: AuthUser | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Estado de registro/login
  isLoggingIn: boolean;
  isRegistering: boolean;
  loginError: string | null;
  registerError: string | null;
  
  // Acciones
  setUser: (user: AuthUser | null) => void;
  setSession: (session: AuthSession | null) => void;
  setLoading: (loading: boolean) => void;
  setLoginState: (isLogging: boolean, error?: string | null) => void;
  setRegisterState: (isRegistering: boolean, error?: string | null) => void;
  
  // Autenticación
  login: (session: AuthSession) => void;
  logout: () => void;
  updateUser: (updates: Partial<AuthUser>) => void;
  
  // Utilidades
  isSessionValid: () => boolean;
  getToken: () => string | null;
  
  // Reset
  reset: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
      isLoggingIn: false,
      isRegistering: false,
      loginError: null,
      registerError: null,

      // Setters básicos
      setUser: (user) => 
        set({ 
          user, 
          isAuthenticated: !!user 
        }),
        
      setSession: (session) => 
        set({ 
          session,
          user: session?.user || null,
          isAuthenticated: !!session?.user,
        }),
        
      setLoading: (loading) => set({ isLoading: loading }),
      
      setLoginState: (isLogging, error = null) =>
        set({ 
          isLoggingIn: isLogging, 
          loginError: error 
        }),
        
      setRegisterState: (isRegistering, error = null) =>
        set({ 
          isRegistering, 
          registerError: error 
        }),

      // Acciones de autenticación
      login: (session) => {
        set({
          session,
          user: session.user,
          isAuthenticated: true,
          isLoggingIn: false,
          loginError: null,
        });
      },

      logout: () => {
        set({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
          isLoggingIn: false,
          isRegistering: false,
          loginError: null,
          registerError: null,
        });
      },

      updateUser: (updates) => {
        const state = get();
        if (state.user) {
          const updatedUser = { ...state.user, ...updates };
          set({
            user: updatedUser,
            session: state.session ? {
              ...state.session,
              user: updatedUser,
            } : null,
          });
        }
      },

      // Utilidades
      isSessionValid: () => {
        const state = get();
        if (!state.session) return false;
        return state.session.expires_at > Date.now();
      },

      getToken: () => {
        const state = get();
        if (!state.session || !state.isSessionValid()) return null;
        return state.session.token;
      },

      // Reset
      reset: () => {
        set({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
          isLoggingIn: false,
          isRegistering: false,
          loginError: null,
          registerError: null,
        });
      },
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => mmkvAuthStorage),
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Validar sesión al hidratat
        if (state && state.session && !state.isSessionValid()) {
          state.logout();
        }
      },
    }
  )
);