export const fontFamilies = {
    regular: "Inter_400Regular",
    medium: "Inter_500Medium",
    semiBold: "Inter_600SemiBold",
    bold: "Inter_700Bold",
    extraBold: "Inter_800ExtraBold",
} as const;
export type FontFamilyName = (typeof fontFamilies)[keyof typeof fontFamilies];
export const fontSizes = {
    xs: 12,
    sm: 13,
    base: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    display: 34,
} as const;
export const lineHeights = {
    tight: 1.2,
    snug: 1.3,
    normal: 1.5,
} as const;
export const textStyles = {
    display: {
        fontFamily: fontFamilies.extraBold,
        fontSize: fontSizes.display,
        lineHeight: fontSizes.display * lineHeights.tight,
    },
    title: {
        fontFamily: fontFamilies.bold,
        fontSize: fontSizes.xl,
        lineHeight: fontSizes.xl * lineHeights.tight,
    },
    heading: {
        fontFamily: fontFamilies.semiBold,
        fontSize: fontSizes.lg,
        lineHeight: fontSizes.lg * lineHeights.snug,
    },
    body: {
        fontFamily: fontFamilies.regular,
        fontSize: fontSizes.base,
        lineHeight: fontSizes.base * lineHeights.normal,
    },
    bodyMedium: {
        fontFamily: fontFamilies.medium,
        fontSize: fontSizes.base,
        lineHeight: fontSizes.base * lineHeights.normal,
    },
    caption: {
        fontFamily: fontFamilies.regular,
        fontSize: fontSizes.sm,
        lineHeight: fontSizes.sm * lineHeights.normal,
    },
    micro: {
        fontFamily: fontFamilies.medium,
        fontSize: fontSizes.xs,
        lineHeight: fontSizes.xs * lineHeights.snug,
    },
} as const;
