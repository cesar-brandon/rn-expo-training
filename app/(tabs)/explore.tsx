import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { H4, ScrollView, View } from "tamagui";

export default function ExploreScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView bg="$background" p="$2" flex={1}>
        <View flex={1} bg="$background" p="$2">
          <H4>Explorar</H4>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
