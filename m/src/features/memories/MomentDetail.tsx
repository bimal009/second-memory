import React, { useRef, useState } from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useMemoryQuery, useRefreshMemories } from "@/api/useMemoryQuery";
import { Page, layout } from "@/components/ui/Page";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { SwitchRow } from "@/components/ui/SwitchRow";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ResourceState } from "@/components/ui/ResourceState";
import { GradientFrame, HighlightPolygon } from "@/components/domain/FrameWithHighlight";
import { LocalRecordingPlayer } from "@/components/domain/LocalRecordingPlayer";
import { LocationCard } from "@/components/domain/LocationCard";
import { useTheme } from "@/theme/ThemeProvider";
import { highlightFill, limeDeep } from "@/theme/tokens";
import { copy, captureCopy as r, uiCopy as c } from "@/constants/strings";
export function MomentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(); const { colors } = useTheme(); const [highlight, setHighlight] = useState(true); const [confirm, setConfirm] = useState(false);
  const frames = useRef<React.ComponentRef<typeof ScrollView>>(null); const [frameIndex, setFrameIndex] = useState(0);
  const query = useMemoryQuery(["memory", id], () => api.getMemory(id)); const refresh = useRefreshMemories(); const { width } = useWindowDimensions(); const frameWidth = Math.min(width - 48, 712);
  const remove = useMutation({ mutationFn: () => api.deleteMemory(id), onSuccess: () => { refresh(); router.back(); } }); const memory = query.data;
  return <Page eyebrow={memory?.kind === "bookmark" ? r.bookmarks : r.chunk} title={memory?.title ?? c.memories} subtitle={memory?.startedAtLabel} trailing={<IconButton accessibilityLabel={c.back} onPress={() => router.back()} icon={<ArrowLeft accessible={false} color={colors.foreground} size={24} />} />}>
    <ResourceState loading={query.isPending} error={query.error} empty={!query.isPending && !memory} retry={() => { void query.refetch(); }} />
    {memory && <><ScrollView ref={frames} horizontal snapToInterval={frameWidth + 8} decelerationRate="fast" onMomentumScrollEnd={event => setFrameIndex(Math.min(2, Math.round(event.nativeEvent.contentOffset.x / (frameWidth + 8))))} accessibilityLabel={c.frames} showsHorizontalScrollIndicator contentContainerStyle={{ gap: 8 }}>{[0, 1, 2].map((offset) => <View key={offset} accessible accessibilityLabel={copy(c.framePosition, { current: offset + 1, total: 3 })} style={{ width: frameWidth, height: frameWidth * 0.7, borderRadius: 10, overflow: "hidden" }}><GradientFrame seed={memory.frameSeed + offset} />{highlight && memory.highlight && <View pointerEvents="none" style={StyleSheet.absoluteFill}><HighlightPolygon mask={memory.highlight.mask} stroke={colors.isDark ? colors.primary : limeDeep} fill={highlightFill} /></View>}</View>)}</ScrollView>
      <Text variant="caption" color="mutedForeground">{copy(c.framePosition, { current: frameIndex + 1, total: 3 })}</Text><View style={layout.wrap}><Button label={c.previousFrame} variant="secondary" disabled={frameIndex === 0} onPress={() => { const next = frameIndex - 1; setFrameIndex(next); frames.current?.scrollTo({ x: next * (frameWidth + 8), animated: false }); }} /><Button label={c.nextFrame} variant="secondary" disabled={frameIndex === 2} onPress={() => { const next = frameIndex + 1; setFrameIndex(next); frames.current?.scrollTo({ x: next * (frameWidth + 8), animated: false }); }} /></View>
      <SwitchRow label={c.highlight} value={highlight} onValueChange={setHighlight} /><View style={layout.section}><Text variant="heading">{c.transcript}</Text><Text>{memory.transcript}</Text></View><View style={layout.section}><Text variant="heading">{c.tags}</Text><View style={layout.wrap}>{memory.tags.map(tag => <Text key={tag} variant="caption" color="mutedForeground">#{tag}</Text>)}</View></View>{memory.location && <LocationCard location={memory.location} />}{memory.localCopyUri && <LocalRecordingPlayer uri={memory.localCopyUri} />}<Button label={c.deleteMemory} variant="danger" onPress={() => setConfirm(true)} /></>}
    <BottomSheet visible={confirm} title={c.deleteTitle} onClose={() => setConfirm(false)}><Text>{c.deleteBody}</Text>{remove.error && <Text color="destructive">{c.error}</Text>}<Button label={c.deleteMemory} variant="danger" loading={remove.isPending} onPress={() => remove.mutate()} /><Button label={c.cancel} variant="secondary" onPress={() => setConfirm(false)} /></BottomSheet>
  </Page>;
}
