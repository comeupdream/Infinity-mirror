/* Product catalog — lamps, kits, modules, and build slots.
   Fitment follows the XAT Racing rule: "FITS YOUR CAR" needs POSITIVE
   evidence (the product explicitly lists your chassis), never absence
   of contradiction. Made-to-order builds are excluded from the badge —
   a build slot isn't a part that fits, it's a commission. */

export interface ProductOption {
  label: string;
  priceDelta: number; // cents
}

export interface Product {
  slug: string;
  name: string;
  sku: string;
  price: number;      // cents
  desc: string;
  chassis: string[];  // explicit fitment (empty = universal/build)
  kind: 'lamp' | 'kit' | 'module' | 'build';
  options?: ProductOption[];
  eta?: string;
  blueprint?: string; // Blueprint Lab sheet
}

export const CATALOG: Product[] = [
  {
    slug: 'gs400-infinity-tails',
    name: 'INFINITY TAILS · LEXUS GS400',
    sku: 'IM-81551-GS4',
    price: 145000,
    desc: 'Full rear set for the S160 — twin infinity pods, sequential amber floor strip, first-surface mirror stack behind smoked polycarbonate. Plug-in harness, no splicing.',
    chassis: ['S160'],
    kind: 'lamp',
    options: [
      { label: 'SMOKED LENS', priceDelta: 0 },
      { label: 'CLEAR LENS', priceDelta: 0 },
      { label: 'RED LENS', priceDelta: 4500 },
    ],
    eta: '3–4 WK BUILD',
    blueprint: 'gs400-s160',
  },
  {
    slug: 's197-tribar-tails',
    name: 'TRI-BAR INFINITY TAILS · MUSTANG',
    sku: 'IM-6C-S197',
    price: 125000,
    desc: 'S197 tri-bar rebuilt as three infinity tunnels with the factory-correct 1-2-3 sequential chase. Red or smoked glass.',
    chassis: ['S197'],
    kind: 'lamp',
    options: [
      { label: 'SMOKED LENS', priceDelta: 0 },
      { label: 'RED LENS', priceDelta: 0 },
    ],
    eta: '3–4 WK BUILD',
    blueprint: 'mustang-s197',
  },
  {
    slug: 'custom-infinity-headlights',
    name: 'CUSTOM INFINITY HEADLIGHTS',
    sku: 'IM-BUILD-H',
    price: 180000,
    desc: 'Commission slot: your OEM housings, opened, mirrored, sealed. Infinity DRL ring, switchback turns, optional demon eye behind the projector. Send cores or we source them.',
    chassis: [],
    kind: 'build',
    eta: '5–7 WK BUILD',
  },
  {
    slug: 'custom-infinity-tails',
    name: 'CUSTOM INFINITY TAILS',
    sku: 'IM-BUILD-T',
    price: 140000,
    desc: 'Commission slot for any chassis in (or beyond) the fitment table. Sequential turns, infinity pods, reverse tunnels — drawn up in the Blueprint Lab before a single cut.',
    chassis: [],
    kind: 'build',
    eta: '4–6 WK BUILD',
  },
  {
    slug: 'rgb-halo-retrofit',
    name: 'RGB HALO RETROFIT · PAIR',
    sku: 'IM-HALO-2',
    price: 42000,
    desc: 'Surface-mount halo rings sized to your projector bores, wired for the IM chase controller. Show use for color modes.',
    chassis: [],
    kind: 'kit',
  },
  {
    slug: 'sequential-module',
    name: 'SEQUENTIAL TURN MODULE',
    sku: 'IM-SEQ-12',
    price: 9500,
    desc: '12V flasher-side module, 84 CPM sweep, plug-and-play pigtails. Runs any of our amber strips or your own.',
    chassis: [],
    kind: 'module',
  },
  {
    slug: 'demon-eye-kit',
    name: 'DEMON EYE PROJECTOR KIT',
    sku: 'IM-DMN-1',
    price: 26000,
    desc: 'Behind-the-lens illumination for retrofit projectors. Red, or RGB on the chase controller. Show and off-road use only.',
    chassis: [],
    kind: 'kit',
  },
  {
    slug: 'chase-controller',
    name: 'IM CHASE CONTROLLER · BT',
    sku: 'IM-CTL-BT',
    price: 14500,
    desc: 'Bluetooth controller for halos, demon eyes, and underglow strips. The RGB / GHOST / SHOW programs from this site, in your housings.',
    chassis: [],
    kind: 'module',
  },
  {
    slug: 'mirror-film-pack',
    name: 'MIRROR STACK FILM PACK',
    sku: 'IM-FLM-30',
    price: 6000,
    desc: 'First-surface mirror sheet + 30% two-way film, pre-cut oversize for DIY infinity builds. The exact stack from our lamps.',
    chassis: [],
    kind: 'kit',
  },
];

/** POSITIVE-evidence fitment: build slots never badge; a product must
    explicitly list the garage chassis. */
export function fitsChassis(p: Product, chassis: string | null): boolean {
  if (!chassis || p.kind === 'build') return false;
  return p.chassis.includes(chassis);
}

export const bySlug = (slug: string): Product | undefined =>
  CATALOG.find((p) => p.slug === slug);

export const fmtUSD = (cents: number): string =>
  '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
