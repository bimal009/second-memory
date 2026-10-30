import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, BellPlus, Flag } from "lucide-react-native";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useMemoryQuery, useRefreshMemories } from "@/api/useMemoryQuery";
import { Page, layout } from "@/components/ui/Page";
import { Text } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ResourceState } from "@/components/ui/ResourceState";
import { useCapture } from "./CaptureProvider";
import { ChunkTimeline } from "@/components/domain/ChunkTimeline";
import { LocalRecordingPlayer } from "@/components/domain/LocalRecordingPlayer";
import { useTheme } from "@/theme/ThemeProvider";
import { captureCopy as r, uiCopy as c } from "@/constants/strings";
import { clock } from "@/features/session/clock";
export function RunDetail() {
  const capture = useCapture();
  const { id } = useLocalSearchParams<{ id: string }>(); const query = useMemoryQuery(["run", id], () => api.getRun(id)); const { colors } = useTheme(); const refresh = useRefreshMemories();
  const [confirm, setConfirm] = useState(false); const [added, setAdded] = useState<string[]>([]); const run = query.data;
  const reminder = useMutation({ mutationFn: (text: string) => api.createReminder(text), onSuccess: (_, text) => { setAdded(list => [...list, text]); refresh(); } });
  const remove = useMutation({ mutationFn: async () => { if (capture.runId === id) await capture.stop(false); await api.deleteRun(id); }, onSuccess: () => { refresh(); router.back(); } });
  return <Page eyebrow={r.run} title={run?.title ?? r.runs} subtitle={run ? clock(run.durationSec) : undefined} trailing={<IconButton accessibilityLabel={c.back} onPress={() => router.back()} icon={<ArrowLeft accessible={false} size={24} color={colors.foreground} />} />}>
    <ResourceState loading={query.isPending} error={query.error} empty={!query.isPending && !run} retry={() => { void query.refetch(); }} />
    {run && <><View style={layout.section}><Text variant="heading">{c.summary}</Text><Text>{run.summary}</Text></View><View style={layout.section}><Text variant="heading">{c.actions}</Text>{run.actionItems.map(text => <Pressable key={text} accessibilityRole="button" accessibilityLabel={`${c.createReminder}: ${text}`} accessibilityState={{ disabled: added.includes(text) || reminder.isPending }} disabled={added.includes(text) || reminder.isPending} onPress={() => reminder.mutate(text)} style={({ pressed }) => [layout.row, { minHeight: 56, padding: 12, backgroundColor: colors.secondary, borderRadius: 10, opacity: pressed ? 0.7 : 1 }]}><BellPlus accessible={false} size={24} color={colors.foreground} /><View style={layout.flex}><Text>{text}</Text>{added.includes(text) && <Text variant="caption" color="mutedForeground">{c.reminderAdded}</Text>}</View></Pressable>)}{reminder.error && <Text color="destructive">{c.error}</Text>}</View>
      <View style={layout.section}><Text variant="heading">{c.bookmarks}</Text>{run.bookmarks.map((mark, index) => <Button key={index} label={`${clock(mark.seconds)} · ${mark.label}`} variant="secondary" icon={<Flag accessible={false} size={18} color={colors.foreground} />} onPress={() => router.push({ pathname: "/memory/[id]", params: { id: mark.memoryId } })} />)}</View>
      <View style={layout.section}><Text variant="heading">{r.chunks}</Text><ChunkTimeline chunks={run.chunks} onOpen={memoryId => router.push({ pathname: "/memory/[id]", params: { id: memoryId } })} /></View>
      {run.localCopyUri && <LocalRecordingPlayer uri={run.localCopyUri} />}<Button label={r.deleteRun} variant="danger" onPress={() => setConfirm(true)} /></>}
    <BottomSheet visible={confirm} title={c.deleteTitle} onClose={() => setConfirm(false)}><Text>{r.deleteRunBody}</Text>{remove.error && <Text color="destructive">{c.error}</Text>}<Button label={r.deleteRun} variant="danger" loading={remove.isPending} onPress={() => remove.mutate()} /><Button label={c.cancel} variant="secondary" onPress={() => setConfirm(false)} /></BottomSheet>
  </Page>;
}
