import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Play } from "lucide-react-native";
import { getMemory } from "@/api/memory";
import { playLocalClipForMemory } from "@/lib/clipLaunch";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { ThumbImage } from "@/components/media/ThumbImage";
import { Text } from "@/components/ui/Text";
import { strings } from "@/constants/strings";
import { useTheme } from "@/theme/ThemeProvider";
import { iconSize, spacing, touchTarget } from "@/theme/spacing";
import type { Memory } from "@repo/types";

function clockLabel(offsetMs: number | null | undefined) {
    if (offsetMs === null || offsetMs === undefined)
        return null;
    const total = Math.floor(offsetMs / 1000);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function BackButton() {
    const { colors } = useTheme();
    return (
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
    );
}

export function MemoryDetailScreen() {
    const { colors } = useTheme();
    const params = useLocalSearchParams<{ id: string }>();
    const [memory, setMemory] = useState<Memory | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!params.id)
            return;
        let alive = true;
        void getMemory(params.id)
            .then((row) => {
                if (alive)
                    setMemory(row);
            })
            .catch(() => {
                if (alive)
                    setFailed(true);
            });
        return () => {
            alive = false;
        };
    }, [params.id]);

    const playClip = useCallback(async () => {
        if (!params.id)
            return;
        await playLocalClipForMemory(params.id);
    }, [params.id]);

    if (failed) {
        return (
            <ScreenContainer>
                <View style={styles.gap}>
                    <BackButton/>
                    <Text color="destructive">{`Memory didn't load.`}</Text>
                </View>
            </ScreenContainer>
        );
    }
    if (!memory) {
        return (
            <ScreenContainer>
                <ActivityIndicator style={styles.loader}/>
            </ScreenContainer>
        );
    }
    const frames = memory.media
        .filter((mediaRow) => mediaRow.kind === "frame")
        .slice(0, 12);
    const thumbByParent = new Map(memory.media
        .filter((mediaRow) => mediaRow.kind === "thumbnail")
        .map((mediaRow) => [mediaRow.parent_id, mediaRow.id] as const));
    const time = new Date(memory.occurred_at).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
    return (
        <ScreenContainer scroll>
            <View style={styles.gap}>
                <BackButton/>
                <Text variant="micro" color="mutedForeground">
                    {`${memory.kind === "session_summary" ? "SESSION SUMMARY" : "MEMORY"} · ${time}`}
                </Text>
                <Text variant="display">{memory.note}</Text>
                {memory.description ? (
                    <Text variant="bodyMedium">{memory.description}</Text>
                ) : null}
                {memory.tags.length > 0 ? (
                    <Text color="mutedForeground" variant="caption">
                        {memory.tags.join(" · ")}
                    </Text>
                ) : null}
                {memory.transcript ? (
                    <Card>
                        <View style={styles.gap}>
                            <Text variant="micro" color="mutedForeground">
                                {strings.memories.detail.transcriptTitle}
                            </Text>
                            <Text variant="bodyMedium">{memory.transcript}</Text>
                        </View>
                    </Card>
                ) : null}
                {memory.chunk_idx !== null ? (
                    <Button
                        label={strings.memories.detail.playClip}
                        variant="secondary"
                        icon={<Play size={18} color={colors.primary}/>}
                        onPress={() => void playClip()}
                    />
                ) : null}
                {frames.length > 0 ? (
                    <View style={styles.gap}>
                        <Text variant="micro" color="mutedForeground">
                            {strings.library.framesTitle}
                        </Text>
                        {frames.map((frame) => (
                            <View key={frame.id} style={styles.gap}>
                                <ThumbImage
                                    mediaId={thumbByParent.get(frame.id) ?? null}
                                    height={180}
                                />
                                {clockLabel(frame.offset_ms) ? (
                                    <Text variant="caption" color="mutedForeground">
                                        {clockLabel(frame.offset_ms)}
                                    </Text>
                                ) : null}
                            </View>
                        ))}
                    </View>
                ) : (
                    <Text color="mutedForeground">{strings.library.noFrames}</Text>
                )}
            </View>
        </ScreenContainer>
    );
}
const styles = StyleSheet.create({
    gap: { gap: spacing.md },
    loader: { paddingVertical: spacing.xl },
    back: {
        width: touchTarget,
        height: touchTarget,
        borderRadius: touchTarget / 2,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: "center",
        justifyContent: "center",
    },
});
