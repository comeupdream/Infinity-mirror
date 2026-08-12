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

import { currentLang } from '../ui/lang';

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
  /** Japanese copy — the site is kanji-first; EN strings above are the
      toggle's swap targets. options aligns index-for-index. */
  jp?: { name: string; desc: string; eta?: string; options?: string[] };
}

/* the dance ladder — deltas off each construction's no-dance base */
const DANCE = (d2: number, d3: number, d4: number): ProductOption[] => [
  { label: 'NO DANCE · ALL STATIC', priceDelta: 0 },
  { label: 'DANCE · BRAKE + PARK', priceDelta: d2 },
  { label: 'DANCE · TURN SIGNAL', priceDelta: d3 },
  { label: 'FULL DANCE · TURN + BRAKE + PARK', priceDelta: d4 },
];

const DANCE_JP = ['ダンスなし ・ 全て固定', 'ダンス ・ ブレーキ+ポジション', 'ダンス ・ ウインカー', 'フルダンス ・ ウインカー+ブレーキ+ポジション'];

export const SHIPPING_CENTS = 8000; // flat, per order
export const TERMS = [
  'TAILLIGHTS NOT INCLUDED — SHIP YOUR CORES',
  'FLAT $80 SHIPPING',
  '1-YEAR WARRANTY',
];
export const TERMS_JP = [
  'テールランプ本体は含まれません — コアをお送りください',
  '送料一律 $80',
  '1年保証',
];

export const CATALOG: Product[] = [
  /* ── the three constructions, any chassis — No.1–12 ── */
  {
    slug: 'led-tail-build',
    jp: {
      name: 'LEDテール製作',
      desc: '純正ハウジングをLEDアレイで再構築 — メニューNo.1〜4。ダンス（点灯アニメーション）の範囲を選択：全固定、ブレーキ+ポジション、流れるウインカー、フルプログラム。',
      eta: '製作10日',
      options: DANCE_JP,
    },
    name: 'LED TAIL BUILD',
    sku: 'IM-TL-LED',
    price: 95000,
    desc: 'Your OEM housings rebuilt with discrete LED arrays — menu No.1–4. Pick how much of the lamp dances: static, brake + park animation, sequential turns, or the full program.',
    chassis: [],
    eta: '10-DAY BUILD',
    kind: 'build',
    options: DANCE(25000, 25000, 55000),
  },
  {
    slug: 'acrylic-tail-build',
    jp: {
      name: 'アクリルテール製作',
      desc: '削り出しのアクリル導光材をハウジングに内蔵 — 均一なエッジ発光、メニューNo.5〜8。同じダンス構成で、より深いガラス感。',
      eta: '製作10日',
      options: DANCE_JP,
    },
    name: 'ACRYLIC TAIL BUILD',
    sku: 'IM-TL-ACR',
    price: 130000,
    desc: 'Machined acrylic light guides in your housings — the even edge-lit glow, menu No.5–8. Same dance ladder, deeper glass.',
    chassis: [],
    eta: '10-DAY BUILD',
    kind: 'build',
    options: DANCE(25000, 25000, 55000),
  },
  {
    slug: 'infinity-tail-build',
    jp: {
      name: 'インフィニティミラー ・ レンズレス3D製作',
      desc: '当店のシグネチャー — 表面鏡スタックまたはレンズレス3Dアレイをコアに内蔵、メニューNo.9〜12。このサイト全体が動かしている、あの効果です。',
      eta: '製作10日',
      options: DANCE_JP,
    },
    name: 'INFINITY MIRROR · NO-LENS 3D BUILD',
    sku: 'IM-TL-INF',
    price: 165000,
    desc: 'The signature — first-surface mirror stacks or open no-lens 3D arrays built into your cores, menu No.9–12. The effect this whole site runs on.',
    chassis: [],
    eta: '10-DAY BUILD',
    kind: 'build',
    options: DANCE(25000, 25000, 45000),
  },

  /* ── chassis-drafted infinity sets (Blueprint Lab linked) ── */
  {
    slug: 'gs400-infinity-tails',
    jp: {
      name: 'インフィニティテール ・ レクサス GS400',
      desc: 'S160用リアフルセット、インフィニティ仕様 — ホットオーブ中心のサンバーストポッド、デュアル146連LEDフロア、ティアドロップ・ヘイロートランクランプ。実際に納品した参考ビルドのデザイン。',
      eta: '製作10日',
      options: DANCE_JP,
    },
    name: 'INFINITY TAILS · LEXUS GS400',
    sku: 'IM-81551-GS4',
    price: 165000,
    desc: 'Full rear set for the S160 on the infinity ladder — sunburst pods with the hot orb center, dual 146-LED floor, teardrop halo trunk lamps. The shipped design from the reference build.',
    chassis: ['S160'],
    eta: '10-DAY BUILD',
    kind: 'lamp',
    options: DANCE(25000, 25000, 45000),
    blueprint: 'gs400-s160',
  },
  {
    slug: 's197-tribar-tails',
    jp: {
      name: 'トライバー・インフィニティテール ・ マスタング',
      desc: 'S197のトライバーを3本のインフィニティトンネルとして再構築 — 純正準拠の1-2-3シーケンシャルは、ウインカーダンス以上のグレードで対応。',
      eta: '製作10日',
      options: DANCE_JP,
    },
    name: 'TRI-BAR INFINITY TAILS · MUSTANG',
    sku: 'IM-6C-S197',
    price: 165000,
    desc: 'S197 tri-bar rebuilt as three infinity tunnels on the infinity ladder — the factory-correct 1-2-3 chase lives in the turn-dance tiers.',
    chassis: ['S197'],
    eta: '10-DAY BUILD',
    kind: 'lamp',
    options: DANCE(25000, 25000, 45000),
    blueprint: 'mustang-s197',
  },

  /* ── headlights: not on the published tail menu — priced by reply ── */
  {
    slug: 'custom-infinity-headlights',
    jp: {
      name: 'カスタム・インフィニティヘッドライト',
      desc: 'コミッション枠：純正ハウジングを殻割り、ミラー加工、再シール。インフィニティDRLリング、ウインカーポジション（スイッチバック）、プロジェクター奥のデーモンアイも対応。ハウジングごとに個別見積り。',
    },
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
  cents > 0 ? fmtUSD(cents) : (currentLang() === 'en' ? 'BY QUOTE' : '要相談');

/* ── kanji-first display accessors (EN strings are the swap targets) ── */
export const pName = (p: Product): string =>
  currentLang() === 'en' ? p.name : (p.jp?.name ?? p.name);
export const pDesc = (p: Product): string =>
  currentLang() === 'en' ? p.desc : (p.jp?.desc ?? p.desc);
export const pEta = (p: Product): string | undefined =>
  currentLang() === 'en' ? p.eta : (p.jp?.eta ?? p.eta);
/** display label for a canonical (EN) option label */
export const pOptLabel = (p: Product, canonical: string): string => {
  if (currentLang() === 'en' || !p.options || !p.jp?.options) return canonical;
  const i = p.options.findIndex((o) => o.label === canonical);
  return i >= 0 ? (p.jp.options[i] ?? canonical) : canonical;
};
