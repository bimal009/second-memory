import React from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { GradientFrame } from "./FrameWithHighlight";
import { useTheme } from "@/theme/ThemeProvider";
import { clock } from "@/features/session/clock";
import type { Chunk } from "@/types/run";
import { captureCopy as c } from "@/constants/strings";
export function ChunkTimeline({ chunks, onOpen }: { chunks: Chunk[]; onOpen: (id: string) => void }) {
  const { colors } = useTheme();
  return <View style={{ gap: 12 }}>{chunks.map(chunk => <Pressable key={chunk.id} accessibilityRole="button" accessibilityLabel={clock(chunk.seconds) + ": " + chunk.text} accessibilityHint={c.openMemory} onPress={() => onOpen(chunk.memoryId)} style={({ pressed }) => ({ flexDirection: "row", gap: 12, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.7 : 1 })}><View style={{ width: 64, height: 64, borderRadius: 10, overflow: "hidden" }}><GradientFrame seed={chunk.frameSeed} /></View><View style={{ flex: 1, gap: 8 }}><Text variant="caption" color="mutedForeground">{clock(chunk.seconds)}</Text><Text>{chunk.text}</Text></View></Pressable>)}</View>;
}
