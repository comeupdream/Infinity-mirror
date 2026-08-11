/* Canvas plumbing shared by every FX surface.
   MangoMatrix discipline (DPR-fit, pre-rendered sprites, zero per-frame
   allocations) + the AAA emitter model: LEDs are not round blobs — they
   carry a hot core, an astigmatic cross-flare (lens flutes smear light
   sideways), a chromatic fringe on whites, and a bloom skirt. */

export function fitCanvas(cv: HTMLCanvasElement): CanvasRenderingContext2D | null {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = cv.clientWidth, h = cv.clientHeight;
  if (!w || !h) return null;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
  }
  const ctx = cv.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

export interface RGB { r: number; g: number; b: number }

export const LED = {
  drl:   { r: 234, g: 246, b: 255 } as RGB,
  amber: { r: 255, g: 160, b: 40 } as RGB,
  tail:  { r: 255, g: 32,  b: 56 } as RGB,
  demon: { r: 255, g: 24,  b: 48 } as RGB,
  cyan:  { r: 79,  g: 216, b: 255 } as RGB,
  show:  { r: 176, g: 107, b: 255 } as RGB,
  green: { r: 61,  g: 255, b: 160 } as RGB,
};

/* ── M-2 · per-bounce transmission ramps ─────────────────────────
   A 30% film doesn't fade light, it kills it by color: three stops
   per mode — face, mid-tunnel, the deep end — sampled along bounce
   index. Real stacks warm then drown. */
export type Ramp = [RGB, RGB, RGB];
export const RAMPS: Record<string, Ramp> = {
  drl:   [{ r: 234, g: 246, b: 255 }, { r: 127, g: 196, b: 255 }, { r: 18, g: 44, b: 74 }],
  amber: [{ r: 255, g: 210, b: 122 }, { r: 255, g: 160, b: 40 },  { r: 96, g: 44, b: 6 }],
  tail:  [{ r: 255, g: 90,  b: 110 }, { r: 255, g: 32,  b: 56 },  { r: 66, g: 8,  b: 16 }],
  demon: [{ r: 255, g: 90,  b: 110 }, { r: 255, g: 24,  b: 48 },  { r: 74, g: 8,  b: 16 }],
  ghost: [{ r: 234, g: 246, b: 255 }, { r: 150, g: 190, b: 224 }, { r: 26, g: 40, b: 58 }],
  reverse: [{ r: 244, g: 250, b: 255 }, { r: 170, g: 214, b: 246 }, { r: 30, g: 52, b: 78 }],
};

export function mix(a: RGB, b: RGB, k: number): RGB {
  return {
    r: Math.round(a.r + (b.r - a.r) * k),
    g: Math.round(a.g + (b.g - a.g) * k),
    b: Math.round(a.b + (b.b - a.b) * k),
  };
}

/** Sample a ramp at bounce i: stop0→stop1 across the first 4 bounces,
    stop1→stop2 across the next 8. */
export function rampAt(ramp: Ramp, i: number): RGB {
  if (i <= 0) return ramp[0];
  if (i < 4) return mix(ramp[0], ramp[1], i / 4);
  return mix(ramp[1], ramp[2], Math.min(1, (i - 4) / 8));
}

export function hueRGB(h: number): RGB {
  const i = Math.floor(h * 6), f = h * 6 - i;
  const q = 1 - f;
  const seq: [number, number, number][] = [
    [1, f, 0], [q, 1, 0], [0, 1, f], [0, q, 1], [f, 0, 1], [1, 0, q],
  ];
  const [r, g, b] = seq[((i % 6) + 6) % 6];
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

/* ── M-5 · emitter atlas ─────────────────────────────────────────
   Per color: white-hot core → colored body → horizontal astigmatic
   streak (the flutes) → faint vertical flare → chromatic fringe on
   near-whites → bloom skirt. Cached; rgb-mode hues are quantized so
   the cache stays small. */
const emitterCache: Record<string, HTMLCanvasElement> = {};
export function ledSprite(c: RGB): HTMLCanvasElement {
  const key = c.r + ',' + c.g + ',' + c.b;
  let cv = emitterCache[key];
  if (cv) return cv;
  cv = document.createElement('canvas');
  const S = 96, C = S / 2;
  cv.width = S; cv.height = S;
  const g = cv.getContext('2d')!;
  g.globalCompositeOperation = 'lighter';
  // bloom skirt
  let rad = g.createRadialGradient(C, C, 0, C, C, C);
  rad.addColorStop(0, `rgba(${key},.55)`);
  rad.addColorStop(0.35, `rgba(${key},.16)`);
  rad.addColorStop(1, `rgba(${key},0)`);
  g.fillStyle = rad;
  g.fillRect(0, 0, S, S);
  // astigmatic cross-flare: wide horizontal streak + short vertical
  g.save();
  g.translate(C, C); g.scale(1, 0.16);
  rad = g.createRadialGradient(0, 0, 0, 0, 0, C * 0.94);
  rad.addColorStop(0, `rgba(${key},.9)`);
  rad.addColorStop(1, `rgba(${key},0)`);
  g.fillStyle = rad;
  g.fillRect(-C, -C, S, S * 4);
  g.restore();
  g.save();
  g.translate(C, C); g.scale(0.11, 1);
  rad = g.createRadialGradient(0, 0, 0, 0, 0, C * 0.6);
  rad.addColorStop(0, `rgba(${key},.6)`);
  rad.addColorStop(1, `rgba(${key},0)`);
  g.fillStyle = rad;
  g.fillRect(-C * 6, -C, S * 8, S);
  g.restore();
  // chromatic fringe on near-whites (blue-shifted halo)
  const isWhite = c.r > 200 && c.g > 200 && c.b > 200;
  if (isWhite) {
    rad = g.createRadialGradient(C, C, C * 0.16, C, C, C * 0.4);
    rad.addColorStop(0, 'rgba(120,170,255,0)');
    rad.addColorStop(0.7, 'rgba(120,170,255,.28)');
    rad.addColorStop(1, 'rgba(120,170,255,0)');
    g.fillStyle = rad;
    g.fillRect(0, 0, S, S);
  }
  // colored body + white-hot core
  rad = g.createRadialGradient(C, C, 0, C, C, C * 0.2);
  rad.addColorStop(0, 'rgba(255,255,255,.98)');
  rad.addColorStop(0.35, `rgba(${key},.95)`);
  rad.addColorStop(1, `rgba(${key},0)`);
  g.fillStyle = rad;
  g.fillRect(0, 0, S, S);
  emitterCache[key] = cv;
  return cv;
}

/** quantized-hue emitter for rgb modes (24 buckets keeps the cache sane) */
export function ledSpriteHue(h: number): HTMLCanvasElement {
  return ledSprite(hueRGB(Math.round(((h % 1) + 1) % 1 * 24) / 24));
}

/** legacy soft blob — still right for distant/soft glows */
const glowCache: Record<string, HTMLCanvasElement> = {};
export function glowSprite(r: number, g: number, b: number): HTMLCanvasElement {
  const key = r + ',' + g + ',' + b;
  let c = glowCache[key];
  if (c) return c;
  c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const gx = c.getContext('2d')!;
  const grad = gx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, `rgba(${key},1)`);
  grad.addColorStop(0.22, `rgba(${key},.85)`);
  grad.addColorStop(0.55, `rgba(${key},.22)`);
  grad.addColorStop(1, `rgba(${key},0)`);
  gx.fillStyle = grad;
  gx.fillRect(0, 0, 64, 64);
  glowCache[key] = c;
  return c;
}

/* ── M-7 · full-frame bloom pass ─────────────────────────────────
   ¼-res copy → blur → composite 'lighter'. ctx.filter isn't
   everywhere (older Safari); feature-detected once, no-ops cleanly. */
const FILTER_OK = (() => {
  try {
    const t = document.createElement('canvas').getContext('2d')!;
    t.filter = 'blur(1px)';
    return t.filter !== 'none';
  } catch { return false; }
})();

export class Bloom {
  private off = document.createElement('canvas');
  /** call after the scene is drawn; strength 0..1 */
  apply(src: HTMLCanvasElement, ctx: CanvasRenderingContext2D, strength: number): void {
    if (!FILTER_OK || strength <= 0 || !src.width || !src.height) return;
    const bw = Math.max(1, src.width >> 2), bh = Math.max(1, src.height >> 2);
    if (this.off.width !== bw || this.off.height !== bh) { this.off.width = bw; this.off.height = bh; }
    const o = this.off.getContext('2d')!;
    o.setTransform(1, 0, 0, 1, 0, 0);
    o.clearRect(0, 0, bw, bh);
    o.drawImage(src, 0, 0, bw, bh);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = strength;
    ctx.filter = 'blur(7px)';
    ctx.drawImage(this.off, 0, 0, src.width, src.height);
    ctx.filter = 'none';
    ctx.restore();
  }
}

export const prefersReducedMotion = (): boolean =>
  matchMedia('(prefers-reduced-motion: reduce)').matches;
