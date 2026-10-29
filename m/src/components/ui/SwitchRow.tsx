import React, { useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { Check, Minus } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Text } from "@/components/ui/Text";
import { spacing } from "@/theme/spacing";
import { useTheme } from "@/theme/ThemeProvider";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export type SwitchRowProps = {
  label: string; sublabel?: string; value: boolean;
  onValueChange: (value: boolean) => void; disabled?: boolean;
  note?: string; destructive?: boolean;
};

export function SwitchRow({ label, sublabel, value, onValueChange, disabled, note, destructive }: SwitchRowProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const [position] = useState(() => new Animated.Value(value ? 20 : 0));
  useEffect(() => {
    const animation = Animated.timing(position, { toValue: value ? 20 : 0, duration: reduced ? 0 : 160, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [position, value, reduced]);
  return <Pressable
    accessibilityRole="switch" accessibilityLabel={label} accessibilityHint={sublabel}
    accessibilityState={{ checked: value, disabled }} disabled={disabled}
    onPress={() => { void Haptics.selectionAsync().catch(() => {}); onValueChange(!value); }}
    style={({ pressed }) => [styles.row, { opacity: disabled ? .45 : pressed ? .65 : 1 }]}
  >
    <View style={styles.text}>
      <Text variant="bodyMedium" color={destructive ? "destructive" : "foreground"}>{label}</Text>
      {sublabel && <Text variant="caption" color="mutedForeground">{sublabel}</Text>}
      {note && <Text variant="caption" color="mutedForeground">{note}</Text>}
    </View>
    <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={[styles.track, { backgroundColor: value ? colors.primary : colors.border }]}>
      <Animated.View style={[styles.thumb, { backgroundColor: colors.card, transform: [{ translateX: position }] }]}>
        {value ? <Check size={14} strokeWidth={2.5} color={colors.primaryForeground} /> : <Minus size={12} color={colors.mutedForeground} />}
      </Animated.View>
    </View>
  </Pressable>;
}
const styles = StyleSheet.create({
  row: { minHeight: 64, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.lg, paddingVertical: spacing.md },
  text: { flex: 1, minWidth: 0, gap: spacing.xs },
  track: { width: 54, height: 34, borderRadius: 17, padding: 4, flexShrink: 0 },
  thumb: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
});
