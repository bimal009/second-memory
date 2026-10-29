import { useEffect, useRef, type PropsWithChildren } from "react";
import { View } from "react-native";
import { router, useSegments } from "expo-router";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { useTheme } from "@/theme/ThemeProvider";
import { useRegisterDevice } from "@/client/device";
import { restartBootstrap } from "./events";
import { useBootstrap } from "./useBootstrap";
export function BootstrapGuard({ children }: PropsWithChildren) {
  const state = useBootstrap();
  const segments = useSegments();
  const { colors } = useTheme();
  const { mutate: register } = useRegisterDevice();
  const previous = useRef(state);
  const route = segments[0];
  const allowed =
    state === "needsOnboarding"
      ? route === "onboarding"
      : state === "needsPermissions"
        ? route === "permissions"
        : state === "ready" &&
          !!route &&
          route !== "onboarding" &&
          route !== "permissions";
  useEffect(() => {
    if (state === "ready" && previous.current !== "ready") register();
    previous.current = state;
  }, [state, register]);
  useEffect(() => {
    if (allowed || state === "loading" || state === "retry") return;
    if (state === "needsOnboarding") router.replace("/onboarding");
    else if (state === "needsPermissions") router.replace("/permissions");
    else if (state === "ready") router.replace("/(tabs)/capture");
  }, [state, allowed]);
  // Keep the root navigator mounted before issuing redirects.
  return (
    <View style={{ flex: 1 }}>
      <View
        style={{ flex: 1, display: allowed ? "flex" : "none" }}
        accessibilityElementsHidden={!allowed}
        importantForAccessibility={allowed ? "auto" : "no-hide-descendants"}
      >
        {children}
      </View>
      {!allowed ? (
        <ScreenContainer>
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              gap: 20,
              maxWidth: 480,
              width: "100%",
              alignSelf: "center",
            }}
          >
            {state !== "retry" ? (
              <>
                <View
                  accessible
                  accessibilityLabel="Loading your memory"
                  style={{
                    height: 12,
                    width: "60%",
                    alignSelf: "center",
                    borderRadius: 6,
                    backgroundColor: colors.secondary,
                  }}
                />
                <Text align="center">Loading your memory?</Text>
              </>
            ) : (
              <>
                <Text variant="title">Could not connect</Text>
                <Text color="mutedForeground">
                  Your account is still saved. Check your connection and try
                  again.
                </Text>
                <Button label="Retry" onPress={restartBootstrap} />
              </>
            )}
          </View>
        </ScreenContainer>
      ) : null}
    </View>
  );
}
