import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { Check, Mic, MessageSquare, Plus, Trash2 } from "lucide-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteReminder, getReminders, setReminderDone, useSimulation } from "@/api";
import { AppScreen, ResponsiveColumns, appStyles } from "@/components/ui/AppScreen";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { CalmEmpty, LoadingRows } from "@/components/domain/ListStates";
import { ConnectionBanner } from "@/components/domain/ConnectionBanner";
import { ReminderEditor } from "@/components/domain/ReminderEditor";
import { SwipeActions } from "@/components/domain/SwipeActions";
import { PermissionNotice, useHomePermissions } from "@/components/domain/PermissionNotice";
import { useTheme } from "@/theme/ThemeProvider";

export function RemindersScreen() {
  const { colors } = useTheme();
  const simulation = useSimulation();
  const client = useQueryClient();
  const permissions = useHomePermissions();
  const [adding, setAdding] = useState(false);
  const [recap, setRecap] = useState(false);
  const query = useQuery({ queryKey: ["demo", "reminders", simulation], queryFn: getReminders, retry: false });
  const update = useMutation({ mutationFn: ({ id, done }: { id: string; done: boolean }) => setReminderDone(id, done), onSuccess: () => { void client.invalidateQueries({ queryKey: ["demo"] }); } });
  const deletion = useMutation({ mutationFn: deleteReminder, onSuccess: () => { void client.invalidateQueries({ queryKey: ["demo"] }); } });
  const items = query.data?.reminders ?? [];
  const section = (done: boolean) => <View style={appStyles.section}>
    <Text variant="heading">{done ? "Done" : "Upcoming"}</Text>
    {!items.some(item => item.done === done) ? <CalmEmpty title={done ? "Nothing checked off yet" : "A little breathing room"} body={done ? "Completed reminders will stay here." : "Add a reminder for something you don't want to miss."} /> : items.filter(item => item.done === done).map(item => {
      const Icon = item.source === "Session" ? MessageSquare : Mic;
      return <SwipeActions key={item.id} onDelete={() => deletion.mutate(item.id)} onComplete={!done ? () => update.mutate({ id: item.id, done: true }) : undefined}>
        <View style={[appStyles.row, { minHeight: 88, paddingVertical: 8 }]}>
          <Pressable accessibilityRole="checkbox" accessibilityLabel={item.text} accessibilityState={{ checked: item.done, disabled: update.isPending }} disabled={update.isPending} onPress={() => update.mutate({ id: item.id, done: !item.done })} style={{ width: 48, height: 48, justifyContent: "center", alignItems: "center" }}><View style={{ width: 24, height: 24, borderRadius: 8, borderWidth: done ? 0 : 1.5, borderColor: colors.ring, backgroundColor: done ? colors.primary : colors.background, alignItems: "center", justifyContent: "center" }}>{done && <Check size={16} color={colors.primaryForeground} />}</View></Pressable>
          <View style={[appStyles.flex, { gap: 6 }]}><Text variant="bodyMedium" style={done ? { textDecorationLine: "line-through", color: colors.mutedForeground } : undefined}>{item.text}</Text><View style={appStyles.row}><Icon size={14} color={colors.mutedForeground} /><Text variant="caption" color="mutedForeground">{item.timeLabel}</Text></View></View>
          <IconButton accessibilityLabel={`Delete ${item.text}`} disabled={deletion.isPending} icon={<Trash2 size={17} color={colors.mutedForeground} />} onPress={() => deletion.mutate(item.id)} />
        </View>
      </SwipeActions>;
    })}
  </View>;
  return <AppScreen title="Reminders" subtitle="A nudge for what comes next." action={<IconButton accessibilityLabel="Add reminder" icon={<Plus size={22} color={colors.foreground} />} onPress={() => setAdding(true)} />}>
    {permissions?.notifications.granted === false && <PermissionNotice permission="notifications" />}
    {query.isPending ? <LoadingRows /> : query.error ? <ConnectionBanner error={query.error} onRetry={() => void query.refetch()} /> : <>
      <View style={[appStyles.panel, { backgroundColor: colors.secondary }]}><Text variant="heading">Your daily recap</Text><Text variant="body">{query.data?.recap}</Text><Button label="Recap now" variant="secondary" style={{ backgroundColor: colors.card, borderRadius: 24, alignSelf: "flex-start" }} onPress={() => setRecap(true)} /></View>
      {update.error && <ConnectionBanner error={update.error} onRetry={() => update.variables && update.mutate(update.variables)} />}
      {deletion.error && <ConnectionBanner error={deletion.error} onRetry={() => deletion.variables && deletion.mutate(deletion.variables)} />}
      <ResponsiveColumns>{[<View key="upcoming">{section(false)}</View>, <View key="done">{section(true)}</View>]}</ResponsiveColumns>
      <Button label="Add reminder" onPress={() => setAdding(true)} style={{ borderRadius: 28 }} />
    </>}
    {adding && <ReminderEditor visible onClose={() => setAdding(false)} />}
    <BottomSheet visible={recap} title="Today, remembered" onClose={() => setRecap(false)}><Text variant="body">{query.data?.recap}</Text><Text variant="body" color="mutedForeground">{items.filter(item => !item.done).map(item => `${item.text} · ${item.timeLabel}`).join("\n\n") || "No upcoming reminders."}</Text><Button label="Done" onPress={() => setRecap(false)} /></BottomSheet>
  </AppScreen>;
}
