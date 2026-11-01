import { GAME_STATE, type ItemName } from "@/features/game-state";
import { hasItem } from "@/lib/bag";
import { img } from "@/lib/img";
import { useState } from "react";

const ITEM_LABEL: Record<ItemName, string> = {
  parcel: "Parcel",
  shoes: "Running Shoes",
  journal: "Journal",
};

interface ItemIcon {
  src: string;
  /**
   * Multiplier applied to the icon's rendered size within its slot —
   * source files aren't consistently cropped to their actual content (e.g.
   * parcel.png is a 64x64 canvas with its art centered/padded inside, vs.
   * shoes.png/book-and-pencil.png's 32x32 tightly-cropped canvases), so
   * `object-contain`ing them all into the same box alone doesn't make them
   * *look* the same size. Tune per-icon to taste once art changes.
   * @default 1
   */
  scale?: number;
}

// Only items with their own art get a real icon — anything else falls back
// to a plain text label in its slot.
const ITEM_ICON: Partial<Record<ItemName, ItemIcon>> = {
  parcel: { src: img("others/parcel.png"), scale: 1.5 },
  shoes: { src: img("others/shoes.png"), scale: 0.6 },
  journal: { src: img("others/book-and-pencil.png"), scale: 0.8 },
};

// Real photos, not pixel art — no [image-rendering:pixelated] on these two.
const PARCEL_PHOTO = img("others/chest-empty.png");
const PARCEL_PHOTO_CLOSEUP = img("others/chest-empty-closeup.png");

export function BagPanel({ onClose }: { onClose: () => void }) {
  // Purely local UI state — nothing on the canvas side needs to know these
  // popups are open, unlike bagOpen/bagIconVisible (which exist specifically
  // so scene code can trigger a React re-render). No GAME_STATE field needed
  // for either.
  const [journalOpen, setJournalOpen] = useState(false);
  const [parcelOpen, setParcelOpen] = useState(false);
  const [parcelZoomed, setParcelZoomed] = useState(false);

  function closeParcel() {
    setParcelOpen(false);
    setParcelZoomed(false); // always reopens at the far view, not wherever it was left
  }

  // Few/specific items are clickable, each with its own distinct effect —
  // not every entry, and not a blanket rule off BagEntry's own `type`. Items
  // with no handler here render as plain, non-interactive display slots.
  const onItemClick: Partial<Record<ItemName, () => void>> = {
    journal: () => setJournalOpen(true),
    parcel: () => setParcelOpen(true),
  };

  const entries = Array.from(GAME_STATE.bag.entries()).filter(([name]) => hasItem(name));

  return (
    <>
      <div className="absolute inset-y-4 right-4 w-80 rounded-lg border-3 bg-linear-to-b from-white to-slate-50 p-5 shadow-[0_0_16px_black] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="w-[calc(100%+2.5rem)] -mx-5 -mt-5 mb-4 flex items-center gap-3 rounded-t-lg bg-linear-to-r from-amber-200 to-amber-800 px-5 py-3 cursor-pointer transition-colors hover:from-amber-400 hover:to-amber-700 active:from-amber-800 active:to-amber-900"
        >
          <img
            src="/assets/purse.png"
            alt=""
            className="size-8 shrink-0 [image-rendering:pixelated] drop-shadow"
          />
          <span className="flex-1 text-left font-game text-xs leading-snug text-amber-50 text-shadow-lg">
            Tap here or press <span className="font-bold">Enter</span> to close
          </span>
          <span className="font-game text-xl leading-none text-amber-50/80">×</span>
        </button>

        <div className="flex flex-col gap-2.5">
          {entries.length === 0 && (
            <div className="py-6 text-center font-game text-sm italic text-amber-950/50">Empty</div>
          )}
          {entries.map(([name, entry]) => {
            const onClick = onItemClick[name];
            const icon = ITEM_ICON[name];

            return (
              <button
                key={name}
                type="button"
                disabled={!onClick}
                onClick={onClick}
                className={`flex items-center gap-3 rounded-lg p-1 shadow-[0_0_2px_rgba(0,0,0,0.3)_inset] transition-colors ${
                  onClick
                    ? "bg-linear-to-br from-amber-100/90 to-amber-100/60 cursor-pointer hover:from-amber-200/90 hover:shadow-amber-800 hover:to-amber-100"
                    : "shadow-none bg-linear-to-br from-white/50 to-amber-100/20 cursor-default"
                }`}
              >
                <div className="size-10 shrink-0 flex items-center justify-center rounded-full bg-amber-900/5 overflow-hidden">
                  {icon ? (
                    <img
                      src={icon.src}
                      alt={ITEM_LABEL[name]}
                      style={icon.scale ? { transform: `scale(${icon.scale})` } : undefined}
                      className="w-full h-full object-contain [image-rendering:pixelated] drop-shadow-sm"
                    />
                  ) : (
                    <span className="font-game text-xl font-black text-amber-950/50">
                      {ITEM_LABEL[name][0]}
                    </span>
                  )}
                </div>

                <span className="flex-1 text-left font-game text-sm font-bold text-amber-950">
                  {ITEM_LABEL[name]}
                </span>

                {entry.type === "item" && entry.quantity > 1 && (
                  <span className="shrink-0 min-w-6 rounded-full border-2 border-amber-800 bg-amber-100 px-1.5 text-center font-game text-xs font-bold text-amber-950 shadow-[2px_2px_0_rgba(0,0,0,0.25)]">
                    {entry.quantity}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {journalOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/40 z-10"
          onClick={() => setJournalOpen(false)}
        >
          <div
            className="w-80 rounded-xl border-slate-800 bg-linear-to-b from-[#fdf3dd] to-[#ecd9ab] p-5 shadow-[0_0_10px_black]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between border-b-2 border-amber-800/40 pb-2">
              <span className="font-game text-lg uppercase tracking-wider text-amber-950">
                Journal
              </span>
              <button
                type="button"
                onClick={() => setJournalOpen(false)}
                className="font-game text-sm text-amber-950/70 hover:text-amber-950"
              >
                Close
              </button>
            </div>
            {/* Placeholder — no quest/task data model exists yet. */}
            <div className="font-game text-sm italic text-amber-950/50">No tasks yet.</div>
          </div>
        </div>
      )}

      {parcelOpen && (
        <div
          className="fixed inset-0 z-10 flex items-center justify-center bg-black/60"
          onClick={closeParcel}
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <div className="w-[min(85vw,1024px)] aspect-video overflow-hidden rounded-xl border-2 border-amber-800 shadow-[0_0_24px_rgba(0,0,0,0.6)]">
              <img
                src={parcelZoomed ? PARCEL_PHOTO_CLOSEUP : PARCEL_PHOTO}
                alt="A chest, with an empty slot where a photo should be"
                onClick={() => setParcelZoomed((zoomed) => !zoomed)}
                className={`w-full h-full object-contain ${
                  parcelZoomed ? "cursor-zoom-out" : "cursor-zoom-in"
                }`}
              />
            </div>
            <div className="mt-2 text-center font-game text-xs text-amber-50/80 text-shadow-lg">
              Click to zoom {parcelZoomed ? "out" : "in"}
            </div>
            <button
              type="button"
              onClick={closeParcel}
              className="absolute -top-3 -right-3 size-8 rounded-full border-2 border-amber-800 bg-amber-50 font-game text-lg leading-none text-amber-950 shadow-[2px_2px_0_rgba(0,0,0,0.3)] hover:bg-amber-100"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
}
