# 🏗️ Arquitectura Local-First para React Native + Expo

Esta documentación describe la arquitectura local-first implementada en el proyecto **rn-expo-training**, diseñada como una plantilla educativa para aplicaciones React Native con funcionalidad offline robusta.

## 📋 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Arquitectura General](#arquitectura-general)
3. [Componentes Principales](#componentes-principales)
4. [Stores con Zustand](#stores-con-zustand)
5. [Validaciones con Zod](#validaciones-con-zod)
6. [Hooks Local-First](#hooks-local-first)
7. [Base de Datos Local](#base-de-datos-local)
8. [Sincronización](#sincronización)
9. [Manejo de Estados Offline](#manejo-de-estados-offline)
10. [Uso y Ejemplos](#uso-y-ejemplos)
11. [Mejores Prácticas](#mejores-prácticas)

## 🎯 Introducción

La arquitectura local-first prioriza la experiencia del usuario al permitir que la aplicación funcione completamente offline, sincronizando automáticamente cuando hay conexión disponible. Esta implementación incluye:

- ✅ **Base de datos local** con SQLite y migraciones
- ✅ **Estado global optimista** con Zustand
- ✅ **Sincronización inteligente** con React Query
- ✅ **Validaciones robustas** con Zod
- ✅ **Storage persistente** con MMKV
- ✅ **Manejo de conflictos** automático
- ✅ **Actualizaciones optimistas** con rollback
- ✅ **Detección de red** adaptativa

## 🏛️ Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTACIÓN                            │
├─────────────────────────────────────────────────────────────┤
│  React Components + Tamagui UI + Expo Router              │
├─────────────────────────────────────────────────────────────┤
│                      HOOKS                                 │
├─────────────────────────────────────────────────────────────┤
│  useLocalFirst • useOptimisticMutation • useOfflineSync   │
├─────────────────────────────────────────────────────────────┤
│                    ESTADO GLOBAL                           │
├─────────────────────────────────────────────────────────────┤
│     Zustand Stores (App • Auth • Todo • Sync • Network)   │
├─────────────────────────────────────────────────────────────┤
│                   CAPA DE DATOS                            │
├─────────────────────────────────────────────────────────────┤
│  React Query • Database Service • Sync Service            │
├─────────────────────────────────────────────────────────────┤
│                   PERSISTENCIA                             │
├─────────────────────────────────────────────────────────────┤
│     SQLite (Expo) • MMKV • Validaciones (Zod)             │
└─────────────────────────────────────────────────────────────┘
```

## 🧩 Componentes Principales

### 📁 Estructura de Carpetas

```
src/
├── shared/
│   ├── stores/           # Estados globales con Zustand
│   ├── hooks/            # Hooks personalizados
│   │   └── local-first/  # Hooks específicos local-first
│   ├── services/         # Servicios de datos y sync
│   ├── validations/      # Schemas y validadores Zod
│   ├── types/            # Tipos TypeScript
│   └── constants/        # Constantes de la app
├── database/
│   ├── migrations/       # Migraciones SQLite
│   └── migrator.ts       # Sistema de migraciones
└── modules/              # Módulos de la aplicación
```

## 🗃️ Stores con Zustand

### AppStore
```typescript
import { useAppStore } from '@/shared/stores';

const appStore = useAppStore();

// Configuración de la app
appStore.setConfig({ theme: 'dark', sync_enabled: true });

// Notificaciones
appStore.addNotification({
  type: 'success',
  title: 'Operación exitosa',
  message: 'Los datos se sincronizaron correctamente'
});
```

### TodoStore con Optimistic Updates
```typescript
import { useTodoStore } from '@/shared/stores';

const todoStore = useTodoStore();

// Agregar TODO optimistamente
const tempId = todoStore.optimisticAdd({
  title: 'Nueva tarea',
  completed: false,
  priority: 'high'
});

// Confirmar o revertir
todoStore.confirmOptimistic(tempId, realTodo);
// o
todoStore.revertOptimistic(tempId);
```

### NetworkStore
```typescript
import { useNetworkStore } from '@/shared/stores';

const networkStore = useNetworkStore();

// Estado de conexión
const isOnline = networkStore.isOnline();
const hasStableConnection = networkStore.hasStableConnection();

// Estadísticas de conexión
const stats = networkStore.getConnectionStats();
```

### SyncStore
```typescript
import { useSyncStore } from '@/shared/stores';

const syncStore = useSyncStore();

// Agregar acción a cola de sincronización
syncStore.addToQueue({
  type: 'CREATE',
  table: 'todos',
  data: todoData
});

// Estadísticas de cola
const queueStats = syncStore.getQueueStats();
```

## ✅ Validaciones con Zod

### Schemas Principales
```typescript
import { createTodoSchema, validateWithSchema } from '@/shared/validations';

// Validar datos
const result = validateWithSchema(createTodoSchema, {
  title: 'Mi tarea',
  priority: 'high',
  user_id: 'user-123'
});

if (result.valid) {
  // Datos válidos en result.data
} else {
  // Errores en result.errors
}
```

### Validadores Utilitarios
```typescript
import { validateEmail, validatePassword } from '@/shared/validations';

// Validación de email
const emailResult = validateEmail('usuario@ejemplo.com');

// Validación de contraseña
const passwordResult = validatePassword('miPassword123');

// Validación múltiple
const result = validateMultipleFields([
  () => validateEmail(email),
  () => validatePassword(password)
]);
```

## 🪝 Hooks Local-First

### useLocalFirst (Hook Principal)
```typescript
import { useLocalFirst } from '@/shared/hooks/local-first';

export function App() {
  const localFirst = useLocalFirst({
    enableAutoSync: true,
    syncInterval: 30000,
    enableOptimisticUpdates: true
  });

  if (!localFirst.isInitialized) {
    return <LoadingScreen />;
  }

  return (
    <View>
      <Text>Estado: {localFirst.isOnline ? 'Online' : 'Offline'}</Text>
      <Text>Cambios pendientes: {localFirst.pendingChanges}</Text>
      <Button onPress={localFirst.forceSync}>
        Sincronizar ahora
      </Button>
    </View>
  );
}
```

### useOptimisticTodoMutation
```typescript
import { useOptimisticTodoMutation } from '@/shared/hooks/local-first';

export function TodoForm() {
  const { createTodo, updateTodo, deleteTodo, isCreating } = 
    useOptimisticTodoMutation();

  const handleCreate = () => {
    createTodo({
      title: 'Nueva tarea',
      user_id: 'current-user',
      priority: 'medium',
      completed: false
    });
  };

  return (
    <Button onPress={handleCreate} disabled={isCreating}>
      {isCreating ? 'Creando...' : 'Crear Tarea'}
    </Button>
  );
}
```

### useOfflineSync
```typescript
import { useOfflineSync } from '@/shared/hooks/local-first';

export function SyncStatus() {
  const sync = useOfflineSync({
    autoRetry: true,
    maxRetries: 5,
    retryInterval: 30000
  });

  return (
    <View>
      <Text>Estado: {sync.isOffline ? 'Offline' : 'Online'}</Text>
      <Text>Cambios pendientes: {sync.hasPendingChanges}</Text>
      <Text>Progreso: {sync.syncProgress}%</Text>
      
      {sync.canSync() && (
        <Button onPress={sync.forceSync}>
          Sincronizar
        </Button>
      )}
    </View>
  );
}
```

### useNetworkSync
```typescript
import { useNetworkSync } from '@/shared/hooks/local-first';

export function NetworkStatus() {
  const networkSync = useNetworkSync({
    syncOnReconnect: true,
    syncOnlyOnWifi: false,
    adaptiveSync: true
  });

  const recommendations = networkSync.getSyncRecommendations();

  return (
    <View>
      <Text>Calidad: {networkSync.connectionQuality}</Text>
      <Text>Tipo: {networkSync.connectionType}</Text>
      <Text>Óptimo para sync: {networkSync.isOptimalForSync ? 'Sí' : 'No'}</Text>
      
      {recommendations.map((rec, index) => (
        <Text key={index}>• {rec}</Text>
      ))}
    </View>
  );
}
```

### useLocalStorage
```typescript
import { useLocalStorage, useConfigStorage, useCachedStorage } from '@/shared/hooks/local-first';

// Storage básico
const [userData, setUserData, removeUserData] = useLocalStorage('user-data');

// Storage de configuración
const { config, updateConfig, resetConfig } = useConfigStorage('app-config', {
  theme: 'system',
  language: 'es'
});

// Storage con cache y TTL
const { value, setValue, clearCache, isExpired } = useCachedStorage(
  'cached-data',
  24 * 60 * 60 * 1000 // 24 horas
);
```

## 🗄️ Base de Datos Local

### Servicio de Base de Datos
```typescript
import { dbService } from '@/shared/services/database';

// Inicializar
await dbService.init();

// Operaciones CRUD
const todo = await dbService.createTodo({
  title: 'Mi tarea',
  user_id: 'user-123',
  completed: false,
  priority: 'high'
});

const todos = await dbService.getAllTodos();
await dbService.updateTodo(todo.id, { completed: true });
await dbService.deleteTodo(todo.id);

// Obtener datos no sincronizados
const unsyncedTodos = await dbService.getUnsyncedTodos();
```

### Sistema de Migraciones
```typescript
import { migrator } from '@/database/migrator';

// Ejecutar migraciones
await migrator.migrate();

// Rollback
await migrator.rollback(1); // Volver a versión 1

// Estado de migraciones
const applied = await migrator.getAppliedMigrations();
const pending = await migrator.getPendingMigrations();
```

## 🔄 Sincronización

### Servicio de Sincronización
```typescript
import { syncService } from '@/shared/services/sync';

// Inicializar
await syncService.init();

// Sincronizar cambios pendientes
const success = await syncService.syncPendingChanges();

// Forzar sincronización
const result = await syncService.forcSync();

// Agregar a cola
syncService.addToSyncQueue('CREATE', 'todos', todoData);
```

### Cola de Sincronización Automática
- ✅ Detección automática de cambios
- ✅ Reintento con backoff exponencial
- ✅ Priorización de acciones
- ✅ Manejo de conflictos
- ✅ Sincronización por lotes

## 📱 Manejo de Estados Offline

### Detección de Conectividad
```typescript
import { networkService } from '@/shared/services/network';

// Estado actual
const hasInternet = networkService.hasInternetAccess();
const networkState = networkService.getNetworkState();

// Suscribirse a cambios
networkService.subscribe((state) => {
  console.log('Network changed:', state);
});
```

### Estrategias Offline
1. **Optimistic UI**: Actualiza inmediatamente la interfaz
2. **Queue System**: Cola de acciones para sincronizar
3. **Conflict Resolution**: Resuelve conflictos automáticamente
4. **Adaptive Sync**: Ajusta frecuencia según conexión
5. **Data Persistence**: Mantiene datos localmente

## 💡 Uso y Ejemplos

### Inicialización Completa
```typescript
// App.tsx
import { useLocalFirst } from '@/shared/hooks/local-first';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Configuración para offline-first
      staleTime: 5 * 60 * 1000, // 5 minutos
      cacheTime: 10 * 60 * 1000, // 10 minutos
      retry: (failureCount, error) => {
        // No reintentar si estamos offline
        return failureCount < 3 && navigator.onLine;
      }
    }
  }
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LocalFirstApp />
    </QueryClientProvider>
  );
}

function LocalFirstApp() {
  const localFirst = useLocalFirst();

  if (!localFirst.isInitialized) {
    return <SplashScreen />;
  }

  return <AppNavigator />;
}
```

### Componente con Datos Local-First
```typescript
// TodoList.tsx
import { useQuery } from '@tanstack/react-query';
import { useTodoStore, useOptimisticTodoMutation } from '@/shared/hooks/local-first';

export function TodoList() {
  const todoStore = useTodoStore();
  const { createTodo, updateTodo, deleteTodo } = useOptimisticTodoMutation();

  // Query que funciona offline
  const { data: todos } = useQuery({
    queryKey: ['todos'],
    queryFn: () => dbService.getAllTodos(),
    initialData: todoStore.todos
  });

  const handleToggleComplete = (todo: Todo) => {
    updateTodo(todo.id, { completed: !todo.completed });
  };

  return (
    <FlatList
      data={todos}
      renderItem={({ item }) => (
        <TodoItem
          todo={item}
          onToggleComplete={() => handleToggleComplete(item)}
          onDelete={() => deleteTodo(item.id)}
          isOptimistic={item._isOptimistic}
        />
      )}
    />
  );
}
```

## 🎯 Mejores Prácticas

### 1. Manejo de Estados
- ✅ Usa stores para estado global persistente
- ✅ Implementa actualizaciones optimistas para UX fluida
- ✅ Maneja estados de error de forma robusta
- ✅ Proporciona feedback visual para operaciones

### 2. Sincronización
- ✅ Sincroniza solo cuando es necesario
- ✅ Usa batching para operaciones múltiples
- ✅ Implementa conflict resolution
- ✅ Monitorea el uso de datos móviles

### 3. Performance
- ✅ Usa paginación para listas grandes
- ✅ Implementa lazy loading
- ✅ Cachea datos frecuentemente usados
- ✅ Limpia datos obsoletos regularmente

### 4. UX Offline
- ✅ Muestra estado de conectividad
- ✅ Indica datos no sincronizados
- ✅ Permite operaciones offline
- ✅ Sincroniza automáticamente al reconectar

### 5. Seguridad
- ✅ Valida datos en cliente y servidor
- ✅ Encripta datos sensibles en storage
- ✅ Implementa autenticación robusta
- ✅ Maneja tokens de sesión correctamente

## 🔧 Configuración Avanzada

### Variables de Entorno
```env
# Configuración de sincronización
EXPO_PUBLIC_SYNC_INTERVAL=30000
EXPO_PUBLIC_MAX_RETRY_ATTEMPTS=5
EXPO_PUBLIC_OFFLINE_MODE=false

# Configuración de base de datos
EXPO_PUBLIC_DB_NAME=local_first_db
EXPO_PUBLIC_DB_VERSION=1

# Configuración de red
EXPO_PUBLIC_SYNC_ONLY_WIFI=false
EXPO_PUBLIC_ADAPTIVE_SYNC=true
```

### Configuración de React Query
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        const networkStore = useNetworkStore.getState();
        return failureCount < 3 && networkStore.isOnline();
      }
    },
    mutations: {
      retry: false, // Las mutaciones se manejan con el sistema de sync
    }
  }
});
```

## 📊 Monitoreo y Debug

### Herramientas de Debug
```typescript
// Obtener estadísticas de la app
const stats = await localFirst.getAppStats();
console.log('App Stats:', stats);

// Estado de sincronización
const syncStats = syncStore.getQueueStats();
console.log('Sync Queue:', syncStats);

// Estadísticas de storage
const storageStats = storageUtils.getStats();
console.log('Storage Usage:', storageStats);

// Estado de red
const networkStats = networkStore.getConnectionStats();
console.log('Network Stats:', networkStats);
```

### Logging Estructurado
```typescript
// src/shared/utils/logger.ts
export const logger = {
  sync: (message: string, data?: any) => {
    console.log(`[SYNC] ${message}`, data);
  },
  network: (message: string, data?: any) => {
    console.log(`[NETWORK] ${message}`, data);
  },
  db: (message: string, data?: any) => {
    console.log(`[DB] ${message}`, data);
  }
};
```

---

## 🎓 Conclusión

Esta arquitectura local-first proporciona una base sólida para aplicaciones React Native que necesitan funcionar reliablemente offline. La combinación de Zustand, SQLite, React Query, Zod y MMKV crea un ecosistema robusto que puede adaptarse a diferentes necesidades de aplicaciones.

**Beneficios principales:**
- 🚀 **Performance**: Respuesta inmediata sin esperar red
- 🔄 **Sincronización**: Automática e inteligente
- 💾 **Persistencia**: Datos seguros localmente
- 🛡️ **Robustez**: Manejo de errores y conflictos
- 🎨 **UX**: Experiencia fluida offline/online
- 🔧 **Escalabilidad**: Arquitectura modular y extensible

Para comenzar a usar esta arquitectura, simplemente importa `useLocalFirst` en tu componente principal y disfruta de una experiencia local-first completa.