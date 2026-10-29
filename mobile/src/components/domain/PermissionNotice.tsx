import React, { useCallback, useState } from "react";
import { AppState, Linking, Platform } from "react-native";
import { useFocusEffect } from "expo-router";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { readPermissions, type Permissions } from "@/lib/permissions";
import { spacing } from "@/theme/spacing";

export function useHomePermissions() {
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  useFocusEffect(useCallback(() => {
    let active = true;
    const check = () => { if (Platform.OS !== "web") void readPermissions().then(value => { if (active) setPermissions(value); }).catch(() => {}); };
    check();
    const subscription = AppState.addEventListener("change", state => { if (state === "active") check(); });
    return () => { active = false; subscription.remove(); };
  }, []));
  return permissions;
}
const descriptions = {
  microphone: ["Let your assistant hear you", "Microphone access lets you give a voice command. You can still review saved memories without it."],
  location: ["Remember where it happened", "Location adds a place to a memory. You can keep saving without it."],
  notifications: ["Get a nudge at the right time", "Allow notifications so reminders can reach you. Memories still work without them."],
} as const;
export function PermissionNotice({ permission }: { permission: keyof typeof descriptions }) {
  const [failed, setFailed] = useState(false);
  const [title, description] = descriptions[permission];
  return <Card style={{ gap: spacing.sm }}>
    <Text variant="bodyMedium">{title}</Text><Text variant="caption" color="mutedForeground">{description}</Text>
    <Button label="Open settings" variant="secondary" onPress={() => { void Linking.openSettings().catch(() => setFailed(true)); }} />
    {failed && <Text variant="caption" color="destructive">Open your phone settings, then choose Second Memory and Permissions.</Text>}
  </Card>;
}
