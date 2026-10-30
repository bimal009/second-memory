import React, { createContext, useCallback, useContext, useState } from "react";
import { usePathname } from "expo-router";
type PageIndex = 0 | 1 | 2;
function usePagerValue() {
  const [pageIndex, setPageIndex] = useState<PageIndex>(1); const [overlay, setOverlay] = useState<"memories" | "settings" | null>(null);
  const [dragging, setDragging] = useState(false); const pathname = usePathname();
  const routeFocused = pathname === "/capture" || pathname === "/(tabs)/capture";
  const goTo = useCallback((page: PageIndex) => { setOverlay(null); setPageIndex(page); }, []);
  const openMemories = useCallback(() => setOverlay("memories"), []); const openSettings = useCallback(() => setOverlay("settings"), []); const closeOverlay = useCallback(() => setOverlay(null), []);
  return { pageIndex, goTo, onPageSelected: setPageIndex, overlay, openMemories, openSettings, closeOverlay, setDragging, focused: pageIndex === 1 && routeFocused && !overlay && !dragging, routeFocused };
}
const PagerContext = createContext<ReturnType<typeof usePagerValue> | null>(null);
export function AppPagerProvider({ children }: React.PropsWithChildren) { const value = usePagerValue(); return <PagerContext.Provider value={value}>{children}</PagerContext.Provider>; }
export function useAppPager() { const value = useContext(PagerContext); if (!value) throw new Error("AppPagerProvider is required"); return value; }
