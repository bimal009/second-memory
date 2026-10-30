import React from "react";
import { Text as RNText, type TextProps as RNTextProps } from "react-native";
import { textStyles } from "@/theme/typography";
import { useTheme } from "@/theme/ThemeProvider";

export type TextVariant = keyof typeof textStyles;

export type AppTextProps = RNTextProps & {
  variant?: TextVariant;
  /** Token key ("mutedForeground") or literal hex. */
  color?: string;
  align?: "left" | "center" | "right";
  /** Dynamic Type support; zero means no scaling cap. */
  maxFontSizeMultiplier?: number;
};

export function Text({
  variant = "body",
  color,
  align,
  maxFontSizeMultiplier = 0,
  style,
  ...rest
}: AppTextProps) {
  const { colors } = useTheme();

  const colorValue =
    color && color.startsWith("#")
      ? color
      : color
        ? (colors as unknown as Record<string, string>)[color]
        : colors.foreground;

  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        textStyles[variant],
        { color: colorValue },
        align ? { textAlign: align } : null,
        style,
      ]}
      {...rest}
    />
  );
}
