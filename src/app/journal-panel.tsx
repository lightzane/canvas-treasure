import { GAME_STATE } from "@/features/game-state";
import { useState } from "react";

/**
 * Docked top-left, same canvas-relative `absolute` positioning scheme as
 * `BagPanel`'s own main panel (both render inside `layout.tsx`'s `relative`
 * wrapper around the canvas) — a window, not a centered modal, so no
 * backdrop; closing is only via the explicit Close button.
 */
export function JournalPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"active" | "completed">("active");

  // "inactive" quests are undiscovered — never shown, either tab.
  const wantedStatus = tab === "active" ? "active" : "resolved";
  const questEntries = Array.from(GAME_STATE.quests.entries()).filter(
    ([, quest]) => quest.status === wantedStatus,
  );

  // Both counted in one pass over the full quest list, not derived from
  // questEntries above (which only ever holds the *current* tab's quests) —
  // the tab labels need both counts displayed at once, regardless of which
  // tab is currently active.
  const tabCounts = { active: 0, completed: 0 };
  for (const quest of GAME_STATE.quests.values()) {
    if (quest.status === "active") tabCounts.active++;
    else if (quest.status === "resolved") tabCounts.completed++;
  }

  return (
    <div className="absolute top-4 left-4 w-full max-w-md max-h-[calc(100%-2rem)] overflow-y-auto rounded-xl border-slate-800 bg-linear-to-b from-[#fdf3dd] to-[#ecd9ab] p-5 shadow-[0_0_10px_black]">
      <div className="flex items-center justify-between border-b-2 border-amber-800/40 pb-2">
        <div className="flex gap-1 items-center">
          <img
            src="/assets/images/others/book-and-pencil.png"
            alt=""
            className="size-8 shrink-0 [image-rendering:pixelated] drop-shadow"
          />
          <span className="font-game text-lg uppercase tracking-wider text-amber-950">Journal</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="font-game text-sm text-amber-950/70 hover:text-amber-950"
        >
          Close
        </button>
      </div>

      <div className="mb-3 flex gap-1 border-b-2 border-amber-800/30">
        {(["active", "completed"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`-mb-0.5 border-b-2 px-3 py-1.5 font-game text-sm capitalize transition-colors ${
              tab === t
                ? "border-amber-800 font-bold text-amber-950"
                : "border-transparent text-amber-950/50 hover:text-amber-950/80"
            }`}
          >
            {t} ({tabCounts[t]})
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2.5 overflow-y-auto max-h-72">
        {questEntries.length === 0 && (
          <div className="font-game text-sm italic text-amber-950/50">
            {tab === "active" ? "No active quests." : "No completed quests yet."}
          </div>
        )}
        {questEntries.map(([id, quest]) => {
          // Same clockwise conic-gradient pie as quest-toast.ts's own
          // circle — ported over, just re-tinted for this light cream
          // background instead of that one's dark glass pill.
          const hasProgress =
            quest.status !== "resolved" && quest.qty !== undefined && quest.totalQty !== undefined;
          const pieBackground =
            hasProgress && quest.totalQty! > 0
              ? (() => {
                  const deg = Math.round((quest.qty! / quest.totalQty!) * 360);
                  return `conic-gradient(#92400e ${deg}deg, transparent ${deg}deg 360deg)`;
                })()
              : undefined;

          return (
            <div key={id} className="flex items-start gap-2.5 leading-5">
              {/* size-5 (20px) exactly matches the row's own leading-5 (1.25rem/20px) above
                  — top/bottom edges land on the first line's top/bottom edges by
                  construction (align-items: flex-start), no eyeballed margin
                  nudge needed. Same fix as quest-toast.ts's own circle/text
                  alignment — see that file's LINE_HEIGHT comment for the full
                  reasoning (this font's default line-height doesn't center
                  predictably on its own). rounded-full, not rounded-md — this
                  is a circle, not a rounded square. */}
              <div
                className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-amber-800 ${
                  quest.status === "resolved" ? "bg-amber-800" : "bg-transparent"
                }`}
                style={pieBackground ? { background: pieBackground } : undefined}
              >
                {quest.status === "resolved" && (
                  <span className="font-game text-xs leading-none text-amber-50">✓</span>
                )}
              </div>
              <span
                className={`font-game text-sm ${
                  quest.status === "resolved" ? "text-amber-950/50 line-through" : "text-amber-950"
                }`}
              >
                {quest.qty !== undefined && quest.totalQty !== undefined && (
                  <span className="mr-1 font-bold opacity-70">
                    ({quest.qty}/{quest.totalQty})
                  </span>
                )}
                {quest.description}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
