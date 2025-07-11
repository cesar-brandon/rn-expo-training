import { HapticTab } from "@/components/ui/HapticTab";
import TabBarBackground from "@/components/ui/TabBarBackground";
import useLocationStore from "@/stores/location";
import { useNetworkStore } from "@/stores/network";
import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { useTheme } from "tamagui";

export default function TabLayout() {
  const theme = useTheme();
  const startWatching = useLocationStore((state) => state.startWatching);
  const fetchIP = useNetworkStore((state) => state.fetchIP);

  useEffect(() => {
    startWatching();
    fetchIP();
  }, [startWatching, fetchIP]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.accentColor.val,
        tabBarInactiveTintColor: theme.placeholderColor.val,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarActiveBackgroundColor: theme.background.val,
        tabBarInactiveBackgroundColor: theme.background.val,
        tabBarStyle: Platform.select({
          ios: {
            // Usar fondo transparente en iOS para mostrar el efecto blur
            position: "absolute",
          },
          default: {},
        }),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <Feather name="home" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explorar",
          tabBarIcon: ({ color }) => (
            <Feather name="search" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
