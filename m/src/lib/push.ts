import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { createDevice } from "@/api/device";
import type { CreateDeviceSchema } from "@repo/types";

export async function registerDevice() {
  try {
    if (Platform.OS !== "android" && Platform.OS !== "ios") return;
    if (!(await Notifications.getPermissionsAsync()).granted) return;
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return;
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    const data: CreateDeviceSchema = {
      push_token: token.data,
      platform: Platform.OS === "ios" ? "ios" : "android",
    };
    await createDevice(data);
  } catch {
    if (__DEV__) console.debug("Optional device registration unavailable.");
  }
}