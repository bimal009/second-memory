import React from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useAppPager } from "./AppPagerProvider";
export function PagerSurface({ children }: { children: React.ReactNode[] }) {
  const pager = useAppPager();
  const gesture = Gesture.Pan().runOnJS(true).activeOffsetX([-24, 24]).failOffsetY([-18, 18]).onEnd(e => {
    if (Math.abs(e.translationX) > 60) pager.goTo(Math.max(0, Math.min(2, pager.pageIndex + (e.translationX < 0 ? 1 : -1))) as 0 | 1 | 2);
  });
  return <GestureDetector gesture={gesture}><View style={{ flex: 1 }}>{children[pager.pageIndex]}</View></GestureDetector>;
}
