export const recordingNativeModules = ["ExpoAudio", "FileSystem", "ExpoKeepAwake", "ExpoNetwork"] as const;
export function missingRecordingModules(lookup: (name: string) => unknown): string[] {
  return recordingNativeModules.filter(name => !lookup(name));
}
