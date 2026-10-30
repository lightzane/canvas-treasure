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
