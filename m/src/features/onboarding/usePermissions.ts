import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { permissionKeys, readPermissions, requestPermission, type PermissionKey, } from "@/lib/permissions";
export function usePermissions() {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { data: status, refetch } = useQuery({
        queryKey: ["permissions"],
        queryFn: readPermissions,
        gcTime: 0,
    });
    useEffect(() => {
        const sub = AppState.addEventListener("change", (s) => {
            if (s === "active")
                void refetch();
        });
        return () => sub.remove();
    }, [refetch]);
    const allow = async (key?: PermissionKey) => {
        if (!status || busy)
            return;
        setBusy(true);
        setError(null);
        try {
            for (const k of key ? [key] : permissionKeys) {
                if (!status[k].granted && status[k].canAskAgain) {
                    try {
                        await requestPermission(k);
                    }
                    catch {
                        setError(k === "notifications"
                            ? "Notifications are unavailable right now. You can continue without them and try again later."
                            : "Could not request permission. Please try again or open phone settings.");
                    }
                }
            }
        }
        catch {
            setError("Could not update permissions. Please try again.");
        }
        finally {
            await refetch();
            setBusy(false);
        }
    };
    return { status: status ?? null, busy, error, allow };
}
