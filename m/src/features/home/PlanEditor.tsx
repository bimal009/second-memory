import React, { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Check, MapPin, Pencil, Timer, Bell, StickyNote, X, Image } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { SwitchRow } from "@/components/ui/SwitchRow";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/spacing";
import type { CaptureDraft } from "@/api";

export function PlanEditor({ draft, onChange, onSave, onDiscard, saving, disabled, locationDenied, notificationsDenied, framesAvailable = true }: {
  draft: CaptureDraft; onChange: (draft: CaptureDraft) => void; onSave: () => void; onDiscard: () => void;
  saving: boolean; disabled: boolean; locationDenied: boolean; notificationsDenied: boolean;
  framesAvailable?: boolean;
}) {
  const { colors } = useTheme();
  const [editing, setEditing] = useState<"note" | "reminder" | null>(null);
  const [value, setValue] = useState("");
  const set = (key: keyof Pick<CaptureDraft, "clip" | "location" | "note" | "reminder" | "frames">, enabled: boolean) => {
    if (key === "frames" && !framesAvailable) return;
    onChange({ ...draft, [key]: { ...draft[key], enabled } });
  };
  const choices = [
    { key: "clip", label: `Clip: ${draft.clip.seconds} s`, Icon: Timer },
    { key: "location", label: `Location: ${draft.location.enabled ? "on" : "off"}`, Icon: MapPin },
    { key: "note", label: `Note: ${draft.note.text}`, Icon: StickyNote },
    { key: "reminder", label: `Reminder: ${draft.reminder.time}`, Icon: Bell },
    { key: "frames", label: `Frames: ${draft.frames.enabled ? "on" : "off"}`, Icon: Image },
  ] as const;
  const valid = value.trim().length > 0;
  return <>
    <Card style={[styles.card, { borderWidth: 0, backgroundColor: colors.secondary }]}>
      <View style={styles.row}><Text variant="bodyMedium" style={styles.flex}>Here’s what I’ll remember</Text><Check size={18} color={colors.isDark ? colors.primary : colors.primaryForeground} /></View>
      <Text variant="caption" color="mutedForeground">Tap a chip to include or leave it out. Edit any detail before saving.</Text>
      <View style={styles.chips}>{choices.map(({ key, label, Icon }) => <Pressable key={key} accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked: draft[key].enabled, disabled }} disabled={disabled || (key === "location" && locationDenied) || (key === "reminder" && notificationsDenied)} onPress={() => set(key, !draft[key].enabled)} style={[styles.chip, { backgroundColor: draft[key].enabled ? colors.primary : colors.secondary, borderColor: colors.border }]}>
        <Icon size={16} color={draft[key].enabled ? colors.primaryForeground : colors.mutedForeground} /><Text variant="micro" style={{ color: draft[key].enabled ? colors.primaryForeground : colors.mutedForeground }}>{label}</Text>{draft[key].enabled ? <Check size={14} color={colors.primaryForeground} /> : <X size={14} color={colors.mutedForeground} />}
      </Pressable>)}</View>
      <View style={styles.chips}>{(["note", "reminder"] as const).map(key => <Button key={key} label={`Edit ${key}`} variant="ghost" disabled={disabled} icon={<Pencil size={14} color={colors.isDark ? colors.primary : colors.primaryForeground} />} onPress={() => { setEditing(key); setValue(key === "note" ? draft.note.text : draft.reminder.time); }} />)}</View>
      <View style={styles.row}><Button label={saving ? "Saving..." : "Save"} loading={saving} disabled={disabled} onPress={onSave} style={styles.flex} /><Button label="Discard" variant="secondary" disabled={disabled} onPress={onDiscard} style={styles.flex} /></View>
    </Card>
    <BottomSheet title={`Edit ${editing ?? "detail"}`} visible={editing !== null} onClose={() => setEditing(null)}>
      <Text variant="caption" color="mutedForeground">{editing === "reminder" ? "Enter a reminder time, for example 5 PM." : "What would you like to remember?"}</Text>
      <TextInput accessibilityLabel={`Edit ${editing ?? "detail"}`} value={value} onChangeText={setValue} maxLength={editing === "note" ? 160 : 24} style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.secondary }]} />
      {editing && <SwitchRow label={`Include ${editing}`} value={draft[editing].enabled} onValueChange={enabled => set(editing, enabled)} disabled={editing === "reminder" && notificationsDenied} />}
      <Button label="Apply" disabled={!valid} onPress={() => {
        if (editing === "note") onChange({ ...draft, note: { ...draft.note, text: value.trim() } });
        if (editing === "reminder") onChange({ ...draft, reminder: { ...draft.reminder, time: value.trim() } });
        setEditing(null);
      }} />
    </BottomSheet>
  </>;
}
const styles = StyleSheet.create({ card: { gap: spacing.md, borderRadius: 20 }, row: { flexDirection: "row", alignItems: "center", gap: spacing.sm }, flex: { flex: 1, borderRadius: 24 }, chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, chip: { minHeight: 48, maxWidth: "100%", borderRadius: 24, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.sm }, input: { minHeight: 56, borderWidth: 1, borderRadius: 14, paddingHorizontal: spacing.md, fontSize: 16, fontFamily: "Inter_400Regular" } });
