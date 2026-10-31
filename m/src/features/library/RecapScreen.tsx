import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { getRecap } from "@/api/library";
import { Card } from "@/components/ui/Card";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Text } from "@/components/ui/Text";
import { strings } from "@/constants/strings";
import { useTheme } from "@/theme/ThemeProvider";
import { iconSize, spacing, touchTarget } from "@/theme/spacing";
import type { Recap } from "@repo/types";

export function RecapScreen() {
    const { colors } = useTheme();
    const [recap, setRecap] = useState<Recap | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;
        void getRecap()
            .then((row) => {
                if (alive)
                    setRecap(row);
            })
            .catch(() => {
                if (alive)
                    setRecap(null);
            })
            .finally(() => {
                if (alive)
                    setLoading(false);
            });
        return () => {
            alive = false;
        };
    }, []);

    return (
        <ScreenContainer scroll>
            <View style={styles.gap}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={strings.common.back}
                    onPress={() => router.back()}
                    style={({ pressed }) => [
                        styles.back,
                        { borderColor: colors.border, backgroundColor: colors.card },
                        pressed && { opacity: 0.7 },
                    ]}
                >
                    <ArrowLeft size={iconSize.md - 4} color={colors.foreground}/>
                </Pressable>
                <Text variant="display">{strings.recap.title}</Text>
                {loading ? <ActivityIndicator/> : null}
                {!loading && !recap ? (
                    <Text color="mutedForeground">{strings.recap.empty}</Text>
                ) : null}
                {recap ? (
                    <View style={styles.gap}>
                        <Text variant="micro" color="mutedForeground">
                            {recap.day}
                        </Text>
                        {recap.summary ? (
                            <Card>
                                <View style={styles.gap}>
                                    <Text variant="micro" color="mutedForeground">
                                        {strings.recap.title}
                                    </Text>
                                    <Text variant="bodyMedium">{recap.summary}</Text>
                                </View>
                            </Card>
                        ) : null}
                        {recap.highlights.length > 0 ? (
                            <View style={styles.gap}>
                                <Text variant="micro" color="mutedForeground">
                                    HIGHLIGHTS
                                </Text>
                                {recap.highlights.map((highlight, i) => (
                                    <Text key={`${i}-${highlight.slice(0, 12)}`} variant="bodyMedium">
                                        {`· ${highlight}`}
                                    </Text>
                                ))}
                            </View>
                        ) : null}
                    </View>
                ) : null}
            </View>
        </ScreenContainer>
    );
}
const styles = StyleSheet.create({
    gap: { gap: spacing.md },
    back: {
        width: touchTarget,
        height: touchTarget,
        borderRadius: touchTarget / 2,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: "center",
        justifyContent: "center",
    },
});
