/* Blueprint registry — the scaffold that scales one lamp to a garage.
   A new car = one new file exporting a LampBlueprint + one line here.
   Drafting entries hold the queue slot (and the picker card) before
   their geometry lands. */

import type { LampBlueprint } from './types';
import { gs400 } from './blueprints/gs400';
import { mustangS197 } from './blueprints/mustang-s197';

const drafting = (
  id: string, name: string, years: string, chassis: string,
): LampBlueprint => ({
  id, name, years, chassis, kind: 'tail',
  view: { w: 960, h: 460 }, housing: '',
  elements: [], runs: [], dims: [], notes: [],
  sheetNo: 'IM-QUEUE', status: 'drafting',
});

export const BLUEPRINTS: LampBlueprint[] = [
  gs400,
  mustangS197,
  // ── drafting queue: popular 1996–2014 platforms, next up ──
  drafting('supra-a80', 'TOYOTA SUPRA', '1993–1998', 'A80'),
  drafting('skyline-r34', 'NISSAN SKYLINE GT-R', '1999–2002', 'BNR34'),
  drafting('s14-kouki', 'NISSAN 240SX KOUKI', '1995–1998', 'S14'),
  drafting('integra-dc2', 'ACURA INTEGRA', '1994–2001', 'DC2'),
  drafting('chaser-jzx100', 'TOYOTA CHASER', '1996–2001', 'JZX100'),
  drafting('camaro-5g', 'CHEVROLET CAMARO', '2010–2014', 'GEN5'),
  drafting('challenger-lc', 'DODGE CHALLENGER', '2008–2014', 'LC'),
  drafting('is300-xe10', 'LEXUS IS300', '2001–2005', 'XE10'),
];

export const activeBlueprints = (): LampBlueprint[] =>
  BLUEPRINTS.filter((b) => b.status === 'active');

export const getBlueprint = (id: string): LampBlueprint | undefined =>
  BLUEPRINTS.find((b) => b.id === id);
