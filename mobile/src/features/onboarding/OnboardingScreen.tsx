import React, { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import {
  Camera,
  Mic,
  MapPin,
  Bell,
} from "lucide-react-native";
import { Text } from "@/components/ui/Text";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { interpolate } from "@/components/domain/BufferMeter";
import { useSettingsContext } from "@/features/settings/context";
import { spacing, touchTarget } from "@/theme/spacing";
import { limeDeep } from "@/theme/tokens";
import { strings } from "@/constants/strings";
import { useTheme } from "@/theme/ThemeProvider";
import { useHaptics } from "@/hooks/useHaptics";

/** Permission keys in display order. */
type PermissionKey = "camera" | "microphone" | "location" | "notifications";

const PERMISSIONS: {
  key: PermissionKey;
  icon: React.ComponentType<{ size: number; color: string }>;
}[] = [
  { key: "camera", icon: Camera },
  { key: "microphone", icon: Mic },
  { key: "location", icon: MapPin },
  { key: "notifications", icon: Bell },
];

/**
 * Name your assistant + permission rationale cards.
 * All permissions must be granted before continuing.
 */
export function OnboardingScreen({
  onDone,
}: {
  onDone: () => void;
}) {
  const { settings, update } = useSettingsContext();
  const { colors } = useTheme();
  const haptics = useHaptics();
  const [name, setName] = useState(settings.assistantName);
  const [granted, setGranted] = useState<Record<PermissionKey, boolean>>({
    camera: false,
    microphone: false,
    location: false,
    notifications: false,
  });

  const [permissionError, setPermissionError] = useState<string | null>(null);

  const request = async (key: PermissionKey) => {
    haptics.light();
    setPermissionError(null);
    let allowed = false;
    try {
      switch (key) {
        case "camera": {
          const mod = await import("expo-camera");
          allowed = (await mod.Camera.requestCameraPermissionsAsync()).granted;
          break;
        }
        case "microphone": {
          const mod = await import("expo-camera");
          allowed = (await mod.Camera.requestMicrophonePermissionsAsync()).granted;
          break;
        }
        case "location": {
          const loc = await import("expo-location");
          allowed = (await loc.requestForegroundPermissionsAsync()).granted;
          break;
        }
        case "notifications": {
          const n = await import("expo-notifications");
          allowed = (await n.requestPermissionsAsync()).granted;
          break;
        }
      }
    } catch {
      allowed = false;
    }
    setGranted((g) => ({ ...g, [key]: allowed }));
    if (!allowed) setPermissionError(strings.onboarding.permissionRequired);
  };

  const allGranted = Object.values(granted).every(Boolean);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="title">{strings.onboarding.title}</Text>
        <Text variant="caption" color="mutedForeground">
          {strings.onboarding.subtitle}
        </Text>
      </View>

      {/* Assistant name */}
      <Card padding="lg">
        <Text variant="heading">{strings.onboarding.assistantPrompt}</Text>
        <Text variant="caption" color="mutedForeground">
          {strings.onboarding.assistantHint}
        </Text>
        <TextInput
          accessibilityLabel={strings.onboarding.assistantPrompt}
          value={name}
          onChangeText={setName}
          onBlur={() => { if (name.trim()) void update({ assistantName: name.trim() }); }}
          placeholder={strings.onboarding.assistantPlaceholder}
          placeholderTextColor={colors.mutedForeground}
          maxLength={24}
          style={[styles.nameInput, { color: colors.foreground, borderColor: colors.input }]}
        />
      </Card>

      {/* Permission cards */}
      <View style={styles.section}>
        <Text variant="heading">{strings.onboarding.permissionsTitle}</Text>
        <Text variant="caption" color="mutedForeground">
          {strings.onboarding.permissionsSubtitle}
        </Text>
        {PERMISSIONS.map(({ key, icon: Icon }) => {
          const meta = strings.onboarding.permissions[key];
          return (
            <Card key={key} padding="lg">
              <View style={styles.permRow}>
                <View style={styles.iconWrap}>
                  <Icon size={20} color={colors.isDark ? colors.primary : limeDeep} />
                </View>
                <View style={styles.permBody}>
                  <Text variant="bodyMedium">{meta.label}</Text>
                  <Text variant="caption" color="mutedForeground">
                    {interpolate(meta.reason, { name: name.trim() || "your assistant" })}
                  </Text>
                </View>
                {granted[key] ? (
                  <Text variant="micro" style={{ color: colors.primaryForeground }} >
                    {strings.onboarding.enabled}
                  </Text>
                ) : (
                  <Button
                    label={strings.onboarding.enable}
                    variant="secondary"
                    onPress={() => void request(key)}
                  />
                )}
              </View>
            </Card>
          );
        })}
      </View>

      <View style={styles.footer}>
        {permissionError ? (
          <Text variant="caption" color="mutedForeground">{permissionError}</Text>
        ) : null}
        <Button
          label={strings.onboarding.getStarted}
          size="lg"
          fullWidth
          disabled={!name.trim() || !allGranted}
          onPress={() => {
            if (!name.trim() || !allGranted) return;
            void update({ assistantName: name.trim() }).then(() => {
              haptics.success();
              onDone();
            });
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxxl,
  },
  header: {
    gap: spacing.xs,
  },
  nameInput: {
    marginTop: spacing.md,
    minHeight: touchTarget,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
  section: {
    gap: spacing.md,
  },
  permRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: touchTarget,
  },
  permBody: {
    flex: 1,
    gap: 2,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
