/**
 * The shape every long-running, stoppable effect in this folder returns —
 * see this folder's own CLAUDE.md ("An infinite-by-design effect... returns
 * a `{ stop(): void }` handle instead"). Used directly as each `play*`
 * function's return type and at every call site that holds onto one, rather
 * than each effect re-declaring its own identically-shaped
 * `ShineHandle`/`QuestToastHandle`/etc. interface. What `.stop()` does for a
 * given effect (fades out early? snaps back to original position? just
 * stops launching new particles?) is documented on that effect's own `play*`
 * function instead of on a per-effect type that no longer exists.
 */
export interface EffectHandle {
  stop: () => void;
}
