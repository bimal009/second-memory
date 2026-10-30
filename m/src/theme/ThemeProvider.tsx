import React, {
  createContext,
  useContext,
  type PropsWithChildren,
} from "react";
import { useColorScheme } from "react-native";
import { lightColors, darkColors, type ThemeColors } from "@/theme/tokens";
import { usePreferences } from "@/lib/preferences";
import type { AppearanceMode } from "@/types";

type ThemeContextValue = {
  colors: ThemeColors;
  isDark: boolean;
  mode: AppearanceMode;
};

const ThemeCtx = createContext<ThemeContextValue | null>(null);
const lightTheme: ThemeContextValue = {
  colors: lightColors,
  isDark: false,
  mode: "light",
};

export function ThemeProvider({ children }: PropsWithChildren) {
  const { settings } = usePreferences();
  const system = useColorScheme();
  const isDark = settings.appearance === "dark" || (settings.appearance === "system" && system === "dark");
  return <ThemeCtx.Provider value={{ colors: isDark ? darkColors : lightColors, isDark, mode: settings.appearance }}>{children}</ThemeCtx.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeCtx);
  if (!ctx) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }
  return ctx;
}
