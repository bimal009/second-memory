import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { AppState } from "react-native";
import { readKey } from "@/lib/secureKey";
import { hydratePreferences, updatePreferences } from "@/lib/preferences";
import { readPermissions, requiredGranted } from "@/lib/permissions";
import { getMe } from "@/api/me";
import { subscribeBootstrap } from "./events";
import { resolveBootstrap, type BootstrapState } from "./resolveBootstrap";
export type { BootstrapState } from "./resolveBootstrap";
export function useBootstrap(): BootstrapState {
  const client = useQueryClient();
  const [state, setState] = useState<BootstrapState>("loading");
  const [revision, setRevision] = useState(0);
  useEffect(() => subscribeBootstrap(() => setRevision(value => value + 1)), []);
  useEffect(() => {
    const listener = AppState.addEventListener("change", status => { if (status === "active" && state === "ready") setRevision(value => value + 1); });
    return () => listener.remove();
  }, [state]);
  useEffect(() => {
    let active = true;
    const set = (next: BootstrapState) => { if (active) setState(next); };
    set("loading");
    void (async () => {
      try { await hydratePreferences(); } catch { /* Cache is not an authentication source. */ }
      const result = await resolveBootstrap({
        readKey,
        fetchProfile: async () => {
          const me = await client.fetchQuery({ queryKey: ["me"], queryFn: getMe, staleTime: 0, retry: false });
          if (!active) return;
          try { await updatePreferences({ assistantName: me.assistant_name }); } catch { /* Non-critical cache. */ }
        },
        checkRequiredPermissions: async () => requiredGranted(await readPermissions()),
        isUnauthorized: error => isAxiosError(error) && error.response?.status === 401,
      });
      if (result === "needsOnboarding") client.removeQueries({ queryKey: ["me"] });
      set(result);
    })();
    return () => { active = false; };
  }, [client, revision]);
  return state;
}
