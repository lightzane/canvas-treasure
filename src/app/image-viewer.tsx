import {
  BIRTHDAY_POSTCARD_SRC,
  BIRTHDAY_STICKER_CLASSNAME,
  BIRTHDAY_STICKER_SRC,
  POSTCARD_MAX_HEIGHT,
  POSTCARD_MAX_WIDTH,
} from "@/lib/postcard-sticker";

/**
 * A simple full-image preview popup for any bag item — tracing papers now,
 * postcard/treasure photos later. Unlike `ParcelViewer` (which toggles
 * between two *different* photos, a real zoom-to-closeup swap), this just
 * displays one image at its natural aspect ratio, no zoom/swap of any kind.
 *
 * `absolute inset-0`, not `fixed inset-0` — this mounts as a sibling inside
 * layout.tsx's canvas-sized `relative` wrapper (same as `JournalPanel`/
 * `BagPanel`'s own panel), so the backdrop and image stay bounded to the
 * game canvas instead of covering the whole browser viewport.
 */
export function ImageViewer({
  src,
  alt,
  backgroundColor,
  onClose,
}: {
  src: string;
  alt: string;
  /**
   * Overrides the default cream gradient behind the image — for a
   * transparent PNG that doesn't read well against it (e.g. one of the
   * scattered tracing-paper pages). Any valid CSS `background` value, e.g.
   * `"#979796"`. Omit for the default gradient.
   */
  backgroundColor?: string;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 p-8"
      onClick={onClose}
    >
      {/* `inline-block` shrink-wraps this to the photo's own rendered box
          (not the popup's) — that's what lets the sticker below anchor to
          the photo's actual corner regardless of its size/aspect ratio.
          POSTCARD_MAX_WIDTH/HEIGHT are fixed px (not `max-w-full`'s
          percentage), deliberately: a percentage max-height only resolves
          against a parent with an explicit height, which this shrink-wrap
          wrapper doesn't have. The background (default gradient, or
          `backgroundColor` if given) shows through these images'
          transparent regions (the tracing papers are scattered, transparent
          PNGs) instead of the game scene behind the popup. */}
      <div className="relative inline-block leading-none" onClick={(e) => e.stopPropagation()}>
        <img
          src={src}
          alt={alt}
          style={{
            maxWidth: POSTCARD_MAX_WIDTH,
            maxHeight: POSTCARD_MAX_HEIGHT,
            background: backgroundColor,
          }}
          className={`block object-contain rounded-xl border-2 border-amber-800 shadow-[0_0_24px_rgba(0,0,0,0.6)] ${backgroundColor ? "" : "bg-linear-to-b from-white to-amber-50"}`}
        />
        {src === BIRTHDAY_POSTCARD_SRC && (
          <img src={BIRTHDAY_STICKER_SRC} alt="" className={BIRTHDAY_STICKER_CLASSNAME} />
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 size-8 rounded-full border-2 border-amber-800 bg-amber-50 font-game text-lg leading-none text-amber-950 shadow-[2px_2px_0_rgba(0,0,0,0.3)] hover:bg-amber-100"
      >
        ×
      </button>
    </div>
  );
}
