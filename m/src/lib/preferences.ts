import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
import type { AppSettings } from "@/types";
const CACHE = "second-memory-preferences";
let settings: AppSettings = {
    assistantName: "",
    appearance: "system",
    alwaysOnIndicator: true,
    recordingPaused: false,
    bufferMinutes: 2,
    faceBlur: false,
    defaultClipSeconds: 30,
    locationEnabled: true,
    speakReplies: false,
    pushToTalkMode: "video",
    sessionMode: "audio",
    connectedSources: [
        { id: "phone-camera", name: "Phone camera", enabled: true },
        { id: "glasses", name: "Glasses", enabled: false, comingSoon: true },
    ],
};
const listeners = new Set<() => void>();
export const getPreferences = () => settings;
const emit = () => listeners.forEach((listener) => listener());
let writeQueue = Promise.resolve();
export async function hydratePreferences() {
    const cached = await AsyncStorage.getItem(CACHE);
    if (cached) {
        const value = JSON.parse(cached) as Partial<AppSettings>;
        settings = { ...settings, ...value, alwaysOnIndicator: true };
        emit();
    }
}
export function updatePreferences(patch: Partial<AppSettings>) {
    settings = { ...settings, ...patch, alwaysOnIndicator: true };
    emit();
    const snapshot = JSON.stringify(settings);
    writeQueue = writeQueue
        .catch(() => { })
        .then(() => AsyncStorage.setItem(CACHE, snapshot));
    return writeQueue;
}
export function usePreferences() {
    const snapshot = useSyncExternalStore((listener) => {
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    }, () => settings, () => settings);
    return { settings: snapshot, update: updatePreferences };
}
