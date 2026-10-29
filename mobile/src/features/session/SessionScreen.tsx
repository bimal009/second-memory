import React, { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Check, ChevronDown, ChevronUp, Mic } from "lucide-react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { saveSession } from "@/api";
import { AppScreen, ResponsiveColumns, appStyles } from "@/components/ui/AppScreen";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConnectionBanner } from "@/components/domain/ConnectionBanner";
import { ReminderEditor } from "@/components/domain/ReminderEditor";
import { MemoryFrame } from "@/components/domain/MemoryFrame";
import { useTheme } from "@/theme/ThemeProvider";
import { usePreferences } from "@/lib/preferences";
import { CaptureModeSwitch } from "@/features/home/CaptureModeSwitch";
import { CaptureTypeSwitch } from "@/features/recording/CaptureTypeSwitch";
import { LiveWaveform } from "@/features/recording/LiveWaveform";
import { RecordingPermissionCard } from "@/features/recording/RecordingPermissionCard";
import { useRecordingController, useRecordingState } from "@/features/recording/RecordingProvider";
import { sessionLimit } from "@/features/recording/policy";

export function SessionScreen() {
  const { colors } = useTheme();
  const client = useQueryClient();
  const { settings, update } = usePreferences();
  const controller = useRecordingController();
  const state = useRecordingState();
  const session = state?.session;
  const phase = session?.phase ?? "idle";
  const mode = state?.cameraGranted ? settings.sessionMode ?? "audio" : "audio";
  const [transcript, setTranscript] = useState(false);
  const [selectedTime, setSelectedTime] = useState("");
  const [checked, setChecked] = useState<string[]>([]);
  const [reminder, setReminder] = useState<string | null>(null);
  const start = useMutation({ mutationFn: async () => {
    if (!controller) throw new Error("Recording needs an Android device.");
    await controller.startSession(mode);
  }, onMutate: () => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); } });
  const control = useMutation({ mutationFn: async (action: "pause" | "resume" | "stop") => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (action === "pause") await controller?.pauseSession();
    if (action === "resume") await controller?.resumeSession();
    if (action === "stop") await controller?.stopSession();
  } });
  const result = session?.result;
  const save = useMutation({ mutationFn: () => saveSession(session?.mode ?? "audio", result), onSuccess: memory => {
    controller?.clearSessionResult(); void client.invalidateQueries({ queryKey: ["demo"] }); router.replace(`/memory/${memory.id}`);
  } });
  const seconds = Math.floor(state?.sessionSeconds ?? 0);
  const clock = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const error = start.error ?? control.error ?? (state?.error ? new Error(state.error) : controller?.queue.error ? new Error(controller.queue.error) : null);
  return <AppScreen title="Session" back subtitle="Long conversations, kept as text.">
    {error && <ConnectionBanner error={error} onRetry={() => { if (start.error) start.mutate(); else if (control.error && control.variables) control.mutate(control.variables); else controller?.retry(); }} />}
    {phase === "idle" && <>
      <CaptureModeSwitch mode="session" disabled={start.isPending} onChange={next => { if (next === "voice") router.replace("/(tabs)/capture"); }} />
      <CaptureTypeSwitch mode={mode} disabled={start.isPending} cameraDenied={!state?.cameraGranted} onChange={sessionMode => { void update({ sessionMode }).catch(() => {}); }} />
      {!state?.cameraGranted && <Text variant="caption" color="mutedForeground">Camera off</Text>}
      <View style={[appStyles.panel, { backgroundColor: colors.secondary, paddingVertical: 32 }]}><Mic size={28} color={colors.foreground} /><Text variant="title">Make room for a conversation.</Text><Text variant="body" color="mutedForeground">{mode === "video" ? "Record audio and video for up to 10 minutes. Video chunks upload only over Wi-Fi." : "Record audio for up to 30 minutes. Each 30-second chunk uploads while the next one records."}</Text><Text variant="caption" color="mutedForeground">Buffer pauses while a session runs. Raw recordings are deleted after upload.</Text></View>
      {!state?.microphoneGranted && <RecordingPermissionCard session />}
      <Button label="Start session" loading={start.isPending} disabled={!state?.microphoneGranted || !state?.ready} onPress={() => start.mutate()} style={{ borderRadius: 28 }} />
      <Text variant="caption" color="mutedForeground">Keep the app open while recording.</Text>
    </>}
    {(phase === "recording" || phase === "paused") && <>
      <View accessibilityLiveRegion="polite" style={[appStyles.panel, { backgroundColor: colors.secondary }]}><Text variant="bodyMedium">{phase === "recording" ? "Session on, buffer paused" : "Session paused"}</Text><Text variant="caption" color="mutedForeground">Keep the app open while recording.</Text></View>
      {session?.mode === "video" && phase === "recording" && <View style={{ height: 210 }} />}
      <View style={{ alignItems: "center", gap: 16 }}>
        <Text variant="display" style={{ fontSize: 64, lineHeight: 76, letterSpacing: -2, fontVariant: ["tabular-nums"] }}>{clock}</Text>
        {session?.mode === "audio" && <LiveWaveform level={state?.level ?? -160} recording={phase === "recording"} />}
        <Text variant="caption" color="mutedForeground">{session?.mode === "video" ? "Audio + Video" : "Audio only"} · {sessionLimit(session?.mode ?? "audio") / 60} min limit</Text>
        <Text variant="caption" color="mutedForeground">{session?.uploaded ? `Chunk ${session.uploaded} uploaded` : "Recording first chunk..."}</Text>
      </View>
      {!!state?.pendingSessionUploads && <Text accessibilityLiveRegion="polite" variant="bodyMedium">{state.pendingSessionUploads} chunks waiting to upload{state.waitingForWifi ? " · Waiting for Wi-Fi" : ""}</Text>}
      {state?.warning && <Text accessibilityRole="alert" variant="bodyMedium" color="destructive">{state.warning}</Text>}
      <View style={appStyles.wrap}><Button label={phase === "paused" ? "Resume" : "Pause"} variant="secondary" disabled={control.isPending} onPress={() => control.mutate(phase === "paused" ? "resume" : "pause")} style={{ flexGrow: 1, borderRadius: 28 }} /><Button label="Stop" disabled={control.isPending} onPress={() => control.mutate("stop")} style={{ flexGrow: 1, borderRadius: 28 }} /></View>
    </>}
    {(phase === "uploading" || phase === "summarizing") && <View style={appStyles.section}>
      <Text variant="title">{phase === "uploading" ? "Uploading last chunks..." : "Summarizing..."}</Text>
      {phase === "uploading" && <Text variant="body" color="mutedForeground">{state?.pendingSessionUploads ?? 0} chunks waiting to upload{state?.waitingForWifi ? ". Connect to Wi-Fi to finish." : ". Keep this app open."}</Text>}
      <Skeleton height={120} radius={20} /><Skeleton width="80%" /><Skeleton width="60%" />
      <Button label="Retry uploads" variant="secondary" onPress={() => controller?.retry()} />
    </View>}
    {phase === "result" && result && <>
      {!!result.keyFrames?.length && <View style={appStyles.section}><Text variant="heading">Key frames</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>{result.keyFrames.map(frame => <Pressable key={frame.timestamp} accessibilityRole="button" accessibilityLabel={`Transcript at ${frame.timestamp}`} onPress={() => { setTranscript(true); setSelectedTime(frame.timestamp); }} style={{ width: 128, gap: 8, paddingBottom: 8 }}><MemoryFrame uri={frame.uri} /><Text variant="caption">{frame.timestamp}</Text></Pressable>)}</ScrollView></View>}
      <ResponsiveColumns>{[
        <View key="summary" style={appStyles.section}><View style={[appStyles.panel, { backgroundColor: colors.secondary }]}><Text variant="heading">Summary</Text><Text variant="body">{result.summary}</Text></View><Text variant="heading">Action items</Text>{result.actionItems.map(item => <View key={item} style={{ gap: 8 }}><Pressable accessibilityRole="checkbox" accessibilityLabel={item} accessibilityState={{ checked: checked.includes(item) }} onPress={() => setChecked(previous => previous.includes(item) ? previous.filter(value => value !== item) : [...previous, item])} style={[appStyles.row, { minHeight: 56 }]}><View style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: checked.includes(item) ? colors.primary : colors.secondary, justifyContent: "center", alignItems: "center" }}>{checked.includes(item) && <Check size={16} color={colors.primaryForeground} />}</View><Text variant="body" style={appStyles.flex}>{item}</Text></Pressable><Button label="Add reminder" variant="secondary" onPress={() => setReminder(item)} style={{ alignSelf: "flex-start", borderRadius: 24 }} /></View>)}</View>,
        <View key="transcript" style={appStyles.section}><Pressable accessibilityRole="button" accessibilityLabel="Toggle transcript" accessibilityState={{ expanded: transcript }} onPress={() => setTranscript(value => !value)} style={[appStyles.row, { minHeight: 56 }]}><Text variant="heading" style={appStyles.flex}>Transcript</Text>{transcript ? <ChevronUp size={20} color={colors.foreground} /> : <ChevronDown size={20} color={colors.foreground} />}</Pressable>{transcript && result.transcript.map(line => <View key={line.timestamp} style={[appStyles.panel, { backgroundColor: selectedTime === line.timestamp ? colors.secondary : colors.background, paddingHorizontal: 0 }]}><Button label={line.timestamp} variant="secondary" onPress={() => setSelectedTime(line.timestamp)} style={{ alignSelf: "flex-start", borderRadius: 24 }} /><Text variant="body">{line.text}</Text></View>)}</View>,
      ]}</ResponsiveColumns>
      {save.error && <ConnectionBanner error={save.error} onRetry={() => save.mutate()} />}
      <Button label="Save session" loading={save.isPending} onPress={() => save.mutate()} style={{ borderRadius: 28 }} />
      <Button label="Delete session" variant="danger" disabled={save.isPending} onPress={() => { controller?.clearSessionResult(); if (router.canGoBack()) router.back(); else router.replace("/(tabs)/capture"); }} style={{ borderRadius: 28 }} />
    </>}
    {reminder && <ReminderEditor key={reminder} visible initialText={reminder} source="Session" onClose={() => setReminder(null)} />}
  </AppScreen>;
}
