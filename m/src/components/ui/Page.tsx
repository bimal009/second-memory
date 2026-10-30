import React from "react";
import { ScrollView, StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "./Text";
import { useTheme } from "@/theme/ThemeProvider";
export function Page({ eyebrow, title, subtitle, children, trailing }: React.PropsWithChildren<{ eyebrow?: string; title: string; subtitle?: string; trailing?: React.ReactNode }>) {
  const { colors } = useTheme(); const insets = useSafeAreaInsets();
  return <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={[styles.page, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}>
    <View style={styles.header}><View style={{ flex: 1, gap: 8 }}>{eyebrow && <Text variant="micro" color="mutedForeground" style={styles.eyebrow}>{eyebrow}</Text>}<Text accessibilityRole="header" variant="title">{title}</Text>{subtitle && <Text color="mutedForeground">{subtitle}</Text>}</View>{trailing}</View>{children}
  </ScrollView>;
}
export function Field(props: TextInputProps) {
  const { colors } = useTheme();
  return <TextInput {...props} placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.secondary }, props.style]} />;
}
export const layout = StyleSheet.create({ row: { flexDirection: "row", gap: 8, alignItems: "center" }, wrap: { flexDirection: "row", gap: 8, flexWrap: "wrap" }, section: { gap: 16 }, scrim: { padding: 12, borderRadius: 10 }, flex: { flex: 1 } });
const styles = StyleSheet.create({ page: { paddingHorizontal: 24, gap: 32, width: "100%", maxWidth: 760, alignSelf: "center", flexGrow: 1 }, header: { flexDirection: "row", gap: 16 }, eyebrow: { letterSpacing: 2 }, input: { minHeight: 48, padding: 12, borderWidth: 1, borderRadius: 10, fontFamily: "Inter_400Regular", fontSize: 16 } });
