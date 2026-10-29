import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import type { AppSettings } from "@/types";
import { api } from "@/api";

type SettingsContextValue = {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => Promise<void>;
};

const SettingsCtx = createContext<SettingsContextValue | null>(null);

/**
 * In-memory settings backed by the API layer.
 *
 * TODO(backend): replace the default seed + in-memory state with real
 * persistence once api.getSettings/updateSettings hit the FastAPI backend
 * (currently served by mockClient).
 */
export function SettingsProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState<AppSettings>(() => ({
    assistantName: "Ev",
    appearance: "system",
    alwaysOnIndicator: true,
    recordingPaused: false,
    bufferMinutes: 2,
    faceBlur: false,
    connectedSources: [
      { id: "phone-camera", name: "Phone camera", enabled: true },
      { id: "glasses", name: "Glasses", enabled: false, comingSoon: true },
    ],
  }));

  const update = useCallback(async (patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    const fresh = await api.updateSettings(patch);
    setSettings(fresh);
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, update }),
    [settings, update],
  );

  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>;
}

export function useSettingsContext(): SettingsContextValue {
  const ctx = useContext(SettingsCtx);
  if (!ctx) {
    throw new Error("useSettingsContext must be used inside <SettingsProvider>");
  }
  return ctx;
}
