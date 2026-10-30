import React from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useMemoryQuery, useRefreshMemories } from "@/api/useMemoryQuery";
import { Page, layout } from "@/components/ui/Page";
import { Text } from "@/components/ui/Text";
import { ResourceState } from "@/components/ui/ResourceState";
import { RecapCard } from "@/components/domain/RecapCard";
import { ReminderRow } from "@/components/domain/ReminderRow";
import { SessionCard } from "@/components/domain/SessionCard";
import { uiCopy as c } from "@/constants/strings";
export function TodayPage() {
  const today = useMemoryQuery(["today"], () => api.getToday()); const sessions = useMemoryQuery(["sessions"], () => api.listSessions()); const refresh = useRefreshMemories();
  const reminder = useMutation({ mutationFn: ({ id, done }: { id: string; done: boolean }) => api.setReminderDone(id, done), onSuccess: refresh });
  const empty = !today.data?.recap && !today.data?.reminders.length && !sessions.data?.length;
  return <Page eyebrow={c.todayEyebrow} title={c.todayTitle} subtitle={c.todaySubtitle}>
    <ResourceState loading={today.isPending || sessions.isPending} error={today.error || sessions.error || reminder.error} retry={() => { void today.refetch(); void sessions.refetch(); }} empty={!today.isPending && !sessions.isPending && empty} />
    {!today.error && today.data?.recap && <View style={layout.section}><Text variant="micro" color="mutedForeground">{c.recap}</Text><RecapCard recap={today.data.recap} /></View>}
    {!!today.data?.reminders.length && <View style={layout.section}><Text variant="heading">{c.reminders}</Text>{today.data.reminders.map(item => <ReminderRow key={item.id} reminder={item} onToggle={done => { if (!reminder.isPending) reminder.mutate({ id: item.id, done }); }} />)}</View>}
    {!!sessions.data?.length && <View style={layout.section}><Text variant="heading">{c.daySessions}</Text>{sessions.data.map(session => <SessionCard key={session.id} session={session} onPress={() => router.push({ pathname: "/session/[id]", params: { id: session.id } })} />)}</View>}
  </Page>;
}
