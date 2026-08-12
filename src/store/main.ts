/* STORE — catalog grid with honest fitment badges, the BUILD SHEET
   drawer, and the draft-quote checkout. Garage state flows in from the
   fitment widget via `im:vehicle-resolved`. */

import '../fonts.css';
import '../theme.css';
import { mountFitment } from '../fitment/widget';
import { readGarage, type ResolvedVehicle } from '../fitment/ymm';
import { CATALOG, bySlug, fitsChassis, fmtPrice, fmtUSD, pDesc, pEta, pName, pOptLabel, type Product } from './catalog';
import {
  addToCart, buildSheetText, cartGrand, cartLines, cartShipping,
  cartTotal, lineUnitPrice, mailtoHref, setQty, watchCart,
} from './cart';
import { ensureAudio, relayTick } from '../ui/sound';
import { L } from '../ui/lang';
import { initLang } from '../ui/lang';
import { initAccent } from '../ui/accent';
import { mountRain } from '../fx/rain';

const $ = <T extends HTMLElement = HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

let garage: ResolvedVehicle | null = readGarage();
let fitsOnly = false;

/* ── product grid ── */
function badge(p: Product): string {
  if (fitsChassis(p, garage?.chassis ?? null)) {
    return `<span class="fit yes">${L(`✓ ${garage!.chassis}に適合`, `✓ FITS YOUR ${garage!.chassis}`)}</span>`;
  }
  if (p.kind === 'build') return `<span class="fit build">${L('受注製作 ・ 全車種対応', 'BUILT TO ORDER ・ ANY CHASSIS')}</span>`;
  if (p.chassis.length && garage) return `<span class="fit no">${L(`✕ ${garage.chassis}には非適合`, `✕ NOT FOR ${garage.chassis}`)}</span>`;
  if (p.chassis.length) return `<span class="fit build">${p.chassis.join(' · ')}</span>`;
  return `<span class="fit build">${L('汎用パーツ', 'UNIVERSAL PART')}</span>`;
}

function renderGrid(): void {
  const items = CATALOG.filter((p) =>
    !fitsOnly || fitsChassis(p, garage?.chassis ?? null) || p.kind === 'build');
  $('grid').innerHTML = items.map((p) => `
    <div class="prod" data-slug="${p.slug}">
      <span class="nm">${pName(p)}</span>
      <span class="sku">${p.sku}${pEta(p) ? ' ・ ' + pEta(p) : ''}</span>
      <span class="pr">${fmtPrice(p.price)}</span>
      ${badge(p)}
      <span class="desc">${pDesc(p)}</span>
      ${p.blueprint ? `<a class="bplink" href="/lab.html?bp=${p.blueprint}">${L('▸ 図面ラボで動きを見る', '▸ SEE IT RUN IN THE BLUEPRINT LAB')}</a>` : ''}
      ${p.options ? `<select data-opt>${p.options.map((o) =>
        `<option>${pOptLabel(p, o.label)}${o.priceDelta ? ' (+' + fmtUSD(o.priceDelta) + ')' : ''}</option>`).join('')}</select>` : ''}
      <div class="addrow"><button class="hbtn add" data-add>${L('+ ビルドシートに追加', '+ ADD TO BUILD SHEET')}</button></div>
    </div>`).join('');
}

/* live price: the card's label re-prices the moment a dance tier is
   picked — before anything touches the build sheet */
$('grid').addEventListener('change', (e) => {
  const sel = (e.target as HTMLElement).closest<HTMLSelectElement>('[data-opt]');
  if (!sel) return;
  ensureAudio(); relayTick();
  const card = sel.closest<HTMLElement>('.prod')!;
  const p = bySlug(card.dataset.slug!)!;
  const delta = p.options?.[sel.selectedIndex]?.priceDelta ?? 0;
  const pr = card.querySelector<HTMLElement>('.pr');
  if (!pr) return;
  pr.textContent = fmtPrice(p.price + delta);
  pr.classList.remove('bump');
  void pr.offsetWidth;                 // restart the pulse
  pr.classList.add('bump');
});

$('grid').addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-add]');
  if (!btn) return;
  ensureAudio(); relayTick(true);
  const card = btn.closest<HTMLElement>('.prod')!;
  const p = bySlug(card.dataset.slug!)!;
  const optSel = card.querySelector<HTMLSelectElement>('[data-opt]');
  const option = optSel ? p.options![optSel.selectedIndex].label : undefined;
  addToCart(p, option);
});

/* ── build sheet ── */
function renderSheet(): void {
  const lines = cartLines();
  $('lines').innerHTML = lines.length ? lines.map((l) => {
    const p = bySlug(l.slug)!;
    return `<div class="line">
      <span class="n">${pName(p)}${l.option ? `<small>${pOptLabel(p, l.option)}</small>` : ''}</span>
      <span class="q">
        <button class="hbtn" data-dec="${l.key}">−</button>
        <span class="vfd am" style="font-size:16px;">${l.qty}</span>
        <button class="hbtn" data-inc="${l.key}">+</button>
      </span>
      <span class="amt">${lineUnitPrice(l) ? fmtUSD(lineUnitPrice(l) * l.qty) : L('要相談', 'QUOTE')}</span>
    </div>`;
  }).join('') : `<div class="empty">${L('シートは空 ・ ランプを追加してください', 'SHEET EMPTY ・ ADD A LAMP')}</div>`;
  $('total').textContent = fmtUSD(cartTotal());
  $('shipAmt').textContent = lines.length ? fmtUSD(cartShipping()) : '—';
  $('grand').textContent = fmtUSD(cartGrand());
  ($('quoteBtn') as HTMLAnchorElement).href = mailtoHref(garage?.label ?? null);
}

$('lines').addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  const dec = t.closest<HTMLElement>('[data-dec]')?.dataset.dec;
  const inc = t.closest<HTMLElement>('[data-inc]')?.dataset.inc;
  if (!dec && !inc) return;
  ensureAudio(); relayTick();
  const key = (dec ?? inc)!;
  const line = cartLines().find((l) => l.key === key);
  if (line) setQty(key, line.qty + (inc ? 1 : -1));
});

$('copyBtn').addEventListener('click', () => {
  void navigator.clipboard?.writeText(buildSheetText(garage?.label ?? null)).then(() => {
    $('copyOk').textContent = L('✓ コピーしました', '✓ SHEET COPIED');
    setTimeout(() => { $('copyOk').textContent = ''; }, 2500);
  });
});

watchCart(renderSheet);

/* ── fitment / garage ── */
mountFitment($('fitmentMount'));
function renderGarage(): void {
  const chip = $('garChip');
  if (garage) {
    chip.textContent = `${garage.label.toUpperCase()} · ${garage.chassis}`;
    chip.classList.remove('none');
  } else {
    chip.textContent = L('車両未登録', 'NO VEHICLE SAVED');
    chip.classList.add('none');
  }
}
document.addEventListener('im:vehicle-resolved', ((e: CustomEvent<ResolvedVehicle>) => {
  garage = e.detail;
  fitsOnly = true; // auto-engage the filter, XAT style
  $('fitsOnly').setAttribute('aria-pressed', 'true');
  renderGarage(); renderGrid(); renderSheet();
}) as EventListener);

$('fitsOnly').addEventListener('click', () => {
  ensureAudio(); relayTick();
  fitsOnly = !fitsOnly;
  $('fitsOnly').setAttribute('aria-pressed', String(fitsOnly));
  renderGrid();
});

renderGarage();
renderGrid();
renderSheet();
document.addEventListener('im:lang', () => { renderGarage(); renderGrid(); renderSheet(); });

initLang();
initAccent();
mountRain();
