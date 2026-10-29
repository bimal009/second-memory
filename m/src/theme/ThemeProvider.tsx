import React, {
  createContext,
  useContext,
  type PropsWithChildren,
} from "react";
import { lightColors, type ThemeColors } from "@/theme/tokens";
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
  return <ThemeCtx.Provider value={lightTheme}>{children}</ThemeCtx.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeCtx);
  if (!ctx) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }
  return ctx;
}
