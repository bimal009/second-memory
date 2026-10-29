import React from "react";
import { StyleSheet, View } from "react-native";
import { WifiOff, AlertCircle } from "lucide-react-native";
import { ApiError } from "@/api";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/spacing";

export function ConnectionBanner({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { colors } = useTheme();
  const offline = error instanceof ApiError && error.code === "offline" || error instanceof Error && error.message.includes("Can't reach the server");
  const Icon = offline ? WifiOff : AlertCircle;
  return <View accessibilityRole="alert" style={[styles.banner, { borderColor: colors.destructive, backgroundColor: colors.card }]}>
    <View style={styles.message}><Icon size={20} color={colors.destructive} /><Text variant="caption" style={styles.text}>{offline ? "Can't reach the server" : "Something went wrong. Please try again."}</Text></View>
    <Button label="Retry" variant="secondary" onPress={onRetry} />
  </View>;
}
const styles = StyleSheet.create({ banner: { borderWidth: 1, borderRadius: 14, padding: spacing.md, gap: spacing.sm }, message: { flexDirection: "row", gap: spacing.sm, alignItems: "center" }, text: { flex: 1 } });
