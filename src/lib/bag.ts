import { GAME_STATE } from "@/features/game-state";

/**
 * Every item the bag can hold — extend this union as new items get added,
 * e.g. once the shears exist: `"parcel" | "shears" | "shoes"`. Keeps
 * `GAME_STATE.bag.get`/`.set` calls typo-checked at compile time instead of
 * silently failing.
 */
export type ItemName =
  | "parcel"
  | "shoes"
  | "journal"
  | "sketch"
  | "paper1"
  | "papers"
  | "paper2"
  | "paper3"
  | "shears";

/**
 * A bag slot's own value — `"item"` is stackable (a quantity you pick up
 * more of, like the parcel), `"equip"` is a single worn piece (Running
 * Shoes) with no meaningful count of its own. Use `hasItem()` to check
 * "does the player have this" rather than reading `.quantity` directly — a
 * present `"item"` entry at `quantity: 0` (not yet picked up) is a real,
 * distinct case from not having the entry at all, and `.get(name)` alone
 * being truthy doesn't tell them apart (the entry object itself is always
 * truthy, even at quantity 0).
 */
export type BagEntry = { type: "item"; quantity: number } | { type: "equip"; quantity?: number };

/**
 * Whether the bag currently has at least one of `name` — an owned `"equip"`
 * entry (any amount, including none specified), or an `"item"` entry with
 * `quantity > 0`. Use this instead of `GAME_STATE.bag.get(name)` directly —
 * a present `"item"` entry at `quantity: 0` is still a truthy object, so a
 * plain truthiness check on the entry itself can't tell "not picked up yet"
 * apart from "owns some."
 */
export function bagHasItem(name: ItemName): boolean {
  const entry = GAME_STATE.bag.get(name);
  if (!entry) return false;
  return entry.type === "equip" || entry.quantity > 0;
}

export function bagIncItem(name: ItemName, qty = 1) {
  const entry = GAME_STATE.bag.get(name);
  if (!entry) return false;
  if (!entry.quantity) entry.quantity = 0;
  entry.quantity += qty;
}

export function bagAddItem(name: ItemName, qty = 1) {
  const entry = GAME_STATE.bag.get(name);
  if (entry) return bagIncItem(name, qty);

  // doesn't exist yet
  else {
    GAME_STATE.bag.set(name, { type: "equip", quantity: qty });
  }
}
