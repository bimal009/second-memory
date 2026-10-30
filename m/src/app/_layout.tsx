import React, { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { StyleSheet, View } from "react-native";
import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { queryClient } from "@/lib/queryClient";
import { useBootstrap } from "@/features/bootstrap/useBootstrap";
import { BootstrapStatus } from "@/features/bootstrap/BootstrapStatus";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { AppPagerProvider } from "@/features/pager/AppPagerProvider";
import { RecordingBanner } from "@/features/pager/RecordingBanner";
import { lightColors } from "@/theme/tokens";
import { registerDevice } from "@/lib/push";

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  if (fontError) throw fontError;
  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
          <ThemeProvider>
            <AppPagerProvider>
            <StatusBar style="dark" />
            <RootNavigator />
            </AppPagerProvider>
          </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

function RootNavigator() {
  const state = useBootstrap();
  const pathname = usePathname();
  const preview = pathname === "/home-preview";

  useEffect(() => {
    if (state === "ready") void registerDevice();
  }, [state]);

  if (!preview && (state === "loading" || state === "retry")) {
    return <BootstrapStatus failed={state === "retry"} />;
  }

  return (
    <View style={styles.root}>
      {state === "ready" && <RecordingBanner />}
      <Stack screenOptions={{ headerShown: false, animation: "none" }}>
        <Stack.Screen name="home-preview" />
        <Stack.Protected guard={state === "needsOnboarding"}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={state === "needsPermissions"}>
          <Stack.Screen name="permissions" />
        </Stack.Protected>
        <Stack.Protected guard={state === "ready"}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="memory/[id]" />
          <Stack.Screen name="session" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="session/[id]" options={{ animation: "fade" }} />
          <Stack.Screen name="privacy-receipt" options={{ animation: "slide_from_right" }} />
        </Stack.Protected>
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: lightColors.background },
});
