/** 4/8dp spacing rhythm per the pro-rules layout checklist. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Minimum touch target (iOS 44pt / Android 48dp — we use the stricter 48). */
export const touchTarget = 48;

/** Consistent icon-size tokens (pro-rules: no arbitrary sizes). */
export const iconSize = {
  sm: 18,
  md: 24,
  lg: 32,
} as const;
