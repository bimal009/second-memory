import React from "react";
import { StyleSheet, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { isDevice } from "expo-device";
import { CameraIcon, CameraOff } from "lucide-react-native";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { radius } from "@/theme/tokens";
import { spacing } from "@/theme/spacing";
import { useTheme } from "@/theme/ThemeProvider";
import { strings } from "@/constants/strings";

/**
 * Camera preview (preview only — capture/recording logic is backend/native).
 * Falls back to a styled placeholder when permission is denied or the
 * camera isn't available (simulator).
 */
export function CameraStage() {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();

  const simulatorLike = !isDevice;
  const showCamera = permission?.granted && !simulatorLike;

  if (showCamera) {
    return (
      <View style={StyleSheet.absoluteFill}>
        <CameraView style={StyleSheet.absoluteFill} facing="back" mode="picture" />
      </View>
    );
  }

  return (
    <View
      accessible
      accessibilityLabel={strings.capture.cameraPlaceholderTitle}
      style={[
        styles.placeholder,
        simulatorLike ? { backgroundColor: colors.card, borderColor: colors.border } : { backgroundColor: colors.card },
      ]}
    >
      <View style={styles.iconWrap}>
        {simulatorLike ? (
          <CameraOff size={32} color={colors.mutedForeground} />
        ) : (
          <CameraIcon size={32} color={colors.mutedForeground} />
        )}
      </View>
      <Text variant="heading" align="center">
        {strings.capture.cameraPlaceholderTitle}
      </Text>
      <Text variant="caption" color="mutedForeground" align="center" style={styles.body}>
        {simulatorLike
          ? strings.capture.cameraPlaceholderBody
          : strings.capture.permissionDenied}
      </Text>
      {!simulatorLike ? (
        <Button
          label={strings.capture.requestPermission}
          variant="secondary"
          loading={permission === null}
          onPress={() => {
            void requestPermission();
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl,
  },
  iconWrap: { opacity: 0.6 },
  body: { maxWidth: 260 },
});