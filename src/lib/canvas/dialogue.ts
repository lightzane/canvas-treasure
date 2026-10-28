import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/constants/game-settings";
import { GAME_STATE } from "@/features/game-state";

const MAX_LINES_PER_PAGE = 2;
const REVEAL_CHARS_PER_SECOND = 30;
const REVEAL_SPEED_MULTIPLIER = 5; // while Z or X is held
const BOX_PADDING = 16; // gap between canvas edge and box edge
const BOX_HEIGHT = 112;
const BOX_BORDER_WIDTH = 4;
const BOX_RADIUS = 12;
const TEXT_PADDING = 16; // gap between box edge and text, on both left and right
const TEXT_TOP_PADDING = 44; // gap from the box's top edge to the first line's baseline
const BOX_TOP = CANVAS_HEIGHT - BOX_HEIGHT - BOX_PADDING;
const TEXT_LEFT = BOX_PADDING + TEXT_PADDING;
const TEXT_MAX_WIDTH = CANVAS_WIDTH - TEXT_LEFT * 2; // mirrored: same inset on the right
const LINE_HEIGHT = 36;
const FONT = '300 28px "Oxanium", system-ui';
const READ_MORE_SIZE = 14;
const READ_MORE_GAP = 8; // space between the last word and the indicator
const READ_MORE_BLINK_INTERVAL = 0.5; // seconds

/** Resolves once the dialogue's pixel font is loaded — awaited by `GameEngine.start()` before the game loop begins. */
export const dialogueFontReady = document.fonts.load(FONT);

type DialogueInput = string | string[] | { text: string | string[]; color?: string };
interface DialogueMessage {
  text: string;
  color: string;
}

class Dialogue {
  private pending: DialogueMessage[] = [];
  private pages: string[][] = [];
  private pageIndex = 0;
  private needsWrap = false;
  private color = "black";
  private revealedChars = 0;
  private wasHeld = false;
  private blinkElapsed = 0;
  /** Overwrite this to be notified once the whole conversation finishes (e.g. `DIALOGUE.onComplete = () => {...}`). Reset to a no-op by every `show()`. */
  onComplete: () => void = () => {};

  get isActive() {
    return this.pages.length > 0 || this.pending.length > 0;
  }

  /** Starts a brand-new conversation, discarding whatever was showing before. */
  show(input: DialogueInput) {
    this.pending = [];
    this.pages = [];
    this.needsWrap = false;
    this.onComplete = () => {};
    this.enqueue(input);
  }

  /** Appends one more speaker/message segment onto the current conversation. */
  queue(input: DialogueInput) {
    this.enqueue(input);
  }

  private enqueue(input: DialogueInput) {
    const isPlain = typeof input === "string" || Array.isArray(input);
    const text = isPlain ? input : input.text;
    const color = isPlain ? "black" : (input.color ?? "black");
    const texts = Array.isArray(text) ? text : [text];

    for (const t of texts) this.pending.push({ text: t, color });

    if (this.pages.length === 0) this.needsWrap = true; // nothing on screen yet — start showing this
  }

  advance() {
    this.pageIndex++;
    this.revealedChars = 0;
    if (this.pageIndex < this.pages.length) return;

    if (this.pending.length > 0) this.needsWrap = true;
    else {
      this.pages = [];
      this.onComplete();
    }
  }

  update(dt: number) {
    if (!this.isActive || this.pages.length === 0) return;

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
      const message = this.pending.shift()!;
      this.pages = this.wrap(ctx, message.text);
      this.color = message.color;
      this.pageIndex = 0;
      this.needsWrap = false;
      this.revealedChars = 0;
    }

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
    const width = CANVAS_WIDTH - BOX_PADDING * 2;

    // sharp-cornered version — kept for future dialogue types (hint/conversation/narration)
    // ctx.fillStyle = "white";
    // ctx.fillRect(BOX_PADDING, BOX_TOP, width, BOX_HEIGHT);
    // ctx.lineWidth = BOX_BORDER_WIDTH;
    // ctx.strokeStyle = "black";
    // ctx.strokeRect(BOX_PADDING, BOX_TOP, width, BOX_HEIGHT);

    ctx.beginPath();
    ctx.roundRect(BOX_PADDING, BOX_TOP, width, BOX_HEIGHT, BOX_RADIUS);
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
