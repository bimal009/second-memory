import React, { useEffect } from "react";
import { Redirect } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useSettingsContext } from "@/features/settings/context";

/** First-run gate: onboarding → tabs. */
export default function IndexGate() {
  const { settings } = useSettingsContext();

  useEffect(() => {
    void SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  if (settings.onboardingComplete) {
    return <Redirect href="/(tabs)/capture" />;
  }
  return <Redirect href="/onboarding" />;
}
