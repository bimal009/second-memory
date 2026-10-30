import React, { useEffect } from "react";
import { BackHandler, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { CameraPage } from "@/features/camera/CameraPage";
import { AskPage } from "@/features/ask/AskPage";
import { TodayPage } from "@/features/today/TodayPage";
import { SettingsModal } from "@/features/settings/SettingsModal";
import { useAppPager } from "./AppPagerProvider";
import { PagerSurface } from "./PagerSurface";
import { PagerNav } from "./PagerNav";
import { MemoriesOverlay } from "./MemoriesOverlay";
export function AppPager() {
  const pager = useAppPager();
  useEffect(() => { if (!pager.overlay || !pager.routeFocused) return; const sub = BackHandler.addEventListener("hardwareBackPress", () => { pager.closeOverlay(); return true; }); return () => sub.remove(); }, [pager.overlay, pager.routeFocused, pager.closeOverlay]);
  return <GestureHandlerRootView style={{ flex: 1 }}><View style={{ flex: 1 }} accessibilityElementsHidden={!!pager.overlay} importantForAccessibility={pager.overlay ? "no-hide-descendants" : "auto"}><PagerSurface>{[<AskPage key="ask" />, <CameraPage key="camera" />, <TodayPage key="today" />]}</PagerSurface><PagerNav /></View>{pager.overlay === "memories" && <MemoriesOverlay />}{pager.overlay === "settings" && <View accessibilityViewIsModal onAccessibilityEscape={pager.closeOverlay} style={StyleSheet.absoluteFill}><SettingsModal onClose={pager.closeOverlay} /></View>}</GestureHandlerRootView>;
}
