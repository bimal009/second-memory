import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { CalendarDays, Box, Bell } from "lucide-react-native";
import { listMemories } from "@/api/memory";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { ThumbImage } from "@/components/media/ThumbImage";
import { Text } from "@/components/ui/Text";
import { strings } from "@/constants/strings";
import { useTheme } from "@/theme/ThemeProvider";
import { iconSize, spacing, touchTarget } from "@/theme/spacing";
import { radius } from "@/theme/tokens";
import type { Memory } from "@repo/types";

const KIND_LABEL: Record<Memory["kind"], string> = {
    moment: "Saved moment",
    session_chunk: "Memory",
    session_summary: "Session summary",
};

function kindLabel(memory: Memory) {
    return KIND_LABEL[memory.kind] ?? "Memory";
}

export function MemoriesScreen() {
    const { colors } = useTheme();
    const [memories, setMemories] = useState<Memory[] | null>(null);
    const [failed, setFailed] = useState(false);

    const load = useCallback(() => {
        void listMemories(30)
            .then((rows) => {
                setMemories(rows);
                setFailed(false);
            })
            .catch(() => setFailed(true));
    }, []);

    const retry = useCallback(() => {
        setFailed(false);
        load();
    }, [load]);

    useEffect(() => {
        load();
    }, [load]);

    const links = [
        {
            icon: <CalendarDays size={iconSize.md - 4} color={colors.primary}/>,
            label: strings.library.today,
            href: "/recap",
        },
        {
            icon: <Box size={iconSize.md - 4} color={colors.primary}/>,
            label: strings.library.objects,
            href: "/objects",
        },
        {
            icon: <Bell size={iconSize.md - 4} color={colors.primary}/>,
            label: strings.library.reminders,
            href: "/reminders",
        },
    ];

    return (
        <ScreenContainer scroll>
            <View style={styles.gap}>
                <View style={styles.header}>
                    <Text variant="display">{strings.library.title}</Text>
                    <Text color="mutedForeground">
                        {strings.library.subtitle.replace("{name}", strings.appName)}
                    </Text>
                </View>
                <View style={styles.linksRow}>
                    {links.map((link) => (
                        <Pressable
                            key={link.href}
                            accessibilityRole="button"
                            style={({ pressed }) => [
                                styles.linkCard,
                                { borderColor: colors.border, backgroundColor: colors.card },
                                pressed && { opacity: 0.7 },
                            ]}
                            onPress={() => router.push(link.href as never)}
                        >
                            {link.icon}
                            <Text variant="caption">{link.label}</Text>
                        </Pressable>
                    ))}
                </View>
                {memories === null && !failed ? (
                    <ActivityIndicator style={styles.loader}/>
                ) : null}
                {failed ? (
                    <View style={styles.gap}>
                        <Text color="destructive">{`Memories didn't load.`}</Text>
                        <Button label="Retry" variant="ghost" onPress={retry}/>
                    </View>
                ) : null}
                {memories?.length === 0 ? (
                    <Card>
                        <View style={styles.gap}>
                            <Text variant="bodyMedium">No memories yet</Text>
                            <Text color="mutedForeground">
                                Run a capture on the camera screen and notes will show up here.
                            </Text>
                        </View>
                    </Card>
                ) : null}
                {memories?.map((memory) => {
                    const thumb = memory.media.find((m) => m.kind === "thumbnail");
                    const time = new Date(memory.occurred_at).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                    });
                    return (
                        <Pressable
                            key={memory.id}
                            accessibilityRole="button"
                            onPress={() => router.push({ pathname: "/memory-detail", params: { id: memory.id } })}
                            style={({ pressed }) => [
                                styles.row,
                                { borderColor: colors.border, backgroundColor: colors.card },
                                pressed && { opacity: 0.7 },
                            ]}
                        >
                            <ThumbImage mediaId={thumb?.id ?? null} height={64} style={styles.rowThumb}/>
                            <View style={styles.rowBody}>
                                <Text variant="micro" color="mutedForeground">
                                    {`${kindLabel(memory)} · ${time}`}
                                </Text>
                                <Text variant="bodyMedium" numberOfLines={3}>
                                    {memory.note}
                                </Text>
                                {memory.tags[0] ? (
                                    <Text variant="caption" color="mutedForeground" numberOfLines={1}>
                                        {memory.tags.slice(0, 4).join(" · ")}
                                    </Text>
                                ) : null}
                            </View>
                        </Pressable>
                    );
                })}
            </View>
        </ScreenContainer>
    );
}
const styles = StyleSheet.create({
    gap: { gap: spacing.md },
    header: { gap: spacing.xs },
    linksRow: {
        flexDirection: "row",
        gap: spacing.sm,
    },
    linkCard: {
        flex: 1,
        borderRadius: radius.md,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.xs,
        height: touchTarget + spacing.sm,
    },
    row: {
        flexDirection: "row",
        gap: spacing.md,
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        padding: spacing.md,
    },
    rowThumb: {
        width: 84,
        height: 64,
        borderRadius: radius.md,
    },
    rowBody: {
        flex: 1,
        gap: spacing.xs,
    },
    loader: { paddingVertical: spacing.xl },
});
