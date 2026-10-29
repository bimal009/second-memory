import { useMutation } from "@tanstack/react-query";
import { onboard } from "@/api/me";
import { readKey, saveKey } from "@/lib/secureKey";
import { updatePreferences } from "@/lib/preferences";
import { restartBootstrap } from "@/lib/queryClient";
import type { MeOnboard } from "@/types/me";

export function useOnboard() {
  return useMutation({
    mutationFn: async (data: MeOnboard) => {
      if (await readKey()) return;
      const res = await onboard(data);
      await saveKey(res.api_key);
      await updatePreferences({ assistantName: res.assistant_name }).catch(() => {});
    },
    onSuccess: restartBootstrap,
  });
}