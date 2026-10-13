/**
 * Tiny pub/sub so components outside the stage (nav progress bar, HUD) can
 * follow the pinned sequence without re-rendering React every frame.
 */
type Listener = (progress: number) => void;

const listeners = new Set<Listener>();
let last = 0;

export const stageBus = {
  publish(progress: number) {
    last = progress;
    listeners.forEach((l) => l(progress));
  },
  subscribe(fn: Listener) {
    listeners.add(fn);
    fn(last);
    return () => {
      listeners.delete(fn);
    };
  },
};
