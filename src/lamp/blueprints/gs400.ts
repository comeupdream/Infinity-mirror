/* ───────────────────────────────────────────────────────────────────
   LEXUS GS400 (S160 · "2GS") 1998–2000 — rear combination lamp, RH.
   REV B — photo-matched to the crafter's shipped set (IG ref, 07/16):

   · outer quarter lamp: one big SUNBURST infinity pod — hot center
     orb, ~24 radial mirror spokes that pinwheel into the depth —
     over a DUAL discrete-LED floor strip (upper row tail/brake,
     lower row red sequential turn)
   · trunk lamp: TEARDROP HALO — stroke-only receding ring with the
     reverse pod tucked low inside

   All geometry is data; the next photo pass is coordinate edits only.
   ─────────────────────────────────────────────────────────────────── */

import type { LampBlueprint } from '../types';

const RED: [number, number, number] = [255, 32, 56];

export const gs400: LampBlueprint = {
  id: 'gs400-s160',
  name: 'LEXUS GS400',
  years: '1998–2000',
  chassis: 'S160',
  kind: 'tail',
  view: { w: 960, h: 460 },

  // quarter-panel wraparound — inboard edge rides the trunk opening
  housing: `M 486,104
    C 620,82 795,104 894,144
    C 922,154 934,172 932,198
    L 920,316
    C 918,340 904,350 882,350
    L 516,352
    C 496,352 486,342 486,324
    Z`,

  // trunk-lid teardrop lamp (the pair meeting at the licence recess)
  garnishHousing: `M 150,152
    C 240,138 330,148 382,176
    C 396,184 402,198 398,214
    L 368,298
    C 362,314 346,322 328,320
    L 186,308
    C 162,304 148,288 152,264
    Z`,

  elements: [
    {
      id: 'floor-glass', role: 'tail', depth: 1, label: 'DUAL STRIP FLOOR',
      d: `M 516,292 L 858,282 C 868,283 872,289 871,297
          L 868,336 L 520,344 C 510,344 506,338 506,330 Z`,
    },
    {
      id: 'sunburst', role: 'brake', kind: 'sunburst', depth: 7, spokes: 24,
      vanish: [700, 196], label: 'SUNBURST POD',
      d: `M 522,138 C 640,112 800,130 870,168
          C 878,174 882,184 880,196
          L 868,266 C 800,242 660,236 532,258
          C 524,252 520,240 520,222 Z`,
    },
    {
      id: 'reflector', role: 'reflector',
      d: `M 882,268 L 916,258 L 920,330 C 920,340 910,346 900,344
          L 886,342 Z`,
    },
    {
      id: 'teardrop-halo', role: 'tail', kind: 'halo', depth: 6, label: 'TEARDROP HALO',
      d: `M 172,170 C 248,158 322,166 362,190
          C 372,196 377,206 374,218
          L 350,286 C 346,298 334,304 322,302
          L 196,292 C 178,289 168,277 171,259 Z`,
    },
    {
      id: 'reverse-pod', role: 'reverse', depth: 3, label: 'REVERSE',
      d: `M 202,236 L 282,240 C 290,240 294,244 294,252
          L 292,280 C 292,288 288,292 280,291
          L 204,285 C 196,284 192,280 193,272 Z`,
    },
  ],

  runs: [
    {
      // perimeter DRL trace riding the housing inset
      id: 'trace', role: 'drl', leds: 34,
      pts: [
        [500, 118], [560, 106], [660, 98], [760, 106], [860, 130],
        [912, 154], [924, 190], [918, 258], [912, 316], [892, 340],
        [800, 342], [680, 344], [560, 346], [504, 340], [498, 300],
        [496, 220], [498, 150], [500, 118],
      ],
    },
    {
      // floor row 1 — tail / brake (steady red, flares)
      id: 'floor-tail', role: 'tail', leds: 26, tint: RED,
      pts: [[522, 304], [856, 296]],
    },
    {
      // floor row 2 — red sequential, inboard → outboard like the build
      id: 'floor-seq', role: 'turn', leds: 26, tint: RED,
      pts: [[524, 328], [852, 320]],
    },
  ],

  dims: [
    { from: [486, 384], to: [932, 384], label: '446 · HOUSING W' },
    { from: [948, 144], to: [948, 350], label: '206' },
    { from: [148, 384], to: [400, 384], label: '252 · TEARDROP' },
  ],

  notes: [
    'SUNBURST ×24 · HOT ORB CENTER',
    'DUAL 146-LED FLOOR · RED SEQ',
    'TEARDROP HALO TRUNK LAMP',
    'REF: SHIPPED BUILD · IG 07/16',
  ],
  sheetNo: 'IM-81551-GS4 · REV B',
  status: 'active',
};
