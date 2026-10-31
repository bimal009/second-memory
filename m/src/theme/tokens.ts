export type ThemeColors = {
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    destructive: string;
    destructiveForeground: string;
    border: string;
    input: string;
    ring: string;
    overlay: string;
    isDark: boolean;
};
export const lightColors: ThemeColors = {
    background: "#FFFFFF",
    foreground: "#0A0A0A",
    card: "#FFFFFF",
    cardForeground: "#0A0A0A",
    primary: "#A3E635",
    primaryForeground: "#365314",
    secondary: "#F4F4F5",
    secondaryForeground: "#18181B",
    muted: "#F5F5F5",
    mutedForeground: "#737373",
    accent: "#F5F5F5",
    accentForeground: "#18181B",
    destructive: "#DC2626",
    destructiveForeground: "#FFFFFF",
    border: "#E5E5E5",
    input: "#E5E5E5",
    ring: "#A3A3A3",
    overlay: "rgba(10, 10, 10, 0.45)",
    isDark: false,
} as const satisfies ThemeColors;
export const darkColors = {
    background: "#0A0A0A",
    foreground: "#FAFAFA",
    card: "#171717",
    cardForeground: "#FAFAFA",
    primary: "#84CC16",
    primaryForeground: "#1A2E05",
    secondary: "#27272A",
    secondaryForeground: "#FAFAFA",
    muted: "#262626",
    mutedForeground: "#A3A3A3",
    accent: "#262626",
    accentForeground: "#FAFAFA",
    destructive: "#F87171",
    destructiveForeground: "#1A2E05",
    border: "rgba(255, 255, 255, 0.10)",
    input: "rgba(255, 255, 255, 0.15)",
    ring: "#737373",
    overlay: "rgba(0, 0, 0, 0.55)",
    isDark: true,
} as const satisfies ThemeColors;
export const mediaColors = {
    heroBackground: "#0A0A0A",
    scrim: "#000000",
    buttonBg: "rgba(255,255,255,0.16)",
    foreground: "#FAFAFA",
    toastLime: "#BEF264",
    toastText: "#365314",
    decoLight: "rgba(255,255,255,0.14)",
    decoDark: "rgba(10,10,10,0.10)",
    captionFaint: "rgba(255,255,255,0.85)",
    hintFaint: "rgba(255,255,255,0.5)",
    sheetBorder: "rgba(255,255,255,0.1)",
    strongScrim: "rgba(10,10,10,0.88)",
    dimScrim: "rgba(0,0,0,0.8)",
} as const;
export const highlightFill = "rgba(163, 230, 53, 0.28)" as const;
export const limeDeep = "#4D7C0F" as const;
export const chartColors = [
    "#BEF264",
    "#84CC16",
    "#65A30D",
    "#4D7C0F",
    "#3F6212",
] as const;
export const radius = {
    sm: 10,
    md: 10,
    base: 10,
    lg: 10,
    pill: 999,
} as const;
export const motion = {
    fast: 150,
    base: 200,
    slow: 250,
    sheet: 300,
    easing: "ease-out",
} as const;
