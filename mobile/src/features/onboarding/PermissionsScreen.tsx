import { useState } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { permissionKeys, readPermissions, requiredGranted } from "@/lib/permissions";
import { restartBootstrap } from "@/features/bootstrap/events";
import { PermissionCard } from "./PermissionCard";
import { usePermissions } from "./usePermissions";
export function PermissionsScreen() {
  const { status, busy, error, allow, refresh, recheck } = usePermissions();
  const [continuing, setContinuing] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const continueSetup = async () => {
    setContinuing(true); setCheckError(null);
    try {
      if (requiredGranted(await readPermissions())) restartBootstrap();
      else { await refresh(); setCheckError("Allow camera and microphone to continue."); }
    } catch { setCheckError("Could not check permissions. Please retry."); }
    finally { setContinuing(false); }
  };
  return <View style={{ gap: 20, paddingTop: 24, width: "100%", maxWidth: 560, alignSelf: "center" }}>
    <Text variant="micro" color="mutedForeground">02 / CONNECT YOUR SENSES</Text>
    <Text variant="display">Give your memory its senses</Text>
    <Text color="mutedForeground">Camera and microphone are required. Location and notifications are your choice.</Text>
    {!status ? <><Text>Checking permissions?</Text><Button label="Retry permission check" onPress={() => { void recheck(); }} /></> : <>
      {permissionKeys.filter(key => !status[key].granted).map(key => <PermissionCard key={key} kind={key} status={status[key]} busy={busy} onAllow={() => { void allow(key); }} />)}
      {permissionKeys.some(key => !status[key].granted && status[key].canAskAgain) ? <Button label="Allow all" variant="secondary" loading={busy} disabled={busy || continuing} onPress={() => { void allow(); }} /> : null}
      <Button label="Continue" disabled={!requiredGranted(status) || busy || continuing} loading={continuing} onPress={() => { void continueSetup(); }} />
    </>}
    {error || checkError ? <Text color="destructive" accessibilityRole="alert">{error || checkError}</Text> : null}
  </View>;
}
