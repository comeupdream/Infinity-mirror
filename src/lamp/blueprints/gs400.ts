/* ───────────────────────────────────────────────────────────────────
   LEXUS GS400 (S160) 1998–2000 — rear combination lamp, RH.
   The flagship print: quarter-panel wraparound unit + trunk-lid
   garnish, rebuilt as a twin-pod infinity build with a sequential
   amber floor strip.

   Geometry is a stylised draft awaiting photo-match against the real
   lamps (owner supplying reference shots) — every shape below is data,
   so tuning = editing coordinates only.
   ─────────────────────────────────────────────────────────────────── */

import type { LampBlueprint } from '../types';

export const gs400: LampBlueprint = {
  id: 'gs400-s160',
  name: 'LEXUS GS400',
  years: '1998–2000',
  chassis: 'S160',
  kind: 'tail',
  view: { w: 960, h: 460 },

  // quarter-panel wraparound trapezoid — inboard edge rides the trunk opening
  housing: `M 486,100
    C 620,80 795,104 894,146
    C 922,156 934,172 932,196
    L 920,318
    C 918,340 904,350 882,350
    L 516,352
    C 496,352 486,342 486,324
    Z`,

  // trunk-lid garnish strip, spanning toward the licence recess
  garnishHousing: `M 72,164
    C 180,150 350,146 452,152
    C 460,152 464,158 464,166
    L 460,306
    C 460,314 456,318 448,318
    C 340,324 190,326 78,320
    C 70,320 66,314 66,306
    Z`,

  elements: [
    {
      id: 'pod-a', role: 'tail', depth: 7, label: 'INFINITY POD A',
      d: `M 516,132 C 640,112 780,130 868,162 L 862,208
          C 760,178 640,164 520,182 Z`,
    },
    {
      id: 'pod-b', role: 'brake', depth: 9, label: 'INFINITY POD B',
      d: `M 518,200 C 660,182 790,198 858,222 L 850,296
          C 740,270 640,262 520,278 Z`,
    },
    {
      id: 'turn-strip', role: 'turn', depth: 2, label: 'SEQ AMBER',
      d: `M 520,300 L 844,308 C 858,309 862,314 861,322
          L 858,336 L 522,344 C 512,344 508,338 508,330 Z`,
    },
    {
      id: 'reflector', role: 'reflector',
      d: `M 876,268 L 914,258 L 918,330 C 918,340 908,346 898,344
          L 880,342 Z`,
    },
    {
      id: 'garnish-etch', role: 'garnish', label: 'GARNISH',
      d: `M 84,166 L 446,160 L 446,182 L 84,188 Z`,
    },
    {
      id: 'inner-tail', role: 'tail', depth: 5, label: 'INNER TAIL',
      d: `M 86,196 C 170,190 250,188 318,190 L 320,290
          C 250,292 170,294 88,296 Z`,
    },
    {
      id: 'reverse-pod', role: 'reverse', depth: 6, label: 'REVERSE',
      d: `M 352,196 L 438,192 C 446,192 450,196 450,204 L 448,282
          C 448,290 444,294 436,294 L 354,296 C 346,296 342,292 342,284 Z`,
    },
  ],

  runs: [
    {
      // perimeter DRL trace riding the housing inset
      id: 'trace', role: 'drl', leds: 34,
      pts: [
        [500, 116], [560, 106], [660, 98], [760, 106], [860, 132],
        [910, 156], [922, 190], [916, 260], [910, 316], [890, 340],
        [800, 342], [680, 344], [560, 346], [502, 340], [496, 300],
        [494, 220], [496, 150], [500, 116],
      ],
    },
    {
      // sequential amber chase — inboard → outboard (left → right on RH)
      id: 'seq-floor', role: 'turn', leds: 11,
      pts: [[524, 322], [852, 314]],
    },
  ],

  dims: [
    { from: [486, 384], to: [932, 384], label: '446 · HOUSING W' },
    { from: [948, 146], to: [948, 350], label: '204' },
    { from: [66, 384], to: [464, 384], label: '398 · GARNISH' },
  ],

  notes: [
    'LENS: SMOKED PC · HARDCOAT',
    'MIRROR: FIRST-SURFACE + 30% FILM',
    'STRIPS: 2× 146-LED · 12V',
    'SEQ TURN: OUTBOARD SWEEP',
  ],
  sheetNo: 'IM-81551-GS4 · SHT 1',
  status: 'active',
};
