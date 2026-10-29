import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "./Text";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/spacing";

export function Choices<T extends string | number>({ values, selected, onChange, disabled }: {
  values: { value: T; label: string }[]; selected: T; onChange: (value: T) => void; disabled?: boolean;
}) {
  const { colors } = useTheme();
  return <View style={styles.row}>{values.map(item => <Pressable key={item.value} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected: item.value === selected, disabled }} disabled={disabled} onPress={() => onChange(item.value)} style={({ pressed }) => [styles.choice, { backgroundColor: item.value === selected ? colors.foreground : colors.secondary, opacity: disabled ? .4 : pressed ? .65 : 1 }]}><Text variant="caption" style={{ color: item.value === selected ? colors.background : colors.foreground }}>{item.label}</Text></Pressable>)}</View>;
}
const styles = StyleSheet.create({ row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, choice: { minHeight: 48, paddingHorizontal: spacing.lg, justifyContent: "center", alignItems: "center", borderRadius: 24 } });
