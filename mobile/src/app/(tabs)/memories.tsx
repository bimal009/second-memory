import React from "react";
import { router } from "expo-router";
import { Text } from "@/components/ui/Text";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { MemoriesList } from "@/features/memories/MemoriesList";
import { useMemories } from "@/features/memories/useMemories";
import { usePreferences } from "@/lib/preferences";
import { strings } from "@/constants/strings";
import { spacing } from "@/theme/spacing";

export default function MemoriesTab() {
  const memories = useMemories();
  const { settings } = usePreferences();

  return (
    <ScreenContainer scroll padBottom={16}>
      <Text variant="title" style={styles.title}>
        {strings.tabs.memories}
      </Text>
      <MemoriesList
        groups={memories.groups}
        filter={memories.filter}
        query={memories.query}
        loading={memories.loading}
        error={memories.error}
        assistantName={settings.assistantName}
        onFilterChange={memories.setFilter}
        onQueryChange={memories.setQuery}
        onOpen={(id) => router.push(`/memory/${id}`)}
        onRetry={() => void memories.refresh()}
      />
    </ScreenContainer>
  );
}

const styles = {
  title: { marginBottom: spacing.md, marginTop: spacing.md } as const,
};
