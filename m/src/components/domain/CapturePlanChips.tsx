import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  useReducedMotion,
} from "react-native-reanimated";
import { Scissors, MapPin, FileText } from "lucide-react-native";
import { Chip } from "@/components/ui/Chip";
import { Text } from "@/components/ui/Text";
import type { CapturePlan } from "@/types";
import { limeDeep } from "@/theme/tokens";
import { spacing } from "@/theme/spacing";
import { useTheme } from "@/theme/ThemeProvider";
import { strings } from "@/constants/strings";

export type CapturePlanChipsProps = {
  plan: CapturePlan;
  onToggleClip: (on: boolean) => void;
  onToggleLocation: (on: boolean) => void;
  onEditNote: () => void;
};

/** Post-command confirmation: Clip -20s/+10s · Location · Note. */
export function CapturePlanChips({
  plan,
  onToggleClip,
  onToggleLocation,
  onEditNote,
}: CapturePlanChipsProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const appear = useSharedValue(0);

  useEffect(() => {
    appear.value = withTiming(1, { duration: reduced ? 0 : 200 });
  }, [appear, reduced]);

  const container = useAnimatedStyle(() => ({
    opacity: appear.value,
    transform: [{ translateY: (1 - appear.value) * 12 }],
  }));

  const iconColor = colors.isDark ? colors.primary : limeDeep;

  return (
    <Animated.View
      accessibilityLabel={strings.capture.planTitle}
      style={[container, styles.wrap]}
    >
      <Text variant="micro" color="mutedForeground">
        {strings.capture.planTitle}
      </Text>
      <View style={styles.row}>
        <Chip
          label={strings.capture.planClip}
          icon={<Scissors size={14} color={iconColor} />}
          selected={plan.clip}
          onPress={() => onToggleClip(!plan.clip)}
        />
        <Chip
          label={strings.capture.planLocation}
          icon={<MapPin size={14} color={iconColor} />}
          selected={plan.includeLocation}
          onPress={() => onToggleLocation(!plan.includeLocation)}
        />
        <Chip
          label={strings.capture.planNote}
          icon={<FileText size={14} color={iconColor} />}
          selected={plan.note !== null}
          onPress={onEditNote}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
  },
});
