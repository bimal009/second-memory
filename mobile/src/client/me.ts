import { useMutation } from "@tanstack/react-query";
import { onboard } from "@/api/me";
import { readKey, saveKey } from "@/lib/secureKey";
import { updatePreferences } from "@/lib/preferences";
import { restartBootstrap } from "@/features/bootstrap/events";
import type { MeOnboard, MeOnboardOut } from "@/types/me";
let pending = false;
let unsavedResponse: MeOnboardOut | null = null;
export function useOnboard() {
  return useMutation({
    mutationFn: async (data: MeOnboard) => {
      if (pending) throw new Error("Onboarding is already in progress.");
      pending = true;
      try {
        if (await readKey()) { restartBootstrap(); return; }
        const response = unsavedResponse ?? await onboard(data);
        unsavedResponse = response;
        await saveKey(response.api_key);
        unsavedResponse = null;
        try { await updatePreferences({ assistantName: response.assistant_name }); }
        finally { restartBootstrap(); }
      } finally { pending = false; }
    },
    retry: false,
  });
}
