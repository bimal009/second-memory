import React from "react";
import { Pressable, View } from "react-native";
import { ArrowUpRight } from "lucide-react-native";
import { router } from "expo-router";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/theme/ThemeProvider";
import { GradientFrame } from "./FrameWithHighlight";
import type { Sighting } from "@/types/session";
export function SightingsTimeline({ sightings }: { sightings: Sighting[] }) {
  const { colors } = useTheme();
  return <View style={{ gap: 16 }}>{sightings.map(sighting => <Pressable key={sighting.id} accessibilityRole="button" accessibilityLabel={`${sighting.timeLabel}, ${sighting.location?.label ?? ""}`} onPress={() => router.push({ pathname: "/memory/[id]", params: { id: sighting.id } })} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 16, padding: 12, borderLeftWidth: 2, borderColor: colors.ring, opacity: pressed ? 0.7 : 1 })}><View style={{ width: 64, height: 64, overflow: "hidden", borderRadius: 10 }}><GradientFrame seed={sighting.frameSeed} /></View><View style={{ flex: 1, gap: 4 }}><Text variant="bodyMedium">{sighting.timeLabel}</Text><Text variant="caption" color="mutedForeground">{sighting.location?.label}</Text></View><ArrowUpRight accessible={false} size={24} color={colors.foreground} /></Pressable>)}</View>;
}
