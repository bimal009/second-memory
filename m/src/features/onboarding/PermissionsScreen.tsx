import { ActivityIndicator, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { permissionKeys, requiredGranted } from "@/lib/permissions";
import { restartBootstrap } from "@/lib/queryClient";
import { PermissionCard } from "./PermissionCard";
import { usePermissions } from "./usePermissions";

export function PermissionsScreen() {
  const { status, busy, error, allow } = usePermissions();

  if (!status)
    return <ActivityIndicator accessibilityLabel="Checking permissions" />;

  const missing = permissionKeys.filter((k) => !status[k].granted);
  const canAskAny = missing.some((k) => status[k].canAskAgain);

  return (
    <View
      style={{
        gap: 20,
        paddingTop: 24,
        width: "100%",
        maxWidth: 560,
        alignSelf: "center",
      }}
    >
      <Text variant="micro" color="mutedForeground">
        02 / CONNECT YOUR SENSES
      </Text>
      <Text variant="display">Give your memory its senses</Text>
      <Text color="mutedForeground">
        Camera and microphone are required. Location and notifications are your
        choice.
      </Text>
      {missing.map((key) => (
        <PermissionCard
          key={key}
          kind={key}
          status={status[key]}
          busy={busy}
          onAllow={() => void allow(key)}
        />
      ))}
      {canAskAny ? (
        <Button
          label="Allow all"
          variant="secondary"
          loading={busy}
          disabled={busy}
          onPress={() => void allow()}
        />
      ) : null}
      <Button
        label="Continue"
        disabled={!requiredGranted(status) || busy}
        onPress={() => void restartBootstrap()}
      />
      {error ? (
        <Text color="destructive" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
