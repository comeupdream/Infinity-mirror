/* ───────────────────────────────────────────────────────────────────
   FORD MUSTANG (S197) 2005–2009 — rear combination lamp, RH.
   The tri-bar: three vertical infinity pods, factory-famous 1-2-3
   sequential turn. Pods are stacked as paired elements — a red
   brake/tail layer plus an amber-free red turn overlay with `seq`
   ordering, which is all the engine needs to chase them.
   ─────────────────────────────────────────────────────────────────── */

import type { LampBlueprint } from '../types';

const POD_1 = `M 336,146 C 380,140 430,140 464,146 L 460,318 C 424,324 376,324 340,318 Z`;
const POD_2 = `M 506,150 C 550,144 600,144 634,150 L 630,324 C 594,330 546,330 510,324 Z`;
const POD_3 = `M 676,156 C 720,150 770,150 804,156 L 800,330 C 764,336 716,336 680,330 Z`;

export const mustangS197: LampBlueprint = {
  id: 'mustang-s197',
  name: 'FORD MUSTANG',
  years: '2005–2009',
  chassis: 'S197',
  kind: 'tail',
  view: { w: 960, h: 460 },

  housing: `M 302,112
    C 480,92 720,100 862,124
    C 884,128 896,140 896,160
    L 890,326
    C 890,346 878,356 858,356
    L 322,342
    C 302,340 292,330 292,312
    Z`,

  elements: [
    { id: 'pod-1', role: 'brake', depth: 8, label: 'BAR 1', d: POD_1 },
    { id: 'pod-2', role: 'brake', depth: 8, label: 'BAR 2', d: POD_2 },
    { id: 'pod-3', role: 'brake', depth: 8, label: 'BAR 3', d: POD_3 },
    // sequential overlays — same glass, red US-spec turn, chase inboard→outboard
    { id: 'seq-1', role: 'turn', depth: 0, seq: 0, tint: [255, 32, 56], d: POD_1 },
    { id: 'seq-2', role: 'turn', depth: 0, seq: 1, tint: [255, 32, 56], d: POD_2 },
    { id: 'seq-3', role: 'turn', depth: 0, seq: 2, tint: [255, 32, 56], d: POD_3 },
    {
      id: 'reverse-slot', role: 'reverse', depth: 3, label: 'REVERSE',
      d: `M 836,170 L 872,168 L 870,300 L 838,298 Z`,
    },
    {
      id: 'reflector', role: 'reflector',
      d: `M 312,150 L 326,148 L 324,310 L 312,306 Z`,
    },
  ],

  runs: [
    {
      id: 'trace', role: 'drl', leds: 30,
      pts: [
        [312, 124], [460, 108], [640, 108], [820, 122], [884, 144],
        [886, 240], [882, 330], [780, 344], [620, 340], [460, 336],
        [316, 328], [304, 240], [308, 150], [312, 124],
      ],
    },
  ],

  dims: [
    { from: [292, 384], to: [896, 384], label: '604 · HOUSING W' },
    { from: [912, 112], to: [912, 356], label: '244' },
  ],

  notes: [
    'LENS: CLEAR PC · SMOKE OPTION',
    'TRI-BAR · SEQ 1-2-3 (US RED)',
    'STRIPS: 3× 92-LED · 12V',
  ],
  sheetNo: 'IM-6C-S197 · SHT 2',
  status: 'active',
};
