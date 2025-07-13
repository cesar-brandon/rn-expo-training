import PostList from "@/shared/components/PostList";
import { useUserStore } from "@/shared/stores/user";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { H4, ScrollView, Text, View } from "tamagui";

export default function HomeScreen() {
  const { usuario } = useUserStore();

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView bg="$background" p="$2" flex={1} height="100%">
        <View flex={1} mb="$4">
          <H4>Inicio</H4>
          <Text>{usuario?.nombre}</Text>
        </View>
        <PostList usuario={usuario} />
      </ScrollView>
    </SafeAreaView>
  );
}
