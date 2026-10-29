import { useMutation } from "@tanstack/react-query";
import { registerPush } from "@/lib/push";
export function useRegisterDevice() {
  return useMutation({ mutationFn: registerPush, retry: false,
    onError: () => { if (__DEV__) console.debug("Optional device registration unavailable."); },
  });
}
