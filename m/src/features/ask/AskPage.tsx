import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { api, usePreviewState } from "@/api/client";
import { useMemoryQuery, useSettings } from "@/api/useMemoryQuery";
import { Page, Field, layout } from "@/components/ui/Page";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { ResourceState } from "@/components/ui/ResourceState";
import { Shutter } from "@/components/domain/Shutter";
import { CitedAnswerCard } from "@/components/domain/CitedAnswerCard";
import { SightingsTimeline } from "@/components/domain/SightingsTimeline";
import { darkColors } from "@/theme/tokens";
import { copy, uiCopy as c } from "@/constants/strings";
import { useAppPager } from "@/features/pager/AppPagerProvider";
export function AskPage() {
  const [question, setQuestion] = useState(""); const [listening, setListening] = useState(false); const settings = useSettings(); const state = usePreviewState(); const pager = useAppPager();
  const name = settings.data?.assistantName.trim() || c.fallbackName;
  const examples = useMemoryQuery(["examples"], () => api.getExamples());
  const request = useMutation({ mutationFn: (text: string) => api.ask(text, name) });
  useEffect(() => { const timer = setTimeout(() => { request.reset(); setListening(false); }, 0); return () => clearTimeout(timer); }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
  const answer = request.data?.kind === "answer" ? request.data.answer : null;
  const citation = useMemoryQuery(["citation", answer?.citedMemoryId], () => answer ? api.getMemory(answer.citedMemoryId) : Promise.resolve(null));
  const sightings = useMemoryQuery(["sightings", answer?.citedMemoryId], () => answer ? api.getSightings(answer.citedMemoryId) : Promise.resolve([]));
  const send = () => { if (question.trim()) request.mutate(question.trim()); };
  return <Page eyebrow={c.askEyebrow} title={c.askTitle} subtitle={copy(c.askSubtitle, { name })}>
    <View style={{ gap: 16, padding: 24, borderRadius: 10, backgroundColor: darkColors.card, alignItems: "center" }}><Text style={{ color: darkColors.foreground }}>{listening ? c.listening : c.holdAsk}</Text><Shutter label={c.holdAsk} disabled={request.isPending || state === "denied"} onTap={() => { /* Hold-only; text input is the tap alternative. */ }} onHoldStart={() => setListening(true)} onHoldEnd={() => { setListening(false); if (examples.data?.[0]) request.mutate(examples.data[0]); }} /><Text variant="caption" align="center" style={{ color: darkColors.mutedForeground }}>{listening ? examples.data?.[0] : copy(c.speakHint, { name })}</Text></View>
    {state === "denied" && <Text color="mutedForeground">{c.askPermission}</Text>}
    <View style={{ gap: 8 }}><Text variant="bodyMedium">{c.typeLabel}</Text><Field accessibilityLabel={c.typeLabel} placeholder={c.typePlaceholder} value={question} onChangeText={setQuestion} returnKeyType="send" onSubmitEditing={send} /><Button label={c.ask} onPress={send} loading={request.isPending} disabled={!question.trim()} /></View>
    <View style={layout.section}><Text variant="micro" color="mutedForeground">{c.examples}</Text><ResourceState loading={examples.isPending} error={examples.error} retry={() => { void examples.refetch(); }} /><View style={layout.wrap}>{examples.data?.map(example => <Chip key={example} label={example} disabled={request.isPending} onPress={() => { setQuestion(example); request.mutate(example); }} />)}</View></View>
    <ResourceState loading={request.isPending} error={request.error} retry={() => request.variables && request.mutate(request.variables)} />
    {request.data?.kind === "not-found" && <View style={layout.section}><Text variant="heading">{c.notFound}</Text><Text color="mutedForeground">{c.notFoundBody}</Text>{request.data.suggestions.map(text => <Button key={text} label={text} variant="secondary" onPress={() => request.mutate(text)} />)}</View>}
    {answer && <View style={layout.section}><Text variant="micro" color="mutedForeground">{c.answer}</Text><CitedAnswerCard answer={answer} location={citation.data?.location} /><Text variant="heading">{c.lastSeen}</Text><ResourceState loading={sightings.isPending} error={sightings.error || citation.error} retry={() => { void sightings.refetch(); void citation.refetch(); }} /><SightingsTimeline sightings={sightings.data ?? []} /></View>}
  </Page>;
}
