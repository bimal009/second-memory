import React, { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { queryClient } from "@/lib/queryClient";
import { useBootstrap } from "@/features/bootstrap/useBootstrap";
import { BootstrapStatus } from "@/features/bootstrap/BootstrapStatus";
import { ThemeProvider } from "@/theme/ThemeProvider";
import {
  CaptureSessionProvider,
  useCaptureSession,
  formatClock,
} from "@/features/capture/CaptureSessionProvider";
import { RecordingBanner } from "@/components/domain/RecordingBanner";
import { mediaColors } from "@/theme/tokens";
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
        <CaptureSessionProvider>
          <ThemeProvider>
            <StatusBar style="auto" />
            <RootNavigator />
          </ThemeProvider>
        </CaptureSessionProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

function RootNavigator() {
  const state = useBootstrap();

  useEffect(() => {
    if (state === "ready") void registerDevice();
  }, [state]);

  if (state === "loading" || state === "retry") {
    return <BootstrapStatus failed={state === "retry"} />;
  }

  return (
    <View style={styles.root}>
      <Stack screenOptions={{ headerShown: false, animation: "none" }}>
        <Stack.Protected guard={state === "needsOnboarding"}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={state === "needsPermissions"}>
          <Stack.Screen name="permissions" />
        </Stack.Protected>
        <Stack.Protected guard={state === "ready"}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="memory/[id]" />
        </Stack.Protected>
      </Stack>
      <RecordingBannerHost />
    </View>
  );
}

function RecordingBannerHost() {
  const { status, elapsedSec, pause, resume } = useCaptureSession();
  const insets = useSafeAreaInsets();

  if (status === "idle") return null;

  return (
    <View
      pointerEvents="box-none"
      style={{ position: "absolute", top: 0, left: 0, right: 0, paddingTop: insets.top }}
    >
      <RecordingBanner
        visible
        paused={status === "paused"}
        timer={formatClock(elapsedSec)}
        onPause={pause}
        onResume={resume}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: mediaColors.heroBackground },
});
