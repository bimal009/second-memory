import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { ArrowLeft, Trash2 } from "lucide-react-native";
import { listTrackedObjects, untrackObject } from "@/api/library";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Text } from "@/components/ui/Text";
import { strings } from "@/constants/strings";
import { useTheme } from "@/theme/ThemeProvider";
import { iconSize, spacing, touchTarget } from "@/theme/spacing";
import type { TrackedObject } from "@repo/types";

export function TrackedScreen() {
    const { colors } = useTheme();
    const [objects, setObjects] = useState<TrackedObject[] | null>(null);

    const load = useCallback(() => {
        void listTrackedObjects()
            .then((rows) => setObjects(rows))
            .catch(() => setObjects([]));
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const untrack = useCallback((target: TrackedObject) => {
        Alert.alert(
            strings.trackedList.untrack,
            strings.trackedList.untrackBody,
            [
                { text: strings.common.cancel, style: "cancel" },
                {
                    text: strings.common.confirm,
                    style: "destructive",
                    onPress: () => {
                        void untrackObject(target.id)
                            .then(load)
                            .catch(() => { });
                    },
                },
            ],
        );
    }, [load]);

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
                <Text variant="display">{strings.trackedList.title}</Text>
                <Text color="mutedForeground">
                    {strings.trackedList.subtitle.replace("{name}", strings.appName)}
                </Text>
                {objects === null ? <ActivityIndicator/> : null}
                {objects?.length === 0 ? (
                    <Text color="mutedForeground">{strings.trackedList.empty}</Text>
                ) : null}
                {objects?.map((object) => (
                    <View
                        key={object.id}
                        style={[styles.row, { borderColor: colors.border, backgroundColor: colors.card }]}
                    >
                        <View style={styles.rowBody}>
                            <Text variant="bodyMedium">{object.label}</Text>
                            {object.last_nudged_at ? (
                                <Text variant="caption" color="mutedForeground">
                                    {`Last nudge ${new Date(object.last_nudged_at).toLocaleString([], {
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}`}
                                </Text>
                            ) : null}
                        </View>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={strings.trackedList.untrack}
                            onPress={() => untrack(object)}
                            style={({ pressed }) => [
                                styles.untrack,
                                { borderColor: colors.destructive },
                                pressed && { opacity: 0.7 },
                            ]}
                        >
                            <Trash2 size={iconSize.sm + 2} color={colors.destructive}/>
                        </Pressable>
                    </View>
                ))}
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
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
        padding: spacing.md,
    },
    rowBody: {
        flex: 1,
        gap: spacing.xs,
    },
    untrack: {
        width: touchTarget,
        height: touchTarget,
        borderRadius: touchTarget / 2,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: "center",
        justifyContent: "center",
    },
});
