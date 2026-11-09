import type { Sprite } from "@/features/sprite";
import { DIALOGUE } from "@/lib/canvas/dialogue";

/**
 * Binds readMessage to one `interactions(target)` call's own `target` —
 * same factory idiom as createTalkDispatch (`npc-talk.ts`), but for
 * anything read rather than spoken: signposts, messages in a bottle,
 * bulletin boards, picture frames, ... — no NPC/direction concept, plain
 * `Sprite`. Always shows in neutral black, so it's never at the mercy of
 * whatever color an earlier NPC conversation left DIALOGUE's `lastColor`
 * set to.
 *
 * Returns whether `sprite` was actually the target, so a caller needing
 * more than one line can chain onto it — `DIALOGUE.queue(...)` for more
 * text, or `DIALOGUE.onComplete` for a follow-up (e.g. a preview-image
 * reveal) — without that follow-up firing for every unmatched candidate.
 *
 * @example
 * function interactions(target: Sprite | undefined) {
 *   const { readMessage } = createReadDispatch(target);
 *   readMessage(spHouse, "Your house..."); // flat — nothing to chain
 *   if (readMessage(msgBottle1, "[MESSAGE IN A BOTTLE]")) {
 *     DIALOGUE.queue(`"..." — JP Aguilar`); // only runs on an actual match
 *   }
 * }
 */
export function createReadDispatch(target: Sprite | undefined) {
  function readMessage(sprite: Sprite, message: string): boolean {
    if (target !== sprite) return false;
    DIALOGUE.show({ text: message, color: "black" });
    return true;
  }

  return { readMessage };
}
