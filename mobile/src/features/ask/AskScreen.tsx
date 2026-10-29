import React, { useCallback, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { router } from "expo-router";
import { ArrowUpRight, Search } from "lucide-react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ask, getRecentQuestions, useSimulation } from "@/api";
import { AppScreen, ResponsiveColumns, appStyles } from "@/components/ui/AppScreen";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Choices } from "@/components/ui/Choices";
import { HoldToTalk } from "@/features/home/HoldToTalk";
import { ConnectionBanner } from "@/components/domain/ConnectionBanner";
import { LoadingRows, CalmEmpty } from "@/components/domain/ListStates";
import { MemoryFrame } from "@/components/domain/MemoryFrame";
import { PlaceMap } from "@/components/domain/PlaceMap";
import { useHomePermissions, PermissionNotice } from "@/components/domain/PermissionNotice";
import { usePreferences } from "@/lib/preferences";
import { useTheme } from "@/theme/ThemeProvider";

export function AskScreen() {
  const { colors } = useTheme();
  const { settings } = usePreferences();
  const simulation = useSimulation();
  const permissions = useHomePermissions();
  const [input, setInput] = useState("");
  const [holding, setHolding] = useState(false);
  const name = settings.assistantName.trim() || "Aria";
  const recent = useQuery({ queryKey: ["demo", "questions", simulation], queryFn: getRecentQuestions, retry: false });
  const request = useMutation({ mutationFn: ask });
  const { mutate } = request;
  const onVoice = useCallback(() => mutate("Where's my passport?"), [mutate]);
  const send = () => { if (input.trim()) { mutate(input.trim()); setInput(""); } };
  const answer = request.data;
  const best = answer?.citations[0];
  return <AppScreen title={`Ask ${name}`} subtitle="Find a detail. Pick up a thought." scrollEnabled={!holding}>
    <ResponsiveColumns>{[
      <View key="question" style={appStyles.section}>
        <HoldToTalk idleLabel="Hold to ask" processingLabel="Looking through memories..." disabled={request.isPending || permissions?.microphone.granted === false} processing={request.isPending} onSubmit={onVoice} onHoldingChange={setHolding} />
        {permissions?.microphone.granted === false && <PermissionNotice permission="microphone" />}
        <View style={[appStyles.row, { backgroundColor: colors.secondary, borderRadius: 16, padding: 8 }]}>
          <Search size={18} color={colors.mutedForeground} />
          <TextInput accessibilityLabel={`Ask ${name} a question`} placeholder="Or type your question" placeholderTextColor={colors.mutedForeground} value={input} onChangeText={setInput} onSubmitEditing={send} returnKeyType="send" style={[appStyles.flex, { minHeight: 48, color: colors.foreground, fontSize: 16, fontFamily: "Inter_400Regular" }]} />
          <Button label="Ask" disabled={!input.trim() || request.isPending} onPress={send} style={{ borderRadius: 24, paddingHorizontal: 16 }} />
        </View>
        <View style={appStyles.section}><Text variant="heading">Recent questions</Text>
          {recent.isPending ? <LoadingRows /> : recent.error ? <ConnectionBanner error={recent.error} onRetry={() => void recent.refetch()} /> : !recent.data?.length ? <CalmEmpty title="A clear page" body="Your recent questions will appear here." /> : recent.data.map(question => <Pressable key={question} accessibilityRole="button" disabled={request.isPending} onPress={() => mutate(question)} style={[appStyles.row, { minHeight: 56 }]}><Text variant="body" style={appStyles.flex}>{question}</Text><ArrowUpRight size={18} color={colors.mutedForeground} /></Pressable>)}
        </View>
      </View>,
      <View key="answer" style={appStyles.section}>
        {request.error && <ConnectionBanner error={request.error} onRetry={() => request.variables && mutate(request.variables)} />}
        {request.isPending ? <LoadingRows /> : answer ? answer.found && best ? <>
          <View style={[appStyles.panel, { backgroundColor: colors.secondary }]}><Text variant="heading">Found it</Text><Text variant="body">{answer.answer}</Text><Choices values={answer.citations.map(memory => ({ value: memory.id, label: `${memory.dayLabel}, ${memory.timeLabel}` }))} selected="" onChange={id => router.push(`/memory/${id}`)} /></View>
          <MemoryFrame uri={best.frames[0]} highlight={best.highlight} label={best.title} />
          <PlaceMap memory={best} />
          <Text variant="heading">Last seen</Text>
          {answer.citations.map(memory => <Pressable key={memory.id} accessibilityRole="button" accessibilityLabel={`Open ${memory.title}`} onPress={() => router.push(`/memory/${memory.id}`)} style={[appStyles.row, { minHeight: 80 }]}><MemoryFrame compact uri={memory.frames[0]} /><View style={appStyles.flex}><Text variant="bodyMedium">{memory.place}</Text><Text variant="caption" color="mutedForeground">{memory.dayLabel}, {memory.timeLabel}</Text></View><ArrowUpRight size={18} color={colors.mutedForeground} /></Pressable>)}
        </> : <CalmEmpty title="I don't have a memory of that" body="Try asking differently. I'll only answer from what you've saved." /> : <CalmEmpty title="Your memories, connected" body="Ask where you left something or what you planned. Answers link back to the moment." />}
      </View>,
    ]}</ResponsiveColumns>
  </AppScreen>;
}
