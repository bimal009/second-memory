import { useQuery } from "@tanstack/react-query";
import { ApiRequestError } from "@/axios";
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

async function bootstrap(): Promise<
  "needsOnboarding" | "needsPermissions" | "ready"
> {
  await hydratePreferences().catch(() => {});
  if (!(await readKey())) return "needsOnboarding";
  try {
    const me = await getMe();
    await updatePreferences({ assistantName: me.assistant_name }).catch(
      () => {},
    );
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) {
      return "needsOnboarding";
    }
    throw error;
  }
  return requiredGranted(await readPermissions())
    ? "ready"
    : "needsPermissions";
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
