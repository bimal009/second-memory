import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { createDevice } from "@/api/device";

export async function registerDevice() {
  try {
    if (Platform.OS !== "android") return;
    if (!(await Notifications.getPermissionsAsync()).granted) return;
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return;
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    await createDevice({ push_token: token.data, platform: "android" });
  } catch {
    if (__DEV__) console.debug("Optional device registration unavailable.");
  }
}