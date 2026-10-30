import React, { useEffect } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { X } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { CitedAnswerCard } from "./CitedAnswerCard";
import { Text } from "@/components/ui/Text";
import { ResourceState } from "@/components/ui/ResourceState";
import { useTheme } from "@/theme/ThemeProvider";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useMemoryQuery } from "@/api/useMemoryQuery";
import { api } from "@/api/client";
import { captureCopy as c, uiCopy as u } from "@/constants/strings";
import type { AskResult } from "@/types";
export function AnswerOverlay({ result, onClose, onOpen }: { result: AskResult; onClose: () => void; onOpen: () => void }) {
  const { colors } = useTheme(); const reduced = useReducedMotion(); const y = useSharedValue(0); const opacity = useSharedValue(0);
  useEffect(() => { opacity.set(withTiming(1, { duration: reduced ? 0 : 200 })); }, [opacity, reduced]);
  const answer = result.kind === "answer" ? result.answer : null;
  const memory = useMemoryQuery(["overlay-citation", answer?.citedMemoryId], () => answer ? api.getMemory(answer.citedMemoryId) : Promise.resolve(null));
  const pan = Gesture.Pan().activeOffsetY(16).failOffsetX([-20, 20]).runOnJS(true).onUpdate(e => y.set(Math.max(0, e.translationY))).onEnd(e => { if (e.translationY > 80) onClose(); else y.set(withTiming(0, { duration: reduced ? 0 : 200 })); });
  const animation = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: y.value }] }));
  return <View style={[StyleSheet.absoluteFill, { justifyContent: "flex-end", padding: 16 }]} pointerEvents="box-none"><Animated.View accessibilityViewIsModal onAccessibilityEscape={onClose} style={[{ maxHeight: "85%", borderRadius: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 12 }, animation]}>
    <GestureDetector gesture={pan}><View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 48 }}><Text variant="heading">{c.answer}</Text><IconButton accessibilityLabel={u.close} onPress={onClose} icon={<X accessible={false} size={24} color={colors.foreground} />} /></View></GestureDetector>
    <ScrollView>{answer ? <CitedAnswerCard answer={answer} location={memory.data?.location} /> : <Text>{u.notFound}</Text>}<ResourceState error={memory.error} retry={() => { void memory.refetch(); }} /></ScrollView><Button label={c.openAsk} onPress={onOpen} />
  </Animated.View></View>;
}
