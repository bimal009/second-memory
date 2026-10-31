import React, { type PropsWithChildren } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/spacing";

export type ScreenContainerProps = {
  /** Content scrolls (with content insets) or flows top-down. */
  scroll?: boolean;
  /** Treat screen as dark-media (camera hero) — bypasses background bg for look. */
  transparent?: boolean;
  /** Fixed bottom padding above the tab bar/home indicator. */
  padBottom?: number;
  /** Horizontal inset override. */
  noHorizontalPadding?: boolean;
};

export function ScreenContainer({
  children,
  scroll = false,
  transparent = false,
  padBottom,
  noHorizontalPadding = false,
}: PropsWithChildren<ScreenContainerProps>) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bg = transparent ? "transparent" : colors.background;

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.content,
        !noHorizontalPadding && styles.contentPad,
        {
          paddingBottom:
            insets.bottom + (padBottom ? padBottom + 16 : spacing.xxl),
        },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, !noHorizontalPadding && styles.contentPad]}>
      {children}
    </View>
  );

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.flex}>
      <View
        style={[styles.flex, { backgroundColor: bg, paddingTop: insets.top }]}
      >
        {body}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  contentPad: {
    paddingHorizontal: spacing.lg,
  },
  content: {
    paddingBottom: 0,
  },
});
