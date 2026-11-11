import type { Direction } from "@/features/controller";
import { GAME_STATE } from "@/features/game-state";
import type { Interactable } from "@/features/interact";
import type { Sprite } from "@/features/sprite";
import { PlayerSprite, type AnimationSource } from "@/features/sprite-player";
import { addOnce } from "@/lib/array";
import { createTalkDispatch } from "@/lib/npc-talk";
import { placeAtTile } from "@/lib/positioning";

/** A brand-new NPC — spawned, obstacled, and made interactable automatically. */
export interface NewNpcMessageCfg {
  idleSprites: Record<Direction, AnimationSource>;
  tile: [number, number];
  gender: "m" | "f";
  message: string;
  /** Which way this NPC faces as soon as it's spawned. @default "s" */
  face?: Direction;
  /** Face this direction again once the line ends — same as talkCommonM/F's own `direction` param. @default undefined (keeps facing whatever way it already was) */
  direction?: Direction;
  /** Runs right when the message is shown — `DIALOGUE.queue(...)`/`.effect(...)` here attaches onto this same conversation, same idea as `readMessage`'s own chaining. */
  onShow?: () => void;
}

/** An existing sprite, already spawned/managed elsewhere — only its line gets wired up here. Same (npc, message) / (npc, direction, message) shape as talkCommonM/F, with an optional trailing onShow either way. */
export type ExistingNpcMessageCfg =
  | readonly [sprite: PlayerSprite, gender: "m" | "f", message: string]
  | readonly [sprite: PlayerSprite, gender: "m" | "f", message: string, onShow: () => void]
  | readonly [sprite: PlayerSprite, gender: "m" | "f", direction: Direction, message: string]
  | readonly [
      sprite: PlayerSprite,
      gender: "m" | "f",
      direction: Direction,
      message: string,
      onShow: () => void,
    ];

export type NpcMessageCfg = NewNpcMessageCfg | ExistingNpcMessageCfg;

export interface NpcMessageEntry {
  sprite: PlayerSprite;
  gender: "m" | "f";
  message: string;
  direction?: Direction;
  onShow?: () => void;
}

function isExistingCfg(cfg: NpcMessageCfg): cfg is ExistingNpcMessageCfg {
  return Array.isArray(cfg);
}

/** Pulls an `ExistingNpcMessageCfg` tuple apart — `third` is `message` (3-/4-length forms) or `direction` (4-/5-length forms); `onShow` is the only one ever a function, so that's what disambiguates a 4-length tuple. Cast past the union-of-exact-tuples type here since TS can't narrow `third`/`fourth` across it on its own — the runtime check above is the real source of truth. */
function resolveExistingCfg(cfg: ExistingNpcMessageCfg): NpcMessageEntry {
  const [sprite, gender, third, fourth, fifth] = cfg as [
    PlayerSprite,
    "m" | "f",
    Direction | string,
    string | (() => void) | undefined,
    (() => void) | undefined,
  ];

  if (typeof fourth === "function" || fourth === undefined) {
    return { sprite, gender, message: third, onShow: fourth };
  }
  return { sprite, gender, direction: third as Direction, message: fourth, onShow: fifth };
}

/**
 * Declarative config → NPC(s) with a single spoken line — same idea as
 * `createReadables`, but for talked-to NPCs instead of read objects. Each
 * entry is either:
 * - an object (`NewNpcMessageCfg`): a brand-new NPC, placed at `tile` and
 *   added to `npcs` (so `drawYSorted` actually draws it), obstacles, and
 *   `interactables`.
 * - a tuple (`ExistingNpcMessageCfg`): an already-spawned sprite — nothing
 *   about spawning happens here, only its line gets wired up.
 *
 * Pass the result to `npcMessagesInteractions` from `interactions(target)`.
 *
 * @example
 * const NPC_MESSAGES = createNpcMessages(
 *   NPCS,
 *   INTERACTABLES,
 *   [
 *     { idleSprites: IMGS_ADULT_MALE_1_IDLE, tile: [10, 5], gender: "m", message: "Hello..." },
 *     [npcExistingOne, "f", "s", "Hi there...", () => DIALOGUE.queue("...and one more thing.")],
 *   ],
 * );
 */
function spawnNewCfg(cfg: NewNpcMessageCfg, npcs: PlayerSprite[]): NpcMessageEntry {
  const { idleSprites, tile, gender, message, face = "s", direction, onShow } = cfg;
  const sprite = new PlayerSprite({ sprites: { idle: idleSprites } });
  placeAtTile(sprite, tile);
  sprite.face(face);
  addOnce(npcs, sprite);
  addOnce(GAME_STATE.obstacles, sprite);
  return { sprite, gender, message, direction, onShow };
}

export function createNpcMessages(
  npcs: PlayerSprite[],
  interactables: Interactable[],
  cfgs: NpcMessageCfg[],
): NpcMessageEntry[] {
  return cfgs.map((cfg) => {
    const entry = isExistingCfg(cfg) ? resolveExistingCfg(cfg) : spawnNewCfg(cfg, npcs);
    addOnce(interactables, entry.sprite);
    return entry;
  });
}

/** Call once per frame from `interactions(target)` — shows whichever entry (if any) matches `target`, then runs its `onShow`. */
export function npcMessagesInteractions(target: Sprite | undefined, entries: NpcMessageEntry[]) {
  const { talkCommonM, talkCommonF } = createTalkDispatch(target);

  for (const { sprite, gender, message, direction, onShow } of entries) {
    const talk = gender === "m" ? talkCommonM : talkCommonF;
    const matched =
      direction !== undefined ? talk(sprite, direction, message) : talk(sprite, message);
    if (matched) {
      onShow?.();
      return;
    }
  }
}
