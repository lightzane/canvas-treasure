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
