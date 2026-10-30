import React, { useEffect } from "react";
import { Redirect } from "expo-router";
import { useAppPager } from "./AppPagerProvider";
function LegacyPagerRoute({ page, overlay }: { page?: 0 | 1 | 2; overlay?: "memories" | "settings" }) {
  const pager = useAppPager();
  useEffect(() => { if (page !== undefined) pager.goTo(page); if (overlay === "memories") pager.openMemories(); if (overlay === "settings") pager.openSettings(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <Redirect href="/(tabs)/capture" />;
}
export const LegacyAskRoute = () => <LegacyPagerRoute page={0} />;
export const LegacyTodayRoute = () => <LegacyPagerRoute page={2} />;
export const LegacySessionRoute = () => <LegacyPagerRoute page={1} />;
export const LegacyMemoriesRoute = () => <LegacyPagerRoute overlay="memories" />;
export const LegacySettingsRoute = () => <LegacyPagerRoute overlay="settings" />;
