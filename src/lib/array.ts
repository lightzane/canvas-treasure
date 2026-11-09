/**
 * Adds `item` to `list` only if it isn't already there — safe to call every
 * `enter()`, for anything whose spawn condition (a `sequence` flag) can stay
 * true across many re-entries. `enter()` isn't one-time setup, it reruns on
 * every visit to a scene, so an unguarded `.push()` there would re-add the
 * same item on every single return trip.
 */
export function addOnce<T>(list: T[], item: T) {
  if (!list.includes(item)) list.push(item);
}

/**
 * Drops `item` out of `list` in place — mutates the same array reference
 * rather than `.filter()`-ing a new one. Matters because a caller like
 * `despawnNPC` (@/lib/npc-spawn) passes in a live reference it expects to
 * end up without `item` — e.g. `GAME_STATE.obstacles` itself — and a
 * `.filter()` result reassigned only to this function's own local `list`
 * parameter would never be visible to that caller at all (JS passes the
 * reference by value, not by reference-to-reference), leaving the original
 * array untouched. A no-op if `item` isn't in `list`.
 */
export function remove<T>(list: T[], item: T) {
  const i = list.indexOf(item);
  if (i !== -1) list.splice(i, 1);
}
