/* Product catalog — LIVE PRICING from the builder's published price
   list (IG story). Three constructions, each priced by how much of the
   lamp DANCES (their word for animated programs):

     ladder            LED      ACRYLIC   INFINITY / NO-LENS 3D
     no dance          $950     $1,300    $1,650
     brake+park dance  $1,200   $1,550    $1,900
     turn dance        $1,200   $1,550    $1,900
     full dance        $1,500   $1,850    $2,100

   Global terms, verbatim from the list: taillights NOT included (ship
   your cores), flat $80 shipping, 1-year warranty.

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
  /** cents; 0 = BY QUOTE (priced by reply, never invented) */
  price: number;
  desc: string;
  chassis: string[];  // explicit fitment (empty = universal/build)
  kind: 'lamp' | 'kit' | 'module' | 'build';
  options?: ProductOption[];
  eta?: string;
  blueprint?: string; // Blueprint Lab sheet
}

/* the dance ladder — deltas off each construction's no-dance base */
const DANCE = (d2: number, d3: number, d4: number): ProductOption[] => [
  { label: 'NO DANCE · ALL STATIC', priceDelta: 0 },
  { label: 'DANCE · BRAKE + PARK', priceDelta: d2 },
  { label: 'DANCE · TURN SIGNAL', priceDelta: d3 },
  { label: 'FULL DANCE · TURN + BRAKE + PARK', priceDelta: d4 },
];

export const SHIPPING_CENTS = 8000; // flat, per order
export const TERMS = [
  'TAILLIGHTS NOT INCLUDED — SHIP YOUR CORES',
  'FLAT $80 SHIPPING',
  '1-YEAR WARRANTY',
];

export const CATALOG: Product[] = [
  /* ── the three constructions, any chassis — No.1–12 ── */
  {
    slug: 'led-tail-build',
    name: 'LED TAIL BUILD',
    sku: 'IM-TL-LED',
    price: 95000,
    desc: 'Your OEM housings rebuilt with discrete LED arrays — menu No.1–4. Pick how much of the lamp dances: static, brake + park animation, sequential turns, or the full program.',
    chassis: [],
    kind: 'build',
    options: DANCE(25000, 25000, 55000),
  },
  {
    slug: 'acrylic-tail-build',
    name: 'ACRYLIC TAIL BUILD',
    sku: 'IM-TL-ACR',
    price: 130000,
    desc: 'Machined acrylic light guides in your housings — the even edge-lit glow, menu No.5–8. Same dance ladder, deeper glass.',
    chassis: [],
    kind: 'build',
    options: DANCE(25000, 25000, 55000),
  },
  {
    slug: 'infinity-tail-build',
    name: 'INFINITY MIRROR · NO-LENS 3D BUILD',
    sku: 'IM-TL-INF',
    price: 165000,
    desc: 'The signature — first-surface mirror stacks or open no-lens 3D arrays built into your cores, menu No.9–12. The effect this whole site runs on.',
    chassis: [],
    kind: 'build',
    options: DANCE(25000, 25000, 45000),
  },

  /* ── chassis-drafted infinity sets (Blueprint Lab linked) ── */
  {
    slug: 'gs400-infinity-tails',
    name: 'INFINITY TAILS · LEXUS GS400',
    sku: 'IM-81551-GS4',
    price: 165000,
    desc: 'Full rear set for the S160 on the infinity ladder — sunburst pods with the hot orb center, dual 146-LED floor, teardrop halo trunk lamps. The shipped design from the reference build.',
    chassis: ['S160'],
    kind: 'lamp',
    options: DANCE(25000, 25000, 45000),
    blueprint: 'gs400-s160',
  },
  {
    slug: 's197-tribar-tails',
    name: 'TRI-BAR INFINITY TAILS · MUSTANG',
    sku: 'IM-6C-S197',
    price: 165000,
    desc: 'S197 tri-bar rebuilt as three infinity tunnels on the infinity ladder — the factory-correct 1-2-3 chase lives in the turn-dance tiers.',
    chassis: ['S197'],
    kind: 'lamp',
    options: DANCE(25000, 25000, 45000),
    blueprint: 'mustang-s197',
  },

  /* ── headlights: not on the published tail menu — priced by reply ── */
  {
    slug: 'custom-infinity-headlights',
    name: 'CUSTOM INFINITY HEADLIGHTS',
    sku: 'IM-BUILD-H',
    price: 0,
    desc: 'Commission slot: your OEM housings, opened, mirrored, sealed. Infinity DRL ring, switchback turns, optional demon eye behind the projector. Quoted per housing by reply.',
    chassis: [],
    kind: 'build',
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

/** price display: 0 means the honest answer is a conversation */
export const fmtPrice = (cents: number): string =>
  cents > 0 ? fmtUSD(cents) : 'BY QUOTE';
