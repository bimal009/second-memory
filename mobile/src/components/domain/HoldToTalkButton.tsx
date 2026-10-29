import React, { useEffect, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  useReducedMotion,
} from "react-native-reanimated";
import { Mic, Pause } from "lucide-react-native";
import { Text } from "@/components/ui/Text";
import { radius } from "@/theme/tokens";
import { spacing } from "@/theme/spacing";
import { useTheme } from "@/theme/ThemeProvider";
import { useHaptics } from "@/hooks/useHaptics";

export type HoldToTalkButtonProps = {
  /** Interpolated label, e.g. "Hold to talk to {name}". */
  label: string;
  /** Reading "hold to talk" → active while held. */
  active: boolean;
  paused?: boolean;
  disabled?: boolean;
  onHoldStart?: () => void;
  onHoldEnd?: () => void;
  /** While active, shows "release to send" under the button. */
  releaseHint?: string;
};

/**
 * Large press-and-hold control with an animated lime ring + haptics.
 * Motion: transform/opacity only, ~200ms; static under reduced motion.
 */
export function HoldToTalkButton({
  label,
  active,
  paused,
  disabled,
  onHoldStart,
  onHoldEnd,
  releaseHint,
}: HoldToTalkButtonProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const reduced = useReducedMotion();

  const [size, setSize] = useState(96);
  const ring = useSharedValue(0);
  const pressed = useSharedValue(0);
  /** Set in press handlers only — never read/written during render. */
  const holdStarted = useRef(false);

  useEffect(() => {
    if (active && !reduced && !paused) {
      ring.value = withRepeat(withTiming(1, { duration: 1400 }), -1, false);
    } else {
      ring.value = withTiming(0, { duration: 200 });
    }
  }, [active, reduced, paused, ring]);

  useEffect(() => {
    pressed.value = withTiming(paused ? 0 : active ? 1 : 0, { duration: 200 });
  }, [active, paused, pressed]);

  const onLayout = (e: LayoutChangeEvent) => {
    const s = e.nativeEvent.layout.width;
    if (s > 0) setSize(s);
  };

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + ring.value * 0.45 }],
    opacity: ring.value > 0.02 ? (1 - ring.value) * 0.9 : 0,
  }));

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.12 }],
    opacity: paused ? 0.5 : 1,
  }));

  const handleIn = () => {
    if (disabled || paused) return;
    holdStarted.current = true;
    haptics.medium();
    onHoldStart?.();
  };
  const handleOut = () => {
    if (!holdStarted.current) return;
    holdStarted.current = false;
    if (disabled || paused) return;
    haptics.light();
    onHoldEnd?.();
  };

  const IconGlyph = paused ? Pause : Mic;

  return (
    <View style={styles.wrap}>
      <View style={styles.ringHost} onLayout={onLayout}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ring,
            { width: size, height: size, borderColor: colors.primary },
            ringStyle,
          ]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityHint={releaseHint ?? "Press and hold"}
          accessibilityState={{ disabled, busy: active }}
          onPressIn={handleIn}
          onPressOut={handleOut}
          disabled={disabled}
          style={({ pressed }) => [
            styles.button,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Animated.View
            style={[
              styles.inner,
              { backgroundColor: active ? colors.primary : colors.secondary },
              dotStyle,
            ]}
          >
            <IconGlyph
              size={32}
              color={active ? colors.primaryForeground : colors.foreground}
            />
          </Animated.View>
        </Pressable>
      </View>
      <Text
        variant="caption"
        color={active ? "foreground" : "mutedForeground"}
        align="center"
        style={styles.label}
      >
        {active ? (releaseHint ?? label) : label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: spacing.md,
  },
  ringHost: {
    width: 96,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    borderRadius: radius.pill,
    borderWidth: 3,
  },
  button: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  inner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    maxWidth: 260,
  },
});
