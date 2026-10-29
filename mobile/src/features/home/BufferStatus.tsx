import React, { useEffect, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { Pause, Play } from "lucide-react-native";
import { Text } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { useTheme } from "@/theme/ThemeProvider";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { spacing } from "@/theme/spacing";
import type { BufferState } from "@/api";

export function BufferStatus({ assistantName, buffer, toggling, onToggle, statusLabel, preview = false }: {
  assistantName: string;
  buffer: BufferState;
  toggling: boolean;
  onToggle: () => void;
  statusLabel?: string; preview?: boolean;
}) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (!buffer.recording || reduced) { opacity.setValue(1); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: .3, duration: 900, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 900, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [buffer.recording, reduced, opacity]);

  const seconds = Math.max(0, Math.min(buffer.seconds, buffer.capacity));
  const progress = buffer.capacity > 0 ? seconds / buffer.capacity : 0;
  return <View style={styles.container}>
    <View style={styles.header}>
      <View style={styles.identity}>
        <Text variant="display" numberOfLines={1} style={styles.name}>{assistantName}</Text>
        <Text variant="caption" color="mutedForeground">Your second memory</Text>
      </View>
      <View style={styles.statusGroup}>
        <View style={styles.status}>
          <Animated.View style={[styles.dot, { opacity, backgroundColor: buffer.recording ? colors.destructive : colors.mutedForeground }]} />
          <Text variant="caption" style={{ flexShrink: 1 }}>{statusLabel ?? (buffer.recording ? "Buffer on" : "Paused")}</Text>
        </View>
        <IconButton
          accessibilityLabel={buffer.recording ? "Pause buffer" : "Resume buffer"}
          disabled={toggling} onPress={onToggle}
          style={{ backgroundColor: colors.secondary, borderRadius: 24 }}
          icon={buffer.recording ? <Pause size={18} color={colors.foreground} /> : <Play size={18} color={colors.foreground} />}
        />
      </View>
    </View>
    <View style={[styles.buffer, { backgroundColor: colors.secondary, paddingRight: preview ? 116 : 16 }]}>
      <View style={styles.readout}>
        <Text variant="display" style={styles.clock}>{Math.floor(seconds / 60)}:{String(Math.floor(seconds % 60)).padStart(2, "0")}</Text>
        <Text variant="body" color="mutedForeground" style={styles.buffered}>buffered</Text>
        {!preview && <Text variant="caption" color="mutedForeground" style={styles.capacity}>{buffer.capacity} s max</Text>}
      </View>
      <View
        accessibilityRole="progressbar" accessibilityLabel="Seconds buffered"
        accessibilityValue={{ min: 0, max: buffer.capacity, now: seconds }}
        style={[styles.track, { backgroundColor: colors.border }]}
      >
        <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: colors.foreground }]} />
      </View>
      <View style={styles.scale}>
        {!preview && <Text variant="micro" color="mutedForeground">0 s</Text>}
        <Text variant="micro" color="mutedForeground">{preview ? "2 min window" : `Only the last ${buffer.capacity / 60} minutes`}</Text>
      </View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: spacing.xl },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  identity: { flex: 1, gap: spacing.xs, minWidth: 0 },
  name: { fontSize: 30, lineHeight: 36, letterSpacing: -1 },
  statusGroup: { flexDirection: "row", alignItems: "center", gap: spacing.md, maxWidth: "60%", flexShrink: 1 },
  status: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexShrink: 1 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  buffer: { padding: spacing.lg, borderRadius: 20, gap: spacing.md },
  readout: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm },
  clock: { fontSize: 40, lineHeight: 44, letterSpacing: -1.8, fontVariant: ["tabular-nums"] },
  buffered: { fontSize: 15 },
  capacity: { marginLeft: "auto" },
  track: { height: 5, borderRadius: 3, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3 },
  scale: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
});
