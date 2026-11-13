import { ImageViewer } from "@/app/image-viewer";
import { JournalPanel } from "@/app/journal-panel";
import { ParcelViewer } from "@/app/parcel-viewer";
import { PAGE_SOUND_VOLUME, PAPER_BG_COLOR, PuzzleViewer } from "@/app/puzzle-viewer";
import { GAME_STATE } from "@/features/game-state";
import { audioPlaySound } from "@/lib/audio";
import { bagHasItem, type ItemName } from "@/lib/bag";
import { img } from "@/lib/img";
import { loadImage } from "@/lib/load-image";
import { startPostcardConfetti, stopPostcardConfetti } from "@/lib/postcard-confetti";
import { useEffect, useRef, useState } from "react";

const ITEM_LABEL: Record<ItemName, string> = {
  journal: "Journal",
  parcel: "Parcel",
  treasure: "Treasure",
  birthday_postcard: "Birthday Postcard",
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
  treasure: { src: img("others/chest-close.png"), scale: 1.5 },
  birthday_postcard: { src: img("others/birthday-postcard.png"), scale: 0.7 },
  shoes: { src: img("others/shoes.png"), scale: 0.6 },
  sketch: { src: img("others/sketch.png"), scale: 1 },
  papers: { src: img("others/paper-multi.png"), scale: 1.5 },
  paper1: { src: img("others/paper-single.png"), scale: 1.5 },
  paper2: { src: img("others/paper-single.png"), scale: 1.5 },
  paper3: { src: img("others/paper-single.png"), scale: 1.5 },
  shears: { src: img("others/garden-shears.png"), scale: 0.8 },
  treasure_map: { src: img("others/message-bottle-v.png"), scale: 0.8 },
};
// Eagerly warms the shared image cache (load-image.ts) for every bag icon
// above, in one place that covers the whole map — including any future
// item added to it, without having to remember to add it here too. See
// hua-ze-lei.ts's own PORTRAIT_HUAZELEI loadImage() call for why this
// matters: these render the instant the bag opens, so an unwarmed one
// would show blank/broken in the grid for however long its first-ever
// fetch takes, in production only.
Object.values(ITEM_ICON).forEach((icon) => loadImage(icon.src));

export function BagPanel({ onClose }: { onClose: () => void }) {
  // Purely local UI state — nothing on the canvas side needs to know these
  // popups are open, unlike bagOpen/bagIconVisible (which exist specifically
  // so scene code can trigger a React re-render). No GAME_STATE field needed
  // for either.
  // Starts true (only when there's at least one "active" quest to show):
  // BagPanel is only ever mounted via {bagOpen && <BagPanel/>} in
  // layout.tsx, so it fully remounts fresh every time the bag opens — this
  // makes the journal open automatically alongside it, every time, EXCEPT
  // when it would just show an empty checklist (no discovered quests yet).
  const [journalOpen, setJournalOpen] = useState(() =>
    Array.from(GAME_STATE.quests.values()).some((quest) => quest.status === "active"),
  );
  // Only counts as viewed when it actually auto-opened (see journalOpen
  // above) — no click needed in that case. When there's nothing active to
  // show, it doesn't open, so it isn't "viewed" either; the player only
  // gets credit for it once they open it themselves (onItemClick below).
  // Safe to call every render otherwise (Set.add of an already-present
  // value is a no-op); BagPanel only ever mounts fresh while the bag is
  // open, same reasoning as journalOpen itself.
  if (journalOpen) GAME_STATE.bagViewedItems.add("journal");
  const [parcelOpen, setParcelOpen] = useState(false);
  const [puzzleOpen, setPuzzleOpen] = useState(false);
  // Bumped whenever something mutates GAME_STATE.quests while JournalPanel is
  // already mounted (e.g. PuzzleViewer solving a quest mid-popup) — passed as
  // JournalPanel's `key` below to force a fresh remount/read, since it has no
  // other way to know the external quests Map changed underneath it.
  const [journalRefreshKey, setJournalRefreshKey] = useState(0);
  // One slot, not three booleans — only ever one image previewed at a time,
  // and each paper needs its own src/alt, not just an open/closed flag.
  // `name` rides along purely so the close effect below can tell which item
  // is closing — it's not used for rendering the viewer itself.
  const [viewingImage, setViewingImage] = useState<{
    src: string;
    alt: string;
    backgroundColor?: string;
    name: ItemName;
  } | null>(null);

  // Which item's viewer was open — `viewingImage` itself goes back to
  // `null` on close, so by the time the effect below runs there's nothing
  // left on state to say which item this close is even for. Written from
  // an effect (not from viewImage's click handler directly) so this is
  // always a plain render-triggered ref update, not a ref write buried
  // inside a closure-returning-a-closure the linter can't see is
  // click-only.
  const lastViewedNameRef = useRef<ItemName | null>(null);
  useEffect(() => {
    if (viewingImage) lastViewedNameRef.current = viewingImage.name;
  }, [viewingImage]);

  // `backgroundColor` is optional — only items whose art is a transparent
  // PNG (the tracing papers) need one, to replace ImageViewer's default
  // cream gradient with something that doesn't fight the art.
  const viewImage = (name: ItemName, file: string, backgroundColor?: string) => () => {
    GAME_STATE.bagViewedItems.add(name);
    setViewingImage({ src: img(file), alt: ITEM_LABEL[name], backgroundColor, name });
    if (name === "birthday_postcard") startPostcardConfetti(5);
    if (name === "treasure_map" || /paper|sketch.*/i.test(name))
      audioPlaySound("page_turn_forward", { volume: PAGE_SOUND_VOLUME });
  };

  // Runs the moment the viewer closes (viewingImage goes falsy) — whether
  // that's the × button, Escape, or switching to another item. Confetti
  // stop stays unconditional (birthday_postcard is the only case that ever
  // set confettiHandle, so it's a no-op otherwise); the close sound is
  // conditioned on lastViewedNameRef the same way its open sound was
  // conditioned on `name` above.
  useEffect(() => {
    if (viewingImage) return;
    stopPostcardConfetti();
    if (
      lastViewedNameRef.current === "treasure_map" ||
      /paper.*|sketch/i.test(lastViewedNameRef.current ?? "")
    )
      audioPlaySound("page_turn_backward", { volume: PAGE_SOUND_VOLUME });
  }, [viewingImage]);

  useEffect(() => {
    if (!GAME_STATE.bagViewedItems.has("papers")) return;
    if (puzzleOpen) audioPlaySound("page_turn_forward", { volume: PAGE_SOUND_VOLUME });
    else audioPlaySound("page_turn_backward", { volume: PAGE_SOUND_VOLUME });
  }, [puzzleOpen]);

  // Few/specific items are clickable, each with its own distinct effect —
  // not every entry, and not a blanket rule off BagEntry's own `type`. Items
  // with no handler here render as plain, non-interactive display slots.
  // Each one also records itself in `bagViewedItems` — see that field's own
  // doc comment in game-state.ts for why (distinguishing "closed without
  // looking" from "looked, then closed" for `onBagClose`).
  const onItemClick: Partial<Record<ItemName, () => void>> = {
    journal: () => {
      GAME_STATE.bagViewedItems.add("journal");
      setJournalOpen(true);
    },
    treasure: () => {
      GAME_STATE.bagViewedItems.add("treasure");
      setParcelOpen(true);
    },
    parcel: () => {
      GAME_STATE.bagViewedItems.add("parcel");
      setParcelOpen(true);
    },
    papers: () => {
      GAME_STATE.bagViewedItems.add("papers");
      setPuzzleOpen(true);
    },
    birthday_postcard: viewImage("birthday_postcard", "treasure/cheryl_birthday_postcard.jpg"),
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
            src={`${import.meta.env.BASE_URL}assets/purse.png`}
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
                onClick={(e) => {
                  // A focused <button> natively re-activates on Enter too —
                  // without this, clicking an entry (e.g. opening the
                  // postcard viewer) leaves it focused, so the same Enter
                  // press used to close the bag also re-fires this button's
                  // own onClick (e.g. spawning a brand-new confetti burst
                  // right as the old one's meant to stop) — same mechanism
                  // as the bag-icon toggle button in layout.tsx.
                  e.currentTarget.blur();
                  onClick?.();
                }}
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
