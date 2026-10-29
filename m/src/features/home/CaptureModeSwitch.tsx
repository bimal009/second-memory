import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Mic, MessagesSquare } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/spacing";

export function CaptureModeSwitch({ mode, onChange, disabled }: { mode: "voice" | "session"; onChange: (mode: "voice" | "session") => void; disabled?: boolean }) {
  const { colors } = useTheme();
  return <View style={[styles.track, { backgroundColor: colors.secondary }]}>
    {([{ mode: "voice", label: "Push-to-talk", Icon: Mic }, { mode: "session", label: "Session", Icon: MessagesSquare }] as const).map(item => {
      const selected = item.mode === mode;
      const foreground = selected ? colors.background : colors.mutedForeground;
      return <Pressable key={item.mode} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected, disabled }} disabled={disabled} onPress={() => { if (!selected) { void Haptics.selectionAsync().catch(() => {}); onChange(item.mode); } }} style={({ pressed }) => [styles.option, { backgroundColor: selected ? colors.foreground : "transparent", opacity: disabled ? .5 : pressed ? .7 : 1 }]}>
        <item.Icon size={18} strokeWidth={1.8} color={foreground} />
        <Text variant="bodyMedium" style={{ color: foreground, fontSize: 14 }}>{item.label}</Text>
      </Pressable>;
    })}
  </View>;
}
const styles = StyleSheet.create({ track: { flexDirection: "row", padding: spacing.xs, borderRadius: 30, gap: spacing.xs, width: "100%", maxWidth: 440, alignSelf: "center" }, option: { flex: 1, minWidth: 0, minHeight: 48, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, borderRadius: 26 } });
