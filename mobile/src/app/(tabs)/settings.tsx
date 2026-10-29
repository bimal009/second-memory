import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { SettingsView } from "@/features/settings/SettingsView";
import { strings } from "@/constants/strings";
import { spacing } from "@/theme/spacing";

export default function SettingsTab() {
  const [toast, setToast] = useState(false);

  return (
    <ScreenContainer scroll padBottom={16}>
      <Text variant="title" style={styles.title}>
        {strings.tabs.settings}
      </Text>
      <SettingsView
        onDeletedAll={() => {
          setToast(true);
          setTimeout(() => setToast(false), 2200);
        }}
      />
      {toast ? (
        <View
          style={styles.toast}
          accessibilityLiveRegion="polite"
          accessibilityLabel={strings.settings.deletedAllToast}
        >
          <Text variant="micro" color="primaryForeground">
            {strings.settings.deletedAllToast}
          </Text>
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: spacing.md, marginTop: spacing.md },
  toast: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    backgroundColor: "#84CC16",
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
});
