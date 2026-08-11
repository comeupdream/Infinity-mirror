/* Canvas plumbing shared by every FX surface.
   Same discipline as the MangoMatrix renderer: DPR-fit once per frame,
   pre-rendered sprites, zero per-frame gradient allocations. */

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

/** Soft round LED glow sprite — drawn with composite 'lighter' for bloom. */
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

export function hueRGB(h: number): RGB {
  // compact HSV(h,1,1) → RGB for the RGB-chase modes
  const i = Math.floor(h * 6), f = h * 6 - i;
  const q = 1 - f;
  const seq: [number, number, number][] = [
    [1, f, 0], [q, 1, 0], [0, 1, f], [0, q, 1], [f, 0, 1], [1, 0, q],
  ];
  const [r, g, b] = seq[((i % 6) + 6) % 6];
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

export const prefersReducedMotion = (): boolean =>
  matchMedia('(prefers-reduced-motion: reduce)').matches;
