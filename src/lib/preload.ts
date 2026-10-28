export async function preload(images: HTMLImageElement[]) {
  await Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve, reject) => {
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => reject(new Error(`Failed to load image: ${img.src}`)), {
          once: true,
        });
      });
    }),
  );
}
