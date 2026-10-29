import React from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { spacing, touchTarget, iconSize } from "@/theme/spacing";
import { radius } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";

export type IconButtonProps = {
  /** Required — icon-only controls must be announced. */
  accessibilityLabel: string;
  onPress?: () => void;
  icon: React.ReactNode;
  disabled?: boolean;
  selected?: boolean;
  /** Trims padding for tighter inline use; hit area stays ≥44px via hitSlop. */
  tight?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({
  accessibilityLabel,
  onPress,
  icon,
  disabled,
  selected,
  tight,
  style,
}: IconButtonProps) {
  const { colors } = useTheme();

  const bg = selected ? colors.primary : "transparent";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected: !!selected }}
      onPress={onPress}
      disabled={disabled}
      hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
      style={({ pressed }: { pressed: boolean }) => [
        styles.base,
        tight && styles.tight,
        { backgroundColor: bg },
        style,
        pressed && !disabled && { opacity: 0.6 },
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.iconWrap}>{icon}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: touchTarget,
    height: touchTarget,
    borderRadius: radius.base,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  tight: {
    width: iconSize.lg + spacing.lg,
    height: iconSize.lg + spacing.lg,
  },
  disabled: {
    opacity: 0.4,
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
