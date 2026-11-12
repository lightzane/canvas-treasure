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
 * Returns whether `npc` was actually the target, same as `readMessage` —
 * so a caller needing more than one line (or any other follow-up) can
 * chain onto it instead of just firing it and moving on.
 *
 * @example
 * function interactions(target: Sprite | undefined) {
 *   const { talkCommonM, talkCommonF } = createTalkDispatch(target);
 *   talkCommonM(npcExampleMale, "w", "Hello..."); // faces w again once the line finishes
 *   talkCommonF(npcExampleFemale, "Hello..."); // no direction change after
 * }
 */
export function createTalkDispatch(target: Sprite | undefined) {
  function talkCommonM(npc: PlayerSprite, message: string): boolean;
  function talkCommonM(npc: PlayerSprite, direction: Direction, message: string): boolean;
  function talkCommonM(
    npc: PlayerSprite,
    directionOrMessage: Direction | string,
    message?: string,
  ): boolean {
    if (target !== npc) return false;
    const [direction, text] = resolveDirectionMessage(directionOrMessage, message);
    talkCommon(npc, "blue", direction, text);
    return true;
  }

  function talkCommonF(npc: PlayerSprite, message: string): boolean;
  function talkCommonF(npc: PlayerSprite, direction: Direction, message: string): boolean;
  function talkCommonF(
    npc: PlayerSprite,
    directionOrMessage: Direction | string,
    message?: string,
  ): boolean {
    if (target !== npc) return false;
    const [direction, text] = resolveDirectionMessage(directionOrMessage, message);
    talkCommon(npc, "red", direction, text);
    return true;
  }

  return { talkCommonM, talkCommonF };
}

/** "m"/"f" derive the usual blue/red convention; anything else is used directly as the color — a named CSS color or hex string, for a cast with their own distinct colors (e.g. overworld.ts's DIALOGUE_COLOR_DAOMINGSI). `string & {}` (not plain `string`) keeps "m"/"f" showing up as autocomplete suggestions — a plain `string` union member would otherwise swallow the whole type down to bare `string`, losing them. */
type SpeakerColor = "m" | "f" | (string & {});

export interface GroupConversation<Alias extends string> {
  /**
   * Shows `message` in `alias`'s own registered color/portrait — `.show()`
   * (starts a fresh conversation) if nothing's currently active, `.queue()`
   * (appends) otherwise, so the first `talk()` of any cutscene never needs
   * its own separate `DIALOGUE.show()` call. `portrait` overrides just this
   * one line — omit it to keep reusing whatever `alias` was registered with.
   */
  talk(alias: Alias, message: string, portrait?: string | null): void;
}

/**
 * A scripted, multi-speaker conversation — registers each speaker's own
 * color/portrait once, then `talk(alias, message)` dispatches by alias
 * instead of a hand-written switch. Generalizes overworld.ts's own
 * `f4Speaker`, which does exactly this but hardcoded to one specific cast.
 *
 * @example
 * const { talk } = createGroupConversation([
 *   ["daomingsi", "m", PORTRAIT_DAOMINGSI],
 *   ["huazelei", DIALOGUE_COLOR_HUAZELEI, PORTRAIT_HUAZELEI],
 * ]);
 * talk("daomingsi", "DAO MING SI: ..."); // starts fresh via .show()
 * DIALOGUE.effect(() => playExclamation(huazelei));
 * talk("huazelei", "HUA ZE LEI: ..."); // appends via .queue()
 * endCutscene(() => spawnMazeChest());
 */
export function createGroupConversation<
  const Entries extends readonly (readonly [
    alias: string,
    color: SpeakerColor,
    portrait?: string | null,
  ])[],
>(entries: Entries): GroupConversation<Entries[number][0]> {
  const speakers = new Map(
    entries.map(([alias, color, portrait]) => [
      alias,
      { color: color === "m" ? "blue" : color === "f" ? "red" : color, portrait },
    ]),
  );

  function talk(alias: string, message: string, portrait?: string | null) {
    const speaker = speakers.get(alias);
    if (!speaker) return;
    const input = { text: message, color: speaker.color, portrait: portrait ?? speaker.portrait };
    if (DIALOGUE.isActive) DIALOGUE.queue(input);
    else DIALOGUE.show(input);
  }

  return { talk };
}
