import { img } from "@/lib/img";
import { loadImage } from "@/lib/load-image";

const TITLE_SRC = img("title-screen.jpg");
// Eagerly warms the shared image cache (load-image.ts) — see
// hua-ze-lei.ts's own PORTRAIT_HUAZELEI loadImage() call for why. Doubly
// important here specifically: this renders before GameEngine even exists,
// so it's the one image in the game that was never going to be swept up by
// its preload gate on its own (that gate only runs once GameEngine.start()
// is called) — it needs its own explicit warm, same as this.
loadImage(TITLE_SRC);

/**
 * The very first thing the player sees — full title art. The image itself
 * already bakes in the "Press Any Key" prompt, so no extra UI is drawn
 * here. Stays mounted after the first keypress too (see `layout.tsx`) —
 * `StartScreen` renders on top of it with a translucent/blurred panel, so
 * this keeps showing through as a frosted backdrop rather than being
 * swapped out.
 */
export function TitleScreen() {
  return (
    <img
      src={TITLE_SRC}
      alt=""
      className="absolute inset-0 h-full w-full object-cover select-none"
      draggable={false}
    />
  );
}
