import React, { forwardRef } from "react";
import { Text as RNText, StyleSheet, type TextProps as RNTextProps } from "react-native";
import { textStyles } from "@/theme/typography";
import { useTheme } from "@/theme/ThemeProvider";
import type { ThemeColors } from "@/theme/tokens";

export type TextVariant = keyof typeof textStyles;

export type AppTextProps = RNTextProps & {
  variant?: TextVariant;
  color?: keyof ThemeColors | string;
  weight?: "regular" | "medium" | "semiBold" | "bold" | "extraBold";
  align?: "left" | "center" | "right";
  /** Dynamic Type support; keeps layout stable by scaling max +40%. */
  maxFontSizeMultiplier?: number;
};

export const Text = forwardRef<RNText, AppTextProps>(function AppText(
  {
    variant = "body",
    color,
    weight,
    align,
    maxFontSizeMultiplier = 1.4,
    style,
    ...rest
  },
  ref,
) {
  const { colors } = useTheme();

  const fontSizeKey = variant;
  const colorValue =
    typeof color === "string" && color.startsWith("#")
      ? color
      : color
        ? (colors as Record<string, string>)[color]
        : undefined;

  return (
    <RNText
      ref={ref}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        textStyles[fontSizeKey],
        colorValue ? { color: colorValue } : { color: colors.foreground },
        weight
          ? {
              fontFamily: {
                regular: textStyles.body.fontFamily,
                medium: textStyles.bodyMedium.fontFamily,
                semiBold: textStyles.heading.fontFamily,
                bold: textStyles.title.fontFamily,
                extraBold: textStyles.display.fontFamily,
              }[weight],
            }
          : null,
        align ? { textAlign: align } : null,
        style,
      ]}
      {...rest}
    />
  );
});
