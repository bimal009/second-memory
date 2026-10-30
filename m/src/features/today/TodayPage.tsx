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
import { RunCard } from "@/components/domain/RunCard";
import { captureCopy as r, uiCopy as c } from "@/constants/strings";
export function TodayPage() {
  const today = useMemoryQuery(["today"], () => api.getToday()); const runs = useMemoryQuery(["runs"], () => api.listRuns()); const refresh = useRefreshMemories();
  const reminder = useMutation({ mutationFn: ({ id, done }: { id: string; done: boolean }) => api.setReminderDone(id, done), onSuccess: refresh });
  const todayRuns = runs.data?.filter(run => new Date(run.createdAt).toDateString() === new Date().toDateString());
  const empty = !today.data?.recap && !today.data?.reminders.length && !todayRuns?.length;
  return <Page title={c.today}>
    <ResourceState loading={today.isPending || runs.isPending} error={today.error || runs.error || reminder.error} retry={() => { void today.refetch(); void runs.refetch(); }} empty={!today.isPending && !runs.isPending && empty} />
    {!today.error && today.data?.recap && <View style={layout.section}><Text variant="micro" color="mutedForeground">{c.recap}</Text><RecapCard recap={today.data.recap} /></View>}
    {!!today.data?.reminders.length && <View style={layout.section}><Text variant="heading">{c.reminders}</Text>{today.data.reminders.map(item => <ReminderRow key={item.id} reminder={item} onToggle={done => { if (!reminder.isPending) reminder.mutate({ id: item.id, done }); }} />)}</View>}
    {!!todayRuns?.length && <View style={layout.section}><Text variant="heading">{r.runs}</Text>{todayRuns.map(run => <RunCard key={run.id} run={run} onPress={() => router.push({ pathname: "/run/[id]", params: { id: run.id } })} />)}</View>}
  </Page>;
}
