import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/constants/game-settings";
import { GAME_STATE } from "@/features/game-state";
import gsap from "gsap";

const MAX_LINES_PER_PAGE = 2;
const REVEAL_CHARS_PER_SECOND = 30;
const REVEAL_SPEED_MULTIPLIER = 5; // while Z or X is held
const BOX_PADDING = 16; // gap between canvas's bottom edge and the box
const BOX_WIDTH = 700; // dialogue box width, in px — tweak this directly to resize
const BOX_HEIGHT = 112;
const BOX_BORDER_WIDTH = 4;
const BOX_RADIUS = 12;
const TEXT_PADDING = 16; // gap between box edge and text, on both left and right
const TEXT_TOP_PADDING = 44; // gap from the box's top edge to the first line's baseline
const BOX_LEFT = (CANVAS_WIDTH - BOX_WIDTH) / 2; // centered horizontally
const BOX_TOP = CANVAS_HEIGHT - BOX_HEIGHT - BOX_PADDING;
const TEXT_LEFT = BOX_LEFT + TEXT_PADDING;
const TEXT_MAX_WIDTH = BOX_WIDTH - TEXT_PADDING * 2;
const LINE_HEIGHT = 36;
const FONT = '300 28px "Oxanium", system-ui';
const READ_MORE_SIZE = 14;
const READ_MORE_GAP = 8; // space between the last word and the indicator
const READ_MORE_BLINK_INTERVAL = 0.5; // seconds

/** Resolves once the dialogue's pixel font is loaded — awaited by `GameEngine.start()` before the game loop begins. */
export const dialogueFontReady = document.fonts.load(FONT);

type DialogueInput = string | string[] | { text: string | string[]; color?: string };
interface DialogueMessage {
  kind: "message";
  text: string;
  color: string;
}
interface DialogueEffect {
  kind: "effect";
  run: () => void;
  /** Seconds to pause (not gated on player input) after `run()` before continuing to the next queued item. */
  delay: number;
}
type PendingItem = DialogueMessage | DialogueEffect;

class Dialogue {
  private pending: PendingItem[] = [];
  private pages: string[][] = [];
  private pageIndex = 0;
  private needsWrap = false;
  private color = "black";
  /** The most recently used color — what a `queue()`/`show()` call falls back to when it doesn't specify its own. */
  private lastColor = "black";
  /** True from the moment an effect starts running until its delay (if any) finishes and the next item is settled — blocks player input from advancing early. */
  private resolvingEffects = false;
  private revealedChars = 0;
  private wasHeld = false;
  private blinkElapsed = 0;
  /** Overwrite this to be notified once the whole conversation finishes (e.g. `DIALOGUE.onComplete = () => {...}`). Reset to a no-op by every `show()`. */
  onComplete: () => void = () => {};

  get isActive() {
    return this.pages.length > 0 || this.pending.length > 0 || this.resolvingEffects;
  }

  /** Starts a brand-new conversation, discarding whatever was showing before. Locks `GAME_STATE.movementLocked` automatically — released automatically once the whole conversation finishes, see `pullPending`. */
  show(input: DialogueInput) {
    this.pending = [];
    this.pages = [];
    this.needsWrap = false;
    this.onComplete = () => {};
    this.lastColor = "black"; // a new conversation always starts from the default, not whatever the last one ended on
    GAME_STATE.movementLocked = true;
    this.enqueue(input);
  }

  /** Appends one more speaker/message segment onto the current conversation. */
  queue(input: DialogueInput) {
    this.enqueue(input);
  }

  /**
   * Queues a side effect (e.g. `playAttentionBounce`) to run between
   * messages — not gated on player input. `delay` (seconds) pauses, with the
   * dialogue box still showing the previous page, before the next queued
   * item appears.
   *
   * @example
   * DIALOGUE.show("Something catches her eye.");
   * DIALOGUE.effect(() => playAttentionBounce(npc), 0.5);
   * DIALOGUE.queue("...oh!");
   */
  effect(run: () => void, delay = 0) {
    const wasIdle = !this.isActive;
    if (wasIdle) this.onComplete = () => {}; // starting a fresh sequence from idle (no preceding show()) — otherwise a stale onComplete left over from the last conversation can fire again once this resolves
    this.pending.push({ kind: "effect", run, delay });
    if (wasIdle) this.pullPending(); // nothing else in progress — this can run right away
  }

  private enqueue(input: DialogueInput) {
    const wasIdle = !this.isActive;
    if (wasIdle) this.onComplete = () => {}; // same reasoning as effect() above
    const isPlain = typeof input === "string" || Array.isArray(input);
    const text = isPlain ? input : input.text;
    const color = isPlain ? this.lastColor : (input.color ?? this.lastColor);
    this.lastColor = color; // so a later queue() without its own color inherits this one, not the default
    const texts = Array.isArray(text) ? text : [text];

    for (const t of texts) this.pending.push({ kind: "message", text: t, color });

    if (wasIdle) this.pullPending(); // nothing on screen yet — start showing this
  }

  advance() {
    this.pageIndex++;
    this.revealedChars = 0;
    if (this.pageIndex < this.pages.length) return;

    this.pullPending();
  }

  /**
   * Walks `pending`: runs any effects immediately (honoring their `delay`)
   * until a real message is next, then flags it for `draw()` to wrap and
   * show. Clears `pages`/fires `onComplete()` only once nothing is left —
   * so the box keeps showing the previous page, frozen, while an effect's
   * delay plays out, instead of flashing empty.
   */
  private pullPending() {
    const next = this.pending[0];

    if (!next) {
      this.resolvingEffects = false;
      this.pages = [];
      GAME_STATE.movementLocked = false; // ahead of onComplete, so it can re-lock for its own purposes if it needs to
      this.onComplete();
      return;
    }

    if (next.kind === "effect") {
      this.resolvingEffects = true;
      this.pending.shift();
      next.run();
      if (next.delay > 0) gsap.delayedCall(next.delay, () => this.pullPending());
      else this.pullPending();
      return;
    }

    this.resolvingEffects = false;
    this.needsWrap = true;
  }

  update(dt: number) {
    if (!this.isActive || this.pages.length === 0 || this.resolvingEffects) return;

    this.blinkElapsed += dt;

    const held = GAME_STATE.keys.actions.z || GAME_STATE.keys.actions.x;
    const justPressed = held && !this.wasHeld;
    this.wasHeld = held;

    const page = this.pages[this.pageIndex] ?? [];
    const totalChars = page.join("").length;
    const speed = REVEAL_CHARS_PER_SECOND * (held ? REVEAL_SPEED_MULTIPLIER : 1);
    this.revealedChars = Math.min(totalChars, this.revealedChars + speed * dt);

    if (justPressed && this.revealedChars >= totalChars) this.advance();
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.isActive) return;

    if (this.needsWrap) {
      const message = this.pending.shift();
      if (message?.kind === "message") {
        this.pages = this.wrap(ctx, message.text);
        this.color = message.color;
        this.pageIndex = 0;
        this.needsWrap = false;
        this.revealedChars = 0;
      }
    }

    if (this.pages.length === 0) return; // mid-effect-delay, nothing wrapped yet — stay blank rather than draw an empty box

    this.drawBox(ctx);
    this.drawPage(ctx);
    this.drawReadMore(ctx);
  }

  private wrap(ctx: CanvasRenderingContext2D, text: string): string[][] {
    ctx.font = FONT;

    const words = text.trim().replace(/\s+/g, " ").split(" ");
    const lines: string[] = [];
    let line = "";

    for (const word of words) {
      const attempt = line ? `${line} ${word}` : word;
      if (ctx.measureText(attempt).width > TEXT_MAX_WIDTH && line) {
        lines.push(line);
        line = word;
      } else {
        line = attempt;
      }
    }
    if (line) lines.push(line);

    const pages: string[][] = [];
    for (let i = 0; i < lines.length; i += MAX_LINES_PER_PAGE) {
      pages.push(lines.slice(i, i + MAX_LINES_PER_PAGE));
    }
    return pages.length > 0 ? pages : [[""]];
  }

  private drawBox(ctx: CanvasRenderingContext2D) {
    // sharp-cornered version — kept for future dialogue types (hint/conversation/narration)
    // ctx.fillStyle = "white";
    // ctx.fillRect(BOX_LEFT, BOX_TOP, BOX_WIDTH, BOX_HEIGHT);
    // ctx.lineWidth = BOX_BORDER_WIDTH;
    // ctx.strokeStyle = "black";
    // ctx.strokeRect(BOX_LEFT, BOX_TOP, BOX_WIDTH, BOX_HEIGHT);

    ctx.beginPath();
    ctx.roundRect(BOX_LEFT, BOX_TOP, BOX_WIDTH, BOX_HEIGHT, BOX_RADIUS);
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.lineWidth = BOX_BORDER_WIDTH;
    ctx.strokeStyle = "black";
    ctx.stroke();
  }

  private drawPage(ctx: CanvasRenderingContext2D) {
    ctx.font = FONT;
    ctx.fillStyle = this.color;
    const y = BOX_TOP + TEXT_TOP_PADDING;
    const page = this.pages[this.pageIndex] ?? [];

    let remaining = Math.floor(this.revealedChars);
    page.forEach((line, i) => {
      const visible = line.slice(0, Math.max(0, remaining));
      remaining -= line.length;
      ctx.fillText(visible, TEXT_LEFT, y + i * LINE_HEIGHT);
    });
  }

  private drawReadMore(ctx: CanvasRenderingContext2D) {
    const page = this.pages[this.pageIndex] ?? [];
    const totalChars = page.join("").length;
    const fullyRevealed = this.revealedChars >= totalChars;
    const hasMore = this.pageIndex < this.pages.length - 1 || this.pending.length > 0;
    if (!fullyRevealed || !hasMore) return;

    const blinkOn = Math.floor(this.blinkElapsed / READ_MORE_BLINK_INTERVAL) % 2 === 0;
    if (!blinkOn) return;

    const lastLineIndex = page.length - 1;
    const lastLine = page[lastLineIndex] ?? "";
    ctx.font = FONT;
    const lastLineWidth = ctx.measureText(lastLine).width;

    const textY = BOX_TOP + TEXT_TOP_PADDING + lastLineIndex * LINE_HEIGHT;
    const x = TEXT_LEFT + lastLineWidth + READ_MORE_GAP;
    const y = textY - READ_MORE_SIZE + 4;

    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + READ_MORE_SIZE, y);
    ctx.lineTo(x + READ_MORE_SIZE / 2, y + READ_MORE_SIZE);
    ctx.closePath();
    ctx.fill();
  }
}

export const DIALOGUE = new Dialogue();
