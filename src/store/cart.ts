/* BUILD SHEET (cart) — the XAT Racing cart patterns, trimmed to fit:
   localStorage lines keyed `slug` or `slug::OPTION` so the same lamp in
   two lens tints stays two lines, cross-tab sync via the storage event,
   boot-time sanitation dropping slugs the catalog no longer carries.
   Checkout is a draft quote request (mailto + copyable sheet) — no
   payment processor is wired yet, and the sheet says so honestly. */

import { bySlug, fmtUSD, type Product } from './catalog';

const KEY = 'im-cart';
/** Configure before launch: where quote requests land. */
export const ORDERS_EMAIL = 'orders@infinitymirror.works';

export interface CartLine {
  key: string;      // slug or slug::OPTION
  slug: string;
  option?: string;
  qty: number;
}

type CartMap = Record<string, CartLine>;

function read(): CartMap {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}') as CartMap;
    // sanitize stale slugs on every read — catalog is the truth
    const clean: CartMap = {};
    for (const k of Object.keys(raw)) {
      const line = raw[k];
      if (line && typeof line.qty === 'number' && bySlug(line.slug)) clean[k] = line;
    }
    return clean;
  } catch { return {}; }
}

function write(map: CartMap): void {
  try { localStorage.setItem(KEY, JSON.stringify(map)); } catch { /* blocked */ }
  document.dispatchEvent(new CustomEvent('im:cart-changed'));
}

export function cartLines(): CartLine[] {
  return Object.values(read());
}

export function cartCount(): number {
  return cartLines().reduce((n, l) => n + l.qty, 0);
}

export function lineUnitPrice(line: CartLine): number {
  const p = bySlug(line.slug);
  if (!p) return 0;
  const delta = p.options?.find((o) => o.label === line.option)?.priceDelta ?? 0;
  return p.price + delta;
}

export function cartTotal(): number {
  return cartLines().reduce((n, l) => n + lineUnitPrice(l) * l.qty, 0);
}

export function addToCart(p: Product, option?: string): void {
  const map = read();
  const key = option ? `${p.slug}::${option}` : p.slug;
  const line = map[key] ?? { key, slug: p.slug, option, qty: 0 };
  line.qty += 1;
  map[key] = line;
  write(map);
}

export function setQty(key: string, qty: number): void {
  const map = read();
  if (!map[key]) return;
  if (qty <= 0) delete map[key];
  else map[key].qty = qty;
  write(map);
}

export function clearCart(): void {
  write({});
}

/** cross-tab sync — storage fires only in OTHER tabs */
export function watchCart(onChange: () => void): void {
  document.addEventListener('im:cart-changed', onChange);
  addEventListener('storage', (e) => { if (e.key === KEY) onChange(); });
}

/* ── quote-request checkout ────────────────────────────────────── */

export function buildSheetText(garageLabel: string | null): string {
  const lines = cartLines();
  const rows = lines.map((l) => {
    const p = bySlug(l.slug)!;
    const opt = l.option ? ` [${l.option}]` : '';
    return `${l.qty}× ${p.name}${opt} (${p.sku}) — ${fmtUSD(lineUnitPrice(l) * l.qty)}`;
  });
  return [
    'INFINITY MIRROR WORKS — BUILD SHEET',
    '───────────────────────────────────',
    ...rows,
    '───────────────────────────────────',
    `TOTAL (PARTS): ${fmtUSD(cartTotal())}`,
    garageLabel ? `VEHICLE: ${garageLabel}` : 'VEHICLE: (add your chassis / VIN)',
    '',
    'Draft quote request — shipping + build queue confirmed by reply.',
  ].join('\n');
}

export function mailtoHref(garageLabel: string | null): string {
  const subject = 'Build quote — Infinity Mirror Works';
  return `mailto:${ORDERS_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(buildSheetText(garageLabel))}`;
}
