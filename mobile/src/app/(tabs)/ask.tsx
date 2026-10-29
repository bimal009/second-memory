import React from "react";
import { StyleSheet, View } from "react-native";
import { AskScreen } from "@/features/ask/AskScreen";
import { ScreenContainer } from "@/components/ui/ScreenContainer";

export default function AskTab() {
  return (
    <ScreenContainer noHorizontalPadding>
      <View style={styles.fill}>
        <AskScreen />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
