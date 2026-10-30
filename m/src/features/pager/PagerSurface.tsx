import React, { useEffect, useRef } from "react";
import PagerView from "react-native-pager-view";
import { View } from "react-native";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useAppPager } from "./AppPagerProvider";
export function PagerSurface({ children }: { children: React.ReactNode[] }) {
  const ref = useRef<PagerView>(null); const pager = useAppPager(); const reduced = useReducedMotion();
  useEffect(() => { if (reduced) ref.current?.setPageWithoutAnimation(pager.pageIndex); else ref.current?.setPage(pager.pageIndex); }, [pager.pageIndex, reduced]);
  return <PagerView ref={ref} initialPage={1} style={{ flex: 1 }} scrollEnabled={!pager.overlay} onPageSelected={event => pager.onPageSelected(event.nativeEvent.position as 0 | 1 | 2)} onPageScrollStateChanged={event => pager.setDragging(event.nativeEvent.pageScrollState !== "idle")}>
    {children.map((child, index) => <View key={index} collapsable={false} style={{ flex: 1 }}>{child}</View>)}
  </PagerView>;
}
