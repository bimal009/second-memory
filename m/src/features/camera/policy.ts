export type CameraActivityInput = {
  cameraPage: boolean; routeFocused: boolean; foreground: boolean; overlay: boolean;
  dragging: boolean; session: boolean; paused: boolean; previewAvailable: boolean; settingsReady: boolean;
};
/** A single privacy gate shared by preview and rolling-buffer lifecycle. */
export function cameraCanRun(input: CameraActivityInput) {
  return input.cameraPage && input.routeFocused && input.foreground && !input.overlay && !input.dragging && !input.session && !input.paused && input.previewAvailable && input.settingsReady;
}
/** The dead zone makes a brief, unfinished hold a no-op rather than a capture. */
export function shutterIntent(milliseconds: number) {
  return milliseconds < 180 ? "tap" : milliseconds >= 350 ? "hold" : "cancel";
}
