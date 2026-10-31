import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft } from "lucide-react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { Text } from "@/components/ui/Text";
import { strings } from "@/constants/strings";
import { iconSize, spacing, touchTarget } from "@/theme/spacing";

export function ClipScreen() {
    const params = useLocalSearchParams<{ uri: string; offset_ms: string; title: string }>();
    const offsetMs = Number(params.offset_ms ?? "0");
    const player = useVideoPlayer(params.uri, (target) => {
        target.currentTime = Math.max(0, offsetMs / 1000);
        void target.play();
    });
    return (
        <View style={styles.root}>
            <StatusBar style="light"/>
            <View style={StyleSheet.absoluteFill}>
                <VideoView
                    style={StyleSheet.absoluteFill}
                    player={player}
                    contentFit="contain"
                    nativeControls
                />
            </View>
            <View style={styles.top}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={strings.common.back}
                    onPress={() => router.back()}
                    style={({ pressed }) => [
                        styles.back,
                        pressed && { opacity: 0.7 },
                    ]}
                >
                    <ArrowLeft size={iconSize.md} color="#fff"/>
                </Pressable>
                {params.title ? (
                    <Text variant="caption" numberOfLines={1} style={styles.title}>
                        {params.title}
                    </Text>
                ) : null}
            </View>
        </View>
    );
}
const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: "#000",
    },
    top: {
        position: "absolute",
        top: spacing.xl + spacing.md,
        left: spacing.lg,
        right: spacing.lg,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
    },
    back: {
        width: touchTarget,
        height: touchTarget,
        borderRadius: touchTarget / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.4)",
    },
    title: {
        color: "#fff",
        flex: 1,
    },
});
