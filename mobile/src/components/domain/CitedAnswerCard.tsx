import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { Badge } from "@/components/ui/Badge";
import { GradientFrame, HighlightPolygon } from "@/components/domain/FrameWithHighlight";
import { LocationCard } from "@/components/domain/LocationCard";
import { interpolate } from "@/components/domain/BufferMeter";
import type { Answer, MemoryLocation } from "@/types";
import { limeDeep, radius } from "@/theme/tokens";
import { spacing } from "@/theme/spacing";
import { useTheme } from "@/theme/ThemeProvider";
import { strings } from "@/constants/strings";

export type CitedAnswerCardProps = {
  answer: Answer;
  location?: MemoryLocation;
  /** Dynamic Type is respected via ui/Text; override for the small answer. */
};

/**
 * Voice answer with a dominant frame + semi-transparent lime highlight
 * polygon drawn from the mock mask points (react-native-svg).
 */
export function CitedAnswerCard({ answer, location }: CitedAnswerCardProps) {
  const { colors } = useTheme();
  const [highlightOn, setHighlightOn] = useState(true);

  const stroke = colors.isDark ? colors.primary : limeDeep;
  const ToggleIcon = highlightOn ? EyeOff : Eye;

  return (
    <Card padding="lg">
      <View style={styles.headerRow}>
        <Badge label={strings.ask.answerBadge} tone="lime" />
      </View>
      <View style={styles.frameWrap}>
        <View style={styles.frame}>
          <GradientFrame seed={answer.frameSeed} aspect={4 / 3} corners={radius.base} />
        </View>
        {highlightOn ? (
          <View style={ABS_FILL} pointerEvents="none">
            <HighlightPolygon
              mask={answer.highlightMask}
              aspect={4 / 3}
              stroke={stroke}
              fill="rgba(163, 230, 53, 0.28)"
            />
          </View>
        ) : null}
      </View>

      <View style={styles.metaRow}>
        <Text variant="micro" color="mutedForeground">
          {interpolate(strings.ask.at, { time: answer.timeLabel })}
        </Text>
        <View style={styles.grow} />
        <TogglePressable
          label={highlightOn ? strings.memories.detail.highlightOn : strings.memories.detail.highlightOff}
          onPress={() => setHighlightOn((v) => !v)}
          icon={<ToggleIcon size={16} color={colors.foreground} />}
        />
      </View>

      {location ? <LocationCard location={location} /> : null}

      <Text variant="caption" color="mutedForeground">
        {answer.text}
      </Text>
    </Card>
  );
}

function TogglePressable({
  label,
  onPress,
  icon,
}: {
  label: string;
  onPress: () => void;
  icon: React.ReactNode;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[styles.toggle, pressed && { opacity: 0.7 }]}
    >
      {icon}
      <Text variant="micro">{label}</Text>
    </Pressable>
  );
}

const ABS_FILL = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
} as const;

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    marginBottom: spacing.sm,
  },
  frameWrap: {
    position: "relative",
    aspectRatio: 4 / 3,
    borderRadius: radius.base,
    overflow: "hidden",
  },
  frame: ABS_FILL,
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  grow: { flex: 1 },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
});