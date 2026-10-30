import { useMemoryQuery } from "@/api/useMemoryQuery";
import { api } from "@/api/client";
/** TODO(location): obtain consented coordinates through expo-location. This stub never requests GPS. */
export function useLocation(enabled = true) { return useMemoryQuery(["location", enabled], () => enabled ? api.getLocation() : Promise.resolve(undefined)); }
