import { ImageViewer } from "@/app/image-viewer";
import { JournalPanel } from "@/app/journal-panel";
import { ParcelViewer } from "@/app/parcel-viewer";
import { PAPER_BG_COLOR, PuzzleViewer } from "@/app/puzzle-viewer";
import { GAME_STATE } from "@/features/game-state";
import { bagHasItem, type ItemName } from "@/lib/bag";
import { img } from "@/lib/img";
import { useState } from "react";

const ITEM_LABEL: Record<ItemName, string> = {
  journal: "Journal",
  parcel: "Parcel",
  shoes: "Running Shoes",
  sketch: "ZZ's Sketch",
  papers: "ZZ's Tracing Papers Scrambled",
  paper1: "ZZ's Tracing Paper 1",
  paper2: "ZZ's Tracing Paper 2",
  paper3: "ZZ's Tracing Paper 3",
  shears: "Garden Shears",
  treasure_map: "Treasure Map in a Bottle",
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
  journal: { src: img("others/book-and-pencil.png"), scale: 0.8 },
  parcel: { src: img("others/parcel.png"), scale: 1.5 },
  shoes: { src: img("others/shoes.png"), scale: 0.6 },
  sketch: { src: img("others/sketch.png"), scale: 0.8 },
  papers: { src: img("others/paper-multi.png"), scale: 1.5 },
  paper1: { src: img("others/paper-single.png"), scale: 1.5 },
  paper2: { src: img("others/paper-single.png"), scale: 1.5 },
  paper3: { src: img("others/paper-single.png"), scale: 1.5 },
  shears: { src: img("others/garden-shears.png"), scale: 0.8 },
  treasure_map: { src: img("others/message-bottle-v.png"), scale: 0.8 },
};

export function BagPanel({ onClose }: { onClose: () => void }) {
  // Purely local UI state — nothing on the canvas side needs to know these
  // popups are open, unlike bagOpen/bagIconVisible (which exist specifically
  // so scene code can trigger a React re-render). No GAME_STATE field needed
  // for either.
  // Starts true: BagPanel is only ever mounted via {bagOpen && <BagPanel/>}
  // in layout.tsx, so it fully remounts fresh every time the bag opens —
  // this makes the journal open automatically alongside it, every time.
  const [journalOpen, setJournalOpen] = useState(true);
  const [parcelOpen, setParcelOpen] = useState(false);
  const [puzzleOpen, setPuzzleOpen] = useState(false);
  // Bumped whenever something mutates GAME_STATE.quests while JournalPanel is
  // already mounted (e.g. PuzzleViewer solving a quest mid-popup) — passed as
  // JournalPanel's `key` below to force a fresh remount/read, since it has no
  // other way to know the external quests Map changed underneath it.
  const [journalRefreshKey, setJournalRefreshKey] = useState(0);
  // One slot, not three booleans — only ever one image previewed at a time,
  // and each paper needs its own src/alt, not just an open/closed flag.
  const [viewingImage, setViewingImage] = useState<{
    src: string;
    alt: string;
    backgroundColor?: string;
  } | null>(null);

  // `backgroundColor` is optional — only items whose art is a transparent
  // PNG (the tracing papers) need one, to replace ImageViewer's default
  // cream gradient with something that doesn't fight the art.
  const viewImage = (name: ItemName, file: string, backgroundColor?: string) => () =>
    setViewingImage({ src: img(file), alt: ITEM_LABEL[name], backgroundColor });

  // Few/specific items are clickable, each with its own distinct effect —
  // not every entry, and not a blanket rule off BagEntry's own `type`. Items
  // with no handler here render as plain, non-interactive display slots.
  const onItemClick: Partial<Record<ItemName, () => void>> = {
    journal: () => setJournalOpen(true),
    parcel: () => setParcelOpen(true),
    papers: () => setPuzzleOpen(true),
    sketch: viewImage("sketch", "treasure/cheryl_birthday_postcard_sketch.jpg"),
    paper1: viewImage("paper1", "puzzle/tp1.png", PAPER_BG_COLOR),
    paper2: viewImage("paper2", "puzzle/tp2.png", PAPER_BG_COLOR),
    paper3: viewImage("paper3", "puzzle/tp3.png", PAPER_BG_COLOR),
    treasure_map: viewImage("treasure_map", "others/treasure-map.jpg"),
  };

  // Once all three are collected, they're viewable from inside the puzzle
  // (PuzzleViewer's own per-paper column — each thumbnail opens the same
  // dedicated PNG this bag entry would have), so showing them again here
  // too is just clutter. Before that point they still need their own bag
  // slots — that's the only way to notice/open each one as it's caught.
  const allPapersCollected = bagHasItem("paper1") && bagHasItem("paper2") && bagHasItem("paper3");
  const PAPER_NAMES: ItemName[] = ["paper1", "paper2", "paper3"];

  const entries = Array.from(GAME_STATE.bag.entries()).filter(
    ([name]) => bagHasItem(name) && !(allPapersCollected && PAPER_NAMES.includes(name)),
  );

  return (
    <>
      <div className="absolute inset-y-4 right-4 w-80 rounded-lg border-3 bg-linear-to-b from-white to-amber-50 p-5 shadow-[0_0_16px_black] overflow-y-auto">
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
                  <span className="shrink-0 min-w-6 rounded-full bg-amber-100 px-1.5 text-center font-game text-xs font-bold text-amber-950">
                    x{entry.quantity}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {journalOpen && (
        <JournalPanel key={journalRefreshKey} onClose={() => setJournalOpen(false)} />
      )}
      {parcelOpen && <ParcelViewer onClose={() => setParcelOpen(false)} />}
      {puzzleOpen && (
        <PuzzleViewer
          onClose={() => setPuzzleOpen(false)}
          onSolved={() => setJournalRefreshKey((k) => k + 1)}
        />
      )}
      {viewingImage && (
        <ImageViewer
          src={viewingImage.src}
          alt={viewingImage.alt}
          backgroundColor={viewingImage.backgroundColor}
          onClose={() => setViewingImage(null)}
        />
      )}
    </>
  );
}
