export type BootstrapState = "loading" | "needsOnboarding" | "needsPermissions" | "ready" | "retry";
type Dependencies = {
  readKey: () => Promise<string | null>;
  fetchProfile: () => Promise<void>;
  checkRequiredPermissions: () => Promise<boolean>;
  isUnauthorized: (error: unknown) => boolean;
};
export async function resolveBootstrap(deps: Dependencies): Promise<BootstrapState> {
  try {
    if (!await deps.readKey()) return "needsOnboarding";
    await deps.fetchProfile();
    return await deps.checkRequiredPermissions() ? "ready" : "needsPermissions";
  } catch (error) {
    return deps.isUnauthorized(error) ? "needsOnboarding" : "retry";
  }
}
