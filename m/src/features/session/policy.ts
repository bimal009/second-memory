export const sessionPolicy = { chunkSeconds: 60, warnSeconds: 45 * 60, limitSeconds: 60 * 60, shortSeconds: 10, height: 480 } as const;
export function sessionClock(startedAt: number, now: number) {
  const seconds = Math.min(sessionPolicy.limitSeconds, Math.max(0, Math.floor((now - startedAt) / 1000)));
  return { seconds, finishedChunks: Math.floor(seconds / sessionPolicy.chunkSeconds), warning: seconds >= sessionPolicy.warnSeconds, stop: seconds >= sessionPolicy.limitSeconds };
}
