const listeners = new Set<() => void>();
export function restartBootstrap() {
  listeners.forEach((listener) => listener());
}
export function subscribeBootstrap(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
