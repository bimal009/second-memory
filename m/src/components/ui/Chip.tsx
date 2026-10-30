import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { radius } from "@/theme/tokens";
import { spacing, touchTarget } from "@/theme/spacing";
import { useTheme } from "@/theme/ThemeProvider";

export type ChipProps = {
  label: string;
  icon?: React.ReactNode;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
};

export function Chip({ label, icon, selected, disabled, onPress }: ChipProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected: !!selected }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.primary : colors.secondary,
          borderColor: selected ? "transparent" : colors.border,
          opacity: pressed && !disabled ? 0.75 : disabled ? 0.45 : 1,
        },
      ]}
    >
      <View style={styles.row}>
        {icon}
        <Text
          variant="micro"
          style={{
            color: selected ? colors.primaryForeground : colors.secondaryForeground,
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: touchTarget,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    borderCurve: "continuous",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
});
