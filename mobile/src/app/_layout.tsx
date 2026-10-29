import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
import { BootstrapGuard } from "@/features/bootstrap/BootstrapGuard";
import { ThemeProvider } from "@/theme/ThemeProvider";
import {
  CaptureSessionProvider,
  useCaptureSession,
  formatClock,
} from "@/features/capture/CaptureSessionProvider";
import { RecordingBanner } from "@/components/domain/RecordingBanner";
import { mediaColors } from "@/theme/tokens";

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <CaptureSessionProvider>
          <ThemeProvider>
            <StatusBar style="auto" />
            <BootstrapGuard>
              <View style={styles.root}>
                <Stack screenOptions={{ headerShown: false, animation: "none" }}>
                  <Stack.Screen name="onboarding" />
                  <Stack.Screen name="permissions" />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="memory/[id]" />
                </Stack>
                <RecordingBannerHost />
              </View>
            </BootstrapGuard>
          </ThemeProvider>
        </CaptureSessionProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
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
