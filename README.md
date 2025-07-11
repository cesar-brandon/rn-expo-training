# 🚀 RN Expo Training - Local-First Architecture

Una plantilla educativa completa para React Native + Expo con arquitectura **local-first** robusta, diseñada para aplicaciones que funcionan perfectamente offline y sincronizan automáticamente cuando hay conexión.

## ✨ Características Principales

- 🎯 **Local-First**: Funciona completamente offline con sincronización automática
- 🗃️ **SQLite + Migraciones**: Base de datos local con sistema de migraciones robusto
- 🔄 **Optimistic Updates**: Actualizaciones inmediatas con rollback automático
- 🌐 **Sync Inteligente**: Sincronización adaptativa basada en calidad de conexión
- 🏪 **Zustand Stores**: Estado global optimista con persistencia
- ✅ **Validaciones Zod**: Schemas robustos con validación client-side
- 📱 **MMKV Storage**: Storage rápido y encriptado para configuraciones
- 🎨 **Tamagui UI**: Componentes modernos y performantes
- 🧭 **Expo Router**: Navegación type-safe con file-based routing
- 📡 **React Query**: Cache inteligente que funciona offline
- 🔧 **TypeScript**: Completamente tipado para mejor DX

## 🏗️ Arquitectura

```
📱 React Native + Expo
├── 🎨 UI Layer (Tamagui + Expo Router)
├── 🪝 Hooks Layer (Local-First Hooks)
├── 🏪 State Layer (Zustand Stores)
├── 📊 Data Layer (React Query + SQLite)
├── 🔄 Sync Layer (Background Sync)
└── 💾 Storage Layer (SQLite + MMKV)
```

## 🚀 Quick Start

### 1. Instalación

```bash
# Clonar el repositorio
git clone <repository-url>
cd rn-expo-training

# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm start
```

### 2. Uso Básico

```tsx
// App.tsx
import { useLocalFirst } from '@/shared/hooks/local-first';

export default function App() {
  const localFirst = useLocalFirst({
    enableAutoSync: true,
    syncInterval: 30000,
    enableOptimisticUpdates: true
  });

  if (!localFirst.isInitialized) {
    return <LoadingScreen />;
  }

  return <YourApp />;
}
```

### 3. Operaciones Local-First

```tsx
// Crear datos con optimistic updates
import { useOptimisticTodoMutation } from '@/shared/hooks/local-first';

function TodoForm() {
  const { createTodo, isCreating } = useOptimisticTodoMutation();

  const handleCreate = () => {
    // Se actualiza inmediatamente en UI y se sincroniza en background
    createTodo({
      title: 'Nueva tarea',
      completed: false,
      priority: 'high'
    });
  };

  return (
    <Button onPress={handleCreate} disabled={isCreating}>
      {isCreating ? 'Creando...' : 'Crear Tarea'}
    </Button>
  );
}
```

## 📚 Documentación Completa

Para documentación detallada de la arquitectura, hooks, stores y mejores prácticas:

👉 **[Ver Documentación Completa](./LOCAL_FIRST_ARCHITECTURE.md)**

## 🧩 Estructura del Proyecto

```
src/
├── shared/
│   ├── stores/           # Zustand stores (App, Auth, Todo, Sync, Network)
│   ├── hooks/            # Custom hooks
│   │   └── local-first/  # Local-first specific hooks
│   ├── services/         # Data services (Database, Sync, Network)
│   ├── validations/      # Zod schemas and validators
│   ├── types/            # TypeScript type definitions
│   └── constants/        # App constants
├── database/
│   ├── migrations/       # SQLite migration files
│   └── migrator.ts       # Migration system
├── modules/              # Feature modules
│   └── components/       # Shared components
└── config/               # App configuration
```

## 🛠️ Stack Tecnológico

| Categoría | Tecnología | Propósito |
|-----------|------------|-----------|
| **Framework** | React Native + Expo | Desarrollo multiplataforma |
| **UI Library** | Tamagui | Componentes modernos y performantes |
| **Navegación** | Expo Router | File-based routing type-safe |
| **Estado Global** | Zustand | Estado simple y potente |
| **Estado Servidor** | React Query | Cache inteligente offline-first |
| **Base de Datos** | Expo SQLite | Persistencia local robusta |
| **Storage** | MMKV | Storage rápido para configuraciones |
| **Validaciones** | Zod | Schemas y validación type-safe |
| **Tipado** | TypeScript | Type safety completo |

## 🎯 Casos de Uso Ideales

Esta plantilla es perfecta para:

- 📱 **Apps Móviles**: Que necesiten funcionar sin conexión
- 🔄 **Apps Colaborativas**: Con sincronización en tiempo real
- 📊 **Apps de Productividad**: TODOs, notas, gestión de tareas
- 🏢 **Apps Empresariales**: CRM, inventarios, field service
- 🎓 **Apps Educativas**: Contenido offline, progreso sincronizado
- 🩺 **Apps de Salud**: Registro de datos críticos offline

## 🚀 Features Avanzadas

### Sincronización Inteligente
```typescript
// Se adapta automáticamente a la calidad de conexión
const networkSync = useNetworkSync({
  syncOnReconnect: true,
  syncOnlyOnWifi: false,
  adaptiveSync: true
});
```

### Actualizaciones Optimistas
```typescript
// Updates UI inmediatamente, rollback automático si falla
const { createTodo, updateTodo, deleteTodo } = useOptimisticTodoMutation();
```

### Storage Avanzado
```typescript
// Storage con TTL y cache automático
const { value, setValue, isExpired } = useCachedStorage('user-prefs', 24 * 60 * 60 * 1000);
```

### Manejo de Red
```typescript
// Detección automática de calidad de conexión
const networkStore = useNetworkStore();
const quality = networkStore.connectionQuality; // 'excellent' | 'good' | 'poor' | 'offline'
```

## 📊 Monitoreo y Debug

```typescript
// Estadísticas en tiempo real
const appStats = localFirst.appStats;
console.log(`
  Total TODOs: ${appStats.totalTodos}
  No sincronizados: ${appStats.unsynced}
  Última sincronización: ${appStats.lastSyncTime}
  Uptime conexión: ${appStats.connectionStats.uptime}ms
`);
```

## 🎨 UI Components (Tamagui)

```tsx
import { Button, Card, Text, XStack, YStack } from 'tamagui';

<Card padding="$4" margin="$2">
  <YStack space="$3">
    <Text fontSize="$6" fontWeight="bold">
      Datos Locales
    </Text>
    <XStack space="$2">
      <Button theme="blue">Sincronizar</Button>
      <Button theme="gray" variant="outlined">Cancelar</Button>
    </XStack>
  </YStack>
</Card>
```

## 🔧 Configuración

### Variables de Entorno
```env
EXPO_PUBLIC_SYNC_INTERVAL=30000
EXPO_PUBLIC_MAX_RETRY_ATTEMPTS=5
EXPO_PUBLIC_OFFLINE_MODE=false
EXPO_PUBLIC_SYNC_ONLY_WIFI=false
```

### Configuración de Stores
```typescript
// src/shared/stores/app-store.ts
const defaultConfig: AppConfig = {
  theme: 'system',
  language: 'es',
  notifications_enabled: true,
  sync_enabled: true,
  offline_mode: false,
};
```

## 🧪 Testing

```bash
# Tests unitarios
npm test

# Tests E2E
npm run test:e2e

# Linting
npm run lint

# Type checking
npm run type-check
```

## 📱 Scripts Disponibles

```bash
npm start          # Iniciar development server
npm run android    # Ejecutar en Android
npm run ios        # Ejecutar en iOS
npm run web        # Ejecutar en web
npm run build      # Build para producción
npm run lint       # Linter
npm run type-check # Verificación de tipos
npm run db:migrate # Ejecutar migraciones
npm run db:seed    # Poblar DB con datos de prueba
```

## 🤝 Contribución

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Roadmap

- [ ] **Autenticación Completa**: Login/register con JWT
- [ ] **Push Notifications**: Notificaciones offline-first
- [ ] **File Upload**: Manejo de archivos con sync
- [ ] **Conflict Resolution UI**: Interfaz para resolver conflictos
- [ ] **Performance Monitoring**: Métricas de performance
- [ ] **A/B Testing**: Framework para experimentos
- [ ] **Analytics Offline**: Tracking que funciona offline

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver el archivo [LICENSE](./LICENSE) para más detalles.

## 🙏 Agradecimientos

- [Expo Team](https://expo.dev) por el increíble framework
- [Tamagui](https://tamagui.dev) por los componentes UI
- [Zustand](https://github.com/pmndrs/zustand) por el state management simple
- [TanStack Query](https://tanstack.com/query) por el cache inteligente
- [MMKV](https://github.com/mrousavy/react-native-mmkv) por el storage performante

---

## 🎯 ¿Listo para construir tu próxima app local-first?

Esta plantilla te proporciona todo lo necesario para crear aplicaciones React Native robustas que funcionan perfectamente offline. 

**¡Comienza ahora y construye la próxima generación de apps móviles!** 🚀

---

<div align="center">
  <strong>Hecho con ❤️ para la comunidad React Native</strong>
</div>
