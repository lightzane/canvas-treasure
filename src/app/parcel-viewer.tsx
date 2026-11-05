import { GAME_STATE } from "@/features/game-state";
import { img } from "@/lib/img";
import { useState } from "react";

// Real photos, not pixel art — no [image-rendering:pixelated] on these two.
const PARCEL_PHOTO_EMPTY = img("treasure/chest-empty.png");
const PARCEL_PHOTO_CLOSEUP = img("treasure/chest-empty-closeup.png");
const PARCEL_PHOTO_REVEALED = img("treasure/treasure-full.png");
const PARCEL_PHOTO_REVEALED_CLOSEUP = img("treasure/treasure-full-closeup.png");

/** A centered modal (unlike JournalPanel's docked window) — a backdrop click also closes it. `zoomed` resets for free on close since this only mounts while open; no manual reset needed. */
export function ParcelViewer({ onClose }: { onClose: () => void }) {
  const [zoomed, setZoomed] = useState(false);

  // Read once — ParcelViewer only ever mounts fresh while open (same as
  // BagPanel's own panels), so there's no live state to track. Quantity 2
  // marks the "chest reopened, treasure revealed" moment (see
  // overworld.ts's `bagIncItem("parcel")` right after the final-reveal
  // dialogue) — this non-stackable keepsake's quantity has no other
  // meaning past that point.
  const revealed =
    GAME_STATE.bag.get("parcel")?.quantity === 2 || GAME_STATE.bag.get("treasure")?.quantity;
  const parcelPhoto = revealed ? PARCEL_PHOTO_REVEALED : PARCEL_PHOTO_EMPTY;
  const parcelPhotoCloseup = revealed ? PARCEL_PHOTO_REVEALED_CLOSEUP : PARCEL_PHOTO_CLOSEUP;

  return (
    <div
      className="fixed inset-0 z-10 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <div className="w-[min(85vw,1024px)] aspect-video overflow-hidden rounded-xl border-2 border-amber-800 shadow-[0_0_24px_rgba(0,0,0,0.6)]">
          <img
            src={zoomed ? parcelPhotoCloseup : parcelPhoto}
            alt="A chest, with an empty slot where a photo should be"
            onClick={() => setZoomed((z) => !z)}
            className={`w-full h-full object-contain ${zoomed ? "cursor-zoom-out" : "cursor-zoom-in"}`}
          />
        </div>
        <div className="mt-2 text-center font-game text-xs text-amber-50/80 text-shadow-lg">
          Click to zoom {zoomed ? "out" : "in"}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-3 -right-3 size-8 rounded-full border-2 border-amber-800 bg-amber-50 font-game text-lg leading-none text-amber-950 shadow-[2px_2px_0_rgba(0,0,0,0.3)] hover:bg-amber-100"
        >
          ×
        </button>
      </div>
    </div>
  );
}
