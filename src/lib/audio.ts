import { Howl } from "howler";

// Files live in public/audio/ (not src/assets/) so they're addressable by plain
// path here — same convention as ../fanorona-lite's sound.composable.ts — rather
// than one import per file. Resolves correctly under any Vite `base` config too.
const base = import.meta.env.BASE_URL.replace(/\/$/, "/assets/audio/");

export type SoundKey =
  | "click"
  | "pop"
  | "level_complete"
  | "quick_air_woosh"
  | "garden_shovel_stab"
  | "page_turn_forward"
  | "page_turn_backward";
export type MusicKey =
  | "home"
  | "overworld"
  | "mansion"
  | "market"
  | "flowershop"
  | "maze"
  | "zz_makeawish"
  | "amb_beach"
  | "amb_shopping_crowd"
  | "amb_water_flowing"
  | "amb_wind_interior";

/**
 * Physical files split into multiple named clips rather than played whole —
 * the filename and millisecond boundaries are facts about that one
 * recording, so they're declared exactly once, here, instead of repeating
 * the path per SoundKey (see SheetSoundEntry below). Each sheet gets
 * exactly one shared Howl, built with Howler's own native multi-sprite
 * support (`sprite` is its actual config key — same name kept here on
 * purpose), so the file is fetched/decoded once no matter how many
 * SoundKeys reference different clips of it.
 */
const SOUND_SHEETS = {
  book_paging: {
    src: "fx/mixkit-single-book-paging-1101.wav",
    sprite: {
      forward: [0, 1000],
      backward: [1700, 2000],
    },
  },
} as const satisfies Record<string, { src: string; sprite: Record<string, [number, number]> }>;

type SheetKey = keyof typeof SOUND_SHEETS;

interface StandaloneSoundEntry {
  /** Filenames under public/audio/ — one is picked at random on each play. */
  src: string[];
  /** Fades the clip's volume to 0 across its full duration. Use for a recording with an audible artifact right at the end. */
  silenceEnd?: boolean;
  /**
   * Seconds into the clip every `audioPlaySound()` call for this key starts
   * from by default — e.g. to skip a silent/unwanted lead-in baked into the
   * recording, without every call site having to remember and repeat that
   * offset. A call's own `options.seek` still overrides this per-play.
   */
  seek?: number;
}

/** One named clip of a SOUND_SHEETS entry — `sprite` is narrowed per `sheet`, so only that sheet's own clip names type-check/autocomplete. */
type SheetSoundEntry = {
  [K in SheetKey]: { sheet: K; sprite: keyof (typeof SOUND_SHEETS)[K]["sprite"] };
}[SheetKey];

type SoundEntry = StandaloneSoundEntry | SheetSoundEntry;

// prettier-ignore
const SOUND_REGISTRY: Record<SoundKey, SoundEntry> = {
  click:               { src: ["interface/mixkit-modern-technology-select-3124.wav"] },
  pop:                 { src: ["interface/mixkit-hard-pop-click-2364.wav"], seek: 0.01 },
  level_complete:      { src: ["fx/mixkit-completion-of-a-level-2063.wav"] },
  quick_air_woosh:     { src: ["fx/mixkit-quick-air-woosh-2605.wav"] },
  garden_shovel_stab:  { src: ["fx/mixkit-garden-shovel-stab-1918.wav"] },
  page_turn_forward:   { sheet: "book_paging", sprite: "forward" },
  page_turn_backward:  { sheet: "book_paging", sprite: "backward" },
  // pop:              { src: [...Array(5)].map((_, i) => `crack-${i + 1}.mp3`), silenceEnd: true }, // crack-*.mp3 recordings have an audible artifact at the end
  // 'battle-start':   { src: ["mixkit-drums-of-war-2784.wav"] }
};

const MUSIC_REGISTRY: Record<MusicKey, string> = {
  home: "classical-verdanturf.mp3",
  overworld: "classical-littleroot-town.mp3",
  mansion: "我是真的真的很爱你.mp3",
  market: "sm.mp3",
  flowershop: "classical-pallet-town.mp3",
  maze: "pokemon-route1-acoustic.mp3",
  zz_makeawish: "周渝民-make-a-wish.mp3",
  amb_beach: "ambience/mixkit-small-waves-harbor-rocks-1208.wav",
  amb_shopping_crowd: "ambience/mixkit-shopping-center-crowd-377.wav",
  amb_water_flowing: "ambience/mixkit-water-flowing-ambience-loop-3126.wav",
  amb_wind_interior: "ambience/mixkit-wind-cold-interior-1172.wav",
};

// Lazily built on first play, then reused for the rest of the session.
const soundCache = new Map<SoundKey, Howl[]>();
const musicCache = new Map<MusicKey, Howl>();
// Keyed by sheet (not by SoundKey) — the one shared Howl for a SOUND_SHEETS
// entry, so every SoundKey referencing it (different `sprite` names) plays
// off the same decoded file instead of each fetching its own copy.
const sheetCache = new Map<SheetKey, Howl>();

/**
 * The one currently-playing *base* track — each scene has exactly one
 * (its theme), and switching scenes should always crossfade into the new
 * one without the caller needing to remember or pass along whatever was
 * playing before. A single `MusicKey | null`, not a Howl reference —
 * `musicCache` above already holds the one persistent Howl per key for
 * the whole session, so this only needs to answer "which key is current."
 * See `playMusic()`. Separate from `activeAmbience` below: a scene's base
 * theme and its layered ambience (ocean, wind, ...) are controlled
 * independently — swapping the base theme on a scene change should never
 * interrupt ambience that's still relevant, and vice versa.
 */
let activeMusic: MusicKey | null = null;

/**
 * Keys of every currently-playing ambience layer — unlike the single base
 * track above, any number of these can be active at once (e.g. ocean waves
 * under a beach scene, layered with a music-box sting). A `Set<MusicKey>`,
 * not a second `Map<MusicKey, Howl>`: "active" is a pure membership
 * question, and a second map of the same Howls already in `musicCache`
 * would just be a copy that could drift out of sync with it.
 */
const activeAmbience = new Set<MusicKey>();

/**
 * Last volume we intentionally set for each key — the one source of truth
 * for "what should this fade FROM," instead of reading it back via
 * `howl.volume()`. That read is unreliable here: every fade-in above runs
 * per sound-id (`howl.fade(0, target, ms, id)`), which Howler only ever
 * applies to that one id — the Howl's own group-level volume (what a bare,
 * id-less `howl.volume()` returns) never moves off whatever it was at
 * creation. Reading that stale value as "current volume" before a
 * pause/stop fade caused an audible snap UP to it (Howler's `.fade()`
 * starts by snapping to `from`) before ramping back down — this map is
 * what fixed that.
 */
const musicVolume = new Map<MusicKey, number>();

/**
 * The specific sound id currently playing for each key — required so every
 * fade/pause/stop below can target `id` explicitly instead of omitting it.
 * Omitting `id` on `howl.fade()`/`.pause()`/`.stop()` doesn't mean "the
 * current sound" — Howler treats it as "every sound instance on this Howl,"
 * group-wide. That matters here because a key can get re-played (a new
 * `howl.play()`, a new id) WHILE an earlier instance of the same key is
 * still mid-fade-out from a just-before pause/stop call: `.play()` can't
 * reuse that old instance (it's not paused/ended yet), so it spins up a
 * second one — and when the old fade-out's deferred `.pause()`/`.stop()`
 * then fires with no id, it silently kills the brand new instance too, even
 * though it has nothing to do with the old one. Whatever `fade` duration
 * the original pause/stop call was given, this race is possible if the key
 * gets re-played again before that fade finishes. Scoping every call to the
 * exact id sidesteps it entirely, regardless of the fade length involved.
 */
const musicSoundId = new Map<MusicKey, number>();

/** Fades a clip's volume to 0 across its full duration, masking an artifact at the very end of the recording. */
function fadeToSilence(howl: Howl, id: number): void {
  howl.fade(howl.volume(id) as number, 0, howl.duration(id) * 1000, id);
}

/** The one shared Howl for a SOUND_SHEETS entry — built once, with every one of that sheet's clips registered as a Howler sprite up front, then reused by every SoundKey that references it. */
function getSheetHowl(key: SheetKey): Howl {
  let howl = sheetCache.get(key);

  if (!howl) {
    const { src, sprite } = SOUND_SHEETS[key];
    howl = new Howl({ src: [`${base}${src}`], sprite });
    sheetCache.set(key, howl);
  }

  return howl;
}

function getSoundVariants(key: SoundKey): Howl[] {
  const entry = SOUND_REGISTRY[key];

  // Not memoized in soundCache — getSheetHowl's own sheetCache already
  // dedups this across every SoundKey that shares the sheet, which is the
  // whole point (one decode, multiple named clips of it).
  if ("sheet" in entry) return [getSheetHowl(entry.sheet)];

  let howls = soundCache.get(key);

  if (!howls) {
    const { src, silenceEnd } = entry;

    howls = src.map((file) => {
      const howl = new Howl({ src: [`${base}${file}`] });
      if (silenceEnd) howl.on("play", (id) => fadeToSilence(howl, id));
      return howl;
    });

    soundCache.set(key, howls);
  }

  return howls;
}

export interface PlaySoundOptions {
  /** 0–1. Omit to play at whatever volume the clip was authored/last set at. */
  volume?: number;
  /**
   * Seconds into the clip to start playback from, instead of the top —
   * overrides that `SoundEntry`'s own `seek` default (if it has one) for
   * just this call.
   */
  seek?: number;
}

/**
 * Plays a random variant of the given sound effect.
 *
 * @example
 * audioPlaySound("tackle"); // picks one of crack-1..5.mp3 at random
 * audioPlaySound("click", { volume: 0.7 });
 * audioPlaySound("pop", { seek: 0.5 }); // skip the first half-second, just this once
 */
export function audioPlaySound(key: SoundKey, options?: PlaySoundOptions): void {
  const entry = SOUND_REGISTRY[key];
  const variants = getSoundVariants(key);
  const howl = variants[Math.floor(Math.random() * variants.length)]!;
  const id = "sheet" in entry ? howl.play(entry.sprite) : howl.play();
  if (options?.volume !== undefined) howl.volume(options.volume, id);
  const seek = options?.seek ?? ("seek" in entry ? entry.seek : undefined);
  if (seek !== undefined) howl.seek(seek, id);
}

export interface PlayMusicOptions {
  /** @default true */
  loop?: boolean;
  /** 0–1. Defaults to 1 the first time a track is created; carries over on later calls if omitted. */
  volume?: number;
  /**
   * Seconds into the track to start playback from. Omit to resume from wherever
   * it was left off (or the beginning, the first time it's ever played) — pass
   * `0` explicitly to always restart from the top regardless of prior position.
   */
  seek?: number;
  /**
   * Seconds to fade in over. For `audioPlayMusic()` this is a crossfade —
   * the outgoing base track fades to silence while the incoming one fades
   * in. For `audioPlayAmbience()` it's just a fade-in, since any number of
   * ambience layers can be playing at once (nothing to fade out). Omit (or
   * `0`) for an instant start.
   * @default 1 for `audioPlayMusic()`; `0` for `audioPlayAmbience()`
   */
  fade?: number;
}

// Only ever sets volume on a BRAND NEW Howl (its initial level) — never on
// one already cached. Snapping a cached howl's volume here used to run
// unconditionally, before callers even got to decide whether this was a
// genuine new play or just "same track, already playing, asking for a
// different volume" — the latter wants a choice between an instant snap or
// a fade (see audioPlayMusic's alreadyActive branch), not this unconditional
// silent snap underneath it either way.
function getMusicHowl(key: MusicKey, options?: PlayMusicOptions): Howl {
  let howl = musicCache.get(key);

  if (!howl) {
    howl = new Howl({
      src: [`${base}${MUSIC_REGISTRY[key]}`],
      loop: options?.loop ?? true,
      volume: options?.volume ?? 1,
    });
    musicCache.set(key, howl);
  }

  return howl;
}

/**
 * Starts (or switches to) the one base background track — e.g. a scene's
 * theme. Crossfades automatically: whichever track was previously active
 * fades out while this one fades in, over `options.fade` seconds (default
 * 1) — the caller never needs to know or remember what was playing
 * before, just which key the current scene wants. By default, calling it
 * again for a track that was paused resumes it from where it left off —
 * pass `seek: 0` for a track that should always restart (e.g. a battle
 * theme beginning fresh for every new battle).
 *
 * Only ever one active at a time — for layered, simultaneous tracks (e.g.
 * ocean waves under a beach scene), use `playAmbience()` instead; the two
 * are independent, so swapping the base theme here never touches whatever
 * ambience is currently layered on top.
 *
 * Calling it again for the track that's ALREADY the active one (no track
 * swap, no seek) is just a volume change on that same playing track — fades
 * to the new `options.volume` over `options.fade` seconds same as a swap
 * would (default 1), or pass `fade: 0` for an instant snap instead.
 *
 * @example
 * audioPlayMusic("map"); // crossfades in, resuming where "map" left off
 * audioPlayMusic("battle", { volume: 0.5, seek: 0, fade: 0.3 }); // quick fade, always starts at the top
 * audioPlayMusic("overworld", { volume: 0.1 }); // already playing — fades its volume down over 1s
 * audioPlayMusic("overworld", { volume: 0.1, fade: 0 }); // same, but instant
 */
export function audioPlayMusic(key: MusicKey, options?: PlayMusicOptions): void {
  const howl = getMusicHowl(key, options);
  const fadeMs = (options?.fade ?? 1) * 1000;

  if (key === activeMusic && howl.playing() && options?.seek === undefined) {
    // Same track, still playing — nothing to swap or resume, just maybe a
    // volume change on it. Doing that via a fade (or an instant snap, if
    // the caller passed `fade: 0`) here, instead of falling through to the
    // crossfade-swap logic below, which assumes a DIFFERENT track is
    // fading out underneath — there isn't one.
    if (options?.volume === undefined) return;
    const activeId = musicSoundId.get(key);
    const currentVolume = musicVolume.get(key) ?? (howl.volume() as number);
    musicVolume.set(key, options.volume);
    if (fadeMs <= 0) {
      if (activeId === undefined) howl.volume(options.volume);
      else howl.volume(options.volume, activeId);
    } else howl.fade(currentVolume, options.volume, fadeMs, activeId);
    return;
  }

  const prevKey = activeMusic;
  const prevHowl = prevKey ? musicCache.get(prevKey) : undefined;
  activeMusic = key;

  if (prevHowl?.playing() && prevKey) {
    const prevId = musicSoundId.get(prevKey);
    const prevVolume = musicVolume.get(prevKey) ?? (prevHowl.volume() as number);

    // Pause (not stop) once the fade-out finishes, so the next playMusic()
    // for THIS track still resumes from where it left off — then restore
    // its volume, since .fade() leaves it at 0 and a bare .pause() doesn't
    // reset that on its own. A plain setTimeout tied to the fade's own
    // known length, not a `howl.once("fade", ...)` listener — that fires on
    // the first 'fade' event from ANY sound id on this Howl, not
    // specifically prevId, so it could resolve early/for the wrong id if
    // this same key gets re-played before this fade-out finishes. Scoping
    // every call below to prevId (never omitted) is what actually prevents
    // this fade-out from touching a different, newer instance of this key.
    if (fadeMs <= 0) {
      prevHowl.pause(prevId);
    } else {
      prevHowl.fade(prevVolume, 0, fadeMs, prevId);
      setTimeout(() => {
        prevHowl.pause(prevId);
        if (prevId === undefined) prevHowl.volume(prevVolume);
        else prevHowl.volume(prevVolume, prevId);
      }, fadeMs);
    }
  }

  // Read the target volume BEFORE touching anything, then silence only this
  // specific sound id (not the Howl's group-level default) before playing it
  // — muting the group default here would leave it stuck at 0 permanently,
  // since the fade below only ever restores the per-id volume, not the
  // group's. That stale 0 is what `howl.volume()` would read back next time
  // this same key plays again, fading from 0 to 0 — silently, forever.
  const targetVolume = options?.volume ?? musicVolume.get(key) ?? (howl.volume() as number);
  musicVolume.set(key, targetVolume);
  const id = howl.play();
  musicSoundId.set(key, id);
  howl.volume(0, id);
  if (options?.seek !== undefined) howl.seek(options.seek, id);
  howl.fade(0, targetVolume, fadeMs, id);
}

/**
 * Pauses the current base track, preserving its position for the next
 * `audioPlayMusic()` call. Does not touch ambience.
 *
 * @param fade Seconds to fade to silence before pausing, instead of an
 * instant cut. Omit (or `0`) for an immediate pause.
 *
 * @example
 * audioPauseMusic(); // instant
 * audioPauseMusic(1.5); // fades out first
 */
export function audioPauseMusic(fade?: number): void {
  if (!activeMusic) return;
  const howl = musicCache.get(activeMusic);
  if (!howl) return;

  const id = musicSoundId.get(activeMusic);
  const fadeMs = (fade ?? 0) * 1000;
  if (fadeMs <= 0 || !howl.playing()) {
    howl.pause(id);
    return;
  }

  const prevVolume = musicVolume.get(activeMusic) ?? (howl.volume() as number);
  howl.fade(prevVolume, 0, fadeMs, id);
  // Same dance as the crossfade-out in audioPlayMusic(): pause (not stop)
  // once the fade finishes so the next audioPlayMusic() call still resumes
  // from here, then restore the volume .fade() left at 0. A plain
  // setTimeout tied to the fade's own known length, scoped to this specific
  // id throughout — see musicSoundId's own doc comment for why a bare
  // `howl.once("fade", ...)`/omitted id is unsafe here.
  setTimeout(() => {
    howl.pause(id);
    if (id === undefined) howl.volume(prevVolume);
    else howl.volume(prevVolume, id);
  }, fadeMs);
}

/**
 * Fully stops the current base track and resets its position to 0. The
 * next `audioPlayMusic()` call for that track starts fresh instead of
 * resuming — use this for a track that should always begin from the start
 * (e.g. a battle theme restarting for every new battle), as opposed to
 * `audioPauseMusic()`, which preserves position for a later resume. Does
 * not touch ambience.
 *
 * @param fade Seconds to fade to silence before stopping, instead of an
 * instant cut. Omit (or `0`) for an immediate stop.
 */
/**
 * Whether `key` is the current base track AND actually still playing — use
 * this to guard a repeatable trigger (e.g. a zone's `onEnter`, which can
 * fire again on every re-entry) before passing `seek` to `audioPlayMusic()`.
 * `seek` deliberately forces a fresh restart even for an already-active
 * track (see `audioPlayMusic()`'s own doc comment) — exactly what a
 * same-track re-entry does NOT want, since it'd crossfade a second instance
 * of the same track in on top of the one already playing.
 *
 * @example
 * function soundGardenMaze() {
 *   if (audioIsMusicActive("maze")) return; // already playing — don't re-seek/restart
 *   audioPlayMusic("maze", { seek: 8, fade: 2, volume: 0.3 });
 * }
 */
export function audioIsMusicActive(key: MusicKey): boolean {
  return key === activeMusic && (musicCache.get(key)?.playing() ?? false);
}

export function audioStopMusic(fade?: number): void {
  if (!activeMusic) return;
  const key = activeMusic;
  const howl = musicCache.get(key);
  activeMusic = null;
  if (!howl) return;

  const id = musicSoundId.get(key);
  const fadeMs = (fade ?? 0) * 1000;
  if (fadeMs <= 0 || !howl.playing()) {
    howl.stop(id);
    return;
  }

  const prevVolume = musicVolume.get(key) ?? (howl.volume() as number);
  howl.fade(prevVolume, 0, fadeMs, id);
  setTimeout(() => {
    howl.stop(id);
    if (id === undefined) howl.volume(prevVolume);
    else howl.volume(prevVolume, id);
  }, fadeMs);
}

function toKeyArray(keys: MusicKey | MusicKey[] | undefined, fallback: Iterable<MusicKey>) {
  if (keys === undefined) return [...fallback];
  return Array.isArray(keys) ? keys : [keys];
}

/**
 * Starts one or more ambience layers (ocean, wind, ...) — unlike
 * `audioPlayMusic()`, this never pauses anything else; any number of
 * ambience tracks (and the one base track) can be playing together. Each
 * key resumes from wherever it left off, same per-key resume behavior as
 * `audioPlayMusic()`, independently of the others. `options` applies to
 * every key passed in this call; call it again separately for a key that
 * needs different options.
 *
 * Calling it again for a key that's ALREADY playing (no seek) is just a
 * volume change on that layer — fades to the new `options.volume` over
 * `options.fade` seconds (default `0`, i.e. instant — unlike
 * `audioPlayMusic()`, ambience defaults to an instant snap here since it
 * never implied a fade for a fresh start either), or pass a `fade` for a
 * smooth change instead.
 *
 * @example
 * audioPlayAmbience("ocean");
 * audioPlayAmbience(["ocean", "wind"], { volume: 0.4, fade: 3 });
 * audioPlayAmbience("ocean", { volume: 0.1 }); // already playing — instant volume change
 * audioPlayAmbience("ocean", { volume: 0.1, fade: 2 }); // same, but fades over 2s
 */
export function audioPlayAmbience(keys: MusicKey | MusicKey[], options?: PlayMusicOptions): void {
  const fadeMs = (options?.fade ?? 0) * 1000;

  for (const key of Array.isArray(keys) ? keys : [keys]) {
    const howl = getMusicHowl(key, options);

    if (activeAmbience.has(key) && howl.playing() && options?.seek === undefined) {
      // Same layer, still playing — nothing to start, just maybe a volume
      // change on it (same idea as audioPlayMusic()'s alreadyActive branch).
      if (options?.volume === undefined) continue;
      const activeId = musicSoundId.get(key);
      const currentVolume = musicVolume.get(key) ?? (howl.volume() as number);
      musicVolume.set(key, options.volume);
      if (fadeMs <= 0) {
        if (activeId === undefined) howl.volume(options.volume);
        else howl.volume(options.volume, activeId);
      } else howl.fade(currentVolume, options.volume, fadeMs, activeId);
      continue;
    }

    activeAmbience.add(key);

    // getMusicHowl() never touches a cached howl's volume (only a brand
    // new one's, at creation) — so read the target explicitly here, then
    // silence only this sound id before fading it in. Never the group
    // default: that'd be stuck at 0 next time this key plays. musicVolume
    // (not howl.volume()) is what pause/stop later read back as "current" —
    // see its own doc comment for why that distinction matters.
    const targetVolume = options?.volume ?? musicVolume.get(key) ?? (howl.volume() as number);
    musicVolume.set(key, targetVolume);
    const id = howl.play();
    musicSoundId.set(key, id);
    if (options?.seek !== undefined) howl.seek(options.seek, id);
    if (fadeMs > 0) {
      howl.volume(0, id);
      howl.fade(0, targetVolume, fadeMs, id);
    } else {
      howl.volume(targetVolume, id);
    }
  }
}

/**
 * Pauses ambience layers, preserving position for a later
 * `audioPlayAmbience()` resume. Omit `keys` to pause every ambience track
 * currently active — returns whichever keys were actually paused, so the
 * caller can hold onto that list and resume exactly those later
 * (`audioPlayAmbience(audioPauseAmbience())`) without tracking anything
 * itself.
 *
 * @param fade Seconds to fade each targeted layer to silence before
 * pausing, instead of an instant cut. Omit (or `0`) for an immediate pause.
 *
 * @example
 * audioPauseAmbience(); // pause everything, remember what for later
 * audioPauseAmbience("ocean"); // just one
 * audioPauseAmbience(["ocean", "wind"]); // a specific few
 * audioPauseAmbience("ocean", 2); // fades out over 2s first
 */
export function audioPauseAmbience(keys?: MusicKey | MusicKey[], fade?: number): MusicKey[] {
  const targets = toKeyArray(keys, activeAmbience);
  const fadeMs = (fade ?? 0) * 1000;

  for (const key of targets) {
    const howl = musicCache.get(key);
    const id = musicSoundId.get(key);
    activeAmbience.delete(key);
    if (!howl) continue;

    if (fadeMs <= 0 || !howl.playing()) {
      howl.pause(id);
      continue;
    }

    const prevVolume = musicVolume.get(key) ?? (howl.volume() as number);
    howl.fade(prevVolume, 0, fadeMs, id);
    setTimeout(() => {
      howl.pause(id);
      if (id === undefined) howl.volume(prevVolume);
      else howl.volume(prevVolume, id);
    }, fadeMs);
  }

  return targets;
}

/**
 * Fully stops ambience layers and resets their position to 0. Omit `keys`
 * to stop everything currently active.
 *
 * @param fade Seconds to fade each targeted layer to silence before
 * stopping, instead of an instant cut. Omit (or `0`) for an immediate stop.
 *
 * @example
 * audioStopAmbience("ocean", 5); // fades out over 5s, then stops
 */
export function audioStopAmbience(keys?: MusicKey | MusicKey[], fade?: number): void {
  const fadeMs = (fade ?? 0) * 1000;

  for (const key of toKeyArray(keys, activeAmbience)) {
    const howl = musicCache.get(key);
    const id = musicSoundId.get(key);
    activeAmbience.delete(key);
    if (!howl) continue;

    if (fadeMs <= 0 || !howl.playing()) {
      howl.stop(id);
      continue;
    }

    const prevVolume = musicVolume.get(key) ?? (howl.volume() as number);
    howl.fade(prevVolume, 0, fadeMs, id);
    setTimeout(() => {
      howl.stop(id);
      if (id === undefined) howl.volume(prevVolume);
      else howl.volume(prevVolume, id);
    }, fadeMs);
  }
}

// Eagerly construct every registered Howl at module load, instead of lazily on
// first play. Howler starts fetching + decoding as soon as a Howl is created,
// so without this, the very first playSound()/playMusic() call for a given key
// has to wait on that network+decode work before anything is audible — this
// runs it well ahead of time, while there's plenty of gameplay before it's needed.
(Object.keys(SOUND_REGISTRY) as SoundKey[]).forEach(getSoundVariants);
(Object.keys(MUSIC_REGISTRY) as MusicKey[]).forEach((key) => getMusicHowl(key));
