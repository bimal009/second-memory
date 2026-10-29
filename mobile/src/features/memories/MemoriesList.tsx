import React from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Search, TriangleAlert } from "lucide-react-native";
import { Text } from "@/components/ui/Text";
import { Chip } from "@/components/ui/Chip";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { MemoryCard } from "@/components/domain/MemoryCard";
import { interpolate } from "@/components/domain/BufferMeter";
import type { MemoryFilterKey } from "@/types";
import { strings } from "@/constants/strings";
import { spacing } from "@/theme/spacing";
import { useTheme } from "@/theme/ThemeProvider";
import type { MemoryGroup } from "@/features/memories/useMemories";

const FILTERS: { key: MemoryFilterKey; label: string }[] = [
  { key: "all", label: strings.memories.filters.all },
  { key: "today", label: strings.memories.filters.today },
  { key: "places", label: strings.memories.filters.places },
  { key: "clips", label: strings.memories.filters.clips },
  { key: "reminders", label: strings.memories.filters.reminders },
];

export type MemoriesListProps = {
  groups: MemoryGroup[];
  filter: MemoryFilterKey;
  query: string;
  loading: boolean;
  error: boolean;
  assistantName: string;
  onFilterChange: (f: MemoryFilterKey) => void;
  onQueryChange: (q: string) => void;
  onOpen: (id: string) => void;
  onRetry: () => void;
};

export function MemoriesList({
  groups,
  filter,
  query,
  loading,
  error,
  assistantName,
  onFilterChange,
  onQueryChange,
  onOpen,
  onRetry,
}: MemoriesListProps) {
  const { colors } = useTheme();

  if (error) {
    return (
      <EmptyState
        icon={TriangleAlert}
        title={strings.memories.errorTitle}
        body={strings.ask.errorBody}
        actionLabel={strings.common.retry}
        onAction={onRetry}
      />
    );
  }

  if (!loading && groups.length === 0) {
    return (
      <EmptyState
        icon={Search}
        title={interpolate(strings.memories.emptyTitle, {})}
        body={interpolate(strings.memories.emptyBody, { name: assistantName })}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Search */}
      <View
        style={[
          styles.searchRow,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Search size={18} color={colors.mutedForeground} />
        <TextInput
          style={[styles.input, { color: colors.foreground }]}
          placeholder={strings.memories.search}
          placeholderTextColor={colors.mutedForeground}
          value={query}
          onChangeText={onQueryChange}
          returnKeyType="search"
          accessibilityLabel={strings.memories.search}
        />
      </View>

      {/* Filters */}
      <View style={styles.chipsRow}>
        {FILTERS.map((f) => (
          <Chip
            key={f.key}
            label={f.label}
            selected={filter === f.key}
            onPress={() => onFilterChange(f.key)}
          />
        ))}
      </View>

      {/* Loading skeleton */}
      {loading ? (
        <View style={styles.skeletons}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.skeletonRow}>
              <Skeleton width={64} height={64} />
              <View style={styles.skeletonCol}>
                <Skeleton width="80%" />
                <Skeleton width="95%" height={12} />
                <Skeleton width="60%" height={12} />
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {/* Grouped list */}
      {!loading
        ? groups.map((group) => (
            <View key={group.label} style={styles.group}>
              <Text variant="heading">{group.label}</Text>
              {group.memories.map((m) => (
                <MemoryCard key={m.id} memory={m} onPress={() => onOpen(m.id)} />
              ))}
            </View>
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: spacing.sm,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  skeletons: {
    gap: spacing.md,
  },
  skeletonRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  skeletonCol: {
    flex: 1,
    gap: spacing.xs,
    paddingVertical: 2,
  },
  group: {
    gap: spacing.md,
  },
});
