import React from "react";
import { View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEvent } from "expo";
import { Text } from "@/components/ui/Text";
import { captureCopy as c } from "@/constants/strings";
/** Mount only with a real local URI from the API. Never synthesize a recording or autoplay it. */
export function LocalRecordingPlayer({ uri }: { uri: string }) {
  const player = useVideoPlayer({ uri }); const status = useEvent(player, "statusChange", { status: player.status });
  return <View style={{ gap: 12 }}><Text variant="heading">{c.localCopy}</Text><Text variant="caption" color="mutedForeground">{c.localOnly}</Text>{status.status === "error" ? <Text color="destructive">{c.localPlaybackError}</Text> : <VideoView player={player} nativeControls style={{ width: "100%", aspectRatio: 16 / 9, borderRadius: 10 }} />}</View>;
}
