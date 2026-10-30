import React, { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { X, ShieldCheck, Camera, Glasses, LockKeyhole } from "lucide-react-native";
import { useSettings } from "@/api/useMemoryQuery";
import { Page, Field, layout } from "@/components/ui/Page";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { IconButton } from "@/components/ui/IconButton";
import { SwitchRow } from "@/components/ui/SwitchRow";
import { ResourceState } from "@/components/ui/ResourceState";
import { useCapture } from "@/features/run/CaptureProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { copy, captureCopy as r, uiCopy as c } from "@/constants/strings";
import { DeleteMemoriesSheet } from "./DeleteMemoriesSheet";
export function SettingsModal({ onClose }: { onClose: () => void }) {
  const query = useSettings(); const { colors } = useTheme(); const capture = useCapture();
  const [draftName, setName] = useState<string | null>(null); const [deleting, setDeleting] = useState(false); const settings = query.data;
  const name = draftName ?? settings?.assistantName ?? "";
  return <Page title={c.settings} trailing={<IconButton accessibilityLabel={c.close} onPress={onClose} icon={<X accessible={false} size={24} color={colors.foreground} />} />}>
    <ResourceState loading={query.isPending} error={query.error} retry={() => { void query.refetch(); }} />
    {query.updateError && <Text accessibilityRole="alert" color="destructive">{c.settingsError}</Text>}
    {settings && <><View style={layout.section}><Text variant="heading">{c.assistantName}</Text><Field accessibilityLabel={c.assistantName} maxLength={30} value={name} onChangeText={setName} onBlur={() => { if (name.trim()) query.update({ assistantName: name.trim() }); }} onSubmitEditing={() => { if (name.trim()) query.update({ assistantName: name.trim() }); }} /></View>
      <View style={layout.section}><Text variant="heading">{c.appearance}</Text><View style={layout.wrap}>{(["light", "dark", "system"] as const).map(mode => <Chip key={mode} label={c[mode]} selected={settings.appearance === mode} onPress={() => query.update({ appearance: mode })} />)}</View></View>
      <View style={layout.section}><Text variant="heading">{r.chunkLength}</Text><View style={layout.wrap}>{([20, 30, 45, 60] as const).map(seconds => <Chip key={seconds} label={copy(r.seconds, { count: seconds })} selected={(settings.chunkLength ?? 30) === seconds} onPress={() => query.update({ chunkLength: seconds })} />)}</View></View>
      <View style={layout.section}><Text variant="heading">{c.voiceReplies}</Text><View style={layout.wrap}>{(["off", "earphones", "always"] as const).map(mode => <Chip key={mode} label={c[mode]} selected={(settings.voiceReplies ?? "off") === mode} onPress={() => query.update({ voiceReplies: mode })} />)}</View></View>
      <View><SwitchRow label={c.keepLocal} value={settings.keepLocalRecording ?? false} onValueChange={keepLocalRecording => query.update({ keepLocalRecording })} /><SwitchRow label={c.faceBlur} sublabel={c.soon} value={false} disabled onValueChange={() => {}} /></View>
      <View style={[layout.section, { padding: 16, backgroundColor: colors.secondary, borderRadius: 10 }]}><View style={layout.row}><ShieldCheck accessible={false} size={24} color={colors.foreground} /><Text variant="heading">{c.privacy}</Text></View><View style={layout.row}><LockKeyhole accessible={false} size={18} color={colors.foreground} /><View style={layout.flex}><Text>{c.indicator}</Text><Text variant="caption" color="mutedForeground">{c.locked}</Text></View></View><SwitchRow label={r.pause} value={capture.status !== "capturing" && capture.status !== "idle"} disabled={capture.status === "idle"} onValueChange={value => value ? capture.pause() : capture.resume()} /><Text variant="caption" color="mutedForeground">{c.privacyBody}</Text><Button label={c.receipt} variant="secondary" onPress={() => router.push("/privacy-receipt")} /></View>
      <View style={layout.section}><Text variant="heading">{c.sources}</Text><View style={layout.row}><Camera accessible={false} size={24} color={colors.foreground} /><View style={layout.flex}><Text>{c.phone}</Text><Text variant="caption" color="mutedForeground">{c.active}</Text></View></View><View style={layout.row}><Glasses accessible={false} size={24} color={colors.mutedForeground} /><View style={layout.flex}><Text>{c.glasses}</Text><Text variant="caption" color="mutedForeground">{r.planned}</Text></View></View></View><Button label={c.deleteAll} variant="danger" onPress={() => setDeleting(true)} /></>}
    {deleting && <DeleteMemoriesSheet close={() => setDeleting(false)} />}
  </Page>;
}
