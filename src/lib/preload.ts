/**
 * Running tally across every `preload()` call anywhere in the app — each
 * scene module calls this independently (own `ready:` field) at import
 * time, well before React ever mounts, so by the time anything reads this
 * `total` is already the real grand total, no race. Read by the Start
 * screen's loading percentage (`layout.tsx`); nothing else needs to know
 * about it, so this stays a plain mutable object rather than a pub/sub —
 * same "shared mutable state, read fresh" convention as `GAME_STATE`.
 */
export const PRELOAD_PROGRESS = { loaded: 0, total: 0 };

export async function preload(images: HTMLImageElement[]) {
  PRELOAD_PROGRESS.total += images.length;
  await Promise.all(
    images.map((img) => {
      if (img.complete) {
        PRELOAD_PROGRESS.loaded++;
        return Promise.resolve();
      }
      return new Promise<void>((resolve, reject) => {
        img.addEventListener(
          "load",
          () => {
            PRELOAD_PROGRESS.loaded++;
            resolve();
          },
          { once: true },
        );
        img.addEventListener("error", () => reject(new Error(`Failed to load image: ${img.src}`)), {
          once: true,
        });
      });
    }),
  );
}
