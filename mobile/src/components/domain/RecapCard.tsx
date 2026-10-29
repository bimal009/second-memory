import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { GradientFrame } from "@/components/domain/FrameWithHighlight";
import type { DayRecap } from "@/types";
import { spacing } from "@/theme/spacing";
import { radius } from "@/theme/tokens";
import { strings } from "@/constants/strings";

export type RecapCardProps = {
  recap: DayRecap;
};

/** Daily summary with a horizontal strip of key moments. */
export function RecapCard({ recap }: RecapCardProps) {
  return (
    <Card padding="lg">
      <View style={styles.header}>
        <Text variant="micro" color="mutedForeground">
          {recap.dateLabel}
        </Text>
        <Text variant="heading">{recap.headline}</Text>
        <Text variant="caption" color="mutedForeground">
          {recap.summary}
        </Text>
      </View>

      <Text variant="micro" color="mutedForeground" style={styles.stripTitle}>
        {strings.today.keyMoments}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
        accessible
        accessibilityLabel={strings.today.keyMoments}
      >
        {recap.keyMoments.map((moment) => (
          <View key={moment.label} style={styles.moment}>
            <View style={styles.momentThumb}>
              <GradientFrame seed={moment.frameSeed} corners={radius.md} aspect={0.75} />
            </View>
            <Text variant="micro" numberOfLines={1} style={styles.momentLabel}>
              {moment.label}
            </Text>
            <Badge label={moment.timeLabel} tone="outline" />
          </View>
        ))}
      </ScrollView>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  stripTitle: {
    marginBottom: spacing.sm,
  },
  strip: {
    gap: spacing.md,
  },
  moment: {
    width: 88,
    gap: spacing.xs,
  },
  momentThumb: {
    width: 88,
    height: 100,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  momentLabel: {
    textAlign: "center",
  },
});
