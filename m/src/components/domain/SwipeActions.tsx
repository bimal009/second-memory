import React, { useMemo, useState } from "react";
import { Animated, PanResponder, Pressable, StyleSheet, View } from "react-native";
import { Check, Trash2 } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";

export function SwipeActions({ children, onDelete, onComplete }: { children: React.ReactNode; onDelete: () => void; onComplete?: () => void }) {
  const { colors } = useTheme();
  const [offset] = useState(() => new Animated.Value(0));
  const distance = onComplete ? 144 : 72;
  const responder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
    onPanResponderMove: (_, gesture) => offset.setValue(Math.max(-distance, Math.min(0, gesture.dx))),
    onPanResponderRelease: (_, gesture) => Animated.spring(offset, { toValue: gesture.dx < -35 ? -distance : 0, useNativeDriver: true, bounciness: 0 }).start(),
    onPanResponderTerminate: () => Animated.timing(offset, { toValue: 0, duration: 150, useNativeDriver: true }).start(),
  }), [distance, offset]);
  return <View style={styles.wrap}>
    <View style={styles.actions}>
      {onComplete && <Pressable accessibilityRole="button" accessibilityLabel="Mark reminder done" onPress={onComplete} style={[styles.action, { backgroundColor: colors.primary }]}><Check size={20} color={colors.primaryForeground} /></Pressable>}
      <Pressable accessibilityRole="button" accessibilityLabel="Delete" onPress={onDelete} style={[styles.action, { backgroundColor: colors.destructive }]}><Trash2 size={20} color={colors.destructiveForeground} /></Pressable>
    </View>
    <Animated.View {...responder.panHandlers} style={{ backgroundColor: colors.background, transform: [{ translateX: offset }] }}>{children}</Animated.View>
  </View>;
}
const styles = StyleSheet.create({ wrap: { overflow: "hidden", borderRadius: 12 }, actions: { position: "absolute", right: 0, top: 0, bottom: 0, flexDirection: "row" }, action: { width: 72, minHeight: 48, alignItems: "center", justifyContent: "center" } });
