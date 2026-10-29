import React, { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Badge } from "@/components/ui/Badge";
import { SwitchRow } from "@/components/ui/SwitchRow";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { interpolate } from "@/components/domain/BufferMeter";
import { usePreferences } from "@/lib/preferences";
import { useHaptics } from "@/hooks/useHaptics";
import { api } from "@/api";
import type { AppearanceMode, BufferMinutes } from "@/types";
import { spacing } from "@/theme/spacing";
import { strings } from "@/constants/strings";
import { useTheme } from "@/theme/ThemeProvider";

export type SettingsViewProps = {
  onDeletedAll: () => void;
};

const APPEARANCE: { mode: AppearanceMode; label: string }[] = [
  { mode: "light", label: strings.settings.appearanceLight },
  { mode: "dark", label: strings.settings.appearanceDark },
  { mode: "system", label: strings.settings.appearanceSystem },
];

const BUFFERS: BufferMinutes[] = [1, 2, 5];

export function SettingsView({ onDeletedAll }: SettingsViewProps) {
  const { settings, update } = usePreferences();
  const { colors } = useTheme();
  const haptics = useHaptics();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typed, setTyped] = useState("");

  const confirmEnabled = typed.trim().toUpperCase() === "DELETE";

  return (
    <View style={styles.container}>
      {/* Assistant name */}
      <Card padding="lg">
        <Text variant="micro" color="mutedForeground">
          {strings.settings.assistantName}
        </Text>
        <View style={styles.nameRow}>
          <TextInput
            accessibilityLabel={strings.settings.assistantName}
            accessibilityHint={strings.settings.assistantNameHint}
            value={settings.assistantName}
            onChangeText={(v) => void update({ assistantName: v })}
            style={[styles.input, { color: colors.foreground }]}
            placeholder={strings.onboarding.assistantPlaceholder}
            placeholderTextColor={colors.mutedForeground}
            maxLength={24}
          />
        </View>
        <Text variant="caption" color="mutedForeground">
          {strings.settings.assistantNameHint}
        </Text>
      </Card>

      {/* Privacy */}
      <View style={styles.section}>
        <Text variant="heading">{strings.settings.privacyTitle}</Text>
        <Card padding="lg">
          <SwitchRow
            label={strings.settings.alwaysOnIndicator}
            sublabel={strings.settings.alwaysOnLocked}
            value={settings.alwaysOnIndicator}
            disabled
            onValueChange={() => {
              /* locked on — privacy-tailored no-op */
            }}
          />
          <SwitchRow
            label={strings.settings.pauseCapture}
            sublabel={strings.settings.pauseCapturingHint}
            value={settings.recordingPaused}
            onValueChange={(v) => void update({ recordingPaused: v })}
          />
          <Text variant="caption" color="mutedForeground" style={styles.explainer}>
            {strings.settings.storageNote}
          </Text>
          <View style={styles.bufferRow}>
            <Text variant="bodyMedium">{strings.settings.bufferLength}</Text>
            <View style={styles.bufferChips}>
              {BUFFERS.map((b) => (
                <Chip
                  key={b}
                  label={interpolate(strings.capture.bufferMinutesLabel, { minutes: `${b}` })}
                  selected={settings.bufferMinutes === b}
                  onPress={() => void update({ bufferMinutes: b })}
                />
              ))}
            </View>
          </View>
          <SwitchRow
            label={strings.settings.faceBlur}
            value={settings.faceBlur}
            disabled
            note={strings.settings.faceBlurComingSoon}
            onValueChange={() => {
              /* disabled until the feature ships */
            }}
          />
        </Card>
      </View>

      {/* Appearance */}
      <View style={styles.section}>
        <Text variant="heading">{strings.settings.appearanceTitle}</Text>
        <View style={styles.appearanceRow}>
          {APPEARANCE.map((a) => (
            <Chip
              key={a.mode}
              label={a.label}
              selected={settings.appearance === a.mode}
              onPress={() => void update({ appearance: a.mode })}
            />
          ))}
        </View>
      </View>

      {/* Connected sources */}
      <View style={styles.section}>
        <Text variant="heading">{strings.settings.sourcesTitle}</Text>
        <Card padding="lg">
          {settings.connectedSources.map((s) => (
            <View key={s.id} style={styles.sourceRow}>
              <Text variant="body">{s.name}</Text>
              {s.comingSoon ? (
                <Badge label={strings.settings.sourceComingSoon} tone="outline" />
              ) : (
                <IconButton
                  accessibilityLabel={`${s.name} — ${s.enabled ? "enabled" : "disabled"}`}
                  onPress={() => {
                    haptics.light();
                    void update({
                      connectedSources: settings.connectedSources.map((x) =>
                        x.id === s.id ? { ...x, enabled: !x.enabled } : x,
                      ),
                    });
                  }}
                  icon={<Text variant="micro">{s.enabled ? "On" : "Off"}</Text>}
                />
              )}
            </View>
          ))}
        </Card>
      </View>

      {/* Danger zone */}
      <View style={styles.section}>
        <Badge label={strings.settings.destructiveTitle} tone="danger" />
        <Button
          label={strings.settings.deleteAll}
          variant="danger"
          onPress={() => {
            haptics.warning();
            setTyped("");
            setConfirmOpen(true);
          }}
        />
      </View>

      {/* Typed confirm bottom sheet */}
      <BottomSheet
        visible={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={strings.settings.deleteAllTitle}
      >
        <Text variant="caption" color="mutedForeground">
          {strings.settings.deleteAllBody}
        </Text>
        <TextInput
          accessibilityLabel={strings.settings.deleteAllTypeHint}
          value={typed}
          onChangeText={setTyped}
          placeholder={strings.settings.deleteAllTypeHint}
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="characters"
          style={[
            styles.typedInput,
            { color: colors.destructive, borderColor: colors.destructive },
          ]}
        />
        <Button
          label={strings.settings.deleteAllConfirm}
          variant="danger"
          disabled={!confirmEnabled}
          onPress={() => {
            void api.deleteAllMemories().then(() => {
              setConfirmOpen(false);
              onDeletedAll();
            });
          }}
        />
        <Button
          label={strings.common.cancel}
          variant="secondary"
          onPress={() => setConfirmOpen(false)}
        />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  input: {
    flex: 1,
    minHeight: 44,
    fontSize: 16,
    paddingVertical: spacing.sm,
  },
  section: {
    gap: spacing.md,
  },
  explainer: { marginTop: spacing.xs },
  bufferRow: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  bufferChips: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  appearanceRow: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
  },
  typedInput: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    letterSpacing: 2,
  },
});
