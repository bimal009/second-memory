import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { GradientFrame } from "./FrameWithHighlight";
import type { Memory } from "@/types";
import { darkColors, mediaColors } from "@/theme/tokens";
export function MemoryGrid({ memories, onOpen }: { memories: Memory[]; onOpen: (id: string) => void }) {
  return <View style={styles.grid}>{memories.map(memory => <Pressable key={memory.id} accessibilityRole="button" accessibilityLabel={`${memory.title}, ${memory.startedAtLabel}`} onPress={() => onOpen(memory.id)} style={({ pressed }) => [styles.tile, { opacity: pressed ? 0.65 : 1 }]}><View accessibilityElementsHidden style={StyleSheet.absoluteFill}><GradientFrame seed={memory.frameSeed} aspect={1} /></View><View style={styles.caption}><Text variant="caption" numberOfLines={2} style={{ color: darkColors.foreground }}>{memory.title}</Text><Text variant="micro" style={{ color: darkColors.foreground }}>{memory.startedAtLabel}</Text></View></Pressable>)}</View>;
}
const styles = StyleSheet.create({ grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, tile: { width: "31.5%", aspectRatio: 0.8, borderRadius: 10, overflow: "hidden", minHeight: 100, justifyContent: "flex-end" }, caption: { padding: 8, gap: 4, backgroundColor: mediaColors.strongScrim } });
