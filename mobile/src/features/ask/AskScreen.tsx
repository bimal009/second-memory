import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Send, Search } from "lucide-react-native";
import { Text } from "@/components/ui/Text";
import { Chip } from "@/components/ui/Chip";
import { HoldToTalkButton } from "@/components/domain/HoldToTalkButton";
import { AskResultView } from "@/features/ask/AskResultView";
import { useAsk } from "@/features/ask/useAsk";
import { spacing } from "@/theme/spacing";
import { strings } from "@/constants/strings";
import { interpolate } from "@/components/domain/BufferMeter";
import { usePreferences } from "@/lib/preferences";
import { useTheme } from "@/theme/ThemeProvider";

const MOCK_TRANSCRIPT = "Where is my passport?";

/**
 * Voice-first Q&A: hold to ask, typed fallback, cited answer rendering.
 */
export function AskScreen() {
  const { settings } = usePreferences();
  const { colors } = useTheme();
  const name = settings.assistantName;
  const { phase, question, result, location, suggestions, ask, reset } = useAsk();
  const [draft, setDraft] = useState("");

  const submitText = () => {
    const q = draft.trim() || question;
    if (q) {
      ask(q);
      setDraft("");
    }
  };

  return (
    <View style={styles.fill}>
      <View style={styles.header}>
        <Text variant="title">{strings.ask.title}</Text>
        <Text variant="caption" color="mutedForeground">
          {interpolate(strings.ask.subtitle, { name })}
        </Text>
      </View>

      {/* Result area */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {phase !== "idle" ? (
          <View style={styles.result}>
            <AskResultView
              phase={phase}
              result={result}
              location={location}
              suggestions={suggestions}
              assistantName={name}
              onRetry={(q) => (q ? ask(q) : ask(question))}
              onReset={reset}
            />
          </View>
        ) : null}

        {/* Example questions */}
        <View style={styles.examples}>
          <Text variant="micro" color="mutedForeground">
            {strings.ask.examplesTitle}
          </Text>
          <View style={styles.exampleRow}>
            {suggestions.map((s) => (
              <Chip key={s} label={s} onPress={() => ask(s)} />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Bottom: hold to ask + typed fallback */}
      <View style={styles.bottom}>
        <HoldToTalkButton
          label={interpolate(strings.ask.holdToAsk, { name })}
          active={phase === "thinking"}
          releaseHint={strings.ask.listening}
          onHoldStart={() => ask(MOCK_TRANSCRIPT)}
        />

        <View style={[styles.fallbackRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Search size={18} color={colors.mutedForeground} style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder={interpolate(strings.ask.placeholder, { name })}
            placeholderTextColor={colors.mutedForeground}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={submitText}
            returnKeyType="send"
            accessibilityLabel={interpolate(strings.ask.typingFallback, { name })}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.common.confirm}
            onPress={submitText}
            style={({ pressed }) => [
              styles.sendBtn,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Send size={18} color={colors.primaryForeground} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
    paddingTop: spacing.md,
  },
  result: {},
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  examples: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  exampleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  bottom: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
    alignItems: "center",
  },
  fallbackRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
  },
  searchIcon: { marginLeft: spacing.xs },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: spacing.sm,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
