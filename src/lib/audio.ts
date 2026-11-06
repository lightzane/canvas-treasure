import { Howl } from "howler";

// Files live in public/audio/ (not src/assets/) so they're addressable by plain
// path here — same convention as ../fanorona-lite's sound.composable.ts — rather
// than one import per file. Resolves correctly under any Vite `base` config too.
const base = import.meta.env.BASE_URL.replace(/\/$/, "/assets/audio/");

export type SoundKey = "click";
export type MusicKey =
  | "home"
  | "overworld"
  | "mansion"
  | "market"
  | "amb_shopping_crowd"
  | "amb_water_flowing"
  | "amb_beach";

interface SoundEntry {
  /** Filenames under public/audio/ — one is picked at random on each play. */
  src: string[];
  /** Fades the clip's volume to 0 across its full duration. Use for a recording with an audible artifact right at the end. */
  silenceEnd?: boolean;
}

// prettier-ignore
const SOUND_REGISTRY: Record<SoundKey, SoundEntry> = {
  click:            { src: ["interface/mixkit-modern-technology-select-3124.wav"] },
  // tackle:           { src: [...Array(5)].map((_, i) => `crack-${i + 1}.mp3`), silenceEnd: true }, // crack-*.mp3 recordings have an audible artifact at the end
  // 'battle-start':   { src: ["mixkit-drums-of-war-2784.wav"] }
};

const MUSIC_REGISTRY: Record<MusicKey, string> = {
  home: "classical-verdanturf.mp3",
  overworld: "classical-littleroot-town.mp3",
  mansion: "我是真的真的很爱你.mp3",
  market: "sm.mp3",
  amb_shopping_crowd: "ambience/mixkit-shopping-center-crowd-377.wav",
  amb_water_flowing: "ambience/mixkit-water-flowing-ambience-loop-3126.wav",
  amb_beach: "ambience/mixkit-small-waves-harbor-rocks-1208.wav",
};

// Lazily built on first play, then reused for the rest of the session.
const soundCache = new Map<SoundKey, Howl[]>();
const musicCache = new Map<MusicKey, Howl>();

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

/** Fades a clip's volume to 0 across its full duration, masking an artifact at the very end of the recording. */
function fadeToSilence(howl: Howl, id: number): void {
  howl.fade(howl.volume(id) as number, 0, howl.duration(id) * 1000, id);
}

function getSoundVariants(key: SoundKey): Howl[] {
  let howls = soundCache.get(key);

  if (!howls) {
    const { src, silenceEnd } = SOUND_REGISTRY[key];

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
}

/**
 * Plays a random variant of the given sound effect.
 *
 * @example
 * audioPlaySound("tackle"); // picks one of crack-1..5.mp3 at random
 * audioPlaySound("click", { volume: 0.7 });
 */
export function audioPlaySound(key: SoundKey, options?: PlaySoundOptions): void {
  const variants = getSoundVariants(key);
  const howl = variants[Math.floor(Math.random() * variants.length)]!;
  const id = howl.play();
  if (options?.volume !== undefined) howl.volume(options.volume, id);
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

function getMusicHowl(key: MusicKey, options?: PlayMusicOptions): Howl {
  let howl = musicCache.get(key);

  if (!howl) {
    howl = new Howl({
      src: [`${base}${MUSIC_REGISTRY[key]}`],
      loop: options?.loop ?? true,
      volume: options?.volume ?? 1,
    });
    musicCache.set(key, howl);
  } else if (options?.volume !== undefined) {
    howl.volume(options.volume);
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
 * @example
 * audioPlayMusic("map"); // crossfades in, resuming where "map" left off
 * audioPlayMusic("battle", { volume: 0.5, seek: 0, fade: 0.3 }); // quick fade, always starts at the top
 */
export function audioPlayMusic(key: MusicKey, options?: PlayMusicOptions): void {
  const howl = getMusicHowl(key, options);

  if (key === activeMusic && howl.playing() && options?.seek === undefined) return; // already the one playing

  const fadeMs = (options?.fade ?? 1) * 1000;
  const prevKey = activeMusic;
  const prevHowl = prevKey ? musicCache.get(prevKey) : undefined;
  activeMusic = key;

  if (prevHowl?.playing()) {
    const prevVolume = prevHowl.volume() as number;
    prevHowl.fade(prevVolume, 0, fadeMs);
    // Pause (not stop) once the fade-out finishes, so the next playMusic()
    // for THIS track still resumes from where it left off — then restore
    // its volume, since .fade() leaves it at 0 and a bare .pause() doesn't
    // reset that on its own.
    prevHowl.once("fade", () => {
      prevHowl.pause();
      prevHowl.volume(prevVolume);
    });
  }

  // Read the target volume BEFORE touching anything, then silence only this
  // specific sound id (not the Howl's group-level default) before playing it
  // — muting the group default here would leave it stuck at 0 permanently,
  // since the fade below only ever restores the per-id volume, not the
  // group's. That stale 0 is what `howl.volume()` would read back next time
  // this same key plays again, fading from 0 to 0 — silently, forever.
  const targetVolume = options?.volume ?? (howl.volume() as number);
  const id = howl.play();
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

  const fadeMs = (fade ?? 0) * 1000;
  if (fadeMs <= 0 || !howl.playing()) {
    howl.pause();
    return;
  }

  const prevVolume = howl.volume() as number;
  howl.fade(prevVolume, 0, fadeMs);
  // Same dance as the crossfade-out in audioPlayMusic(): pause (not stop)
  // once the fade finishes so the next audioPlayMusic() call still resumes
  // from here, then restore the volume .fade() left at 0.
  howl.once("fade", () => {
    howl.pause();
    howl.volume(prevVolume);
  });
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
export function audioStopMusic(fade?: number): void {
  if (!activeMusic) return;
  const key = activeMusic;
  const howl = musicCache.get(key);
  activeMusic = null;
  if (!howl) return;

  const fadeMs = (fade ?? 0) * 1000;
  if (fadeMs <= 0 || !howl.playing()) {
    howl.stop();
    return;
  }

  const prevVolume = howl.volume() as number;
  howl.fade(prevVolume, 0, fadeMs);
  howl.once("fade", () => {
    howl.stop();
    howl.volume(prevVolume);
  });
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
 * @example
 * audioPlayAmbience("ocean");
 * audioPlayAmbience(["ocean", "wind"], { volume: 0.4, fade: 3 });
 */
export function audioPlayAmbience(keys: MusicKey | MusicKey[], options?: PlayMusicOptions): void {
  const fadeMs = (options?.fade ?? 0) * 1000;

  for (const key of Array.isArray(keys) ? keys : [keys]) {
    const howl = getMusicHowl(key, options);
    if (activeAmbience.has(key) && howl.playing() && options?.seek === undefined) continue;
    activeAmbience.add(key);

    // Same reasoning as audioPlayMusic(): read the target volume first
    // (getMusicHowl() above already applied options.volume to the group
    // default if given), then silence only this sound id before fading it
    // in — never the group default, or it'd be stuck at 0 next time.
    const targetVolume = options?.volume ?? (howl.volume() as number);
    const id = howl.play();
    if (options?.seek !== undefined) howl.seek(options.seek, id);
    if (fadeMs > 0) {
      howl.volume(0, id);
      howl.fade(0, targetVolume, fadeMs, id);
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
    activeAmbience.delete(key);
    if (!howl) continue;

    if (fadeMs <= 0 || !howl.playing()) {
      howl.pause();
      continue;
    }

    const prevVolume = howl.volume() as number;
    howl.fade(prevVolume, 0, fadeMs);
    howl.once("fade", () => {
      howl.pause();
      howl.volume(prevVolume);
    });
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
    activeAmbience.delete(key);
    if (!howl) continue;

    if (fadeMs <= 0 || !howl.playing()) {
      howl.stop();
      continue;
    }

    const prevVolume = howl.volume() as number;
    howl.fade(prevVolume, 0, fadeMs);
    howl.once("fade", () => {
      howl.stop();
      howl.volume(prevVolume);
    });
  }
}

// Eagerly construct every registered Howl at module load, instead of lazily on
// first play. Howler starts fetching + decoding as soon as a Howl is created,
// so without this, the very first playSound()/playMusic() call for a given key
// has to wait on that network+decode work before anything is audible — this
// runs it well ahead of time, while there's plenty of gameplay before it's needed.
(Object.keys(SOUND_REGISTRY) as SoundKey[]).forEach(getSoundVariants);
(Object.keys(MUSIC_REGISTRY) as MusicKey[]).forEach((key) => getMusicHowl(key));
