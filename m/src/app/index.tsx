import { Redirect } from "expo-router";
import { useBootstrap } from "@/features/bootstrap/useBootstrap";
import { BootstrapStatus } from "@/features/bootstrap/BootstrapStatus";
export default function Index() {
    const state = useBootstrap();
    if (state === "loading" || state === "retry") {
        return <BootstrapStatus failed={state === "retry"}/>;
    }
    if (state === "needsOnboarding")
        return <Redirect href="/onboarding"/>;
    if (state === "needsPermissions")
        return <Redirect href="/permissions"/>;
    return <Redirect href="/capture"/>;
}
