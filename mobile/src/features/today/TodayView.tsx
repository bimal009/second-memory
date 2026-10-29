import React from "react";
import { StyleSheet, View } from "react-native";
import { CalendarOff } from "lucide-react-native";
import { Text } from "@/components/ui/Text";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { RecapCard } from "@/components/domain/RecapCard";
import { ReminderRow } from "@/components/domain/ReminderRow";
import type { TodayPayload } from "@/types";
import { spacing } from "@/theme/spacing";
import { strings } from "@/constants/strings";

export type TodayViewProps = {
  data: TodayPayload | null;
  loading: boolean;
  error: boolean;
  onToggleReminder: (id: string, done: boolean) => void;
  onRetry: () => void;
};

export function TodayView({
  data,
  loading,
  error,
  onToggleReminder,
  onRetry,
}: TodayViewProps) {
  if (error) {
    return (
      <EmptyState
        icon={CalendarOff}
        title={strings.ask.errorTitle}
        body={strings.ask.errorBody}
        actionLabel={strings.common.retry}
        onAction={onRetry}
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Skeleton height={180} radius={14} />
        <Skeleton width="40%" />
        <Skeleton height={52} radius={10} />
        <Skeleton height={52} radius={10} />
      </View>
    );
  }

  if (!data) return null;

  const allDone = data.reminders.length > 0 && data.reminders.every((r) => r.done);

  return (
    <View style={styles.container}>
      {data.recap ? <RecapCard recap={data.recap} /> : null}

      <View style={styles.section}>
        <Text variant="heading">{strings.today.remindersTitle}</Text>
        {data.reminders.length === 0 ? (
          <EmptyState
            icon={CalendarOff}
            title={strings.today.emptyTitle}
            body={strings.today.emptyBody}
          />
        ) : (
          <>
            {data.reminders.map((r) => (
              <ReminderRow
                key={r.id}
                reminder={r}
                onToggle={(done) => onToggleReminder(r.id, done)}
              />
            ))}
            {allDone ? (
              <Text variant="caption" color="mutedForeground" style={styles.allDone}>
                {strings.today.allDone}
              </Text>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  section: {
    gap: spacing.md,
  },
  allDone: {
    textAlign: "center",
  },
});
