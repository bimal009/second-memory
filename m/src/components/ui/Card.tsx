import React from "react";
import { View, StyleSheet, type ViewProps } from "react-native";
import { radius } from "@/theme/tokens";
import { spacing } from "@/theme/spacing";
import { useTheme } from "@/theme/ThemeProvider";
export type CardProps = ViewProps & {
    padding?: keyof typeof spacing;
};
export function Card({ padding = "lg", style, ...rest }: CardProps) {
    const { colors } = useTheme();
    return (<View style={[
            {
                backgroundColor: colors.card,
                borderRadius: radius.lg,
                borderCurve: "continuous",
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: colors.border,
                padding: spacing[padding],
            },
            style,
        ]} {...rest}/>);
}
