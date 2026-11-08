import { birthdayConfetti } from "@/lib/confetti";

/**
 * Remembers the running confetti's own stop handle so `stopPostcardConfetti`
 * can be called from a different module than the one that started it — e.g.
 * bag-panel.tsx starts this when the birthday postcard image opens, but
 * layout.tsx also needs to stop it on the bag's own close path, which can
 * happen while the postcard viewer is still open underneath (unmounting
 * BagPanel entirely, bypassing the viewer's own close effect). Module-private
 * so nothing outside these two functions can read/write it directly — that's
 * what broke React Fast Refresh when this lived as a raw exported `let` in
 * bag-panel.tsx (a .tsx file's exports must all be components for it to
 * qualify as a Fast Refresh boundary).
 */
let handle: ReturnType<typeof birthdayConfetti> | undefined;

/** Starts the birthday-postcard confetti burst. */
export function startPostcardConfetti(duration?: number) {
  handle = birthdayConfetti(duration);
}

/** Stops the confetti started by `startPostcardConfetti`, if any — a no-op otherwise. */
export function stopPostcardConfetti() {
  handle?.();
  handle = undefined;
}
