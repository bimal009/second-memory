import React from "react";
import { Pressable } from "react-native";
import { useAppPager } from "./AppPagerProvider";
import { Text } from "@/components/ui/Text";
import { darkColors } from "@/theme/tokens";
import { uiCopy as c } from "@/constants/strings";
import { clock } from "@/features/session/clock";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
export function RecordingBanner() {
  const pager = useAppPager();
  const insets = useSafeAreaInsets();
  if (!pager.isSessionActive || pager.focused) return null;
  return <Pressable accessibilityRole="button" accessibilityLabel={c.sessionRunning} onPress={() => { pager.goTo(1); router.replace("/(tabs)/capture"); }} style={({ pressed }) => ({ minHeight: insets.top + 48, padding: 12, paddingTop: insets.top + 12, backgroundColor: darkColors.primary, opacity: pressed ? 0.7 : 1 })}><Text align="center" style={{ color: darkColors.primaryForeground }}>{c.sessionRunning} · {clock(pager.session.seconds)}</Text></Pressable>;
}
