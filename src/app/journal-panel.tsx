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

  return (
    <div className="absolute top-4 left-4 w-full max-w-md max-h-[calc(100%-2rem)] overflow-y-auto rounded-xl border-slate-800 bg-linear-to-b from-[#fdf3dd] to-[#ecd9ab] p-5 shadow-[0_0_10px_black]">
      <div className="flex items-center justify-between border-b-2 border-amber-800/40 pb-2">
        <span className="font-game text-lg uppercase tracking-wider text-amber-950">Journal</span>
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
            {t}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2.5 overflow-y-auto max-h-72">
        {questEntries.length === 0 && (
          <div className="font-game text-sm italic text-amber-950/50">
            {tab === "active" ? "No active quests." : "No completed quests yet."}
          </div>
        )}
        {questEntries.map(([id, quest]) => (
          <div key={id} className="flex items-start gap-2.5 leading-5">
            {/* size-5 (20px) exactly matches the row's own leading-5 (1.25rem/20px) above
                — top/bottom edges land on the first line's top/bottom edges by
                construction (align-items: flex-start), no eyeballed margin
                nudge needed. Same fix as quest-toast.ts's own circle/text
                alignment — see that file's LINE_HEIGHT comment for the full
                reasoning (this font's default line-height doesn't center
                predictably on its own). */}
            <div
              className={`flex size-5 shrink-0 items-center justify-center rounded-md border-2 border-amber-800 ${
                quest.status === "resolved" ? "bg-amber-800" : "bg-transparent"
              }`}
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
        ))}
      </div>
    </div>
  );
}
