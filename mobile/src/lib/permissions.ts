import { Camera } from "expo-camera";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import { Platform } from "react-native";
export const permissionKeys = [
  "camera",
  "microphone",
  "location",
  "notifications",
] as const;
export type PermissionKey = (typeof permissionKeys)[number];
export type Permission = { granted: boolean; canAskAgain: boolean };
export type Permissions = Record<PermissionKey, Permission>;
export async function readPermissions(): Promise<Permissions> {
  const [camera, microphone, location, notifications] = await Promise.all([
    Camera.getCameraPermissionsAsync(),
    Camera.getMicrophonePermissionsAsync(),
    Location.getForegroundPermissionsAsync().catch(() => ({
      granted: false,
      canAskAgain: true,
    })),
    Notifications.getPermissionsAsync().catch(() => ({
      granted: false,
      canAskAgain: true,
    })),
  ]);
  return { camera, microphone, location, notifications };
}
export const requiredGranted = (status: Permissions) =>
  status.camera.granted && status.microphone.granted;
export async function requestPermission(
  key: PermissionKey,
): Promise<Permission> {
  switch (key) {
    case "camera":
      return Camera.requestCameraPermissionsAsync();
    case "microphone":
      return Camera.requestMicrophonePermissionsAsync();
    case "location":
      return Location.requestForegroundPermissionsAsync();
    case "notifications":
      if (Platform.OS === "android") {
        const channel = await Notifications.getNotificationChannelAsync("default");
        if (!channel) await Notifications.setNotificationChannelAsync("default", {
          name: "Reminders",
          importance: AndroidImportance.DEFAULT,
        });
      }
      return Notifications.requestPermissionsAsync();
  }
}
