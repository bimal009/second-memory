import { useMutation } from "@tanstack/react-query";
import { createUser } from "@/api/me";
import { readKey, saveKey } from "@/lib/secureKey";
import { updatePreferences } from "@/lib/preferences";
import { restartBootstrap } from "@/lib/queryClient";
import type { CreateUserSchema } from "@repo/types";

export function useOnboard() {
  return useMutation({
    mutationFn: async (data: CreateUserSchema) => {
      if (await readKey()) return;
      const res = await createUser(data);
      await saveKey(res.api_key);
      await updatePreferences({ assistantName: res.assistant_name }).catch(
        () => {},
      );
    },
    onSuccess: restartBootstrap,
  });
}
