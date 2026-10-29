import React, { useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { setSimulation, useSimulation } from "@/api";
import { Card } from "@/components/ui/Card";
import { SwitchRow } from "@/components/ui/SwitchRow";
import { Text } from "@/components/ui/Text";
import { spacing } from "@/theme/spacing";

export function DevSimulation() {
  const taps = useRef(0);
  const [visible, setVisible] = useState(false);
  const state = useSimulation();
  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Version 1.0.0"
        onPress={() => {
          taps.current += 1;
          if (taps.current >= 5) {
            setVisible((v) => !v);
            taps.current = 0;
          }
        }}
        style={styles.version}
      >
        <Text variant="micro" color="mutedForeground">
          Second Memory · Version 1.0.0
        </Text>
      </Pressable>
      {visible && (
        <Card style={styles.card}>
          <Text variant="bodyMedium">Preview controls</Text>
          <SwitchRow
            label="Simulate offline"
            value={state.offline}
            onValueChange={(offline) => setSimulation({ offline })}
          />
          <SwitchRow
            label="Simulate empty data"
            value={state.empty}
            onValueChange={(empty) => setSimulation({ empty })}
          />
          <SwitchRow
            label="Simulate error"
            value={state.error}
            onValueChange={(error) => setSimulation({ error })}
          />
        </Card>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  version: { minHeight: 48, alignItems: "center", justifyContent: "center" },
  card: { gap: spacing.sm },
});
