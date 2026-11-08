import type { Direction } from "@/features/controller";
import type { Sprite } from "@/features/sprite";
import type { PlayerSprite } from "@/features/sprite-player";
import { DIALOGUE } from "@/lib/canvas/dialogue";
import { beginCutscene } from "@/lib/cutscene";
import { hudSetBagIconVisible } from "@/lib/hud";
import { cancelScheduledFace, scheduleFaceDirection } from "@/lib/npc-auto";

/**
 * Shared by talkCommonM/talkCommonF below. `color` picks male
 * (blue) vs. female (red) — this project's existing speaker-color
 * convention (see home.ts/overworld.ts) — "Common" in their name means the
 * caller never has to know/pass it themselves.
 */
function talkCommon(
  npc: PlayerSprite,
  color: string,
  direction: Direction | undefined,
  message: string,
) {
  beginCutscene();
  if (direction) cancelScheduledFace(npc);
  DIALOGUE.show({ text: message, color });
  DIALOGUE.onComplete = () => {
    if (direction) scheduleFaceDirection(npc, direction);
    hudSetBagIconVisible(true);
  };
}

/** Pulls `direction`/`message` back apart from talkCommonM/F's own overloaded (npc, message) / (npc, direction, message) call shape. */
function resolveDirectionMessage(
  directionOrMessage: Direction | string,
  message: string | undefined,
): [Direction | undefined, string] {
  return message !== undefined
    ? [directionOrMessage as Direction, message]
    : [undefined, directionOrMessage];
}

/**
 * Binds talkCommonM/talkCommonF to one `interactions(target)` call's
 * own `target` — same factory idiom as `createNpcSpawner` (bind once per
 * dispatch, call without repeating the same param on every single call
 * after). Each returned function is a no-op unless `npc` is the one
 * actually faced; otherwise it's the same quick one-line exchange — locks
 * movement for the duration via `beginCutscene`, then releases it and
 * re-shows the bag icon once the line finishes. `direction` is optional:
 * pass it when the NPC should face back that way once the line ends
 * (cancelling any `scheduleFaceDirection` already pending for it first);
 * omit it to leave the NPC facing whatever way it already was.
 *
 * For anything stateful (first-meet vs. already-met, multi-line, spawning
 * another NPC afterward, ...), this still isn't the right tool — dispatch
 * on `target` yourself instead (a `switch`, see template.ts's npcExample)
 * and call `DIALOGUE.show`/`beginCutscene` directly.
 *
 * @example
 * function interactions(target: Sprite | undefined) {
 *   const { talkCommonM, talkCommonF } = createTalkDispatch(target);
 *   talkCommonM(npcExampleMale, "w", "Hello..."); // faces w again once the line finishes
 *   talkCommonF(npcExampleFemale, "Hello..."); // no direction change after
 * }
 */
export function createTalkDispatch(target: Sprite | undefined) {
  function talkCommonM(npc: PlayerSprite, message: string): void;
  function talkCommonM(npc: PlayerSprite, direction: Direction, message: string): void;
  function talkCommonM(
    npc: PlayerSprite,
    directionOrMessage: Direction | string,
    message?: string,
  ) {
    if (target !== npc) return;
    const [direction, text] = resolveDirectionMessage(directionOrMessage, message);
    talkCommon(npc, "blue", direction, text);
  }

  function talkCommonF(npc: PlayerSprite, message: string): void;
  function talkCommonF(npc: PlayerSprite, direction: Direction, message: string): void;
  function talkCommonF(
    npc: PlayerSprite,
    directionOrMessage: Direction | string,
    message?: string,
  ) {
    if (target !== npc) return;
    const [direction, text] = resolveDirectionMessage(directionOrMessage, message);
    talkCommon(npc, "red", direction, text);
  }

  return { talkCommonM, talkCommonF };
}
