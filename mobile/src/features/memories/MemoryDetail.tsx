import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteMemory, getMemories, getMemory, useSimulation } from "@/api";
import { AppScreen, ResponsiveColumns, appStyles } from "@/components/ui/AppScreen";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { SwitchRow } from "@/components/ui/SwitchRow";
import { Choices } from "@/components/ui/Choices";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { LoadingRows, CalmEmpty } from "@/components/domain/ListStates";
import { ConnectionBanner } from "@/components/domain/ConnectionBanner";
import { MemoryFrame } from "@/components/domain/MemoryFrame";
import { PlaceMap } from "@/components/domain/PlaceMap";
import { ReminderEditor } from "@/components/domain/ReminderEditor";
import { useTheme } from "@/theme/ThemeProvider";

export type MemoryDetailProps = { id: string; onDelete: (id: string) => void };
export function MemoryDetail({ id, onDelete }: MemoryDetailProps) {
  const { colors } = useTheme();
  const simulation = useSimulation();
  const client = useQueryClient();
  const [highlight, setHighlight] = useState(true);
  const [width, setWidth] = useState(300);
  const [index, setIndex] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [reminder, setReminder] = useState(false);
  const query = useQuery({ queryKey: ["demo", "memory", id, simulation], queryFn: () => getMemory(id), retry: false });
  const history = useQuery({ queryKey: ["demo", "memories", simulation], queryFn: () => getMemories(), retry: false });
  const deletion = useMutation({ mutationFn: () => deleteMemory(id), onSuccess: () => { void client.invalidateQueries({ queryKey: ["demo"] }); onDelete(id); } });
  const memory = query.data;
  const sightings = history.data?.filter(item => item.id !== id && memory?.tags[0] && item.tags.includes(memory.tags[0])) ?? [];
  return <AppScreen title="Memory" back>
    {query.isPending ? <LoadingRows /> : query.error ? <ConnectionBanner error={query.error} onRetry={() => void query.refetch()} /> : !memory ? <CalmEmpty title="This memory isn't here" body="It may have been deleted. Return to Memories to find another moment." /> : <>
      <Text variant="title">{memory.title}</Text>
      <Text variant="caption" color="mutedForeground">{memory.dayLabel}, {memory.timeLabel} · {memory.source}</Text>
      <ResponsiveColumns>{[
        <View key="media" style={appStyles.section}>
          <View onLayout={event => setWidth(event.nativeEvent.layout.width)}>
            {memory.frames.length ? <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={event => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}>{memory.frames.map((uri, frame) => <View key={uri} style={{ width }}><MemoryFrame uri={uri} label={`${memory.title}, frame ${frame + 1}`} highlight={highlight ? memory.highlight : undefined} /></View>)}</ScrollView> : <MemoryFrame />}
          </View>
          {memory.frames.length > 1 && <Text variant="caption" color="mutedForeground">Frame {Math.min(index + 1, memory.frames.length)} of {memory.frames.length}</Text>}
          {memory.highlight && <SwitchRow label="Show highlight" sublabel="The object found in this frame" value={highlight} onValueChange={setHighlight} />}
          {memory.place !== "Location off" && <PlaceMap memory={memory} />}
        </View>,
        <View key="details" style={appStyles.section}>
          <View style={[appStyles.panel, { backgroundColor: colors.secondary }]}><Text variant="heading">Note</Text><Text variant="body">{memory.title}</Text><Text variant="caption" color="mutedForeground">Source: {memory.source}</Text></View>
          <Choices values={memory.tags.map(tag => ({ value: tag, label: tag }))} selected="" onChange={() => {}} />
          <View style={appStyles.section}><Text variant="heading">Last seen history</Text>{history.isPending ? <LoadingRows /> : history.error ? <ConnectionBanner error={history.error} onRetry={() => void history.refetch()} /> : !sightings.length ? <Text variant="body" color="mutedForeground">This is the first saved sighting.</Text> : sightings.map(item => <Button key={item.id} label={`${item.dayLabel}, ${item.timeLabel} · ${item.place}`} variant="secondary" onPress={() => router.push(`/memory/${item.id}`)} />)}</View>
          <Button label="Add reminder" onPress={() => setReminder(true)} style={{ borderRadius: 28 }} />
          <Button label="Delete this memory" variant="danger" onPress={() => setConfirm(true)} style={{ borderRadius: 28 }} />
        </View>,
      ]}</ResponsiveColumns>
      <ReminderEditor key={memory.id} visible={reminder} onClose={() => setReminder(false)} initialText={memory.title} source={memory.source === "Session" ? "Session" : "Voice"} />
    </>}
    <BottomSheet visible={confirm} title="Delete this memory?" onClose={() => !deletion.isPending && setConfirm(false)}><Text variant="body">Its text and frames will be removed.</Text>{deletion.error && <ConnectionBanner error={deletion.error} onRetry={() => deletion.mutate()} />}<Button label="Delete memory" variant="danger" loading={deletion.isPending} onPress={() => deletion.mutate()} /><Button label="Keep memory" variant="secondary" disabled={deletion.isPending} onPress={() => setConfirm(false)} /></BottomSheet>
  </AppScreen>;
}
