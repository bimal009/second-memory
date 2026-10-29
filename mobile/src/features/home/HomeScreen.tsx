import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { CheckCircle2, ShieldCheck } from "lucide-react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Text } from "@/components/ui/Text";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConnectionBanner } from "@/components/domain/ConnectionBanner";
import { PermissionNotice, useHomePermissions } from "@/components/domain/PermissionNotice";
import { usePreferences } from "@/lib/preferences";
import { useTheme } from "@/theme/ThemeProvider";
import { limeDeep } from "@/theme/tokens";
import { spacing } from "@/theme/spacing";
import { useHome } from "./useHome";
import { CommandButton } from "@/features/recording/CommandButton";
import { CaptureTypeSwitch } from "@/features/recording/CaptureTypeSwitch";
import { RecordingPermissionCard } from "@/features/recording/RecordingPermissionCard";
import { Choices } from "@/components/ui/Choices";
import { BufferStatus } from "./BufferStatus";
import { PlanEditor } from "./PlanEditor";
import { CaptureModeSwitch } from "./CaptureModeSwitch";

export function HomeScreen({ preview = false }: { preview?: boolean }) {
  const home = useHome();
  const { settings, update } = usePreferences();
  const { colors } = useTheme();
  const permissions = useHomePermissions();
  const microphoneDenied = !home.state?.microphoneGranted;
  const cameraDenied = !home.state?.cameraGranted;
  const locationDenied = permissions?.location.granted === false;
  const notificationsDenied = permissions?.notifications.granted === false;
  const [windowSeconds, setWindowSeconds] = useState(30);
  const holding = home.state?.commandPhase === "recording" || home.state?.commandPhase === "preparing";
  const mode = cameraDenied ? "audio" : settings.pushToTalkMode ?? "video";
  const assistantName = settings.assistantName.trim() || "Aria";
  const accent = colors.isDark ? colors.primary : limeDeep;
  useEffect(() => {
    if (home.saved) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [home.saved]);
  const draft = home.draft ? {
    ...home.draft,
    location: { enabled: home.draft.location.enabled && !locationDenied && settings.locationEnabled !== false },
    reminder: { ...home.draft.reminder, enabled: home.draft.reminder.enabled && !notificationsDenied },
  } : null;
  return <ScreenContainer noHorizontalPadding>
    <ScrollView scrollEnabled={!holding} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      {preview && <Text variant="micro" color="mutedForeground">Home preview · simulated capture</Text>}
      {home.error && <ConnectionBanner error={home.error} onRetry={home.retry} />}
      {home.buffer.isPending ? <View style={styles.loading} accessibilityLabel="Loading buffer"><Skeleton width="50%" height={40} /><Skeleton height={180} radius={24} /></View> : <BufferStatus assistantName={assistantName} buffer={home.buffer.data} statusLabel={home.state?.bufferMessage ?? "Buffer off"} preview={!!home.state?.cameraMounted} toggling={holding || !!home.state?.session && !["idle", "result"].includes(home.state.session.phase)} onToggle={home.toggleRecording} />}
      {home.state?.ready && (microphoneDenied || cameraDenied) && <RecordingPermissionCard />}
      {holding && <Text variant="caption" color="mutedForeground">Buffer paused while you talk</Text>}
      {holding && mode === "video" && <View style={{ height: 100 }} />}
      {locationDenied && <PermissionNotice permission="location" />}
      {notificationsDenied && <PermissionNotice permission="notifications" />}
      {home.buffer.data?.seconds === 0 && <Card style={styles.notice}><Text variant="bodyMedium">A fresh start</Text><Text variant="caption" color="mutedForeground">Your buffer is empty. New moments will appear here while the buffer is on.</Text></Card>}
      {draft && <PlanEditor draft={draft} onChange={home.setDraft} onSave={() => home.saveDraft(draft)} onDiscard={home.discard} saving={home.saving} disabled={home.busy} locationDenied={locationDenied || settings.locationEnabled === false} notificationsDenied={notificationsDenied} framesAvailable={home.state?.commandMode === "video"} />}
      {home.saved && <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.saved, { backgroundColor: colors.secondary }]}><CheckCircle2 size={22} color={accent} /><Text variant="bodyMedium" style={{ color: accent }}>Saved to memories</Text></View>}
      <View style={styles.spacer} />
      <CaptureModeSwitch mode="voice" disabled={holding || home.busy || !!draft} onChange={mode => { if (mode === "session") router.push("/session"); }} />
      <CaptureTypeSwitch mode={mode} disabled={holding || home.busy || !!draft} cameraDenied={cameraDenied} onChange={pushToTalkMode => { void update({ pushToTalkMode }).catch(() => {}); }} />
      {cameraDenied && <Text variant="caption" color="mutedForeground">Camera off</Text>}
      <View style={{ gap: 8 }}><Text variant="caption" color="mutedForeground">Include recent context</Text><Choices values={[15, 30, 60].map(value => ({ value, label: `${value} s` }))} selected={windowSeconds} disabled={holding || home.busy || !!draft} onChange={setWindowSeconds} /></View>
      <CommandButton mode={mode} windowSeconds={windowSeconds} disabled={!!draft || home.saving || home.buffer.isPending} />
      {!!home.state?.pendingUploads && <Text variant="caption" color="mutedForeground">{home.state.pendingUploads} files waiting to upload{home.state.waitingForWifi ? " · Wi-Fi needed" : ""}</Text>}
      <View style={styles.privacy}><ShieldCheck size={14} color={colors.mutedForeground} /><Text variant="micro" color="mutedForeground">Nothing is uploaded until you trigger it.</Text></View>
    </ScrollView>
  </ScreenContainer>;
}
const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: spacing.lg, paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.lg, width: "100%", maxWidth: 640, alignSelf: "center" },
  loading: { gap: spacing.lg }, notice: { gap: spacing.sm }, spacer: { flex: 1, minHeight: spacing.md },
  privacy: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: spacing.xs, flexWrap: "wrap" }, saved: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.lg, borderRadius: 16 },
});
