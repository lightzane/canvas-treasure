import gsap from "gsap";

export interface Cue {
  /** Seconds after `start()` at which `run` fires. */
  at: number;
  run: () => void;
}

/**
 * A timed-event schedule — the scalable alternative to one boolean flag per
 * timed trigger. Declare every cue for a scene/cutscene once; call `start()`
 * whenever the timeline should begin (e.g. on scene entry). No per-frame
 * polling — each cue is a real GSAP timer, so `update()` never needs to touch
 * this again after calling `start()`.
 *
 * @example
 * const cues = new Cues([
 *   { at: 0, run: () => DIALOGUE.show("A wild Pokémon appeared!") },
 *   { at: 1, run: () => playMusic("battle") },
 *   { at: 3, run: () => showCutsceneImage() },
 * ]);
 *
 * // in the scene:
 * update(_dt) {
 *   if (GAME_STATE.sceneElapsed === 0) cues.start();
 * }
 */
export class Cues {
  private cues: Cue[];
  private timers: gsap.core.Tween[] = [];

  constructor(cues: Cue[]) {
    this.cues = cues;
  }

  /** Cancels any of this schedule's still-pending cues from a previous run, then schedules fresh ones — safe to call every scene entry. */
  start(): void {
    this.cancel();
    this.timers = this.cues.map((cue) => gsap.delayedCall(cue.at, cue.run));
  }

  /** Cancels every cue from the current run that hasn't fired yet. */
  cancel(): void {
    this.timers.forEach((timer) => timer.kill());
    this.timers = [];
  }
}
