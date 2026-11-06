import { img } from "@/lib/img";

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
      src={img("title-screen.jpg")}
      alt=""
      className="absolute inset-0 h-full w-full object-cover select-none"
      draggable={false}
    />
  );
}
