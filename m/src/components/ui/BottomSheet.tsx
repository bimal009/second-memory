import React, { useCallback, useEffect } from "react";
import {
  BackHandler,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  useReducedMotion,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { radius, motion, mediaColors } from "@/theme/tokens";
import { spacing } from "@/theme/spacing";
import { useTheme } from "@/theme/ThemeProvider";
import { X } from "lucide-react-native";

export type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

const ABS_FILL = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
} as const;

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
}: BottomSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, {
      duration: reduced ? 0 : motion.sheet,
    });
  }, [visible, progress, reduced]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const scrim = useAnimatedStyle(() => ({
    opacity: progress.value * 0.55,
  }));

  const sheet = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * 320 }],
  }));

  const handleClose = useCallback(() => onClose(), [onClose]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" onRequestClose={handleClose} statusBarTranslucent>
      <View style={[styles.fill, { justifyContent: "flex-end", paddingTop: insets.top }]}>
        <Animated.View style={[styles.fill, styles.scrimBg, scrim]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={handleClose}
            style={styles.fill}
          />
        </Animated.View>
        <Animated.View
          accessibilityRole={Platform.OS === "web" ? "dialog" : undefined}
          accessibilityViewIsModal
          onAccessibilityEscape={handleClose}
          accessibilityLabel={title ?? "Sheet"}
          style={[
            sheet,
            styles.sheet,
            { backgroundColor: colors.card, paddingBottom: insets.bottom + spacing.lg },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />
          {title ? (
            <View style={styles.header}>
              <Text variant="heading" accessibilityRole="header">{title}</Text>
              <IconButton
                accessibilityLabel="Close"
                onPress={handleClose}
                icon={<X size={20} color={colors.foreground} />}
              />
            </View>
          ) : null}
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.body}>{children}</ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { ...ABS_FILL },
  scrimBg: { backgroundColor: mediaColors.scrim },
  sheet: {
    width: "100%",
    maxWidth: 640,
    maxHeight: "90%",
    alignSelf: "center",
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: mediaColors.sheetBorder,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: spacing.xs,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  body: {
    gap: spacing.lg,
  },
});
