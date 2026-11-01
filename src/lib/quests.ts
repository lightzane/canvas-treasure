import { GAME_STATE } from "@/features/game-state";

/**
 * Every quest the journal can track — extend this union as new ones get
 * added. Same reasoning as `ItemName` (`@/lib/bag`): keeps
 * `GAME_STATE.quests.get`/`.set` calls typo-checked at compile time.
 */
export type QuestId = "parcel" | "invitation_postcard" | "catch_sheets" | "music_box";

/**
 * `"inactive"` — not yet discovered, never shown in the journal.
 * `"active"` — discovered, shown in the journal as an open checklist item.
 * `"resolved"` — shown in the journal checked off. Named after the GDD's
 * own vocabulary for this ("Resolves: _task_ Dao Ming Si's Car keys...")
 * rather than inventing a new word for the same idea.
 */
export type QuestStatus = "inactive" | "active" | "resolved";

export interface QuestEntry {
  /** Player-facing text shown in the journal. Never embed progress numbers here — `qty`/`totalQty` below render that automatically. */
  description: string;
  /** Current progress, for a collectible-style quest (e.g. sheets caught so far). Set together with `totalQty`, or leave both unset for a quest with no progress count. */
  qty?: number;
  /** The target `qty` needs to reach. */
  totalQty?: number;
  status: QuestStatus;
}

/**
 * Every quest is pre-defined from the start (most `"inactive"`) —
 * "discovering" one is just flipping its status via `setQuestStatus`, not
 * adding a new entry. Extend this alongside `QuestId` as new quests get
 * written into the GDD.
 */
export const QUESTS: Map<QuestId, QuestEntry> = new Map([
  [
    "parcel",
    {
      description: "Get the parcel.",
      status: "inactive",
    },
  ],
  [
    "invitation_postcard",
    {
      description: "Find out what's this treasure is about.",
      status: "inactive",
    },
  ],
  [
    "catch_sheets",
    {
      description: "Catch Hua Ze Lei's sheets of tracing paper.",
      qty: 0,
      totalQty: 3,
      status: "inactive",
    },
  ],
  [
    "music_box",
    {
      description: "Find what the treasure map points to in the mansion garden.",
      status: "inactive",
    },
  ],
]);

/**
 * Changes a quest's status in place — accepts either its `QuestId` (looked
 * up fresh) or the `QuestEntry` itself, for a caller that's already fetched
 * it (e.g. for its `.description`), to skip the redundant second
 * `GAME_STATE.quests` lookup. Same two-form idea as `walk()`'s own
 * `WalkLeg` (`[col,row] | {direction,steps}`). Does not show the toast
 * notification — call `playQuestToast` (`@/lib/effects/quest-toast`)
 * separately, explicitly, wherever that's actually wanted.
 */
export function setQuestStatus(quest: QuestId | QuestEntry, status: QuestStatus) {
  const entry = typeof quest === "string" ? GAME_STATE.quests.get(quest) : quest;
  if (entry) entry.status = status;
}

/** Updates a quest's current progress in place — same `QuestId | QuestEntry` two-form support as `setQuestStatus`, same reasoning. `totalQty` stays whatever the quest was defined with. Does not show the toast notification — see `setQuestStatus`'s own note. */
export function setQuestProgress(quest: QuestId | QuestEntry, qty: number) {
  const entry = typeof quest === "string" ? GAME_STATE.quests.get(quest) : quest;
  if (entry) entry.qty = qty;
}
