import React, { useCallback, useEffect } from "react";
import {
  BackHandler,
  Modal,
  Pressable,
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
import { radius, motion } from "@/theme/tokens";
import { spacing } from "@/theme/spacing";
import { useTheme } from "@/theme/ThemeProvider";
import { X } from "lucide-react-native";

export type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

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
      <View style={styles.fill}>
        <Animated.View style={[styles.fill, styles.scrimBg, scrim]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={handleClose}
            style={styles.fill}
          />
        </Animated.View>
        <Animated.View
          accessibilityRole="dialog"
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
              <Text variant="heading">{title}</Text>
              <IconButton
                accessibilityLabel="Close"
                onPress={handleClose}
                icon={<X size={20} color={colors.foreground} />}
              />
            </View>
          ) : null}
          <View style={styles.body}>{children}</View>
        </Animated.View>
      </View>
    </Modal>
  );
}

type SV = SharedValue<number>;

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject },
  scrimBg: { backgroundColor: "#000000" },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.1)",
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
