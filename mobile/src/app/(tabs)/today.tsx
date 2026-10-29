import React from "react";
import { Text } from "@/components/ui/Text";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { TodayView } from "@/features/today/TodayView";
import { useToday } from "@/features/today/useToday";
import { strings } from "@/constants/strings";
import { spacing } from "@/theme/spacing";

export default function TodayTab() {
  const today = useToday();

  return (
    <ScreenContainer scroll padBottom={16}>
      <Text variant="title" style={styles.title}>
        {strings.tabs.today}
      </Text>
      <TodayView
        data={today.data}
        loading={today.loading}
        error={today.error}
        onToggleReminder={(id, done) => void today.toggleReminder(id, done)}
        onRetry={() => void today.reload()}
      />
    </ScreenContainer>
  );
}

const styles = {
  title: { marginBottom: spacing.md, marginTop: spacing.md } as const,
};
