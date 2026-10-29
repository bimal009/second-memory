import React, { useEffect, useState } from "react";
import { TextInput, View } from "react-native";
import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addReminder } from "@/api";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { appStyles } from "@/components/ui/AppScreen";
import { ConnectionBanner } from "./ConnectionBanner";
import { useTheme } from "@/theme/ThemeProvider";
import { limeDeep } from "@/theme/tokens";

export function ReminderEditor({ visible, onClose, initialText = "", source = "Voice" }: { visible: boolean; onClose: () => void; initialText?: string; source?: "Voice" | "Session" }) {
  const { colors } = useTheme();
  const client = useQueryClient();
  const [text, setText] = useState(initialText);
  const [date, setDate] = useState(() => new Date(Date.now() + 3600000));
  const [picker, setPicker] = useState<"date" | "time" | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
  const mutation = useMutation({ mutationFn: () => {
    if (date.getTime() <= Date.now()) throw new Error("Choose a future time.");
    return addReminder(text, date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }), source);
  }, onSuccess: () => { void client.invalidateQueries({ queryKey: ["demo"] }); onClose(); } });
  return <BottomSheet title="Add reminder" visible={visible} onClose={onClose}>
    <Text variant="caption" color="mutedForeground">A small nudge, right when you need it.</Text>
    <TextInput accessibilityLabel="Reminder text" placeholder="What should I remind you about?" placeholderTextColor={colors.mutedForeground} value={text} onChangeText={setText} multiline maxLength={200} style={[appStyles.input, { color: colors.foreground, backgroundColor: colors.secondary, paddingVertical: 16 }]} />
    <View style={appStyles.wrap}><Button label={date.toLocaleDateString([], { month: "short", day: "numeric" })} variant="secondary" onPress={() => setPicker("date")} /><Button label={date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} variant="secondary" onPress={() => setPicker("time")} /></View>
    {picker && <DateTimePicker value={date} mode={picker} themeVariant="light" accentColor={limeDeep} onChange={(event, selected) => { if (event.type !== "dismissed" && selected) setDate(selected); setPicker(null); }} />}
    {mutation.error && <ConnectionBanner error={mutation.error} onRetry={() => mutation.mutate()} />}
    <Button label="Add reminder" loading={mutation.isPending} disabled={!text.trim() || date.getTime() <= now} onPress={() => mutation.mutate()} />
    {date.getTime() <= now && <Text variant="caption" color="destructive">Choose a future time.</Text>}
  </BottomSheet>;
}
