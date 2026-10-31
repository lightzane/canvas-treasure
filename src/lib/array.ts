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
 * rather than `.filter()`-ing a new one, which matters for a list something
 * else also holds a reference to (e.g. `GAME_STATE.obstacles` is assigned
 * the same array as a scene's own NPC/decor list, not a copy — replacing it
 * with a filtered copy here wouldn't update what `GAME_STATE.obstacles`
 * still points at). A no-op if `item` isn't in `list`.
 */
export function remove<T>(list: T[], item: T) {
  const i = list.indexOf(item);
  if (i !== -1) list.splice(i, 1);
}
