/* ═══════════════════════════════════════════════════════════════════
   INFINITY TUNNEL — the mirror between two panes of glass.
   A headlight-housing ring (continuous strip + discrete LEDs) repeats
   into the dark exactly the way a first-surface stack folds a strip:
   tight nesting, a slight downward drift per bounce (mirror tilt),
   parallax steering the corridor toward your eye. Owns the boot dive.
   ═══════════════════════════════════════════════════════════════════ */

import { fitCanvas, glowSprite, hueRGB, LED, prefersReducedMotion, type RGB } from './canvas';

export type TunnelMode = 'drl' | 'seq' | 'demon' | 'rgb' | 'ghost' | 'tail';

const MODE_BASE: Record<TunnelMode, RGB> = {
  drl: LED.drl,
  seq: LED.amber,
  demon: LED.demon,
  rgb: LED.cyan,       // per-LED color overridden in rgb mode
  ghost: LED.drl,
  tail: LED.tail,
};

const N_LED = 52;           // dots per ring
const DEPTHS = 15;          // receding reflections
const DECAY = 0.9;          // scale per bounce — tight, corridor-like
const DRIFT_Y = 3.2;        // px the mirror tilt sinks each bounce
const SEQ_CPM = 84;         // sequential flash rate (flashes/min, relay spec)

export class Tunnel {
  private cv: HTMLCanvasElement;
  private mode: TunnelMode = 'drl';
  private pts: { x: number; y: number }[] = [];
  private t0 = performance.now();
  /** camera depth 0..n — animated during boot fly-through */
  private camZ = 0;
  private bootStart = -1;
  private bootDur = 1900;
  private onBootDone: (() => void) | null = null;
  private px = 0; private py = 0;        // pointer parallax [-1..1]
  private tx = 0; private ty = 0;
  powered = false;
  brake = 0;                              // 0..1 flare (tail mode)

  constructor(cv: HTMLCanvasElement) {
    this.cv = cv;
    // superellipse ring — squashed wide like a lamp housing; start angle at
    // the inboard (left) middle so sequential sweeps read outboard
    for (let i = 0; i < N_LED; i++) {
      const a = Math.PI + (i / N_LED) * Math.PI * 2;
      const c = Math.cos(a), s = Math.sin(a);
      const e = 3.0; // squareness
      this.pts.push({
        x: Math.sign(c) * Math.pow(Math.abs(c), 2 / e),
        y: Math.sign(s) * Math.pow(Math.abs(s), 2 / e),
      });
    }
    addEventListener('pointermove', (ev) => {
      const r = cv.getBoundingClientRect();
      if (!r.width || !r.height) return;
      this.tx = ((ev.clientX - r.left) / r.width - 0.5) * 2;
      this.ty = ((ev.clientY - r.top) / r.height - 0.5) * 2;
    }, { passive: true });
  }

  setMode(m: TunnelMode): void { this.mode = m; }
  getMode(): TunnelMode { return this.mode; }

  /** Fly INTO the mirror — fires the callback when the dive settles. */
  boot(done?: () => void): void {
    if (prefersReducedMotion()) { this.camZ = 0; done?.(); return; }
    this.bootStart = performance.now();
    this.onBootDone = done ?? null;
  }

  frame(now: number): void {
    const ctx = fitCanvas(this.cv);
    if (!ctx) return;
    const w = this.cv.clientWidth, h = this.cv.clientHeight;
    ctx.clearRect(0, 0, w, h);

    // glass black backdrop
    ctx.fillStyle = '#02040a';
    ctx.fillRect(0, 0, w, h);

    if (!this.powered) {
      // dead lens — the first ring barely catching room light
      this.strokeRing(ctx, this.ringGeom(w, h, 1, 0), { r: 70, g: 90, b: 110 }, 0.06, 0);
      return;
    }

    // boot dive: camera accelerates through the reflections then re-forms
    if (this.bootStart >= 0) {
      const k = Math.min(1, (now - this.bootStart) / this.bootDur);
      this.camZ = (k < 0.72 ? Math.pow(k / 0.72, 2) : 1) * 6.0 * (1 - Math.pow(k, 9));
      if (k >= 1) { this.bootStart = -1; this.camZ = 0; this.onBootDone?.(); this.onBootDone = null; }
    }

    // pointer parallax follows softly
    this.px += (this.tx - this.px) * 0.06;
    this.py += (this.ty - this.py) * 0.06;

    const reduce = prefersReducedMotion();
    const t = (now - this.t0) / 1000;
    const breathe = reduce ? 1 : 0.93 + 0.07 * Math.sin(t * 1.4);

    // sequential sweep position inside each flash
    const flashT = (t * (SEQ_CPM / 60)) % 1;
    const sweepOn = flashT < 0.62;
    const sweepPos = Math.min(1, flashT / 0.44);

    // vanish-point bloom at the deep end
    const vx = w / 2 + this.px * w * 0.06, vy = h / 2 + this.py * h * 0.05 + DEPTHS * DRIFT_Y * 0.5;
    const base = this.mode === 'rgb' ? hueRGB((t * 0.07) % 1) : MODE_BASE[this.mode];
    ctx.globalCompositeOperation = 'lighter';
    const bloom = glowSprite(base.r, base.g, base.b);
    ctx.globalAlpha = 0.10 * breathe * (this.mode === 'ghost' ? 0.5 : 1);
    ctx.drawImage(bloom, vx - 130, vy - 90, 260, 180);

    for (let d = DEPTHS - 1; d >= 0; d--) {
      const z = d - this.camZ;
      if (z < -0.9) continue;                     // ring passed behind the camera
      const scale = Math.pow(DECAY, z);
      if (scale > 2.6) continue;
      let alpha = Math.pow(0.8, Math.max(0, z)) * breathe;
      if (z < 0) alpha *= Math.max(0, 1 + z);     // fade rings racing past
      this.drawRing(ctx, w, h, scale, z, d, alpha, t, sweepOn, sweepPos, reduce);
    }
    ctx.globalCompositeOperation = 'source-over';

    // brake flare wash (tail mode)
    if (this.mode === 'tail' && this.brake > 0.01) {
      ctx.globalAlpha = this.brake * 0.4;
      ctx.fillStyle = 'rgba(255,32,56,.6)';
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
  }

  private ringGeom(w: number, h: number, scale: number, z: number):
    { cx: number; cy: number; rx: number; ry: number } {
    // the corridor sinks and steers with depth — the mirror-tilt drift
    const depthFrac = 1 - scale;
    return {
      cx: w / 2 + this.px * w * 0.06 * depthFrac * 2,
      cy: h / 2 + this.py * h * 0.05 * depthFrac * 2 + Math.max(0, z) * DRIFT_Y,
      rx: w * 0.435 * scale,
      ry: h * 0.385 * scale,
    };
  }

  private ringPath(g: { cx: number; cy: number; rx: number; ry: number }): Path2D {
    const p = new Path2D();
    this.pts.forEach((pt, i) => {
      const x = g.cx + pt.x * g.rx, y = g.cy + pt.y * g.ry;
      if (i === 0) p.moveTo(x, y); else p.lineTo(x, y);
    });
    p.closePath();
    return p;
  }

  /** continuous strip glow — two-pass stroke */
  private strokeRing(
    ctx: CanvasRenderingContext2D, g: { cx: number; cy: number; rx: number; ry: number },
    c: RGB, alpha: number, _z: number,
  ): void {
    const path = this.ringPath(g);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, alpha * 0.32);
    ctx.strokeStyle = `rgb(${c.r},${c.g},${c.b})`;
    ctx.lineWidth = 6;
    ctx.stroke(path);
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.lineWidth = 1.6;
    ctx.stroke(path);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  private ledColor(d: number, i: number, t: number, reduce: boolean): RGB {
    switch (this.mode) {
      case 'rgb': {
        const hh = ((reduce ? 0 : t * 0.07) + d * 0.08 + (i / N_LED) * 0.1) % 1;
        return hueRGB(hh);
      }
      case 'ghost': return LED.drl;
      default: return MODE_BASE[this.mode];
    }
  }

  private drawRing(
    ctx: CanvasRenderingContext2D, w: number, h: number, scale: number, z: number, d: number,
    alpha: number, t: number, sweepOn: boolean, sweepPos: number, reduce: boolean,
  ): void {
    const g = this.ringGeom(w, h, scale, z);
    const ghostPulse = this.mode === 'ghost'
      ? (reduce ? 0.5 : 0.3 + 0.7 * Math.pow(Math.sin(t * 1.1 + d * 0.7) * 0.5 + 0.5, 2))
      : 1;
    let ringAlpha = alpha * ghostPulse;
    if (this.mode === 'tail') ringAlpha *= 0.55 + this.brake * 0.45;

    // the strip itself
    if (this.mode !== 'seq' || (sweepOn && sweepPos > 0.97)) {
      // seq: strip only glows once the chase completes the loop
      this.strokeRing(ctx, g, this.ledColor(d, 0, t, reduce), ringAlpha * (this.mode === 'seq' ? 0.6 : 0.55), z);
    }

    // discrete LEDs riding the strip
    ctx.globalCompositeOperation = 'lighter';
    const dotR = Math.max(1.4, 4.6 * scale);
    for (let i = 0; i < N_LED; i++) {
      const pt = this.pts[i];
      let a = ringAlpha;
      if (this.mode === 'seq') {
        const frac = i / N_LED;
        a *= sweepOn && frac <= sweepPos ? 1 : 0.05;
      }
      if (a <= 0.012) continue;
      const c = this.ledColor(d, i, t, reduce);
      const spr = glowSprite(c.r, c.g, c.b);
      const s = dotR * 5;
      ctx.globalAlpha = Math.min(1, a);
      ctx.drawImage(spr, g.cx + pt.x * g.rx - s / 2, g.cy + pt.y * g.ry - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}
