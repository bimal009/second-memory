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
import { SessionCard } from "@/components/domain/SessionCard";
import { useTheme } from "@/theme/ThemeProvider";
import { copy, uiCopy as c } from "@/constants/strings";
export function MemoryLibrary({ onClose }: { onClose: () => void }) {
  const { colors } = useTheme(); const [search, setSearch] = useState(""); const [filter, setFilter] = useState("all");
  const query = useMemoryQuery(["library", search, filter], () => api.listMemories({ query: search, filter: filter === "places" ? "places" : "all" }));
  const sessions = useMemoryQuery(["sessions"], () => api.listSessions());
  const moments = filter === "sessions" ? [] : query.data ?? [];
  const matchingSessions = filter === "moments" || filter === "places" ? [] : (sessions.data ?? []).filter(s => `${s.title} ${s.summary}`.toLowerCase().includes(search.toLowerCase()));
  const today = new Date().toDateString();
  const groups = [{ label: c.today, items: moments.filter(m => new Date(m.createdAt).toDateString() === today) }, { label: c.yesterday, items: moments.filter(m => new Date(m.createdAt).toDateString() !== today) }];
  return <Page eyebrow={c.libraryEyebrow} title={c.libraryTitle} subtitle={copy(c.count, { count: query.data?.length ?? 0 })} trailing={<IconButton accessibilityLabel={c.close} onPress={onClose} icon={<X accessible={false} size={24} color={colors.foreground} />} />}>
    <Field accessibilityLabel={c.search} placeholder={c.searchPlaceholder} value={search} onChangeText={setSearch} />
    <View style={layout.wrap}>{(["all", "moments", "sessions", "places"] as const).map(key => <Chip key={key} label={c[key]} selected={filter === key} onPress={() => setFilter(key)} />)}</View>
    <ResourceState loading={query.isPending || sessions.isPending} error={query.error || sessions.error} retry={() => { void query.refetch(); void sessions.refetch(); }} empty={!query.isPending && !sessions.isPending && !moments.length && !matchingSessions.length} />
    {!query.error && !sessions.error && groups.map(group => group.items.length ? <View key={group.label} style={layout.section}><Text variant="heading">{group.label}</Text><MemoryGrid memories={group.items} onOpen={id => router.push({ pathname: "/memory/[id]", params: { id } })} /></View> : null)}
    {!sessions.error && matchingSessions.map(session => <SessionCard key={session.id} session={session} onPress={() => router.push({ pathname: "/session/[id]", params: { id: session.id } })} />)}
  </Page>;
}
