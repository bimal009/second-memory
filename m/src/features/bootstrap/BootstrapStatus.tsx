import { ActivityIndicator, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { useTheme } from "@/theme/ThemeProvider";
import { restartBootstrap } from "@/lib/queryClient";

export function BootstrapStatus({ failed }: { failed: boolean }) {
  const { colors } = useTheme();
  return (
    <ScreenContainer>
      <View style={{ flex: 1, justifyContent: "center", gap: 16 }}>
        {failed ? (
          <>
            <Text variant="title">Could not connect</Text>
            <Text color="mutedForeground">
              Your account is still saved. Check your connection and try again.
            </Text>
            <Button label="Retry" onPress={() => void restartBootstrap()} />
          </>
        ) : (
          <ActivityIndicator
            accessibilityLabel="Loading"
            color={colors.primary}
          />
        )}
      </View>
    </ScreenContainer>
  );
}
