import * as Haptics from "expo-haptics";

/**
 * Small wrapper so screens never import expo-haptics directly.
 *
 * Reserve haptics for confirmations and important actions
 * (never on every scroll or tap).
 */
export function useHaptics() {
  const light = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Simulator / unsupported platform — silently ignore.
    }
  };

  const medium = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      /* noop */
    }
  };

  const success = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      /* noop */
    }
  };

  const warning = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {
      /* noop */
    }
  };

  return { light, medium, success, warning };
}
