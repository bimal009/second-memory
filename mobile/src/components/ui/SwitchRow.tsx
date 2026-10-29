import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { spacing } from "@/theme/spacing";
import { radius } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";
import { useHaptics } from "@/hooks/useHaptics";

export type SwitchRowProps = {
  label: string;
  sublabel?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  /** e.g. "Coming soon" next to the switch. */
  note?: string;
  destructive?: boolean;
};

export function SwitchRow({
  label,
  sublabel,
  value,
  onValueChange,
  disabled,
  note,
  destructive,
}: SwitchRowProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();

  const handle = () => {
    haptics.light();
    onValueChange(!value);
  };

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={sublabel}
      accessibilityState={{ disabled, checked: value }}
      onPress={handle}
      disabled={disabled}
      hitSlop={{ top: spacing.sm, bottom: spacing.sm }}
    >
      <View style={styles.row}>
        <View style={styles.textBlock}>
          <View style={styles.titleRow}>
            <Text
              variant="bodyMedium"
              color={destructive ? "destructive" : "foreground"}
            >
              {label}
            </Text>
            {note ? (
              <View style={[styles.note, { backgroundColor: colors.muted }]}>
                <Text variant="micro" color="mutedForeground">
                  {note}
                </Text>
              </View>
            ) : null}
          </View>
          {sublabel ? (
            <Text variant="caption" color="mutedForeground">
              {sublabel}
            </Text>
          ) : null}
        </View>
        <Switch value={value} onToggle={handle} disabled={disabled} />
      </View>
    </Pressable>
  );
}

function Switch({
  value,
  onToggle,
  disabled,
}: {
  value: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const bg = value ? colors.primary : colors.secondary;
  const knob = value ? colors.primaryForeground : "transparent";

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel=""
      onPress={onToggle}
      disabled={disabled}
      hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
      style={[
        styles.track,
        { backgroundColor: bg },
        disabled && { opacity: 0.4 },
      ]}
    >
      <View
        style={[
          styles.knob,
          knob
            ? { backgroundColor: knob }
            : { borderWidth: 2, borderColor: colors.ring, backgroundColor: "#FFFFFF" },
          value ? styles.knobRight : styles.knobLeft,
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.lg,
    minHeight: 44,
    paddingVertical: spacing.sm,
  },
  textBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  note: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  track: {
    width: 48,
    height: 30,
    borderRadius: 15,
    padding: 2,
    justifyContent: "center",
  },
  knob: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  knobLeft: {
    alignSelf: "flex-start",
  },
  knobRight: {
    alignSelf: "flex-end",
  },
});
