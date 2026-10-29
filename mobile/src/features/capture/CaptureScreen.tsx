import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  useReducedMotion,
} from "react-native-reanimated";
import { Chip } from "@/components/ui/Chip";
import { Text } from "@/components/ui/Text";
import { RecordingPill } from "@/components/domain/RecordingPill";
import { BufferMeter, interpolate } from "@/components/domain/BufferMeter";
import { HoldToTalkButton } from "@/components/domain/HoldToTalkButton";
import { CapturePlanChips } from "@/components/domain/CapturePlanChips";
import type { CapturePlan } from "@/types";
import { spacing } from "@/theme/spacing";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton } from "@/components/ui/IconButton";
import { Pause, Play, Square } from "lucide-react-native";
import { strings } from "@/constants/strings";
import { formatClock } from "@/features/capture/CaptureSessionProvider";

export type CaptureScreenProps = {
  status: "idle" | "recording" | "paused";
  elapsedSec: number;
  bufferMinutes: number;
  assistantName: string;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  /** Mocked recognition result, sent on hold release. */
  onHoldCommand: () => void;
  plan: CapturePlan | null;
  transcript: string | null;
  commandPhase: "idle" | "sending" | "saved" | "error";
  onToggleClip: (on: boolean) => void;
  onToggleLocation: (on: boolean) => void;
  onEditNote: () => void;
};

const MOCK_HINT = "“…keep the toolbox”";

/** Full-bleed capture experience — dark is the hero look for Capture. */
export function CaptureScreen({
  status = "idle",
  elapsedSec,
  bufferMinutes,
  assistantName,
  onStart,
  onPause,
  onResume,
  onStop,
  onHoldCommand,
  plan,
  transcript,
  commandPhase,
  onToggleClip,
  onToggleLocation,
  onEditNote,
}: CaptureScreenProps) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  // Hold started the session? Then release sends the transcribed command.
  const holdStarted = useRef(false);
  const [transcriptText, setTranscriptText] = useState<string | null>(transcript);

  // "Saved" toast appearance (transform/opacity only).
  const savedOpacity = useSharedValue(0);
  useEffect(() => {
    savedOpacity.value = withTiming(commandPhase === "saved" ? 1 : 0, {
      duration: reduced ? 0 : 200,
    });
  }, [commandPhase, savedOpacity, reduced]);
  const savedStyle = useAnimatedStyle(() => ({ opacity: savedOpacity.value }));

  return (
    <View style={[styles.fill, styles.transparent]}>
      {/* Top: pulsing recording pill + buffer meter */}
      <View style={[styles.top, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.pillRow}>
          {status !== "idle" ? (
            <RecordingPill timer={formatClock(elapsedSec)} paused={status === "paused"} />
          ) : null}
        </View>
        <View style={styles.bufferWrap}>
          <BufferMeter
            keptSec={Math.min(elapsedSec, bufferMinutes * 60)}
            capacitySec={bufferMinutes * 60}
          />
        </View>
      </View>

      {/* Live caption area */}
      <View pointerEvents="none" style={styles.caption}>
        <Text variant="caption" style={{ color: "rgba(255,255,255,0.85)" }} align="center">
          {transcriptText ?? strings.capture.liveCaptionPlaceholder}
        </Text>
      </View>

      {/* Plan chips after a command */}
      {plan ? (
        <View style={styles.plan}>
          <CapturePlanChips
            plan={plan}
            onToggleClip={onToggleClip}
            onToggleLocation={onToggleLocation}
            onEditNote={onEditNote}
          />
        </View>
      ) : null}

      {/* Bottom controls */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.sourceRow}>
          <Chip label={strings.capture.sourcePhone} selected />
          <Chip label={strings.capture.sourceGlasses} disabled />
        </View>

        {(status === "recording" || status === "paused") && (
          <View style={sessionRowStyles.row}>
            <View style={styles.sessionSpacer} />
            <IconButton
              accessibilityLabel={status === "paused" ? strings.capture.resume : strings.capture.pause}
              onPress={status === "paused" ? onResume : onPause}
              icon={
                status === "paused" ? (
                  <Play size={22} color="#FAFAFA" />
                ) : (
                  <Pause size={22} color="#FAFAFA" />
                )
              }
              style={styles.sessionButton}
            />
            <IconButton
              accessibilityLabel={strings.capture.stopRecording}
              onPress={onStop}
              icon={<Square size={18} color="#FAFAFA" />}
              style={styles.sessionButton}
            />
          </View>
        )}

        <HoldToTalkButton
          label={interpolate(strings.capture.holdToTalk, { name: assistantName })}
          active={status === "recording"}
          paused={status === "paused"}
          releaseHint={strings.capture.releaseToSend}
          onHoldStart={() => {
            holdStarted.current = true;
            onStart();
          }}
          onHoldEnd={() => {
            if (holdStarted.current) {
              holdStarted.current = false;
              setTranscriptText(MOCK_HINT);
              onHoldCommand();
            }
          }}
        />

        <Text variant="micro" style={styles.mockHint}>
          {MOCK_HINT}
        </Text>
      </View>

      {/* Saved toast */}
      <Animated.View
        pointerEvents="none"
        accessibilityLiveRegion="polite"
        accessibilityLabel={strings.capture.savedToast}
        style={[styles.savedToast, { backgroundColor: "#BEF264" }, commandPhase === "saved" ? savedStyle : { opacity: 0 }]}
      >
        <Text variant="micro" style={{ color: "#365314" }}>
          {strings.capture.savedToast}
        </Text>
      </Animated.View>
    </View>
  );
}

const sessionRowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.md,
  },
});

const styles = StyleSheet.create({
  fill: { flex: 1 },
  transparent: { backgroundColor: "transparent" },
  top: {
    top: 0,
    gap: spacing.md,
  },
  pillRow: {
    alignItems: "center",
    minHeight: 28,
  },
  bufferWrap: {
    paddingHorizontal: spacing.lg,
  },
  caption: {
    position: "absolute",
    top: 200,
    left: spacing.xl,
    right: spacing.xl,
  },
  plan: {
    position: "absolute",
    bottom: 330,
    left: spacing.lg,
    right: spacing.lg,
    alignItems: "center",
  },
  bottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
    alignItems: "center",
  },
  sourceRow: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
  },
  sessionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  sessionSpacer: { width: 48 },
  mockHint: {
    color: "rgba(255,255,255,0.5)",
    maxWidth: 260,
    textAlign: "center",
  },
  savedToast: {
    position: "absolute",
    bottom: 260,
    alignSelf: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
  },
});
