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
      {/* `max-w-full max-h-full` here resolves against THIS flex container's
          own content box, which is a genuinely definite size (inset-0 minus
          fixed padding) — not against an intermediate `auto`-height wrapper
          capped by its own `max-height`, which doesn't give percentage
          children anything definite to resolve against and silently lets
          them overflow. The background (default gradient, or `backgroundColor`
          if given) shows through these images' transparent regions (the
          tracing papers are scattered, transparent PNGs) instead of the game
          scene behind the popup. */}
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        style={backgroundColor ? { background: backgroundColor } : undefined}
        className={`max-w-full max-h-full object-contain rounded-xl border-2 border-amber-800 shadow-[0_0_24px_rgba(0,0,0,0.6)] ${backgroundColor ? "" : "bg-linear-to-b from-white to-amber-50"}`}
      />
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
