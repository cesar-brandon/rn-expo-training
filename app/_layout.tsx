import { Provider } from "@/components/Provider";
import { migrateDbIfNeeded } from "@/database/migrate";
import { useNetworkStore } from "@/stores/network";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import * as Sentry from "@sentry/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import * as Network from "expo-network";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SQLiteProvider } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import * as Updates from "expo-updates";
import { useEffect } from "react";
import { Alert, useColorScheme } from "react-native";
import "react-native-reanimated";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from "expo-router";

const navigationIntegration = Sentry.reactNavigationIntegration();
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: __DEV__,
  debug: true, // If `true`, Sentry will try to print out useful debugging information if something goes wrong with sending the event. Set it to `false` in production
  tracesSampleRate: 1.0, // Set tracesSampleRate to 1.0 to capture 100% of transactions for tracing. Adjusting this value in production.
  integrations: [
    // Pass integration
    navigationIntegration,
  ],
  environment: process.env.NODE_ENV || "development",
});

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [interLoaded, interError] = useFonts({
    Inter: require("@tamagui/font-inter/otf/Inter-Medium.otf"),
    InterBold: require("@tamagui/font-inter/otf/Inter-Bold.otf"),
  });
  const { setIsConnected } = useNetworkStore();

  useEffect(() => {
    if (interLoaded || interError) {
      // Hide the splash screen after the fonts have loaded (or an error was returned) and the UI is ready.
      SplashScreen.hideAsync();
    }
  }, [interLoaded, interError]);

  useEffect(() => {
    async function checkForUpdates() {
      if (__DEV__) {
        console.log("Modo de desarrollo: no se buscan actualizaciones.");
        return;
      }
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          Alert.alert(
            "Actualización disponible",
            "Hay una nueva actualización disponible. ¿Deseas actualizar ahora?",
            [
              {
                text: "No",
                onPress: () => console.log("Actualización pospuesta"),
              },
              {
                text: "Sí",
                onPress: async () => {
                  await Updates.fetchUpdateAsync();
                  await Updates.reloadAsync();
                },
              },
            ],
          );
        }
      } catch (e) {
        console.error(e);
      }
    }

    checkForUpdates();
  }, []);

  useEffect(() => {
    const checkNetworkStatus = async () => {
      const networkState = await Network.getNetworkStateAsync();
      setIsConnected(networkState.isConnected || false);
    };
    checkNetworkStatus();
    const intervalId = setInterval(checkNetworkStatus, 5000);
    const unsubscribe = Network.addNetworkStateListener((state) => {
      setIsConnected(state.isConnected || false);
    });
    return () => {
      clearInterval(intervalId);
      unsubscribe && unsubscribe.remove();
    };
  }, []);

  if (!interLoaded && !interError) {
    return null;
  }

  return (
    <Providers>
      <RootLayoutNav />
    </Providers>
  );
}

const Providers = ({ children }: { children: React.ReactNode }) => {
  return <Provider>{children}</Provider>;
};

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const queryClient = new QueryClient();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <SQLiteProvider databaseName="fdevida.db" onInit={migrateDbIfNeeded}>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="auto" />
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen name="(auth)/sign-in" />
            <Stack.Screen name="+not-found" />
          </Stack>
        </QueryClientProvider>
      </SQLiteProvider>
    </ThemeProvider>
  );
}
