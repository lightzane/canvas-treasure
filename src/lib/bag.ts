import { GAME_STATE, type ItemName } from "@/features/game-state";

/**
 * Whether the bag currently has at least one of `name` — an owned `"equip"`
 * entry (any amount, including none specified), or an `"item"` entry with
 * `quantity > 0`. Use this instead of `GAME_STATE.bag.get(name)` directly —
 * a present `"item"` entry at `quantity: 0` is still a truthy object, so a
 * plain truthiness check on the entry itself can't tell "not picked up yet"
 * apart from "owns some."
 */
export function hasItem(name: ItemName): boolean {
  const entry = GAME_STATE.bag.get(name);
  if (!entry) return false;
  return entry.type === "equip" || entry.quantity > 0;
}
