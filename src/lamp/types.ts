/* ═══════════════════════════════════════════════════════════════════
   LAMP BLUEPRINTS — the data contract for procedural tail lights.

   One blueprint = one vehicle's lamp, drawn as a technical print and
   animated with the shop's infinity-mirror builds. Geometry is authored
   for the RIGHT-HAND (RH) lamp in a fixed blueprint coordinate space;
   the renderer mirrors for LH. Paths are plain SVG path strings so a
   blueprint is pure data — photo-matching against real lamps later is
   a matter of editing coordinates, nothing else.
   ═══════════════════════════════════════════════════════════════════ */

export type ElementRole =
  | 'tail'      // running light — dim red, lit in every rear mode
  | 'brake'     // stop — red, flares on BRAKE
  | 'turn'      // amber, flashes / sweeps
  | 'reverse'   // white
  | 'reflector' // passive red chip, never emits (glints faintly)
  | 'garnish';  // trim panel — etched, unlit

export interface LampElement {
  id: string;
  role: ElementRole;
  /** how the glass is built:
      'panel'    — filled lens area with receding outline reflections
      'sunburst' — radial mirror spokes from a hot orb (the Genki cut:
                   spokes rotate slightly per bounce → pinwheel moiré)
      'halo'     — stroke-only ring, receding (teardrop trunk rings) */
  kind?: 'panel' | 'sunburst' | 'halo';
  /** closed SVG path in blueprint coords */
  d: string;
  /** infinity depth: how many receding reflections this pod shows (0 = flat panel) */
  depth?: number;
  /** sunburst only: radial spoke count (default 24) */
  spokes?: number;
  /** vanishing point override, blueprint coords (default: path bbox centre) */
  vanish?: [number, number];
  /** sequential order among this lamp's turn elements (0 fires first) —
      how a tri-bar Mustang chases 1-2-3 without any per-car code */
  seq?: number;
  /** emitter color override, RGB 0-255 — e.g. US-spec red sequentials */
  tint?: [number, number, number];
  label?: string;
}

export interface LedRun {
  id: string;
  role: 'drl' | 'turn' | 'tail';
  /** polyline the discrete LEDs sit on, in order of the chase direction */
  pts: [number, number][];
  leds: number;
  /** emitter color override — e.g. the all-red Genki floor strips */
  tint?: [number, number, number];
}

export interface DimLine {
  from: [number, number];
  to: [number, number];
  label: string;
}

export interface LampBlueprint {
  id: string;
  name: string;          // "LEXUS GS400"
  years: string;         // "1998–2000"
  chassis: string;       // "S160"
  kind: 'tail' | 'head';
  /** blueprint sheet coordinate space */
  view: { w: number; h: number };
  /** quarter-panel (outer) housing outline — closed path */
  housing: string;
  /** trunk-lid garnish housing, when the car has one — closed path */
  garnishHousing?: string;
  elements: LampElement[];
  runs: LedRun[];
  dims: DimLine[];
  /** etched annotation lines for the title block */
  notes: string[];
  /** decorative drawing number for the sheet (placeholder until real refs land) */
  sheetNo: string;
  status: 'active' | 'drafting';
}

/** Light-program state the engine feeds every element each frame. */
export interface LampState {
  tail: number;      // 0..1
  brake: number;     // 0..1
  turn: number;      // 0..1 — flash envelope
  turnSweep: number; // 0..1 — sequential fill position within a flash
  reverse: number;   // 0..1
  show: number;      // 0..1 — RGB show-mode blend
  t: number;         // seconds
}

export type LampMode = 'PARK' | 'BRAKE' | 'TURN' | 'REVERSE' | 'SHOW' | 'CYCLE';
