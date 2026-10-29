import React from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { OnboardingScreen } from "@/features/onboarding/OnboardingScreen";
import { useSettingsContext } from "@/features/settings/context";

export default function OnboardingRoute() {
  const { update } = useSettingsContext();
  return (
    <ScreenContainer scroll>
      <View style={styles.fill}>
        <OnboardingScreen
          onDone={() => {
            void update({ onboardingComplete: true }).then(() => {
              router.replace("/(tabs)");
            });
          }}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
