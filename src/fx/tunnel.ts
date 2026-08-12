/* ═══════════════════════════════════════════════════════════════════
   INFINITY TUNNEL — AAA mirror physics (SHT 04, as-built).

   M-1  perspective convergence   s(z) = F / (F + z·G)  — harmonic
        spacing, rings bunch toward a horizon they never reach
   M-2  per-bounce transmission   3-stop phosphor ramps — color dies
        into the depth instead of fading
   M-3  cumulative mirror error   rotation per bounce + precessing
        drift + anamorphic (depth²) parallax
   M-4  bounce-lag propagation    every animated quantity samples
        t − i·Δ; mode changes rise from the deepest ring outward
   M-5  emitter model             cross-flare atlas + PWM shimmer
   M-6  front-glass optics        ghost double-image + fresnel edges
        + pointer-tracked specular streak
   M-7  full-frame bloom          ¼-res post pass + halation color
        exported for the housing bezel
   M-8  HID strike boot           arc flash ×3 → color-temp walk →
        exposure settle → dive → landing micro-shake
   M-9  glass interaction         knock ripple on click
   ═══════════════════════════════════════════════════════════════════ */

import {
  Bloom, fitCanvas, hueRGB, ledSprite, ledSpriteHue, mix,
  prefersReducedMotion, rampAt, RAMPS, type RGB,
} from './canvas';

export type TunnelMode = 'drl' | 'seq' | 'demon' | 'rgb' | 'ghost' | 'tail';

const N_LED = 52;
const DEPTHS = 16;
const F = 420, G = 64;          // M-1 focal + bounce gap (px-space)
const ROT_STEP = 0.0055;        // M-3 rad per bounce (≈0.32°)
const DRIFT = 3.1;              // M-3 px per bounce
const PRECESS_S = 40;           // M-3 drift-direction period, seconds
const LAG = 0.045;              // M-4 seconds per bounce
const WAVE_MS = 700;            // M-4 mode wavefront travel time
const SEQ_CPM = 84;

const STRIKE = {                 // M-8 timeline (ms from ignition)
  flashes: [[0, 60], [140, 200], [260, 320]] as const,
  settleStart: 320, settleEnd: 1700, diveStart: 320, diveMs: 1750,
};

interface Ripple { x: number; y: number; t0: number }

export class Tunnel {
  private cv: HTMLCanvasElement;
  private bloom = new Bloom();
  private mode: TunnelMode = 'drl';
  private prevMode: TunnelMode = 'drl';
  private waveT0 = -1e9;                 // M-4 mode wavefront birth
  private pts: { x: number; y: number }[] = [];
  private t0 = performance.now();
  private camZ = 0;
  private strikeT0 = -1e9;               // M-8
  private diveDone = false;
  private shakeT0 = -1e9;
  private onBootDone: (() => void) | null = null;
  private px = 0; private py = 0;
  private tx = 0; private ty = 0;
  private ripple: Ripple | null = null;  // M-9
  private halation: RGB = { r: 0, g: 0, b: 0 };
  powered = false;
  brake = 0;

  constructor(cv: HTMLCanvasElement) {
    this.cv = cv;
    // superellipse housing ring; index 0 at inboard middle so sequential
    // sweeps read outboard
    for (let i = 0; i < N_LED; i++) {
      const a = Math.PI + (i / N_LED) * Math.PI * 2;
      const c = Math.cos(a), s = Math.sin(a);
      const e = 3.0;
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
    // M-9 — knock on the glass
    cv.addEventListener('pointerdown', (ev) => {
      const r = cv.getBoundingClientRect();
      this.ripple = { x: ev.clientX - r.left, y: ev.clientY - r.top, t0: performance.now() };
    });
  }

  /** external parallax drive (gyro on phones) — same axes as pointer */
  setParallax(x: number, y: number): void {
    this.tx = x; this.ty = y;
  }

  setMode(m: TunnelMode): void {
    if (m === this.mode) return;
    this.prevMode = this.mode;
    this.mode = m;
    this.waveT0 = performance.now();     // M-4 — new color rises from the hole
  }
  getMode(): TunnelMode { return this.mode; }

  /** exported for M-7 halation — the housing picks up the lamp's spill */
  halationCSS(): string {
    const h = this.halation;
    return `rgba(${h.r},${h.g},${h.b},.34)`;
  }

  /** M-8 — ignition: strike, settle, dive, land. */
  boot(done?: () => void): void {
    this.onBootDone = done ?? null;
    this.diveDone = false;
    if (prefersReducedMotion()) {
      this.strikeT0 = -1e9; this.camZ = 0; this.diveDone = true;
      this.onBootDone?.(); this.onBootDone = null;
      return;
    }
    this.strikeT0 = performance.now();
  }

  /* ── per-mode ring color at bounce depth ── */
  private ringRGB(mode: TunnelMode, d: number, i: number, t: number, reduce: boolean): RGB {
    if (mode === 'rgb') {
      return hueRGB(((reduce ? 0 : t * 0.07) + d * 0.06 + (i / N_LED) * 0.1) % 1);
    }
    const ramp = RAMPS[mode] ?? RAMPS.tail;
    return rampAt(ramp, d);
  }

  private ringSprite(mode: TunnelMode, d: number, i: number, t: number, reduce: boolean): HTMLCanvasElement {
    if (mode === 'rgb') {
      return ledSpriteHue(((reduce ? 0 : t * 0.07) + d * 0.06 + (i / N_LED) * 0.1) % 1);
    }
    return ledSprite(rampAt(RAMPS[mode] ?? RAMPS.tail, d));
  }

  frame(now: number): void {
    const ctx = fitCanvas(this.cv);
    if (!ctx) return;
    const w = this.cv.clientWidth, h = this.cv.clientHeight;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#02040a';
    ctx.fillRect(0, 0, w, h);

    const reduce = prefersReducedMotion();
    const t = (now - this.t0) / 1000;

    if (!this.powered) {
      this.halation = { r: 0, g: 0, b: 0 };
      this.deadLens(ctx, w, h);
      return;
    }

    /* M-8 — strike state */
    const sT = now - this.strikeT0;
    let exposure = 1;
    let strikeTint = 0;
    if (sT >= 0 && sT < STRIKE.settleEnd) {
      const k = Math.max(0, (sT - STRIKE.settleStart) / (STRIKE.settleEnd - STRIKE.settleStart));
      exposure = 1.55 - 0.55 * k;        // overexposed → adapted
      strikeTint = 0.3 * (1 - k);        // blue-violet arc → mode color
    }
    // dive
    if (!this.diveDone && this.strikeT0 > -1e8) {
      const dT = sT - STRIKE.diveStart;
      if (dT >= 0) {
        const k = Math.min(1, dT / STRIKE.diveMs);
        this.camZ = (k < 0.72 ? Math.pow(k / 0.72, 2) : 1) * 6.0 * (1 - Math.pow(k, 9));
        if (k >= 1) {
          this.diveDone = true; this.camZ = 0;
          this.shakeT0 = now;            // landing micro-shake
          this.onBootDone?.(); this.onBootDone = null;
        }
      }
    }

    // parallax follows softly
    this.px += (this.tx - this.px) * 0.06;
    this.py += (this.ty - this.py) * 0.06;

    const breathe = reduce ? 1 : 0.94 + 0.06 * Math.sin(t * 1.3);

    // M-3 — precessing drift direction (fixed when reduced)
    const pa = reduce ? 0.6 : (t * Math.PI * 2) / PRECESS_S;
    const driftX = Math.cos(pa) * DRIFT * 0.4, driftY = 2.2 + Math.sin(pa) * 0.9;

    // landing shake
    let shX = 0, shY = 0;
    const shT = now - this.shakeT0;
    if (shT >= 0 && shT < 260 && !reduce) {
      const decay = 1 - shT / 260;
      shX = Math.sin(shT * 0.09) * 2.4 * decay;
      shY = Math.cos(shT * 0.13) * 1.6 * decay;
    }

    // M-4 — mode wavefront position 0..1 (deepest ring first)
    const wave = reduce ? 1 : Math.min(1, (now - this.waveT0) / WAVE_MS);

    // halation follows the front ring's current color
    const frontMode = wave >= 1 ? this.mode : this.prevMode;
    this.halation = mix(this.ringRGB(frontMode, 0, 0, t, reduce), this.ringRGB(this.mode, 0, 0, t, reduce), wave);

    ctx.globalCompositeOperation = 'lighter';

    // vanish bloom at the deep end — where the rings pile up
    const deepScale = F / (F + (DEPTHS - 1) * G);
    const vg = this.geom(w, h, deepScale, DEPTHS - 1, driftX, driftY);
    const vanSpr = this.ringSprite(this.mode, DEPTHS - 1, 0, t, reduce);
    ctx.globalAlpha = 0.5 * breathe * exposure * (this.mode === 'ghost' ? 0.5 : 1);
    ctx.drawImage(vanSpr, vg.cx - 120 + shX, vg.cy - 84 + shY, 240, 168);

    for (let d = DEPTHS - 1; d >= 0; d--) {
      const z = d - this.camZ;
      if (z < -0.9) continue;
      const scale = F / (F + Math.max(-5.5, z) * G);          // M-1
      if (scale > 2.8 || scale <= 0) continue;
      let alpha = Math.pow(0.88, Math.max(0, z)) * breathe * exposure;
      if (z < 0) alpha *= Math.max(0, 1 + z);
      this.drawRing(ctx, w, h, scale, z, d, alpha, t, now, reduce, driftX, driftY, shX, shY, wave);
    }

    // M-6 — ghost double-image of the front ring (second-surface reflection)
    if (this.camZ < 0.5) {
      const g0 = this.geom(w, h, 1, 0, driftX, driftY);
      g0.cx += 6 + shX; g0.cy += 4 + shY;
      this.strokeRing(ctx, g0, this.ringRGB(this.mode, 0, 0, t, reduce), 0.10 * exposure, 0);
    }

    ctx.globalCompositeOperation = 'source-over';

    /* M-7 — full-frame bloom, then glass overlays that must stay crisp */
    this.bloom.apply(this.cv, ctx, 0.3 * exposure);

    // M-6 — specular streak tracking the pointer across the pane
    if (!reduce) {
      const sx = w * (0.5 + this.px * 0.4);
      const grad = ctx.createLinearGradient(sx - 80, 0, sx + 80, h);
      grad.addColorStop(0, 'rgba(200,225,255,0)');
      grad.addColorStop(0.5, 'rgba(200,225,255,.05)');
      grad.addColorStop(1, 'rgba(200,225,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    /* M-8 — arc flashes + cooling tint (≤3 flashes, skipped on reduce) */
    if (!reduce && sT >= 0 && sT < STRIKE.settleEnd) {
      for (const [a, b] of STRIKE.flashes) {
        if (sT >= a && sT < b) {
          const k = 1 - (sT - a) / (b - a);
          ctx.fillStyle = `rgba(205,215,255,${0.75 * k})`;
          ctx.fillRect(0, 0, w, h);
        }
      }
      if (strikeTint > 0) {
        ctx.fillStyle = `rgba(150,180,255,${strikeTint * 0.24})`;
        ctx.fillRect(0, 0, w, h);
      }
    }

    // brake flare wash (tail mode)
    if (this.mode === 'tail' && this.brake > 0.01) {
      ctx.globalAlpha = this.brake * 0.4;
      ctx.fillStyle = 'rgba(255,32,56,.6)';
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
  }

  /* ── geometry: M-1 scale + M-3 error + anamorphic parallax ── */
  private geom(w: number, h: number, scale: number, z: number, driftX: number, driftY: number):
    { cx: number; cy: number; rx: number; ry: number; rot: number } {
    const depthFrac = Math.min(1.4, Math.max(0, 1 - scale));
    const anam = depthFrac * depthFrac;                        // deep rings swing harder
    return {
      cx: w / 2 + this.px * w * 0.055 * anam * 2.4 + Math.max(0, z) * driftX,
      cy: h / 2 + this.py * h * 0.05 * anam * 2.4 + Math.max(0, z) * driftY,
      rx: w * 0.435 * scale,
      ry: h * 0.385 * scale,
      rot: Math.max(0, z) * ROT_STEP,
    };
  }

  private ringPath(g: { cx: number; cy: number; rx: number; ry: number; rot: number }): Path2D {
    const p = new Path2D();
    const cr = Math.cos(g.rot), sr = Math.sin(g.rot);
    this.pts.forEach((pt, i) => {
      const rx = pt.x * cr - pt.y * sr, ry = pt.x * sr + pt.y * cr;
      const x = g.cx + rx * g.rx, y = g.cy + ry * g.ry;
      if (i === 0) p.moveTo(x, y); else p.lineTo(x, y);
    });
    p.closePath();
    return p;
  }

  private strokeRing(
    ctx: CanvasRenderingContext2D, g: { cx: number; cy: number; rx: number; ry: number; rot: number },
    c: RGB, alpha: number, _z: number,
  ): void {
    if (alpha <= 0.012) return;
    const path = this.ringPath(g);
    ctx.globalAlpha = Math.min(1, alpha * 0.32);
    ctx.strokeStyle = `rgb(${c.r},${c.g},${c.b})`;
    ctx.lineWidth = 6;
    ctx.stroke(path);
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.lineWidth = 1.6;
    ctx.stroke(path);
    ctx.globalAlpha = 1;
  }

  private drawRing(
    ctx: CanvasRenderingContext2D, w: number, h: number, scale: number, z: number, d: number,
    alpha: number, t: number, now: number, reduce: boolean,
    driftX: number, driftY: number, shX: number, shY: number, wave: number,
  ): void {
    // M-4 — which mode has the wavefront reached this ring?
    const threshold = DEPTHS > 1 ? (DEPTHS - 1 - d) / (DEPTHS - 1) : 0;
    const mode = wave >= threshold ? this.mode : this.prevMode;

    // M-4 — bounce lag: this ring's clock runs behind the front
    const tl = t - d * LAG;
    const flashT = (tl * (SEQ_CPM / 60)) % 1;
    const sweepOn = flashT >= 0 && flashT < 0.62;
    const sweepPos = Math.min(1, Math.max(0, flashT) / 0.44);

    const g = this.geom(w, h, scale, z, driftX, driftY);
    g.cx += shX; g.cy += shY;

    const ghostPulse = mode === 'ghost'
      ? (reduce ? 0.5 : 0.3 + 0.7 * Math.pow(Math.sin(tl * 1.1 + d * 0.7) * 0.5 + 0.5, 2))
      : 1;
    let ringAlpha = alpha * ghostPulse;
    if (mode === 'tail') ringAlpha *= 0.55 + this.brake * 0.45;

    // strip glass glow (skip mid-flash-off for seq)
    const stripColor = this.ringRGB(mode, d, 0, t, reduce);
    if (mode !== 'seq' || (sweepOn && sweepPos > 0.97)) {
      this.strokeRing(ctx, g, stripColor, ringAlpha * 0.5, z);
    }

    // M-9 — knock ripple parameters
    let rip: Ripple | null = this.ripple;
    let ripAge = rip ? (now - rip.t0) / 1000 : 1;
    if (ripAge > 0.4 || reduce) rip = null;
    const ripR = ripAge * 640;              // wavefront radius px/s

    const dotR = Math.max(1.3, 4.4 * scale);
    const cr = Math.cos(g.rot), sr = Math.sin(g.rot);
    const spr = mode === 'rgb' ? null : this.ringSprite(mode, d, 0, t, reduce);

    for (let i = 0; i < N_LED; i++) {
      const pt = this.pts[i];
      let a = ringAlpha;
      if (mode === 'seq') {
        const frac = i / N_LED;
        a *= sweepOn && frac <= sweepPos ? 1 : 0.05;
      }
      // M-5 — PWM shimmer
      if (!reduce) a *= 1 + 0.015 * Math.sin(t * 44 + i * 7.3 + d * 2.1);
      // M-6 — fresnel: glancing-angle brightening at the pane edges
      if (d < 3) a *= 1 + 0.3 * Math.pow(Math.abs(pt.x), 6);
      if (a <= 0.012) continue;

      const rxp = pt.x * cr - pt.y * sr, ryp = pt.x * sr + pt.y * cr;
      let x = g.cx + rxp * g.rx, y = g.cy + ryp * g.ry;

      // M-9 — radial displacement + flinch at the wavefront
      if (rip) {
        const dx = x - rip.x, dy = y - rip.y;
        const dist = Math.hypot(dx, dy) || 1;
        const wfront = Math.exp(-Math.pow((dist - ripR) / 46, 2));
        const amp = 9 * (1 - ripAge / 0.4);
        x += (dx / dist) * wfront * amp;
        y += (dy / dist) * wfront * amp;
        a *= 1 + wfront * 0.9;
      }

      const sp = spr ?? this.ringSprite(mode, d, i, t, reduce);
      const s = dotR * 6.4;
      ctx.globalAlpha = Math.min(1, a);
      ctx.drawImage(sp, x - s / 2, y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  }

  private deadLens(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.globalCompositeOperation = 'lighter';
    const g = this.geom(w, h, 1, 0, 0, 2.2);
    this.strokeRing(ctx, g, { r: 70, g: 90, b: 110 }, 0.07, 0);
    ctx.globalCompositeOperation = 'source-over';
  }
}
