import { Linking, View } from "react-native";
import { Camera, Mic, MapPin, Bell } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/theme/ThemeProvider";
import type { Permission, PermissionKey } from "@/lib/permissions";
const info = {
  camera: {
    label: "Camera",
    reason: "Capture moments you want to remember.",
    icon: Camera,
    required: true,
  },
  microphone: {
    label: "Microphone",
    reason: "Hear your memory commands and questions.",
    icon: Mic,
    required: true,
  },
  location: {
    label: "Location",
    reason: "Add a place to memories while you use the app.",
    icon: MapPin,
    required: false,
  },
  notifications: {
    label: "Notifications",
    reason: "Receive reminders when they are due.",
    icon: Bell,
    required: false,
  },
};
export function PermissionCard({
  kind,
  status,
  busy,
  onAllow,
}: {
  kind: PermissionKey;
  status: Permission;
  busy: boolean;
  onAllow: () => void;
}) {
  const { colors } = useTheme();
  const { label, reason, icon: Icon, required } = info[kind];
  const blocked = !status.canAskAgain;
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <Icon size={24} color={colors.foreground} />
        <View style={{ flex: 1 }}>
          <Text variant="heading">{label}</Text>
          <Text variant="micro" color="mutedForeground">
            {required ? "Required" : "Optional"} ?{" "}
            {blocked ? "Blocked in settings" : "Not allowed"}
          </Text>
        </View>
      </View>
      <Text variant="caption" color="mutedForeground">
        {reason}
      </Text>
      <Button
        label={blocked ? "Open settings" : "Allow"}
        accessibilityHint={label + " permission"}
        variant="secondary"
        disabled={busy}
        onPress={
          blocked
            ? () => {
                void Linking.openSettings();
              }
            : onAllow
        }
      />
    </Card>
  );
}
