import React from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Text } from "@/components/ui/Text";
import { limeDeep, mediaColors, radius } from "@/theme/tokens";
import { spacing, touchTarget } from "@/theme/spacing";
import { useTheme } from "@/theme/ThemeProvider";
import type { ThemeColors } from "@/theme/tokens";

export type ButtonVariant =
  "primary" | "secondary" | "ghost" | "danger" | "onMedia";
export type ButtonSize = "md" | "lg";

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

function resolveColors(
  colors: ThemeColors,
  variant: ButtonVariant,
): { bg: string; fg: string; border?: string } {
  switch (variant) {
    case "primary":
      return { bg: colors.primary, fg: colors.primaryForeground };
    case "secondary":
      return { bg: colors.secondary, fg: colors.secondaryForeground };
    case "ghost":
      // Lime text on white fails 4.5:1 — use deep lime instead.
      return {
        bg: "transparent",
        fg: colors.isDark ? colors.primary : limeDeep,
      };
    case "danger":
      return {
        bg: "transparent",
        fg: colors.destructive,
        border: colors.destructive,
      };
    case "onMedia":
      return { bg: mediaColors.buttonBg, fg: mediaColors.foreground };
  }
}

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  disabled,
  loading,
  fullWidth,
  accessibilityHint,
  style,
}: ButtonProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const scheme = resolveColors(colors, variant);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        size === "lg" && styles.lg,
        {
          backgroundColor: scheme.bg,
          borderColor: scheme.border,
          alignSelf: fullWidth ? "stretch" : "auto",
        },
        style,
        pressed && !disabled && !loading && { opacity: 0.72 },
        (disabled || loading) && styles.disabled,
      ]}
    >
      {loading && !reducedMotion ? (
        <ActivityIndicator color={scheme.fg} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text variant="bodyMedium" style={{ color: scheme.fg }}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchTarget,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.base,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  lg: {
    minHeight: 56,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
  },
  disabled: {
    opacity: 0.5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
});
