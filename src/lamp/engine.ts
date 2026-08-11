/* ═══════════════════════════════════════════════════════════════════
   LAMP ENGINE — draws a LampBlueprint as a living technical print,
   now running the AAA mirror physics (SHT 04, as-built):

   · M-1 perspective convergence on every pod's receding reflections
   · M-2 3-stop transmission ramps — glass dies into color, not alpha
   · M-3 per-bounce rotation (sunburst spokes pinwheel into the depth)
   · M-4 bounce-lag on sequential chases
   · M-5 emitter atlas for every discrete LED
   · M-7 full-frame bloom over the finished sheet

   Engine knows roles, kinds and depths — never car names. That's what
   lets one data file put a new chassis on the shelf.
   ═══════════════════════════════════════════════════════════════════ */

import {
  Bloom, fitCanvas, hueRGB, ledSprite, mix,
  prefersReducedMotion, rampAt, RAMPS, type Ramp, type RGB,
} from '../fx/canvas';
import type { LampBlueprint, LampElement, LampMode, LampState } from './types';

const SEQ_CPM = 84;
const FE = 320, GE = 46;        // M-1 element-space focal + bounce gap
const ROT_STEP = 0.004;         // M-3 panel/halo rad per bounce
const SPOKE_ROT = 0.05;         // M-3 sunburst pinwheel rad per bounce

const ROLE_RAMP: Record<string, Ramp> = {
  tail: RAMPS.tail, brake: RAMPS.tail, turn: RAMPS.amber,
  reverse: RAMPS.reverse, reflector: RAMPS.tail, drl: RAMPS.drl,
};

function tintRamp(t: [number, number, number]): Ramp {
  const c: RGB = { r: t[0], g: t[1], b: t[2] };
  const w: RGB = { r: 255, g: 255, b: 255 };
  const k: RGB = { r: 8, g: 4, b: 6 };
  return [mix(c, w, 0.3), c, mix(c, k, 0.75)];
}

interface Prepared {
  el: LampElement;
  path: Path2D;
  bbox: { x: number; y: number; w: number; h: number };
  vanish: [number, number];
  ramp: Ramp;
}

function pathBBox(d: string): { x: number; y: number; w: number; h: number } {
  const nums = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    minX = Math.min(minX, nums[i]); maxX = Math.max(maxX, nums[i]);
    minY = Math.min(minY, nums[i + 1]); maxY = Math.max(maxY, nums[i + 1]);
  }
  if (!isFinite(minX)) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function polylineLEDs(pts: [number, number][], n: number): [number, number][] {
  if (pts.length < 2 || n < 1) return [];
  const segs: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const len = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    segs.push(len); total += len;
  }
  const out: [number, number][] = [];
  for (let k = 0; k < n; k++) {
    let target = (n === 1 ? 0.5 : k / (n - 1)) * total;
    let i = 0;
    while (i < segs.length - 1 && target > segs[i]) { target -= segs[i]; i++; }
    const f = segs[i] ? target / segs[i] : 0;
    out.push([
      pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f,
      pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f,
    ]);
  }
  return out;
}

export class LampEngine {
  private cv: HTMLCanvasElement;
  private bloom = new Bloom();
  private bp: LampBlueprint | null = null;
  private prepared: Prepared[] = [];
  private housingPath: Path2D | null = null;
  private garnishPath: Path2D | null = null;
  private runDots: { role: 'drl' | 'turn' | 'tail'; dots: [number, number][]; ramp: Ramp }[] = [];
  private seqCount = 0;
  private mode: LampMode = 'CYCLE';
  private t0 = performance.now();
  powered = true;

  constructor(cv: HTMLCanvasElement) { this.cv = cv; }

  setBlueprint(bp: LampBlueprint): void {
    this.bp = bp;
    this.housingPath = bp.housing ? new Path2D(bp.housing) : null;
    this.garnishPath = bp.garnishHousing ? new Path2D(bp.garnishHousing) : null;
    this.prepared = bp.elements.map((el) => {
      const bbox = pathBBox(el.d);
      return {
        el, path: new Path2D(el.d), bbox,
        vanish: el.vanish ?? [bbox.x + bbox.w / 2, bbox.y + bbox.h / 2],
        ramp: el.tint ? tintRamp(el.tint) : (ROLE_RAMP[el.role] ?? RAMPS.tail),
      };
    });
    this.runDots = bp.runs.map((r) => ({
      role: r.role,
      dots: polylineLEDs(r.pts, r.leds),
      ramp: r.tint ? tintRamp(r.tint) : (ROLE_RAMP[r.role] ?? RAMPS.drl),
    }));
    this.seqCount = bp.elements.filter((e) => e.role === 'turn' && e.seq != null).length;
  }

  setMode(m: LampMode): void { this.mode = m; }
  getMode(): LampMode { return this.mode; }

  private state(now: number): LampState {
    const t = (now - this.t0) / 1000;
    const s: LampState = { tail: 0, brake: 0, turn: 0, turnSweep: 0, reverse: 0, show: 0, t };
    if (!this.powered) return s;
    const flashT = (t * (SEQ_CPM / 60)) % 1;
    const flashOn = flashT < 0.62 ? 1 : 0.04;
    const sweep = Math.min(1, flashT / 0.44);
    const mode = this.mode === 'CYCLE' ? this.cyclePhase(t) : this.mode;
    switch (mode) {
      case 'PARK':    s.tail = 1; break;
      case 'BRAKE':   s.tail = 1; s.brake = 1; break;
      case 'TURN':    s.tail = 1; s.turn = flashOn; s.turnSweep = sweep; break;
      case 'REVERSE': s.tail = 1; s.reverse = 1; break;
      case 'SHOW':    s.tail = 1; s.show = 1; break;
    }
    return s;
  }

  private cyclePhase(t: number): Exclude<LampMode, 'CYCLE'> {
    const p = t % 12;
    if (p < 2.5) return 'PARK';
    if (p < 5) return 'BRAKE';
    if (p < 8.5) return 'TURN';
    if (p < 10) return 'REVERSE';
    return 'SHOW';
  }

  frame(now: number): void {
    const ctx = fitCanvas(this.cv);
    if (!ctx || !this.bp) return;
    const w = this.cv.clientWidth, h = this.cv.clientHeight;
    ctx.clearRect(0, 0, w, h);

    const { w: bw, h: bh } = this.bp.view;
    const k = Math.min(w / bw, h / bh) * 0.94;
    const ox = (w - bw * k) / 2, oy = (h - bh * k) / 2;

    this.drawSheet(ctx, w, h, k, ox, oy);

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(k, k);

    if (this.bp.status === 'drafting') {
      this.drawDraftingCard(ctx);
      ctx.restore();
      return;
    }

    const s = this.state(now);
    const reduce = prefersReducedMotion();

    this.strokeHousing(ctx, this.housingPath);
    this.strokeHousing(ctx, this.garnishPath);

    for (const p of this.prepared) this.drawElement(ctx, p, s, reduce);
    this.drawRuns(ctx, s, reduce);
    this.drawDims(ctx);
    this.drawLabels(ctx);

    ctx.restore();

    // M-7 — the finished print glows like footage
    if (this.powered) this.bloom.apply(this.cv, ctx, 0.24);
  }

  /* ── blueprint sheet dressing ── */
  private drawSheet(ctx: CanvasRenderingContext2D, w: number, h: number, k: number, ox: number, oy: number): void {
    ctx.strokeStyle = 'rgba(79,216,255,.05)';
    ctx.lineWidth = 1;
    const minor = 20 * k;
    for (let x = ox % minor; x < w; x += minor) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = oy % minor; y < h; y += minor) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(79,216,255,.10)';
    const major = 100 * k;
    for (let x = ox % major; x < w; x += major) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = oy % major; y < h; y += major) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(79,216,255,.35)';
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.strokeStyle = 'rgba(79,216,255,.15)';
    ctx.strokeRect(12, 12, w - 24, h - 24);
  }

  private strokeHousing(ctx: CanvasRenderingContext2D, path: Path2D | null): void {
    if (!path) return;
    ctx.fillStyle = 'rgba(79,216,255,.03)';
    ctx.fill(path);
    ctx.strokeStyle = 'rgba(79,216,255,.8)';
    ctx.lineWidth = 2;
    ctx.stroke(path);
    ctx.strokeStyle = 'rgba(79,216,255,.22)';
    ctx.lineWidth = 5;
    ctx.stroke(path);
  }

  /* ── color: M-2 ramps (SHOW mode overrides with depth-hue) ── */
  private colorAt(p: Prepared, s: LampState, i: number): RGB {
    if (s.show > 0) return hueRGB((s.t * 0.06 + i * 0.085 + p.bbox.x / 2000) % 1);
    return rampAt(p.ramp, i);
  }

  private elementAlpha(p: Prepared, s: LampState): number {
    switch (p.el.role) {
      case 'tail':    return 0.34 * s.tail + 0.66 * s.brake + 0.4 * s.show;
      case 'brake':   return 0.16 * s.tail + 0.84 * s.brake + 0.5 * s.show;
      case 'turn': {
        if (this.seqCount && p.el.seq != null) {
          const fired = s.turnSweep * this.seqCount > p.el.seq + 0.3;
          return fired ? s.turn : 0;
        }
        return s.turn > 0.5 ? s.turn : 0.05 * s.tail;
      }
      case 'reverse': return s.reverse + 0.25 * s.show;
      case 'reflector': return 0.10 + 0.12 * s.brake;
      default: return 0;
    }
  }

  private drawElement(ctx: CanvasRenderingContext2D, p: Prepared, s: LampState, reduce: boolean): void {
    const { el, path } = p;

    if (el.role === 'garnish') {
      ctx.strokeStyle = 'rgba(183,191,200,.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke(path);
      return;
    }

    const alpha = this.elementAlpha(p, s);
    if (alpha <= 0.01) {
      ctx.strokeStyle = 'rgba(79,216,255,.25)';
      ctx.lineWidth = 1;
      ctx.stroke(path);
      return;
    }

    switch (el.kind) {
      case 'sunburst': this.drawSunburst(ctx, p, s, alpha, reduce); break;
      case 'halo':     this.drawHalo(ctx, p, s, alpha, reduce); break;
      default:         this.drawPanel(ctx, p, s, alpha, reduce); break;
    }
  }

  /* panel — filled lens with receding outline reflections (M-1 spacing) */
  private drawPanel(ctx: CanvasRenderingContext2D, p: Prepared, s: LampState, alpha: number, reduce: boolean): void {
    const { el, path, bbox, vanish } = p;
    const depth = el.depth ?? 0;
    const breathe = reduce ? 1 : 0.93 + 0.07 * Math.sin(s.t * 1.6 + bbox.x * 0.01);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const sweepClip = el.role === 'turn' && el.seq == null && s.turn > 0.5;

    let c = this.colorAt(p, s, 0);
    ctx.globalAlpha = Math.min(1, alpha * 0.3 * breathe);
    ctx.fillStyle = `rgb(${c.r},${c.g},${c.b})`;
    if (sweepClip) {
      ctx.save(); ctx.beginPath();
      ctx.rect(bbox.x, bbox.y, bbox.w * s.turnSweep, bbox.h);
      ctx.clip(); ctx.fill(path); ctx.restore();
    } else {
      ctx.fill(path);
    }

    for (let i = 0; i <= depth; i++) {
      const sc = FE / (FE + i * GE);                     // M-1
      const a = alpha * Math.pow(0.85, i) * breathe;
      if (a < 0.015) break;
      c = this.colorAt(p, s, i);                        // M-2
      ctx.save();
      ctx.translate(vanish[0], vanish[1]);
      ctx.rotate(i * ROT_STEP);                         // M-3
      ctx.scale(sc, sc);
      ctx.translate(-vanish[0], -vanish[1]);
      if (sweepClip) {
        ctx.beginPath();
        ctx.rect(bbox.x, bbox.y, bbox.w * s.turnSweep, bbox.h);
        ctx.clip();
      }
      ctx.globalAlpha = Math.min(1, a);
      ctx.strokeStyle = `rgb(${c.r},${c.g},${c.b})`;
      ctx.lineWidth = i === 0 ? 3 : 2;
      ctx.stroke(path);
      ctx.restore();
    }
    ctx.restore();
  }

  /* sunburst — the Genki cut: hot orb + radial mirror spokes that
     pinwheel deeper into the glass (M-3 rotation per bounce) */
  private drawSunburst(ctx: CanvasRenderingContext2D, p: Prepared, s: LampState, alpha: number, reduce: boolean): void {
    const { el, path, bbox, vanish } = p;
    const depth = el.depth ?? 6;
    const spokes = el.spokes ?? 24;
    const [ox, oy] = vanish;
    const rx = bbox.w / 2, ry = bbox.h / 2;
    const breathe = reduce ? 1 : 0.94 + 0.06 * Math.sin(s.t * 1.5 + bbox.x * 0.013);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // clip every reflection to the lens
    ctx.clip(path);

    // glass wash
    let c = this.colorAt(p, s, 0);
    ctx.globalAlpha = Math.min(1, alpha * 0.22 * breathe);
    ctx.fillStyle = `rgb(${c.r},${c.g},${c.b})`;
    ctx.fill(path);

    for (let i = 0; i <= depth; i++) {
      const sc = FE / (FE + i * GE);                    // M-1
      const a = alpha * Math.pow(0.82, i) * breathe;
      if (a < 0.015) break;
      c = this.colorAt(p, s, i);                        // M-2
      const rot = i * SPOKE_ROT;                        // M-3 pinwheel
      ctx.strokeStyle = `rgb(${c.r},${c.g},${c.b})`;
      ctx.lineWidth = Math.max(0.8, 2.2 * sc);
      ctx.globalAlpha = Math.min(1, a * 0.85);
      ctx.beginPath();
      for (let sp = 0; sp < spokes; sp++) {
        const ang = (sp / spokes) * Math.PI * 2 + rot;
        const ca = Math.cos(ang), sa = Math.sin(ang);
        // PWM shimmer per spoke (M-5)
        ctx.moveTo(ox + ca * rx * 0.12 * sc, oy + sa * ry * 0.16 * sc);
        ctx.lineTo(ox + ca * rx * 0.98 * sc, oy + sa * ry * 0.98 * sc);
      }
      ctx.stroke();
      // rim ring of this reflection
      ctx.globalAlpha = Math.min(1, a * 0.5);
      ctx.save();
      ctx.translate(ox, oy);
      ctx.rotate(rot * 0.4);
      ctx.scale(sc, sc);
      ctx.translate(-ox, -oy);
      ctx.lineWidth = 2;
      ctx.stroke(path);
      ctx.restore();
    }

    // the hot orb — overexposed core like the reference photo
    const orbRamp: RGB = s.show > 0 ? this.colorAt(p, s, 0) : { r: 255, g: 214, b: 168 };
    const orb = ledSprite(orbRamp);
    const os = Math.min(rx, ry) * 0.85;
    ctx.globalAlpha = Math.min(1, alpha * breathe);
    ctx.drawImage(orb, ox - os / 2, oy - os / 2, os, os);
    ctx.globalAlpha = Math.min(1, alpha * 0.65);
    ctx.drawImage(orb, ox - os / 4, oy - os / 4, os / 2, os / 2);
    ctx.restore();

    // crisp lens rim on top
    c = this.colorAt(p, s, 0);
    ctx.globalAlpha = Math.min(1, alpha * 0.9);
    ctx.strokeStyle = `rgb(${c.r},${c.g},${c.b})`;
    ctx.lineWidth = 2.4;
    ctx.stroke(path);
    ctx.globalAlpha = 1;
  }

  /* halo — stroke-only receding ring (teardrop trunk lamps) */
  private drawHalo(ctx: CanvasRenderingContext2D, p: Prepared, s: LampState, alpha: number, reduce: boolean): void {
    const { el, path, vanish } = p;
    const depth = el.depth ?? 5;
    const breathe = reduce ? 1 : 0.94 + 0.06 * Math.sin(s.t * 1.4 + p.bbox.x * 0.02);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i <= depth; i++) {
      const sc = FE / (FE + i * GE);                    // M-1
      const a = alpha * Math.pow(0.8, i) * breathe;
      if (a < 0.015) break;
      const c = this.colorAt(p, s, i);                  // M-2
      ctx.save();
      ctx.translate(vanish[0], vanish[1]);
      ctx.rotate(i * ROT_STEP * 1.6);                   // M-3
      ctx.scale(sc, sc);
      ctx.translate(-vanish[0], -vanish[1]);
      ctx.strokeStyle = `rgb(${c.r},${c.g},${c.b})`;
      ctx.globalAlpha = Math.min(1, a * 0.3);
      ctx.lineWidth = 7;
      ctx.stroke(path);
      ctx.globalAlpha = Math.min(1, a);
      ctx.lineWidth = 2.2;
      ctx.stroke(path);
      ctx.restore();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  private drawRuns(ctx: CanvasRenderingContext2D, s: LampState, reduce: boolean): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const run of this.runDots) {
      for (let i = 0; i < run.dots.length; i++) {
        const [x, y] = run.dots[i];
        let a = 0;
        let c: RGB;
        if (run.role === 'drl') {
          a = this.powered ? 0.75 : 0;
          c = s.show > 0 ? hueRGB((s.t * 0.06 + i * 0.02) % 1) : rampAt(run.ramp, 0);
        } else if (run.role === 'tail') {
          a = 0.4 * s.tail + 0.6 * s.brake + 0.4 * s.show;
          c = s.show > 0 ? hueRGB((s.t * 0.06 + i * 0.02) % 1) : rampAt(run.ramp, s.brake > 0.5 ? 0 : 1);
        } else {
          // sequential chase — comet head bright, fresh tail cooling (M-4)
          const frac = run.dots.length > 1 ? i / (run.dots.length - 1) : 0;
          const lit = s.turn > 0.5 && frac <= s.turnSweep;
          a = lit ? 1 : 0.05 * s.tail;
          // dots closest behind the sweep head run hottest
          const heat = lit ? Math.max(0, 1 - (s.turnSweep - frac) * 3) : 0;
          c = rampAt(run.ramp, lit ? (heat > 0.5 ? 0 : 1) : 2);
        }
        if (a <= 0.01) continue;
        if (!reduce) a *= 1 + 0.015 * Math.sin(s.t * 44 + i * 7.3);   // M-5 PWM
        const spr = ledSprite(c);
        const sz = run.role === 'turn' && a > 0.5 ? 30 : 20;
        ctx.globalAlpha = Math.min(1, a);
        ctx.drawImage(spr, x - sz / 2, y - sz / 2, sz, sz);
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  private drawDims(ctx: CanvasRenderingContext2D): void {
    if (!this.bp) return;
    ctx.strokeStyle = 'rgba(79,216,255,.5)';
    ctx.fillStyle = 'rgba(79,216,255,.9)';
    ctx.lineWidth = 1;
    ctx.font = '15px "VT323", monospace';
    ctx.textAlign = 'center';
    for (const d of this.bp.dims) {
      const [x1, y1] = d.from, [x2, y2] = d.to;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      const vert = Math.abs(x2 - x1) < Math.abs(y2 - y1);
      const tick = 6;
      ctx.beginPath();
      if (vert) {
        ctx.moveTo(x1 - tick, y1); ctx.lineTo(x1 + tick, y1);
        ctx.moveTo(x2 - tick, y2); ctx.lineTo(x2 + tick, y2);
      } else {
        ctx.moveTo(x1, y1 - tick); ctx.lineTo(x1, y1 + tick);
        ctx.moveTo(x2, y2 - tick); ctx.lineTo(x2, y2 + tick);
      }
      ctx.stroke();
      ctx.save();
      if (vert) {
        ctx.translate(x1 - 10, (y1 + y2) / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(d.label, 0, 0);
      } else {
        ctx.fillText(d.label, (x1 + x2) / 2, y1 - 6);
      }
      ctx.restore();
    }
  }

  private drawLabels(ctx: CanvasRenderingContext2D): void {
    if (!this.bp) return;
    ctx.font = '13px "VT323", monospace';
    ctx.fillStyle = 'rgba(183,191,200,.75)';
    ctx.textAlign = 'left';
    for (const p of this.prepared) {
      if (!p.el.label) continue;
      ctx.fillText(p.el.label, p.bbox.x + 4, p.bbox.y - 5);
    }
    const { h } = this.bp.view;
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(79,216,255,.95)';
    ctx.font = '20px "VT323", monospace';
    ctx.fillText(`${this.bp.name} · ${this.bp.chassis}`, 24, h - 52);
    ctx.font = '15px "VT323", monospace';
    ctx.fillStyle = 'rgba(79,216,255,.7)';
    ctx.fillText(`${this.bp.years} · REAR COMBINATION LAMP · RH`, 24, h - 34);
    ctx.fillText(this.bp.sheetNo, 24, h - 16);
    ctx.fillStyle = 'rgba(183,191,200,.6)';
    ctx.font = '13px "VT323", monospace';
    this.bp.notes.forEach((n, i) => {
      ctx.textAlign = 'right';
      ctx.fillText(n, this.bp!.view.w - 24, h - 52 + i * 15);
    });
    ctx.textAlign = 'left';
  }

  private drawDraftingCard(ctx: CanvasRenderingContext2D): void {
    if (!this.bp) return;
    const { w, h } = this.bp.view;
    ctx.strokeStyle = 'rgba(79,216,255,.3)';
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 2;
    ctx.strokeRect(w * 0.18, h * 0.2, w * 0.64, h * 0.5);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(79,216,255,.85)';
    ctx.textAlign = 'center';
    ctx.font = '30px "VT323", monospace';
    ctx.fillText(`${this.bp.name} · ${this.bp.chassis}`, w / 2, h * 0.42);
    ctx.font = '19px "VT323", monospace';
    ctx.fillStyle = 'rgba(255,160,40,.85)';
    ctx.fillText('IN DRAFTING — GEOMETRY QUEUED', w / 2, h * 0.52);
    ctx.fillStyle = 'rgba(183,191,200,.6)';
    ctx.font = '15px "VT323", monospace';
    ctx.fillText(this.bp.years, w / 2, h * 0.6);
    ctx.textAlign = 'left';
  }
}
