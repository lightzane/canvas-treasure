import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/constants/game-settings";

export type FadePhase = "idle" | "show" | "hide";

export class FadeTransition {
  private showDuration = 0;
  private hideDuration = 0;
  private elapsed = 0;
  phase: FadePhase = "idle";

  start(showDuration: number, hideDuration: number) {
    this.showDuration = showDuration;
    this.hideDuration = hideDuration;
    this.phase = "show";
    this.elapsed = 0;
  }

  update(dt: number) {
    if (this.phase === "idle") return;

    const duration = this.phase === "show" ? this.showDuration : this.hideDuration;
    this.elapsed += dt;
    if (this.elapsed < duration) return;

    this.elapsed = 0;
    this.phase = this.phase === "show" ? "hide" : "idle"; // fixed order: show → hide → idle
  }

  get alpha() {
    if (this.phase === "idle") return 0;
    const duration = this.phase === "show" ? this.showDuration : this.hideDuration;
    if (duration <= 0) return this.phase === "show" ? 1 : 0;
    const progress = Math.min(this.elapsed / duration, 1);
    return this.phase === "show" ? progress : 1 - progress;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.alpha <= 0) return;
    ctx.fillStyle = `rgba(0, 0, 0, ${this.alpha})`;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
}

export const FADE = new FadeTransition();
