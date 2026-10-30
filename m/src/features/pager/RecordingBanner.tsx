import React from "react";
import { View } from "react-native";
import { useCapture } from "@/features/run/CaptureProvider";
import { useAppPager } from "./AppPagerProvider";
import { RecordingPill } from "@/components/domain/RecordingPill";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { darkColors } from "@/theme/tokens";
import { captureCopy as c, copy } from "@/constants/strings";
import { clock } from "@/features/session/clock";
import { useSafeAreaInsets } from "react-native-safe-area-context";
export function RecordingBanner() {
  const capture = useCapture(); const pager = useAppPager(); const insets = useSafeAreaInsets();
  if ((capture.status === "idle" && !capture.chunksWaiting) || pager.focused) return null;
  return <View style={{ paddingTop: insets.top + 8, paddingBottom: 8, paddingHorizontal: 16, gap: 8, backgroundColor: darkColors.background }}>
    {capture.status === "idle" ? <Text align="center" style={{ color: darkColors.foreground }}>{copy(c.waiting, { count: capture.chunksWaiting })}</Text> : capture.status === "capturing" ? <RecordingPill timer={clock(capture.elapsed)} /> : <><Text align="center" variant="caption" style={{ color: darkColors.foreground }}>{capture.status === "background_paused" ? c.background : capture.status === "error" ? c.error : c.paused}</Text><Button label={c.resume} onPress={capture.resume} /></>}
  </View>;
}
