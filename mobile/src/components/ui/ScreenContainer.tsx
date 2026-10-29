import React, { type PropsWithChildren } from "react";
import { View, StyleSheet, ScrollView, KeyboardAvoidingView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";

export type ScreenContainerProps = {
  /** Content scrolls (with content insets) or flows top-down. */
  scroll?: boolean;
  /** Treat screen as dark-media (camera hero) — bypasses background bg for look. */
  transparent?: boolean;
  /** Extra bottom padding, e.g. for floating CTAs. */
  padBottom?: number;
};

export function ScreenContainer({
  children,
  scroll = false,
  transparent = false,
  padBottom,
}: PropsWithChildren<ScreenContainerProps>) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bg = transparent ? "transparent" : colors.background;

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.content,
        padBottom ? { paddingBottom: insets.bottom + padBottom } : { paddingBottom: insets.bottom + spacing.xxl },
      ]}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.flex}>{children}</View>
  );

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.flex}>
      <View style={[styles.flex, styles.pad, { backgroundColor: bg, paddingTop: insets.top }]}>
        {body}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: {
    paddingHorizontal: spacingLgSafe(),
  },
  content: {
    paddingBottom: 0,
  },
});

/** Horizontal safe area (notch / rounded corners in landscape). */
function spacingLgSafe() {
  return 16;
}
