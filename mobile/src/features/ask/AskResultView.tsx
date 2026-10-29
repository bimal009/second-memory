import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card } from "@/components/ui/Card";
import { CitedAnswerCard } from "@/components/domain/CitedAnswerCard";
import { Chip } from "@/components/ui/Chip";
import type { AskResult, MemoryLocation } from "@/types";
import { spacing } from "@/theme/spacing";
import { strings } from "@/constants/strings";
import { interpolate } from "@/components/domain/BufferMeter";
import { Button } from "@/components/ui/Button";

export type AskResultViewProps = {
  phase: "thinking" | "answer" | "not-found" | "error";
  result: AskResult | null;
  location: MemoryLocation | null;
  suggestions: readonly string[];
  assistantName: string;
  onRetry: (q?: string) => void;
  onReset: () => void;
};

export function AskResultView({
  phase,
  result,
  location,
  suggestions,
  assistantName,
  onRetry,
  onReset,
}: AskResultViewProps) {
  const { colors } = useTheme();

  if (phase === "thinking") {
    return (
      <Card padding="lg">
        <Skeleton height={180} radius={rad10()} style={styles.gapBelow} />
        <Skeleton width="40%" style={styles.gapBelow} />
        <Skeleton width="100%" />
        <Skeleton width="88%" />
      </Card>
    );
  }

  if (phase === "error") {
    return (
      <Card padding="lg" style={styles.centerCol}>
        <Text variant="heading">{strings.ask.errorTitle}</Text>
        <Text variant="caption" color="mutedForeground" align="center">
          {strings.ask.errorBody}
        </Text>
        <Button label={strings.common.retry} variant="secondary" onPress={() => onRetry()} />
      </Card>
    );
  }

  if (phase === "not-found" || (phase === "answer" && (!result || result.kind === "not-found"))) {
    return (
      <Card padding="lg" style={styles.centerCol}>
        <Text variant="heading">{interpolate(strings.ask.noMemoryTitle, { name: assistantName })}</Text>
        <Text variant="caption" color="mutedForeground" align="center">
          {interpolate(strings.ask.noMemoryBody, { name: assistantName })}
        </Text>
        <View style={styles.suggestions}>
          <Text variant="micro" color="mutedForeground">
            {strings.ask.suggestionsTitle}
          </Text>
          <View style={styles.suggestionRow}>
            {suggestions.slice(0, 3).map((s) => (
              <Chip key={s} label={s} onPress={() => onRetry(s)} />
            ))}
          </View>
        </View>
        <Button label={strings.ask.retry} variant="secondary" onPress={onReset} />
      </Card>
    );
  }

  if (result && result.kind === "answer") {
    return (
      <CitedAnswerCard
        answer={result.answer}
        location={location ?? undefined}
      />
    );
  }

  return null;
}

function rad10() {
  return 10;
}

const styles = StyleSheet.create({
  centerCol: {
    alignItems: "center",
    gap: spacing.md,
  },
  gapBelow: { marginBottom: spacing.md },
  suggestions: {
    width: "100%",
    gap: spacing.sm,
    alignItems: "center",
  },
  suggestionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "center",
  },
});