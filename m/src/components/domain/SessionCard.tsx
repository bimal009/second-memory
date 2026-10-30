import React from "react";
import { Pressable, View } from "react-native";
import { ArrowUpRight, Video } from "lucide-react-native";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/theme/ThemeProvider";
import { GradientFrame } from "./FrameWithHighlight";
import type { Session } from "@/types/session";
import { clock } from "@/features/session/clock";
export function SessionCard({ session, onPress }: { session: Session; onPress: () => void }) {
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={session.title} onPress={onPress} style={({ pressed }) => ({ padding: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.card, gap: 12, opacity: pressed ? 0.7 : 1 })}><View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}><View style={{ width: 56, height: 56, borderRadius: 10, overflow: "hidden" }}><GradientFrame seed={session.frameSeed} /></View><View style={{ flex: 1, gap: 4 }}><Text variant="bodyMedium">{session.title}</Text><View style={{ flexDirection: "row", gap: 8 }}><Video accessible={false} size={18} color={colors.mutedForeground} /><Text variant="caption" color="mutedForeground">{clock(session.durationSec)}</Text></View></View><ArrowUpRight accessible={false} color={colors.foreground} size={24} /></View><Text variant="caption" color="mutedForeground">{session.summary}</Text></Pressable>;
}
