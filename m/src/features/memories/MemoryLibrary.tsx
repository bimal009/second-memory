import React, { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { X } from "lucide-react-native";
import { api } from "@/api/client";
import { useMemoryQuery } from "@/api/useMemoryQuery";
import { Page, Field, layout } from "@/components/ui/Page";
import { Text } from "@/components/ui/Text";
import { Chip } from "@/components/ui/Chip";
import { IconButton } from "@/components/ui/IconButton";
import { ResourceState } from "@/components/ui/ResourceState";
import { MemoryGrid } from "@/components/domain/MemoryGrid";
import { RunCard } from "@/components/domain/RunCard";
import { useTheme } from "@/theme/ThemeProvider";
import { captureCopy as r, uiCopy as c } from "@/constants/strings";
export function MemoryLibrary({ onClose }: { onClose: () => void }) {
  const { colors } = useTheme(); const [search, setSearch] = useState(""); const [filter, setFilter] = useState("all");
  const query = useMemoryQuery(["library", search, filter], () => api.listMemories({ query: search, filter: filter === "places" ? "places" : filter === "bookmarks" ? "bookmarks" : "all" }));
  const runs = useMemoryQuery(["runs"], () => api.listRuns());
  const moments = filter === "runs" ? [] : query.data ?? [];
  const matchingRuns = filter === "bookmarks" || filter === "places" ? [] : (runs.data ?? []).filter(s => `${s.title} ${s.summary}`.toLowerCase().includes(search.toLowerCase()));
  const today = new Date().toDateString();
  const groups = [{ label: c.today, items: moments.filter(m => new Date(m.createdAt).toDateString() === today) }, { label: c.yesterday, items: moments.filter(m => new Date(m.createdAt).toDateString() !== today) }];
  return <Page title={c.memories} trailing={<IconButton accessibilityLabel={c.close} onPress={onClose} icon={<X accessible={false} size={24} color={colors.foreground} />} />}>
    <Field accessibilityLabel={c.search} placeholder={c.searchPlaceholder} value={search} onChangeText={setSearch} />
    <View style={layout.wrap}>{(["all", "bookmarks", "runs", "places"] as const).map(key => <Chip key={key} label={key === "bookmarks" ? r.bookmarks : key === "runs" ? r.runs : c[key]} selected={filter === key} onPress={() => setFilter(key)} />)}</View>
    <ResourceState loading={query.isPending || runs.isPending} error={query.error || runs.error} retry={() => { void query.refetch(); void runs.refetch(); }} empty={!query.isPending && !runs.isPending && !moments.length && !matchingRuns.length} />
    {!query.error && !runs.error && groups.map(group => group.items.length ? <View key={group.label} style={layout.section}><Text variant="heading">{group.label}</Text><MemoryGrid memories={group.items} onOpen={id => router.push({ pathname: "/memory/[id]", params: { id } })} /></View> : null)}
    {!runs.error && matchingRuns.map(run => <RunCard key={run.id} run={run} onPress={() => router.push({ pathname: "/run/[id]", params: { id: run.id } })} />)}
  </Page>;
}
