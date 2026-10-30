import React, { useEffect } from "react";
import { BackHandler, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { MockConnectivity } from "@/api/MockConnectivity";
import { CameraPreview } from "@/features/camera/CameraPreview";
import { CameraPage } from "@/features/camera/CameraPage";
import { AskPage } from "@/features/ask/AskPage";
import { TodayPage } from "@/features/today/TodayPage";
import { SettingsModal } from "@/features/settings/SettingsModal";
import { useAppPager } from "./AppPagerProvider";
import { PagerSurface } from "./PagerSurface";
import { PagerNav } from "./PagerNav";
import { MemoriesOverlay } from "./MemoriesOverlay";
export function AppPager() {
  const pager = useAppPager(); const { overlay, routeFocused, closeOverlay } = pager;
  useEffect(() => { if (!overlay || !routeFocused) return; const sub = BackHandler.addEventListener("hardwareBackPress", () => { closeOverlay(); return true; }); return () => sub.remove(); }, [overlay, routeFocused, closeOverlay]);
  return <GestureHandlerRootView style={{ flex: 1 }}><MockConnectivity /><CameraPreview /><View style={{ flex: 1 }} accessibilityElementsHidden={!!pager.overlay} importantForAccessibility={pager.overlay ? "no-hide-descendants" : "auto"}><PagerSurface>{[<AskPage key="ask" />, <CameraPage key="camera" />, <TodayPage key="today" />]}</PagerSurface><PagerNav /></View>{pager.overlay === "memories" && <MemoriesOverlay />}{pager.overlay === "settings" && <View accessibilityViewIsModal onAccessibilityEscape={pager.closeOverlay} style={StyleSheet.absoluteFill}><SettingsModal onClose={pager.closeOverlay} /></View>}</GestureHandlerRootView>;
}
