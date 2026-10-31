import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { ArrowLeft, BellOff, Check, X } from "lucide-react-native";
import { listReminders, setReminderStatus } from "@/api/reminders";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Text } from "@/components/ui/Text";
import { strings } from "@/constants/strings";
import { useTheme } from "@/theme/ThemeProvider";
import { iconSize, spacing, touchTarget } from "@/theme/spacing";
import type { Reminder } from "@repo/types";

export function RemindersScreen() {
    const { colors } = useTheme();
    const [reminders, setReminders] = useState<Reminder[] | null>(null);

    const load = useCallback(() => {
        void listReminders()
            .then((rows) => setReminders(rows))
            .catch(() => setReminders([]));
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const settle = useCallback((target: Reminder, status: "done" | "dismissed") => {
        void setReminderStatus(target.id, status)
            .then(load)
            .catch(() => { });
    }, [load]);

    const pending = (reminders ?? []).filter((row) => row.status === "pending");
    const settled = (reminders ?? []).filter((row) => row.status !== "pending");

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
                <Text variant="display">{strings.remindersList.title}</Text>
                <Text color="mutedForeground">
                    {strings.remindersList.subtitle.replace("{name}", strings.appName)}
                </Text>
                {reminders === null ? <ActivityIndicator/> : null}
                {reminders !== null && reminders.length === 0 ? (
                    <Text color="mutedForeground">{strings.remindersList.empty}</Text>
                ) : null}
                {pending.map((reminder) => {
                    const due = new Date(reminder.due_at);
                    return (
                        <View
                            key={reminder.id}
                            style={[styles.row, { borderColor: colors.border, backgroundColor: colors.card }]}
                        >
                            <View style={styles.rowBody}>
                                <Text variant="bodyMedium">{reminder.text}</Text>
                                <Text variant="caption" color="mutedForeground">
                                    {`${due.toLocaleString([], {
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })} · ${reminder.source}`}
                                </Text>
                            </View>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={strings.remindersList.done}
                                onPress={() => settle(reminder, "done")}
                                style={({ pressed }) => [
                                    styles.tool,
                                    { borderColor: colors.primary },
                                    pressed && { opacity: 0.7 },
                                ]}
                            >
                                <Check size={iconSize.sm + 2} color={colors.primary}/>
                            </Pressable>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={strings.remindersList.dismiss}
                                onPress={() => settle(reminder, "dismissed")}
                                style={({ pressed }) => [
                                    styles.tool,
                                    { borderColor: colors.destructive },
                                    pressed && { opacity: 0.7 },
                                ]}
                            >
                                <X size={iconSize.sm + 2} color={colors.destructive}/>
                            </Pressable>
                        </View>
                    );
                })}
                {settled.map((reminder) => (
                    <View
                        key={reminder.id}
                        style={[styles.row, styles.settled, { borderColor: colors.border }]}
                    >
                        <View style={styles.rowBody}>
                            <Text variant="bodyMedium" color="mutedForeground">
                                {reminder.text}
                            </Text>
                            <Text variant="caption" color="mutedForeground">
                                {reminder.status === "done" ? "Done" : "Dismissed"}
                            </Text>
                        </View>
                        <BellOff size={iconSize.sm + 2} color={colors.mutedForeground}/>
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
        gap: spacing.sm,
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
        padding: spacing.md,
    },
    rowBody: {
        flex: 1,
        gap: spacing.xs,
    },
    tool: {
        width: touchTarget - 6,
        height: touchTarget - 6,
        borderRadius: (touchTarget - 6) / 2,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: "center",
        justifyContent: "center",
    },
    settled: { opacity: 0.75 },
});
