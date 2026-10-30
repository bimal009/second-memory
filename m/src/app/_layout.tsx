import React, { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import { Inter_800ExtraBold } from "@expo-google-fonts/inter/800ExtraBold";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { queryClient } from "@/lib/queryClient";
import { useBootstrap } from "@/features/bootstrap/useBootstrap";
import { BootstrapStatus } from "@/features/bootstrap/BootstrapStatus";
import { ThemeProvider } from "@/theme/ThemeProvider";
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
          <RootNavigator />
        </ThemeProvider>
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
          <Stack.Screen name="capture" />
        </Stack.Protected>
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
});
