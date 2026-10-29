import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { permissionKeys, readPermissions, requestPermission, type PermissionKey, type Permissions } from "@/lib/permissions";
export function usePermissions() {
  const [status, setStatus] = useState<Permissions | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => { setStatus(await readPermissions()); }, []);
  useEffect(() => {
    const check = () => { void refresh().catch(() => setError("Could not check permissions. Try again.")); };
    check();
    const sub = AppState.addEventListener("change", value => { if (value === "active") check(); });
    return () => sub.remove();
  }, [refresh]);
  const recheck = async () => {
    setError(null);
    try { await refresh(); } catch { setError("Could not check permissions. Try again."); }
  };
  const allow = async (key?: PermissionKey) => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const current = await readPermissions();
      for (const item of key ? [key] : permissionKeys) {
        if (!current[item].granted && current[item].canAskAgain) await requestPermission(item);
      }
      await refresh();
    } catch { setError("Could not update permissions. Try again."); }
    finally { setBusy(false); }
  };
  return { status, busy, error, allow, refresh, recheck };
}
