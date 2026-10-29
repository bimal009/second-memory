import React, { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { router } from "expo-router";
import { ArrowUpRight, Sun } from "lucide-react-native";
import { AppScreen, ResponsiveColumns, appStyles } from "@/components/ui/AppScreen";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { SwitchRow } from "@/components/ui/SwitchRow";
import { DeleteAllSheet } from "@/components/domain/DeleteAllSheet";
import { usePreferences } from "@/lib/preferences";
import { useTheme } from "@/theme/ThemeProvider";
import { DevSimulation } from "./DevSimulation";
import { CaptureTypeSwitch } from "@/features/recording/CaptureTypeSwitch";

export function SettingsScreen({ onDeletedAll }: { onDeletedAll?: () => void } = {}) {
  const { colors } = useTheme();
  const { settings, update } = usePreferences();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(false);
  const persist = (patch: Parameters<typeof update>[0]) => { setError(false); void update(patch).catch(() => setError(true)); };
  return <AppScreen title="Settings" subtitle="Make this feel like your memory.">
    {error && <Text accessibilityRole="alert" variant="caption" color="destructive">Could not save this setting. Please try again.</Text>}
    <ResponsiveColumns>{[
      <View key="capture" style={appStyles.section}>
        <View style={[appStyles.panel, { backgroundColor: colors.secondary }]}><Text variant="heading">Your assistant</Text><Text variant="caption" color="mutedForeground">The name you chose at setup. You can change it here.</Text><TextInput accessibilityLabel="Assistant name" maxLength={30} value={settings.assistantName} onChangeText={assistantName => persist({ assistantName })} placeholder="Assistant name" placeholderTextColor={colors.mutedForeground} style={[appStyles.input, { color: colors.foreground, backgroundColor: colors.card }]} /></View>
        <View style={appStyles.section}><Text variant="heading">Capture defaults</Text><Text variant="bodyMedium">Push-to-talk default</Text><CaptureTypeSwitch mode={settings.pushToTalkMode ?? "video"} onChange={pushToTalkMode => persist({ pushToTalkMode })} /><Text variant="bodyMedium">Session default</Text><CaptureTypeSwitch mode={settings.sessionMode ?? "audio"} onChange={sessionMode => persist({ sessionMode })} /></View>
        <View><Text variant="heading">Preferences</Text><SwitchRow label="Include location" sublabel="Keep the place with each memory" value={settings.locationEnabled ?? true} onValueChange={locationEnabled => persist({ locationEnabled })} /><SwitchRow label="Speak replies" sublabel="Hear answers as well as reading them" value={settings.speakReplies ?? false} onValueChange={speakReplies => persist({ speakReplies })} /><View style={[appStyles.row, { minHeight: 56 }]}><Sun size={20} color={colors.foreground} /><Text variant="body" style={appStyles.flex}>Appearance</Text><Text variant="caption" color="mutedForeground">Light</Text></View></View>
      </View>,
      <View key="privacy" style={appStyles.section}>
        <View style={appStyles.section}><Text variant="heading">Privacy</Text><Pressable accessibilityRole="button" accessibilityLabel="Open privacy receipt" onPress={() => router.push("/privacy-receipt")} style={[appStyles.row, appStyles.panel, { backgroundColor: colors.secondary, minHeight: 64 }]}><View style={appStyles.flex}><Text variant="bodyMedium">Privacy receipt</Text><Text variant="caption" color="mutedForeground">What left your phone and what stays</Text></View><ArrowUpRight size={20} color={colors.foreground} /></Pressable><Text variant="caption" color="mutedForeground">Nothing is uploaded until you trigger it.</Text></View>
        <View style={appStyles.section}><Text variant="heading">Start fresh</Text><Text variant="caption" color="mutedForeground">Remove saved moments and clear this device’s key.</Text><Button label="Delete all memories" variant="danger" onPress={() => setDeleting(true)} style={{ borderRadius: 28 }} /></View>
      </View>,
    ]}</ResponsiveColumns>
    <DevSimulation />
    {deleting && <DeleteAllSheet onDeleted={onDeletedAll} onClose={() => setDeleting(false)} />}
  </AppScreen>;
}
