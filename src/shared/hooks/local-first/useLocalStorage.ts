import { useCallback, useState } from 'react';
import { MMKV } from 'react-native-mmkv';

// Instancia global de MMKV para uso general
const storage = new MMKV({
  id: 'local-storage',
  encryptionKey: 'local-storage-key-change-in-production',
});

interface UseLocalStorageOptions<T> {
  serializer?: {
    serialize: (value: T) => string;
    deserialize: (value: string) => T;
  };
  defaultValue?: T;
  errorOnFailure?: boolean;
}

/**
 * Hook para manejo de storage local con MMKV
 * Proporciona una API similar a useState pero persistida
 */
export function useLocalStorage<T>(
  key: string,
  options: UseLocalStorageOptions<T> = {}
): [T | undefined, (value: T | ((prev: T | undefined) => T)) => void, () => void] {
  const {
    serializer = {
      serialize: JSON.stringify,
      deserialize: JSON.parse,
    },
    defaultValue,
    errorOnFailure = false,
  } = options;

  // Estado local
  const [storedValue, setStoredValue] = useState<T | undefined>(() => {
    try {
      const item = storage.getString(key);
      if (item === undefined) {
        return defaultValue;
      }
      return serializer.deserialize(item);
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      if (errorOnFailure) {
        throw error;
      }
      return defaultValue;
    }
  });

  /**
   * Función para actualizar el valor tanto en storage como en estado
   */
  const setValue = useCallback(
    (value: T | ((prev: T | undefined) => T)) => {
      try {
        // Permitir función de actualización como useState
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        
        // Actualizar estado local
        setStoredValue(valueToStore);
        
        // Actualizar storage
        if (valueToStore === undefined) {
          storage.delete(key);
        } else {
          storage.set(key, serializer.serialize(valueToStore));
        }
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
        if (errorOnFailure) {
          throw error;
        }
      }
    },
    [key, serializer, storedValue, errorOnFailure]
  );

  /**
   * Función para remover el valor del storage
   */
  const removeValue = useCallback(() => {
    try {
      storage.delete(key);
      setStoredValue(undefined);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
      if (errorOnFailure) {
        throw error;
      }
    }
  }, [key, errorOnFailure]);

  return [storedValue, setValue, removeValue];
}

/**
 * Hook para almacenar objetos de configuración
 */
export function useConfigStorage<T extends Record<string, any>>(
  key: string,
  defaultConfig: T
) {
  const [config, setConfig, removeConfig] = useLocalStorage(key, {
    defaultValue: defaultConfig,
  });

  /**
   * Actualiza parcialmente la configuración
   */
  const updateConfig = useCallback(
    (updates: Partial<T>) => {
      setConfig(prev => ({
        ...defaultConfig,
        ...prev,
        ...updates,
      }));
    },
    [setConfig, defaultConfig]
  );

  /**
   * Resetea la configuración a valores por defecto
   */
  const resetConfig = useCallback(() => {
    setConfig(defaultConfig);
  }, [setConfig, defaultConfig]);

  return {
    config: config || defaultConfig,
    updateConfig,
    resetConfig,
    removeConfig,
  };
}

/**
 * Hook para cachear datos con expiración
 */
export function useCachedStorage<T>(
  key: string,
  ttlMs: number = 24 * 60 * 60 * 1000, // 24 horas por defecto
  defaultValue?: T
) {
  interface CachedData<T> {
    value: T;
    timestamp: number;
    ttl: number;
  }

  const [cachedData, setCachedData, removeCachedData] = useLocalStorage<CachedData<T>>(
    `cached_${key}`
  );

  /**
   * Verifica si los datos están expirados
   */
  const isExpired = useCallback(() => {
    if (!cachedData) return true;
    return Date.now() - cachedData.timestamp > cachedData.ttl;
  }, [cachedData]);

  /**
   * Obtiene el valor si no está expirado
   */
  const getValue = useCallback(() => {
    if (!cachedData || isExpired()) {
      return defaultValue;
    }
    return cachedData.value;
  }, [cachedData, isExpired, defaultValue]);

  /**
   * Establece un nuevo valor con timestamp
   */
  const setValue = useCallback(
    (value: T) => {
      setCachedData({
        value,
        timestamp: Date.now(),
        ttl: ttlMs,
      });
    },
    [setCachedData, ttlMs]
  );

  /**
   * Limpia el cache
   */
  const clearCache = useCallback(() => {
    removeCachedData();
  }, [removeCachedData]);

  return {
    value: getValue(),
    setValue,
    clearCache,
    isExpired: isExpired(),
    lastUpdated: cachedData?.timestamp || null,
  };
}

/**
 * Hook para almacenar lista de elementos únicos
 */
export function useStorageList<T>(
  key: string,
  identifier: (item: T) => string = (item: any) => item.id
) {
  const [items, setItems, removeItems] = useLocalStorage<T[]>(key, {
    defaultValue: [],
  });

  /**
   * Agrega un elemento a la lista (o lo actualiza si ya existe)
   */
  const addItem = useCallback(
    (item: T) => {
      setItems(prev => {
        const list = prev || [];
        const existingIndex = list.findIndex(existing => 
          identifier(existing) === identifier(item)
        );
        
        if (existingIndex >= 0) {
          // Actualizar elemento existente
          const newList = [...list];
          newList[existingIndex] = item;
          return newList;
        } else {
          // Agregar nuevo elemento
          return [...list, item];
        }
      });
    },
    [setItems, identifier]
  );

  /**
   * Remueve un elemento de la lista
   */
  const removeItem = useCallback(
    (itemOrId: T | string) => {
      setItems(prev => {
        const list = prev || [];
        const id = typeof itemOrId === 'string' ? itemOrId : identifier(itemOrId);
        return list.filter(item => identifier(item) !== id);
      });
    },
    [setItems, identifier]
  );

  /**
   * Actualiza un elemento específico
   */
  const updateItem = useCallback(
    (id: string, updates: Partial<T>) => {
      setItems(prev => {
        const list = prev || [];
        return list.map(item => 
          identifier(item) === id ? { ...item, ...updates } : item
        );
      });
    },
    [setItems, identifier]
  );

  /**
   * Limpia toda la lista
   */
  const clearItems = useCallback(() => {
    setItems([]);
  }, [setItems]);

  /**
   * Busca un elemento por ID
   */
  const findItem = useCallback(
    (id: string) => {
      const list = items || [];
      return list.find(item => identifier(item) === id);
    },
    [items, identifier]
  );

  return {
    items: items || [],
    addItem,
    removeItem,
    updateItem,
    clearItems,
    findItem,
    count: (items || []).length,
  };
}

/**
 * Funciones utilitarias para manejo directo de MMKV
 */
export const storageUtils = {
  /**
   * Obtiene todas las claves almacenadas
   */
  getAllKeys: () => {
    try {
      return storage.getAllKeys();
    } catch (error) {
      console.error('Error getting all keys:', error);
      return [];
    }
  },

  /**
   * Limpia todo el storage
   */
  clearAll: () => {
    try {
      storage.clearAll();
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },

  /**
   * Obtiene estadísticas del storage
   */
  getStats: () => {
    try {
      const keys = storage.getAllKeys();
      let totalSize = 0;
      
      keys.forEach(key => {
        const value = storage.getString(key);
        if (value) {
          totalSize += value.length;
        }
      });

      return {
        totalKeys: keys.length,
        totalSize,
        averageSize: keys.length > 0 ? totalSize / keys.length : 0,
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {
        totalKeys: 0,
        totalSize: 0,
        averageSize: 0,
      };
    }
  },

  /**
   * Exporta todos los datos a un objeto
   */
  exportData: () => {
    try {
      const keys = storage.getAllKeys();
      const data: Record<string, string> = {};
      
      keys.forEach(key => {
        const value = storage.getString(key);
        if (value !== undefined) {
          data[key] = value;
        }
      });

      return data;
    } catch (error) {
      console.error('Error exporting data:', error);
      return {};
    }
  },

  /**
   * Importa datos desde un objeto
   */
  importData: (data: Record<string, string>) => {
    try {
      Object.entries(data).forEach(([key, value]) => {
        storage.set(key, value);
      });
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  },
};