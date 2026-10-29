import React, {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from "react";
import { useColorScheme } from "react-native";
import { darkColors, lightColors, type ThemeColors } from "@/theme/tokens";
import { useSettingsContext } from "@/features/settings/context";
import type { AppearanceMode } from "@/types";

type ThemeContextValue = {
  colors: ThemeColors;
  isDark: boolean;
  mode: AppearanceMode;
};

const ThemeCtx = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const { settings } = useSettingsContext();
  const system = useColorScheme();
  const isDark =
    settings.appearance === "system"
      ? system === "dark"
      : settings.appearance === "dark";
  const colors = isDark ? darkColors : lightColors;

  const value = useMemo<ThemeContextValue>(
    () => ({ colors, isDark, mode: settings.appearance }),
    [colors, isDark, settings.appearance],
  );

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeCtx);
  if (!ctx) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }
  return ctx;
}
