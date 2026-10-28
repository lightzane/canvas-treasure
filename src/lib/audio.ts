import { Howl } from "howler";

// Files live in public/audio/ (not src/assets/) so they're addressable by plain
// path here — same convention as ../fanorona-lite's sound.composable.ts — rather
// than one import per file. Resolves correctly under any Vite `base` config too.
const base = import.meta.env.BASE_URL.replace(/\/$/, "/assets/audio/");

export type SoundKey = "tackle" | "ember" | "battle-start";
export type MusicKey = "map" | "battle";

interface SoundEntry {
  /** Filenames under public/audio/ — one is picked at random on each play. */
  src: string[];
  /** Fades the clip's volume to 0 across its full duration. Use for a recording with an audible artifact right at the end. */
  silenceEnd?: boolean;
}

// prettier-ignore
const SOUND_REGISTRY: Record<SoundKey, SoundEntry> = {
  tackle:           { src: [...Array(5)].map((_, i) => `crack-${i + 1}.mp3`), silenceEnd: true }, // crack-*.mp3 recordings have an audible artifact at the end
  ember:            { src: ["ember.wav"] },
  'battle-start':   { src: ["mixkit-drums-of-war-2784.wav"] }
};

const MUSIC_REGISTRY: Record<MusicKey, string> = {
  map: "map.wav",
  battle: "mixkit-ko-1068.mp3",
};

// Lazily built on first play, then reused for the rest of the session.
const soundCache = new Map<SoundKey, Howl[]>();
const musicCache = new Map<MusicKey, Howl>();
let activeMusic: Howl | null = null;

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

/**
 * Plays a random variant of the given sound effect.
 *
 * @example
 * playSound("tackle"); // picks one of crack-1..5.mp3 at random
 */
export function playSound(key: SoundKey): void {
  const variants = getSoundVariants(key);
  const howl = variants[Math.floor(Math.random() * variants.length)]!;
  howl.play();
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
 * Starts a background track, pausing whichever one is currently playing.
 * By default, calling it again for a track that was paused resumes it from
 * where it left off — pass `seek: 0` for a track that should always restart
 * (e.g. a battle theme beginning fresh for every new battle).
 *
 * @example
 * playMusic("map"); // resumes where it left off
 * playMusic("battle", { volume: 0.5, seek: 0 }); // always starts at the top
 */
export function playMusic(key: MusicKey, options?: PlayMusicOptions): void {
  const howl = getMusicHowl(key, options);

  if (howl === activeMusic && howl.playing() && options?.seek === undefined) return; // already the one playing

  activeMusic?.pause(); // keep its position in case we come back to it
  activeMusic = howl;
  const id = howl.play();
  if (options?.seek !== undefined) howl.seek(options.seek, id);
}

/** Pauses the currently-playing background track, preserving its position for the next `playMusic()` call. */
export function pauseMusic(): void {
  activeMusic?.pause();
}

/**
 * Fully stops the currently-playing background track and resets its position to 0.
 * The next `playMusic()` call for that track starts fresh instead of resuming —
 * use this for a track that should always begin from the start (e.g. a battle
 * theme restarting for every new battle), as opposed to `pauseMusic()`, which
 * preserves position for a later resume (e.g. the town theme while away in battle).
 */
export function stopMusic(): void {
  activeMusic?.stop();
  activeMusic = null;
}

// Eagerly construct every registered Howl at module load, instead of lazily on
// first play. Howler starts fetching + decoding as soon as a Howl is created,
// so without this, the very first playSound()/playMusic() call for a given key
// has to wait on that network+decode work before anything is audible — this
// runs it well ahead of time, while there's plenty of gameplay before it's needed.
(Object.keys(SOUND_REGISTRY) as SoundKey[]).forEach(getSoundVariants);
(Object.keys(MUSIC_REGISTRY) as MusicKey[]).forEach((key) => getMusicHowl(key));
