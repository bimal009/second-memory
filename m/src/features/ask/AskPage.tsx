import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { api, usePreviewState } from "@/api/client";
import { useMemoryQuery, useSettings, useRefreshMemories } from "@/api/useMemoryQuery";
import { Page, Field, layout } from "@/components/ui/Page";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { ResourceState } from "@/components/ui/ResourceState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Shutter } from "@/components/domain/Shutter";
import { CitedAnswerCard } from "@/components/domain/CitedAnswerCard";
import { SightingsTimeline } from "@/components/domain/SightingsTimeline";
import { darkColors } from "@/theme/tokens";
import { copy, uiCopy as c, captureCopy as r } from "@/constants/strings";
import { useAppPager } from "@/features/pager/AppPagerProvider";
import { useCapture } from "@/features/run/CaptureProvider";
export function AskPage() {
  const [question, setQuestion] = useState(""); const [listening, setListening] = useState(false); const [highlighted, setHighlighted] = useState<unknown>(null);
  const settings = useSettings(); const state = usePreviewState(); const refresh = useRefreshMemories(); const pager = useAppPager(); const capture = useCapture();
  const params = useLocalSearchParams<{ question?: string }>(); const handled = useRef<string | undefined>(undefined);
  const name = settings.data?.assistantName.trim() || c.fallbackName;
  const examples = useMemoryQuery(["examples"], () => api.getExamples()); const history = useMemoryQuery(["question-history"], () => api.getQuestionHistory());
  const request = useMutation({ mutationFn: (text: string) => api.ask(text, name), onSuccess: refresh });
  const answer = request.data?.kind === "answer" ? request.data.answer : null;
  const citation = useMemoryQuery(["citation", answer?.citedMemoryId], () => answer ? api.getMemory(answer.citedMemoryId) : Promise.resolve(null));
  const sightings = useMemoryQuery(["sightings", answer?.citedMemoryId], () => answer ? api.getSightings(answer.citedMemoryId) : Promise.resolve([]));
  useEffect(() => { if (params.question && params.question !== handled.current) { handled.current = params.question; setQuestion(params.question); request.mutate(params.question); } }, [params.question]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (answer) { const timer = setTimeout(() => setHighlighted(answer), 450); return () => clearTimeout(timer); } }, [answer]);
  useEffect(() => { const timer = setTimeout(() => { request.reset(); setListening(false); }, 0); return () => clearTimeout(timer); }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
  const highlighting = !!answer && highlighted !== answer;
  const send = () => { if (question.trim()) request.mutate(question.trim()); };
  return <Page title={c.ask}>
    <View style={{ gap: 16, padding: 24, borderRadius: 10, backgroundColor: darkColors.card, alignItems: "center" }}><Text style={{ color: darkColors.foreground }}>{listening ? r.listening : copy(c.speakHint, { name })}</Text><Shutter label={c.holdAsk} disabled={request.isPending || state === "denied" || pager.pageIndex !== 0 || !capture.foreground} onTap={() => {}} onHoldStart={() => setListening(true)} onHoldCancel={() => setListening(false)} onHoldEnd={() => { setListening(false); if (examples.data?.[0]) { setQuestion(examples.data[0]); request.mutate(examples.data[0]); } }} />{listening && <Text variant="caption" align="center" style={{ color: darkColors.foreground }}>{examples.data?.[0]}</Text>}</View>
    {state === "denied" && <Text color="mutedForeground">{c.askPermission}</Text>}
    <View style={{ gap: 8 }}><Text variant="bodyMedium">{c.typeLabel}</Text><Field accessibilityLabel={c.typeLabel} placeholder={c.typePlaceholder} value={question} onChangeText={setQuestion} returnKeyType="send" onSubmitEditing={send} /><Button label={c.ask} onPress={send} loading={request.isPending} disabled={!question.trim()} /></View>
    <View style={layout.section}><ResourceState loading={examples.isPending} error={examples.error} retry={() => { void examples.refetch(); }} /><View style={layout.wrap}>{examples.data?.map(example => <Chip key={example} label={example} disabled={request.isPending} onPress={() => { setQuestion(example); request.mutate(example); }} />)}</View></View>
    <ResourceState loading={request.isPending} error={request.error} retry={() => request.variables && request.mutate(request.variables)} />
    {request.data?.kind === "not-found" && <View style={layout.section}><Text variant="heading">{c.notFound}</Text><Text color="mutedForeground">{c.notFoundBody}</Text>{request.data.suggestions.map(text => <Button key={text} label={text} variant="secondary" onPress={() => { setQuestion(text); request.mutate(text); }} />)}</View>}
    {highlighting && <View accessibilityLiveRegion="polite" style={layout.section}><Text>{r.highlighting}</Text><Skeleton height={200} /></View>}
    {answer && !highlighting && <View style={layout.section}><CitedAnswerCard answer={answer} location={citation.data?.location} /><Text variant="heading">{c.lastSeen}</Text><ResourceState loading={sightings.isPending} error={sightings.error || citation.error} retry={() => { void sightings.refetch(); void citation.refetch(); }} /><SightingsTimeline sightings={sightings.data ?? []} /></View>}
    <View style={layout.section}><Text variant="heading">{r.recentQuestions}</Text><ResourceState loading={history.isPending} error={history.error} retry={() => { void history.refetch(); }} />{history.data?.length ? history.data.map(item => <Button key={item.id} label={item.question} variant="secondary" onPress={() => { setQuestion(item.question); request.mutate(item.question); }} />) : !history.isPending && !history.error ? <Text color="mutedForeground">{r.noQuestions}</Text> : null}</View>
  </Page>;
}
