import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { TamaguiProvider } from 'tamagui';

import { ReactQueryProvider } from "@/config/react-query/setup";
import { migrator } from "@/database/migrator";
import { useColorScheme } from '@/shared/hooks/common/useColorScheme';
import { dbService } from "@/shared/services/database";
import { networkService } from "@/shared/services/network";
import config from '../tamagui.config';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Inicializando aplicación...');
        
        // 1. Abrir conexión a la base de datos
        await dbService.init();
        console.log('✅ Conexión a base de datos establecida');
        
        // 2. Ejecutar migraciones (esto crea las tablas correctas)
        await migrator.init(dbService.getDatabase());
        await migrator.migrate();
        console.log('✅ Migraciones ejecutadas');
        
        // 3. Inicializar servicio de red
        await networkService.init();
        console.log('✅ Servicio de red inicializado');
        
        setIsInitialized(true);
        console.log('🎉 Aplicación inicializada correctamente');
        
      } catch (error) {
        console.error('❌ Error inicializando aplicación:', error);
        setInitError(error instanceof Error ? error.message : 'Error desconocido');
      }
    };

    if (loaded) {
      initializeApp();
    }
  }, [loaded]);

  useEffect(() => {
    if (loaded && isInitialized) {
      SplashScreen.hideAsync();
    }
  }, [loaded, isInitialized]);

  // Mostrar splash mientras carga
  if (!loaded) {
    return null;
  }

  // Mostrar error si hay problemas
  if (initError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: 'red', fontSize: 18, fontWeight: 'bold', textAlign: 'center' }}>
          Error al inicializar la aplicación
        </Text>
        <Text style={{ color: 'red', fontSize: 14, textAlign: 'center', marginTop: 10 }}>
          {initError}
        </Text>
      </View>
    );
  }

  // Mostrar loading mientras inicializa
  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>
          Inicializando aplicación...
        </Text>
      </View>
    );
  }

  return (
    <ReactQueryProvider>
      <TamaguiProvider config={config}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
        </ThemeProvider>
      </TamaguiProvider>
    </ReactQueryProvider>
  );
}
