import React, { useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { ImageOff } from "lucide-react-native";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/theme/ThemeProvider";
import { highlightFill, limeDeep } from "@/theme/tokens";
import type { Highlight } from "@/types/demo";

export function MemoryFrame({ uri, highlight, label = "Memory frame", compact = false }: { uri?: string; highlight?: Highlight; label?: string; compact?: boolean }) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  return <View style={[styles.frame, { backgroundColor: colors.secondary }, compact && styles.compact]}>
    {uri && !failed ? <Image accessibilityLabel={label} source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setFailed(true)} /> : <View style={styles.fallback}><ImageOff size={24} color={colors.mutedForeground} />{!compact && <Text variant="caption" color="mutedForeground">{uri ? "Frame unavailable" : "Text memory"}</Text>}</View>}
    {uri && !failed && highlight && <View pointerEvents="none" style={[styles.highlight, { left: `${highlight.x * 100}%`, top: `${highlight.y * 100}%`, width: `${highlight.w * 100}%`, height: `${highlight.h * 100}%`, backgroundColor: highlightFill, borderColor: limeDeep }]} />}
  </View>;
}
const styles = StyleSheet.create({ frame: { width: "100%", aspectRatio: 1.5, borderRadius: 16, overflow: "hidden" }, compact: { width: 72, height: 72, aspectRatio: 1, borderRadius: 12 }, fallback: { flex: 1, gap: 8, alignItems: "center", justifyContent: "center" }, highlight: { position: "absolute", borderWidth: 2, borderRadius: 10 } });
