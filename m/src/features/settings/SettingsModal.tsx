import React, { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { X, ShieldCheck, Camera, Glasses, LockKeyhole } from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";
import { setPreviewState, usePreviewState } from "@/api/client";
import { useSettings } from "@/api/useMemoryQuery";
import { Page, Field, layout } from "@/components/ui/Page";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { IconButton } from "@/components/ui/IconButton";
import { SwitchRow } from "@/components/ui/SwitchRow";
import { ResourceState } from "@/components/ui/ResourceState";
import { useAppPager } from "@/features/pager/AppPagerProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { copy, uiCopy as c } from "@/constants/strings";
import type { PreviewState } from "@/types/session";
import { DeleteMemoriesSheet } from "./DeleteMemoriesSheet";
export function SettingsModal({ onClose }: { onClose: () => void }) {
  const query = useSettings(); const { colors } = useTheme(); const pager = useAppPager(); const state = usePreviewState(); const cache = useQueryClient();
  const [draftName, setName] = useState<string | null>(null); const [deleting, setDeleting] = useState(false); const settings = query.data;
  const name = draftName ?? settings?.assistantName ?? "";
  const selectState = (next: PreviewState) => { setPreviewState(next); void cache.invalidateQueries({ queryKey: ["second-memory"] }); };
  return <Page eyebrow={c.settings} title={c.settingsTitle} subtitle={c.settingsSubtitle} trailing={<IconButton accessibilityLabel={c.close} onPress={onClose} icon={<X accessible={false} size={24} color={colors.foreground} />} />}>
    <ResourceState loading={query.isPending} error={query.error} retry={() => { void query.refetch(); }} />
    {query.updateError && <Text accessibilityRole="alert" color="destructive">{c.settingsError}</Text>}
    {settings && <><View style={layout.section}><Text variant="heading">{c.assistantName}</Text><Text variant="caption" color="mutedForeground">{c.nameHint}</Text><Field accessibilityLabel={c.assistantName} maxLength={30} value={name} onChangeText={setName} onBlur={() => { if (name.trim()) query.update({ assistantName: name.trim() }); }} onSubmitEditing={() => { if (name.trim()) query.update({ assistantName: name.trim() }); }} /></View>
      <View style={layout.section}><Text variant="heading">{c.appearance}</Text><View style={layout.wrap}>{(["light", "dark", "system"] as const).map(mode => <Chip key={mode} label={c[mode]} selected={settings.appearance === mode} onPress={() => query.update({ appearance: mode })} />)}</View></View>
      <View style={layout.section}><Text variant="heading">{c.bufferLength}</Text><View style={layout.wrap}>{([1, 2, 5] as const).map(minutes => <Chip key={minutes} label={copy(c.minute, { count: minutes })} selected={settings.bufferMinutes === minutes} onPress={() => query.update({ bufferMinutes: minutes })} />)}</View></View>
      <View style={layout.section}><Text variant="heading">{c.voiceReplies}</Text><View style={layout.wrap}>{(["off", "earphones", "always"] as const).map(mode => <Chip key={mode} label={c[mode]} selected={(settings.voiceReplies ?? "off") === mode} onPress={() => query.update({ voiceReplies: mode })} />)}</View></View>
      <View><SwitchRow label={c.keepLocal} sublabel={c.localHint} value={settings.keepLocalRecording ?? false} onValueChange={keepLocalRecording => query.update({ keepLocalRecording })} /><SwitchRow label={c.faceBlur} sublabel={c.soon} value={false} disabled onValueChange={() => {}} /></View>
      <View style={[layout.section, { padding: 16, backgroundColor: colors.secondary, borderRadius: 10 }]}><View style={layout.row}><ShieldCheck accessible={false} size={24} color={colors.foreground} /><Text variant="heading">{c.privacy}</Text></View><View style={layout.row}><LockKeyhole accessible={false} size={18} color={colors.foreground} /><View style={layout.flex}><Text>{c.indicator}</Text><Text variant="caption" color="mutedForeground">{c.locked}</Text></View></View><SwitchRow label={c.pause} value={pager.privacyPaused || settings.recordingPaused} onValueChange={value => { pager.setPrivacyPaused(value); query.update({ recordingPaused: value }); }} /><Text variant="caption" color="mutedForeground">{c.privacyBody}</Text><Button label={c.receipt} variant="secondary" onPress={() => router.push("/privacy-receipt")} /></View>
      <View style={layout.section}><Text variant="heading">{c.sources}</Text><View style={layout.row}><Camera accessible={false} size={24} color={colors.foreground} /><View style={layout.flex}><Text>{c.phone}</Text><Text variant="caption" color="mutedForeground">{c.active}</Text></View></View><View style={layout.row}><Glasses accessible={false} size={24} color={colors.mutedForeground} /><View style={layout.flex}><Text>{c.glasses}</Text><Text variant="caption" color="mutedForeground">{c.disconnected}</Text></View></View></View><Button label={c.deleteAll} variant="danger" onPress={() => setDeleting(true)} /></>}
    {__DEV__ && <View style={layout.section}><Text variant="heading">{c.diagnostics}</Text><Text variant="caption" color="mutedForeground">{c.demoHint}</Text><View style={layout.wrap}>{([{ key: "normal", label: c.demoNormal }, { key: "offline", label: c.demoOffline }, { key: "empty", label: c.demoEmpty }, { key: "error", label: c.demoError }, { key: "denied", label: c.demoDenied }] as const).map(item => <Chip key={item.key} label={item.label} selected={state === item.key} onPress={() => selectState(item.key)} />)}</View></View>}
    {deleting && <DeleteMemoriesSheet close={() => setDeleting(false)} />}
  </Page>;
}
