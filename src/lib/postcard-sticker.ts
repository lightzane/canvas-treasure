import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/constants/game-settings";
import { img } from "@/lib/img";
import { loadImage } from "@/lib/load-image";
import { cn } from "cn";

/**
 * The one photo this corner sticker decorates — both the bag's full-screen
 * viewer (ImageViewer) and the plain-DOM cutscene preview
 * (playImagePreview) check a shown image's `src` against this instead of
 * each keeping its own copy of the match, so there's exactly one place that
 * says which photo gets the sticker.
 */
export const BIRTHDAY_POSTCARD_SRC = img("treasure/cheryl_birthday_postcard.jpg");
export const BIRTHDAY_STICKER_SRC = img("others/sky-sticker-birthday.png");
// Eagerly warms the shared image cache (load-image.ts) — see
// hua-ze-lei.ts's own PORTRAIT_HUAZELEI loadImage() call for why. Benefits
// both consumers named above (ImageViewer and playImagePreview).
loadImage(BIRTHDAY_POSTCARD_SRC);
loadImage(BIRTHDAY_STICKER_SRC);

/**
 * Both popups that can show the postcard reserve the same 32px of padding
 * around this game's canvas — which is a fixed CSS size (CANVAS_WIDTH x
 * CANVAS_HEIGHT, see game-engine.ts), never responsive — so the photo's own
 * max rendered box is this exact size everywhere it's shown. Deliberately
 * plain pixel values, not percentages: a percentage max-height only
 * resolves against a parent with an explicit (non-content-based) height,
 * which an inline-block wrapper that shrink-wraps to the photo's own
 * corner (so the sticker can anchor to it) doesn't have.
 */
const POPUP_PADDING = 32;
export const POSTCARD_MAX_WIDTH = CANVAS_WIDTH - POPUP_PADDING * 2;
export const POSTCARD_MAX_HEIGHT = CANVAS_HEIGHT - POPUP_PADDING * 2;

/**
 * Shared verbatim between the React popup (ImageViewer) and the plain-DOM
 * one (playImagePreview) — one definition of how/where the sticker sits, so
 * retuning it only ever happens in one place. Resize it by just editing
 * `scale-[0.4]` directly — `origin-bottom-right` pins that corner as the
 * fixed point scale grows/shrinks it from, so the small `-right-2 -bottom-2`
 * overlap past the photo's edge stays correct at any value.
 *
 * The sky-sticker-birthday.png asset itself was re-cropped (its transparent
 * canvas used to pad ~20-25% past the actual drawn character on every
 * side) — that padding, not the positioning here, was the actual cause of
 * the sticker visibly sitting away from the corner even at a flush
 * `bottom-0 right-0`; the art's own edges are what -right-2/-bottom-2 now
 * measure from.
 */
export const BIRTHDAY_STICKER_CLASSNAME = cn(
  "scale-[0.4]",
  "pointer-events-none absolute -right-5 -bottom-2 origin-bottom-right -rotate-12 drop-shadow-md",
);
