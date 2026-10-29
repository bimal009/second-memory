import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { createDevice } from "@/api/me";
export async function registerPush() {
  if (Platform.OS !== "android") return;
  if (!(await Notifications.getPermissionsAsync()).granted) return;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error("Push registration needs an EAS project ID.");
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  await createDevice({ push_token: token.data, platform: "android" });
}
