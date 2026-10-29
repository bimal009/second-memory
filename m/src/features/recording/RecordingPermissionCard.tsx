import React, { useState } from "react";
import { Linking, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/theme/ThemeProvider";
import { appStyles } from "@/components/ui/AppScreen";

export function RecordingPermissionCard({ session = false }: { session?: boolean }) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  return <View style={[appStyles.panel, { backgroundColor: colors.secondary }]}>
    <Text variant="heading">{session ? "Microphone is needed for Session" : "Camera and microphone are needed to remember what happens"}</Text>
    <Text variant="body" color="mutedForeground">{session ? "Allow microphone access, then come back to start a Session." : "The video buffer stays off until both permissions are allowed. Audio-only commands can work without the camera."}</Text>
    <Button label="Open app settings" variant="secondary" style={{ backgroundColor: colors.card }} onPress={() => { void Linking.openSettings().catch(() => setFailed(true)); }} />
    {failed && <Text variant="caption" color="destructive">Open Settings, Second Memory, then Permissions.</Text>}
  </View>;
}
