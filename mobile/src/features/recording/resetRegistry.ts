let reset: (() => Promise<void>) | null = null;
export function registerRecordingReset(callback: () => Promise<void>) {
  reset = callback;
  return () => { if (reset === callback) reset = null; };
}
export async function resetLocalRecordings() { await reset?.(); }
