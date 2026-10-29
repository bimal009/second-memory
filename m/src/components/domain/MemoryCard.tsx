import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { MapPin } from "lucide-react-native";
import { Text } from "@/components/ui/Text";
import { Badge } from "@/components/ui/Badge";
import { GradientFrame } from "@/components/domain/FrameWithHighlight";
import type { Memory } from "@/types";
import { radius } from "@/theme/tokens";
import { spacing } from "@/theme/spacing";
import { useTheme } from "@/theme/ThemeProvider";

export type MemoryCardProps = {
  memory: Memory;
  onPress: () => void;
  /** e.g. "Today" row group label handled by the list — card shows time only. */
};

export function MemoryCard({ memory, onPress }: MemoryCardProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={memory.title}
      accessibilityHint="Open memory detail"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && { opacity: 0.8 },
      ]}
    >
      <View style={styles.thumb}>
        <GradientFrame seed={memory.frameSeed} corners={8} />
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text variant="bodyMedium" color="foreground" numberOfLines={1}>
            {memory.title}
          </Text>
          <Text variant="micro" color="mutedForeground">
            {memory.startedAtLabel}
          </Text>
        </View>
        <Text variant="caption" color="mutedForeground" numberOfLines={2}>
          {memory.summary}
        </Text>
        <View style={styles.metaRow}>
          {memory.clipDurationSec ? (
            <Badge label={`${memory.clipDurationSec}s clip`} tone="outline" />
          ) : null}
          {memory.location ? (
            <View style={[styles.locationChip, { backgroundColor: colors.secondary }]}>
              <MapPin size={12} color={colors.mutedForeground} />
              <Text variant="micro" color="mutedForeground" numberOfLines={1}>
                {memory.location.label}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderCurve: "continuous",
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  body: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
    marginTop: 2,
  },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
});
