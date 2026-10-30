import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, BellPlus, Flag, Play } from "lucide-react-native";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useMemoryQuery, useRefreshMemories } from "@/api/useMemoryQuery";
import { Page, layout } from "@/components/ui/Page";
import { Text } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ResourceState } from "@/components/ui/ResourceState";
import { GradientFrame } from "@/components/domain/FrameWithHighlight";
import { useTheme } from "@/theme/ThemeProvider";
import { uiCopy as c } from "@/constants/strings";
import { clock } from "./clock";
export function SessionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(); const query = useMemoryQuery(["session", id], () => api.getSession(id)); const { colors } = useTheme(); const refresh = useRefreshMemories();
  const [confirm, setConfirm] = useState(false); const [added, setAdded] = useState<string[]>([]); const [selected, setSelected] = useState<number | null>(null); const session = query.data;
  const reminder = useMutation({ mutationFn: (text: string) => api.createReminder(text), onSuccess: (_, text) => { setAdded(list => [...list, text]); refresh(); } });
  const remove = useMutation({ mutationFn: () => api.deleteSession(id), onSuccess: () => { refresh(); router.back(); } });
  return <Page eyebrow={c.sessionMode} title={session?.title ?? c.sessions} subtitle={session ? clock(session.durationSec) : undefined} trailing={<IconButton accessibilityLabel={c.back} onPress={() => router.back()} icon={<ArrowLeft accessible={false} size={24} color={colors.foreground} />} />}>
    <ResourceState loading={query.isPending} error={query.error} empty={!query.isPending && !session} retry={() => { void query.refetch(); }} />
    {session && <><View style={layout.section}><Text variant="heading">{c.summary}</Text><Text>{session.summary}</Text></View><View style={layout.section}><Text variant="heading">{c.actions}</Text>{session.actionItems.map(text => <Pressable key={text} accessibilityRole="button" accessibilityLabel={`${c.createReminder}: ${text}`} accessibilityState={{ disabled: added.includes(text) || reminder.isPending }} disabled={added.includes(text) || reminder.isPending} onPress={() => reminder.mutate(text)} style={({ pressed }) => [layout.row, { minHeight: 56, padding: 12, backgroundColor: colors.secondary, borderRadius: 10, opacity: pressed ? 0.7 : 1 }]}><BellPlus accessible={false} size={24} color={colors.foreground} /><View style={layout.flex}><Text>{text}</Text>{added.includes(text) && <Text variant="caption" color="mutedForeground">{c.reminderAdded}</Text>}</View></Pressable>)}{reminder.error && <Text color="destructive">{c.error}</Text>}</View>
      <View style={layout.section}><Text variant="heading">{c.bookmarks}</Text>{session.bookmarks.map((mark, index) => <Button key={index} label={`${clock(mark.seconds)} · ${mark.label}`} variant="secondary" icon={<Flag accessible={false} size={18} color={colors.foreground} />} onPress={() => setSelected(mark.seconds)} />)}</View>
      <View style={layout.section}><Text variant="heading">{c.chunks}</Text>{session.chunks.map(chunk => <View key={chunk.id} style={[layout.row, { padding: 12, borderWidth: 1, borderColor: selected !== null && Math.abs(chunk.seconds - selected) < 180 ? colors.ring : colors.border, borderRadius: 10, alignItems: "flex-start" }]}><View style={{ width: 64, height: 64, borderRadius: 10, overflow: "hidden" }}><GradientFrame seed={chunk.frameSeed} /></View><View style={[layout.flex, { gap: 8 }]}><Text variant="caption" color="mutedForeground">{clock(chunk.seconds)}</Text><Text>{chunk.text}</Text></View></View>)}</View>
      {session.localCopyUri && <View style={layout.section}><Text variant="heading">{c.localCopy}</Text><Play accessible={false} size={32} color={colors.foreground} /><Text color="mutedForeground">{c.localUnavailable}</Text></View>}<Button label={c.deleteSession} variant="danger" onPress={() => setConfirm(true)} /></>}
    <BottomSheet visible={confirm} title={c.deleteTitle} onClose={() => setConfirm(false)}><Text>{c.deleteBody}</Text>{remove.error && <Text color="destructive">{c.error}</Text>}<Button label={c.deleteSession} variant="danger" loading={remove.isPending} onPress={() => remove.mutate()} /><Button label={c.cancel} variant="secondary" onPress={() => setConfirm(false)} /></BottomSheet>
  </Page>;
}
