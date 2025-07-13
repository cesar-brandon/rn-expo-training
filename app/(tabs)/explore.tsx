import { useUserStore } from "@/shared/stores/user";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, H4, ScrollView, Text, View } from "tamagui";

export default function ExploreScreen() {
  const { usuario, setUsuario } = useUserStore();
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView bg="$background" p="$2" flex={1}>
        <View flex={1} bg="$background" p="$2">
          <H4>Explorar</H4>
          <Text>{usuario?.nombre}</Text>
        </View>
        <Button onPress={() => {
          setUsuario({
            ...usuario,
            nombre: "Juan 2",
          })
        }}>
          <Text>Actualizar usuario</Text>
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
