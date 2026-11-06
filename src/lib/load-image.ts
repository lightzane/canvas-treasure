const imageCache = new Map<string, HTMLImageElement>();

/** Same `src` always returns the same `HTMLImageElement` — multiple sprites sharing one image share one fetch/decode. */
export function loadImage(src: string): HTMLImageElement {
  const cached = imageCache.get(src);
  if (cached) return cached;

  const image = new Image();
  image.src = src;
  imageCache.set(src, image);
  return image;
}

/**
 * Every distinct image anywhere in the game, loaded or not yet — this is
 * the ONLY function in the whole codebase that ever creates an
 * `HTMLImageElement` (confirmed: no other `new Image()` call exists), so
 * this cache is a complete inventory by construction. Used by
 * `GameEngine.start()` to preload-gate on literally everything, instead of
 * each scene having to separately remember to list every sprite it draws —
 * a per-scene list silently goes stale the moment a new sprite is added and
 * its image forgotten; this can't.
 */
export function getAllLoadedImages(): HTMLImageElement[] {
  return [...imageCache.values()];
}
