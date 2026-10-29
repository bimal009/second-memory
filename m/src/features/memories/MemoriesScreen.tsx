import React, { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { router } from "expo-router";
import { ArrowUpRight, Search, Trash2 } from "lucide-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteMemory, getMemories, useSimulation, type DemoMemory } from "@/api";
import { AppScreen, appStyles } from "@/components/ui/AppScreen";
import { Choices } from "@/components/ui/Choices";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { MemoryFrame } from "@/components/domain/MemoryFrame";
import { ConnectionBanner } from "@/components/domain/ConnectionBanner";
import { LoadingRows, CalmEmpty } from "@/components/domain/ListStates";
import { SwipeActions } from "@/components/domain/SwipeActions";
import { useTheme } from "@/theme/ThemeProvider";

const filters = ["All", "Today", "This week", "Places", "Reminders"];
export function MemoriesScreen() {
  const { colors } = useTheme();
  const simulation = useSimulation();
  const client = useQueryClient();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [now] = useState(() => Date.now());
  const [selected, setSelected] = useState<DemoMemory | null>(null);
  const memories = useQuery({ queryKey: ["demo", "memories", simulation, query], queryFn: () => getMemories(query), retry: false });
  const deletion = useMutation({ mutationFn: deleteMemory, onSuccess: () => { setSelected(null); void client.invalidateQueries({ queryKey: ["demo"] }); } });
  const list = memories.data?.filter(memory => filter === "Today" ? memory.dayLabel === "Today" : filter === "This week" ? now - new Date(memory.timestamp).getTime() < 7 * 86400000 : filter === "Places" ? memory.place !== "Location off" : filter === "Reminders" ? memory.reminder || memory.id === "3" : true) ?? [];
  const groups = [...new Set(list.map(memory => memory.dayLabel))];
  return <AppScreen title="Memories" subtitle="The moments you chose to keep.">
    <View style={[appStyles.row, { backgroundColor: colors.secondary, borderRadius: 16, paddingHorizontal: 16 }]}><Search size={20} color={colors.mutedForeground} /><TextInput accessibilityLabel="Search memories" placeholder="Search a thing, note, or place" placeholderTextColor={colors.mutedForeground} value={query} onChangeText={setQuery} returnKeyType="search" style={[appStyles.input, appStyles.flex, { paddingHorizontal: 0, color: colors.foreground }]} /></View>
    <Choices values={filters.map(value => ({ value, label: value }))} selected={filter} onChange={setFilter} />
    {memories.isPending ? <LoadingRows /> : memories.error ? <ConnectionBanner error={memories.error} onRetry={() => void memories.refetch()} /> : !list.length ? <CalmEmpty title={query ? "No matching memories" : "Room for a first memory"} body={query ? "Try a different word or filter." : "Hold to talk or save a recent moment from Home. It'll be waiting here."} /> : groups.map(group => <View key={group} style={appStyles.section}>
      <Text variant="heading">{group}</Text>
      {list.filter(memory => memory.dayLabel === group).map(memory => <SwipeActions key={memory.id} onDelete={() => { deletion.reset(); setSelected(memory); }}>
        <View style={[appStyles.row, { paddingVertical: 8 }]}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Open ${memory.title}`} onPress={() => router.push(`/memory/${memory.id}`)} style={[appStyles.row, appStyles.flex, { minHeight: 88 }]}>
            <MemoryFrame compact uri={memory.frames[0]} label={memory.title} />
            <View style={[appStyles.flex, { gap: 4 }]}><Text variant="bodyMedium" numberOfLines={1}>{memory.title}</Text><Text variant="caption" color="mutedForeground">{memory.timeLabel} · {memory.place}</Text><Text variant="micro" color="mutedForeground" numberOfLines={1}>{memory.tags.join("  ·  ")}</Text></View>
            <ArrowUpRight size={18} color={colors.mutedForeground} />
          </Pressable>
          <IconButton accessibilityLabel={`Delete ${memory.title}`} icon={<Trash2 size={17} color={colors.mutedForeground} />} onPress={() => { deletion.reset(); setSelected(memory); }} />
        </View>
      </SwipeActions>)}
    </View>)}
    <BottomSheet visible={!!selected} title="Delete this memory?" onClose={() => !deletion.isPending && setSelected(null)}><Text variant="body">{selected?.title}</Text><Text variant="caption" color="mutedForeground">This removes its saved text and frames.</Text>{deletion.error && <ConnectionBanner error={deletion.error} onRetry={() => selected && deletion.mutate(selected.id)} />}<Button label="Delete memory" variant="danger" loading={deletion.isPending} onPress={() => selected && deletion.mutate(selected.id)} /><Button label="Keep memory" variant="secondary" disabled={deletion.isPending} onPress={() => setSelected(null)} /></BottomSheet>
  </AppScreen>;
}
