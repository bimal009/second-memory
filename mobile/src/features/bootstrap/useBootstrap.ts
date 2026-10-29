import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { getMe } from "@/api/me";
import { readKey } from "@/lib/secureKey";
import { hydratePreferences, updatePreferences } from "@/lib/preferences";
import { readPermissions, requiredGranted } from "@/lib/permissions";

export type BootstrapState =
  | "loading"
  | "retry"
  | "needsOnboarding"
  | "needsPermissions"
  | "ready";

async function bootstrap(): Promise<"needsOnboarding" | "needsPermissions" | "ready"> {
  await hydratePreferences().catch(() => {});
  if (!(await readKey())) return "needsOnboarding";
  try {
    const me = await getMe();
    await updatePreferences({ assistantName: me.assistant_name }).catch(() => {});
  } catch (error) {
    // The axios interceptor already cleared the key on 401.
    if (isAxiosError(error) && error.response?.status === 401) return "needsOnboarding";
    throw error; // network error or timeout: show retry, never onboarding
  }
  return requiredGranted(await readPermissions()) ? "ready" : "needsPermissions";
}

export function useBootstrap(): BootstrapState {
  const { data, isError } = useQuery({
    queryKey: ["bootstrap"],
    queryFn: bootstrap,
    retry: false,
    staleTime: Infinity,
  });
  if (isError) return "retry";
  return data ?? "loading";
}