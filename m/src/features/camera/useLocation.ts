import { api } from "@/api/client";
import { useMemoryQuery } from "@/api/useMemoryQuery";
/** TODO(location): use expo-location after permission; currently an API-seeded coordinate, never GPS access. */
export function useLocation() { return useMemoryQuery(["location"], () => api.getLocation()); }
