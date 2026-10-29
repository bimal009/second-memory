import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { CameraStage } from "@/features/capture/CameraStage";
import { CaptureScreen } from "@/features/capture/CaptureScreen";
import { useCaptureSession } from "@/features/capture/CaptureSessionProvider";
import { useAssistantCommand } from "@/hooks/useAssistantCommand";
import { useSettingsContext } from "@/features/settings/context";
import type { CapturePlan } from "@/types";

/**
 * Capture tab: camera preview fills the screen, capture UI overlays it.
 * The overlay must stay transparent so the preview shows through.
 */
export default function CaptureTab() {
  const { status, elapsedSec, start, pause, resume, stop } = useCaptureSession();
  const { settings } = useSettingsContext();
  const [planOverride, setPlanOverride] = useState<CapturePlan | null>(null);
  const { phase, transcript, plan, submitCommand } = useAssistantCommand();

  // Release-to-talk sends a mock recognized command (backend seam).
  const handleHoldCommand = () => {
    void submitCommand("keep the toolbox", settings.assistantName);
  };

  const toggle = (key: keyof CapturePlan, on: boolean | string | null) =>
    setPlanOverride((p) => ({
      clip: key === "clip" ? Boolean(on) : (p?.clip ?? plan?.clip ?? true),
      includeLocation:
        key === "includeLocation" ? Boolean(on) : (p?.includeLocation ?? plan?.includeLocation ?? true),
      note: key === "note" ? ((on as string | null) ?? "") : (p?.note ?? plan?.note ?? null),
    }));

  return (
    <View style={[styles.fill, styles.dark]}>
      <CameraStage />
      <CaptureScreen
        status={status}
        elapsedSec={elapsedSec}
        bufferMinutes={settings.bufferMinutes}
        assistantName={settings.assistantName}
        onStart={start}
        onPause={pause}
        onResume={resume}
        onStop={stop}
        onHoldCommand={handleHoldCommand}
        plan={plan ?? planOverride}
        transcript={transcript}
        commandPhase={phase}
        onToggleClip={(on) => toggle("clip", on)}
        onToggleLocation={(on) => toggle("includeLocation", on)}
        onEditNote={() => toggle("note", plan?.note === null || planOverride?.note === null ? "" : null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dark: { backgroundColor: "#0A0A0A" },
});
