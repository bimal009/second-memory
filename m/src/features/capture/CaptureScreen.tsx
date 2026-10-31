import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withRepeat, withSpring, withTiming, } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Flashlight, FlashlightOff, FlipHorizontal2, Images, X, } from "lucide-react-native";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { strings } from "@/constants/strings";
import { useTheme } from "@/theme/ThemeProvider";
import { iconSize, spacing, touchTarget } from "@/theme/spacing";
import { mediaColors, motion, radius } from "@/theme/tokens";
import { useCaptureSession } from "./useCaptureSession";
const RING = 84;
const INNER = 68;
export function CaptureScreen() {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const cameraRef = useRef<CameraView>(null);
    const [facing, setFacing] = useState<"back" | "front">("back");
    const [torch, setTorch] = useState(false);
    const [shutterPressed, setShutterPressed] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();
    const session = useCaptureSession(cameraRef);
    const pulse = useSharedValue(0);
    const press = useSharedValue(0);
    const tint = colors.primary;
    const tintFg = colors.primaryForeground;
    const recColor = colors.destructive;
    const onMedia = mediaColors.foreground;
    useEffect(() => {
        if (session.recording) {
            pulse.value = withRepeat(withTiming(1, {
                duration: motion.sheet * 3,
                easing: Easing.inOut(Easing.quad),
            }), -1, true);
        }
        else {
            pulse.value = withTiming(0, { duration: motion.base });
        }
    }, [session.recording, pulse]);
    useEffect(() => {
        press.value = withSpring(shutterPressed ? 1 : 0, {
            damping: shutterPressed ? 18 : 14,
            stiffness: shutterPressed ? 320 : 260,
        });
    }, [shutterPressed, press]);
    const ringStyle = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.08]) }],
        borderColor: session.recording ? recColor : tint,
        opacity: session.recording
            ? interpolate(pulse.value, [0, 1], [0.75, 1])
            : 1,
    }));
    const innerStyle = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(press.value, [0, 1], [1, 0.86]) }],
        borderRadius: session.recording
            ? interpolate(press.value, [0, 1], [radius.sm + 6, radius.sm + 2])
            : interpolate(press.value, [0, 1], [INNER / 2, INNER / 2 - 4]),
        backgroundColor: session.recording ? recColor : onMedia,
    }));
    const onShutter = useCallback(() => {
        void Haptics.impactAsync(session.recording
            ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Heavy).catch(() => { });
        session.toggle();
    }, [session]);
    if (!permission) {
        return (<View style={[styles.root, { backgroundColor: colors.background }]}/>);
    }
    if (!permission.granted) {
        return (<View style={[
                styles.permissionRoot,
                {
                    backgroundColor: colors.background,
                    paddingTop: insets.top + spacing.xl,
                    paddingBottom: insets.bottom + spacing.xl,
                    paddingHorizontal: spacing.lg,
                },
            ]}>
        <StatusBar style={isDark ? "light" : "dark"}/>
        <View style={styles.permissionBody}>
          <Text variant="micro" color="mutedForeground" style={styles.eyebrow}>
            CAMERA
          </Text>
          <Text variant="display">Camera access</Text>
          <Text color="mutedForeground">
            {strings.appName} needs the camera to capture your day — full
            screen, one tap to start.
          </Text>
        </View>
        <Button label="Allow camera" size="lg" fullWidth onPress={() => void requestPermission()}/>
      </View>);
    }
    return (<View style={[styles.root, { backgroundColor: mediaColors.heroBackground }]}>
      <StatusBar style="light"/>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} mode="video" mute={false} videoQuality="480p" enableTorch={torch && facing === "back"} mirror={facing === "front"}/>

      <View pointerEvents="box-none" style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.topRow}>
          <Tool tint={tint} active={torch && facing === "back"} onPress={() => {
            if (facing === "back")
                setTorch((v) => !v);
        }} disabled={facing === "front"} icon={torch && facing === "back" ? (<Flashlight size={iconSize.md - 2} color={tintFg}/>) : (<FlashlightOff size={iconSize.md - 2} color={onMedia}/>)}/>

          <View style={styles.topCenter}>
            {session.recording ? (<View style={[
                styles.recPill,
                { backgroundColor: mediaColors.strongScrim },
            ]}>
                <View style={[
                styles.recDot,
                { backgroundColor: colors.destructive },
            ]}/>
                <Text variant="bodyMedium" style={{ color: onMedia }}>
                  {session.elapsedLabel}
                </Text>
              </View>) : (<Text variant="micro" style={[styles.brand, { color: tint }]}>
                {strings.appName.toUpperCase()}
              </Text>)}
          </View>

          <Tool tint={tint} onPress={() => {
            setTorch(false);
            setFacing((f) => (f === "back" ? "front" : "back"));
            void Haptics.selectionAsync().catch(() => { });
        }} icon={<FlipHorizontal2 size={iconSize.md - 2} color={onMedia}/>}/>
        </View>

        {session.recording ? (<Text variant="caption" style={[
                styles.uploadHint,
                { color: tintFg, backgroundColor: tint },
            ]}>
            {session.chunksPending > 0
                ? `${session.chunksPending} uploading · ${session.chunksUploaded} saved`
                : `${session.chunksUploaded} chunks on server`}
          </Text>) : null}
      </View>

      <View pointerEvents="box-none" style={[
            styles.bottom,
            { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.sm },
        ]}>
        {session.error ? (<Pressable onPress={session.clearError} style={[styles.errorChip, { backgroundColor: colors.destructive }]}>
            <X size={iconSize.sm - 4} color={colors.destructiveForeground}/>
            <Text variant="caption" style={{ color: colors.destructiveForeground, flexShrink: 1 }} numberOfLines={2}>
              {session.error}
            </Text>
          </Pressable>) : null}

        <Text variant="caption" style={[
            styles.hint,
            { color: session.recording ? colors.destructive : tint },
        ]}>
          {session.busy
            ? session.phase === "starting"
                ? "Starting…"
                : "Saving…"
            : session.recording
                ? "Tap to stop"
                : "Tap to capture your day"}
        </Text>

        <View style={styles.dock}>
          <SideSlot>
            <View style={[
            styles.memories,
            {
                borderColor: tint,
                backgroundColor: mediaColors.buttonBg,
            },
        ]}>
              <Images size={iconSize.md - 2} color={tint}/>
            </View>
          </SideSlot>

          <Pressable accessibilityRole="button" accessibilityLabel={session.recording ? "Stop capture" : "Start capture"} disabled={session.busy} onPressIn={() => setShutterPressed(true)} onPressOut={() => setShutterPressed(false)} onPress={onShutter} style={styles.shutterHit}>
            <Animated.View style={[styles.shutterRing, ringStyle]}>
              {session.busy ? (<ActivityIndicator color={session.recording ? onMedia : tint}/>) : (<Animated.View style={[styles.shutterInner, innerStyle]}/>)}
            </Animated.View>
          </Pressable>

          <SideSlot>
            <Tool large tint={tint} onPress={() => {
            setTorch(false);
            setFacing((f) => (f === "back" ? "front" : "back"));
        }} icon={<FlipHorizontal2 size={iconSize.md} color={onMedia}/>}/>
          </SideSlot>
        </View>
      </View>
    </View>);
}
function Tool({ icon, onPress, disabled, large, tint, active, }: {
    icon: React.ReactNode;
    onPress: () => void;
    disabled?: boolean;
    large?: boolean;
    tint: string;
    active?: boolean;
}) {
    const size = large ? touchTarget + 4 : touchTarget - 4;
    return (<Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [
            {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: active ? tint : mediaColors.strongScrim,
                borderWidth: active ? 0 : 1,
                borderColor: tint,
                alignItems: "center",
                justifyContent: "center",
            },
            pressed && { opacity: 0.7 },
            disabled && { opacity: 0.35 },
        ]}>
      {icon}
    </Pressable>);
}
function SideSlot({ children }: {
    children: React.ReactNode;
}) {
    return <View style={styles.sideSlot}>{children}</View>;
}
const styles = StyleSheet.create({
    root: { flex: 1 },
    permissionRoot: {
        flex: 1,
        width: "100%",
        maxWidth: 560,
        alignSelf: "center",
        justifyContent: "space-between",
        gap: spacing.xl,
    },
    permissionBody: { gap: spacing.md },
    eyebrow: { letterSpacing: 1.6 },
    topBar: {
        position: "absolute",
        left: 0,
        right: 0,
        paddingHorizontal: spacing.lg,
        gap: spacing.md,
    },
    topRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    topCenter: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    brand: {
        letterSpacing: 1.6,
    },
    recPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
    },
    recDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    uploadHint: {
        alignSelf: "center",
        overflow: "hidden",
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: radius.pill,
    },
    bottom: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: "center",
        gap: spacing.md,
    },
    hint: {
        textShadowColor: mediaColors.scrim,
        textShadowRadius: 6,
    },
    dock: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        paddingHorizontal: spacing.xxxl - spacing.sm,
    },
    sideSlot: {
        width: touchTarget + spacing.lg,
        alignItems: "center",
        justifyContent: "center",
    },
    memories: {
        width: touchTarget,
        height: touchTarget,
        borderRadius: radius.sm + 4,
        borderWidth: 2,
        alignItems: "center",
        justifyContent: "center",
    },
    shutterHit: {
        width: RING + spacing.lg,
        height: RING + spacing.lg,
        alignItems: "center",
        justifyContent: "center",
    },
    shutterRing: {
        width: RING,
        height: RING,
        borderRadius: RING / 2,
        borderWidth: 5,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "transparent",
    },
    shutterInner: {
        width: INNER,
        height: INNER,
    },
    errorChip: {
        maxWidth: "88%",
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.sm + 2,
    },
});
