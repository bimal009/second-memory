/** The dead zone makes a brief, unfinished hold a no-op rather than a capture. */
export function shutterIntent(milliseconds: number) {
  return milliseconds < 180 ? "tap" : milliseconds >= 350 ? "hold" : "cancel";
}
