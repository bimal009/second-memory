import React from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { Text } from "./Text";
import { IconButton } from "./IconButton";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/spacing";

export function AppScreen({ title, subtitle, back, action, children, scrollEnabled = true }: {
  title: string; subtitle?: string; back?: boolean; action?: React.ReactNode;
  children: React.ReactNode; scrollEnabled?: boolean;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  return <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.fill, { backgroundColor: colors.background, paddingTop: insets.top }]}>
    <ScrollView scrollEnabled={scrollEnabled} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingHorizontal: width < 360 ? spacing.lg : spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
      <View style={styles.header}>
        {back && <IconButton accessibilityLabel="Back" onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/capture")} icon={<ArrowLeft size={22} color={colors.foreground} />} />}
        <View style={styles.titleBlock}><Text accessibilityRole="header" variant="display" style={styles.title}>{title}</Text>{subtitle && <Text variant="body" color="mutedForeground">{subtitle}</Text>}</View>
        {action}
      </View>
      {children}
    </ScrollView>
  </KeyboardAvoidingView>;
}
export function ResponsiveColumns({ children }: { children: [React.ReactNode, React.ReactNode] }) {
  const { width } = useWindowDimensions();
  return <View style={[styles.columns, width >= 760 && styles.horizontal]}>{children.map((child, index) => <View key={index} style={styles.column}>{child}</View>)}</View>;
}
export const appStyles = StyleSheet.create({
  section: { gap: spacing.lg }, row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, flex: { flex: 1, minWidth: 0 },
  panel: { padding: spacing.lg, borderRadius: 20, gap: spacing.md },
  input: { minHeight: 56, borderRadius: 14, paddingHorizontal: spacing.lg, fontFamily: "Inter_400Regular", fontSize: 16 },
});
const styles = StyleSheet.create({ fill: { flex: 1 }, content: { flexGrow: 1, width: "100%", maxWidth: 960, alignSelf: "center", paddingTop: spacing.xl, gap: spacing.xl }, header: { flexDirection: "row", alignItems: "center", gap: spacing.sm }, titleBlock: { flex: 1, minWidth: 0, gap: spacing.sm }, title: { fontSize: 30, lineHeight: 36, letterSpacing: -1 }, columns: { gap: spacing.xl }, horizontal: { flexDirection: "row", alignItems: "flex-start" }, column: { flex: 1, minWidth: 0, gap: spacing.xl } });
