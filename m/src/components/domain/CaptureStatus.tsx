import React from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { useCapture } from "@/features/run/CaptureProvider";
import { api } from "@/api/client";
import { useMemoryQuery } from "@/api/useMemoryQuery";
import { captureCopy as c, copy } from "@/constants/strings";
import { darkColors, mediaColors } from "@/theme/tokens";
export function CaptureStatus() {
  const capture = useCapture(); const today = useMemoryQuery(["today-memories"], () => api.listMemories({ filter: "today" }));
  const active = capture.status === "capturing";
  const label = active ? capture.chunksUploaded ? copy(c.chunkSaved, { count: capture.chunksUploaded }) : c.firstChunk : capture.status === "background_paused" ? c.background : capture.status === "paused" ? c.paused : capture.status === "error" ? c.captureFailure : c.idle;
  return <View accessibilityLiveRegion="polite" style={{ padding: 12, gap: 8, borderRadius: 10, backgroundColor: mediaColors.strongScrim }}>
    <Text variant="caption" style={{ color: darkColors.foreground }}>{label}</Text>
    {!!capture.chunksWaiting && <Text variant="caption" style={{ color: darkColors.foreground }}>{copy(c.waiting, { count: capture.chunksWaiting })}</Text>}
    {today.data && <Text variant="caption" style={{ color: darkColors.mutedForeground }}>{copy(c.todayCount, { count: today.data.length })}{capture.lastChunkAgo !== null ? " ? " + copy(c.ago, { seconds: capture.lastChunkAgo }) : ""}</Text>}
    {capture.status === "background_paused" || capture.status === "paused" || capture.status === "error" ? <Button label={c.resume} variant="onMedia" onPress={capture.resume} /> : null}
  </View>;
}
