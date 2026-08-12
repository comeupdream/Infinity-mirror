/* IM-∞88 — the flagship lamp. Wires ignition, the rotary intensity
   knob, turn stalks, beam select, mode presets, section tabs, the
   infinity tunnel hero, the mini blueprint sheet, and fitment. */

import '../fonts.css';
import '../theme.css';
import { Tunnel, type TunnelMode } from '../fx/tunnel';
import { LampEngine } from '../lamp/engine';
import { getBlueprint, BLUEPRINTS } from '../lamp/registry';
import { mountFitment } from '../fitment/widget';
import { readGarage, type ResolvedVehicle } from '../fitment/ymm';
import { CATALOG, fitsChassis, fmtPrice, pDesc, pEta, pName } from '../store/catalog';
import { ensureAudio, powerThunk, relayTick } from '../ui/sound';
import { currentLang, initLang, L } from '../ui/lang';

const $ = <T extends HTMLElement = HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

const stage = $('stage'), unit = $('unit');
const root = document.documentElement;

/* ── state ── */
const S = {
  powered: false,
  intensity: 28,
  beamHigh: false,
  stalk: null as 'L' | 'R' | null,
  modeBeforeStalk: 'drl' as TunnelMode,
};

/* ── tunnel hero ── */
const tunnel = new Tunnel($('tunnel') as unknown as HTMLCanvasElement);

/* ── clock / ticker ── */
const pad2 = (n: number): string => String(n).padStart(2, '0');
function tickClock(): void {
  const d = new Date();
  $('clock').textContent = `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  $('sclock').textContent = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
tickClock(); setInterval(tickClock, 1000);
const tickerFor = (lang: string): string => lang === 'en'
  ? 'INFINITY MIRROR WORKS ・ IM-∞88 LIGHT ENGINE ・ INFINITY MIRROR ・ CUSTOM INFINITY HEADLIGHTS + TAILS ・ 10-DAY BUILDS ・ $300 APPOINTMENT ・ PRESS IGN TO ENTER THE MIRROR ・ GS400 BLUEPRINT LIVE IN THE LAB ・ LIGHT ・ '
  : 'INFINITY MIRROR WORKS ・ IM-∞88 ライトエンジン ・ インフィニティ・ミラー ・ カスタム・インフィニティヘッド＆テールライト ・ 製作10日 ・ 予約金$300 ・ IGNを押してミラーの中へ ・ GS400図面ラボ稼働中 ・ 光 ・ ';
$('ticker').textContent = tickerFor(currentLang()).repeat(2);
document.addEventListener('im:lang', ((e: CustomEvent<string>) => {
  $('ticker').textContent = tickerFor(e.detail).repeat(2);
}) as EventListener);
document.addEventListener('im:lang', () => {
  renderFeatured(); renderBpChips(); setIllumi(illumiNight);
});

/* ── ignition ── */
const pwrBtn = $('pwr');
function powerOn(): void {
  if (S.powered) return;
  S.powered = true;
  ensureAudio(); powerThunk();
  stage.classList.remove('unit-off');
  stage.classList.add('striking');            // M-8 — beam arcs with the lamp
  unit.classList.add('booting');
  pwrBtn.classList.add('on');
  pwrBtn.setAttribute('aria-pressed', 'true');
  tunnel.powered = true;
  tunnel.boot(() => unit.classList.remove('booting'));
  setTimeout(() => unit.classList.remove('booting'), 2400);
  setTimeout(() => stage.classList.remove('striking'), 1800);
}
function powerOff(): void {
  if (!S.powered) return;
  S.powered = false;
  setStalk(null);
  stage.classList.add('unit-off');
  pwrBtn.classList.remove('on');
  pwrBtn.setAttribute('aria-pressed', 'false');
  tunnel.powered = false;
}
pwrBtn.addEventListener('click', () => { S.powered ? powerOff() : powerOn(); });

/* ── illumination (NIGHT / BENCH) ── */
const prefersDark = matchMedia('(prefers-color-scheme: dark)');
let illumiNight = true;
function setIllumi(night: boolean): void {
  illumiNight = night;
  root.setAttribute('data-theme', night ? 'night' : 'bench');
  $('illumiTxt').textContent = night ? L('ナイト', 'NIGHT') : L('ベンチ', 'BENCH');
}
setIllumi(prefersDark.matches);
$('illumi').addEventListener('click', () => {
  ensureAudio(); relayTick();
  setIllumi(root.getAttribute('data-theme') !== 'night');
});

/* ── intensity knob ── */
const knob = $('knob'), ind = $('knobInd');
const IMAX = 40, ROT_MIN = -135, ROT_MAX = 135;
const tunnelCv = $('tunnel') as unknown as HTMLCanvasElement;
function renderKnob(): void {
  const deg = ROT_MIN + (S.intensity / IMAX) * (ROT_MAX - ROT_MIN);
  ind.style.transformOrigin = '50% 44px';
  ind.style.transform = `rotate(${deg}deg)`;
  $('intTxt').textContent = 'INT ' + pad2(S.intensity);
  knob.setAttribute('aria-valuenow', String(S.intensity));
  tunnelCv.style.opacity = String(0.3 + 0.7 * (S.intensity / IMAX));
}
function setIntensity(v: number): void {
  S.intensity = Math.max(0, Math.min(IMAX, Math.round(v)));
  renderKnob();
}
renderKnob();
let dragging = false, cx = 0, cy = 0, startAng = 0, startInt = 0;
const angleOf = (e: PointerEvent): number =>
  Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
knob.addEventListener('pointerdown', (e) => {
  const r = knob.getBoundingClientRect();
  cx = r.left + r.width / 2; cy = r.top + r.height / 2;
  startAng = angleOf(e); startInt = S.intensity; dragging = true;
  knob.setPointerCapture(e.pointerId);
});
knob.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  let delta = angleOf(e) - startAng;
  if (delta > 180) delta -= 360; if (delta < -180) delta += 360;
  setIntensity(startInt + delta / 6);
});
knob.addEventListener('pointerup', () => { dragging = false; });
knob.addEventListener('wheel', (e) => {
  e.preventDefault();
  setIntensity(S.intensity + (e.deltaY < 0 ? 1 : -1));
}, { passive: false });
knob.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { setIntensity(S.intensity + 1); e.preventDefault(); }
  if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { setIntensity(S.intensity - 1); e.preventDefault(); }
});

/* ── beam select (and brake flare in TAIL mode) ── */
const beamBtn = $('beamBtn');
function renderBeam(): void {
  $('beamPos').textContent = S.beamHigh ? 'HIGH' : 'LOW';
  $('beamTxt').textContent = 'BEAM · ' + (S.beamHigh ? 'HIGH' : 'LOW');
  const cast = document.querySelector<HTMLElement>('.beamcast');
  if (cast) cast.style.opacity = S.powered ? (S.beamHigh ? '.3' : '.16') : '0';
  tunnel.brake = tunnel.getMode() === 'tail' && S.beamHigh ? 1 : 0;
}
beamBtn.addEventListener('click', () => {
  ensureAudio(); relayTick(true);
  S.beamHigh = !S.beamHigh;
  renderBeam();
});

/* ── turn stalks — relay-timed sequential while engaged ── */
const turnL = $('turnL'), turnR = $('turnR');
let relayTimer: number | undefined;
function setStalk(side: 'L' | 'R' | null): void {
  if (S.stalk === side) side = null; // pressing again cancels
  if (!S.stalk && side) S.modeBeforeStalk = tunnel.getMode();
  S.stalk = side;
  turnL.setAttribute('aria-pressed', String(side === 'L'));
  turnR.setAttribute('aria-pressed', String(side === 'R'));
  clearInterval(relayTimer);
  if (side) {
    tunnel.setMode('seq');
    $('modeTxt').textContent = 'MODE · TURN ' + side;
    relayTimer = window.setInterval(() => relayTick(), 60000 / 84);
    relayTick();
  } else {
    tunnel.setMode(S.modeBeforeStalk);
    $('modeTxt').textContent = 'MODE · ' + S.modeBeforeStalk.toUpperCase();
  }
}
turnL.addEventListener('click', () => { ensureAudio(); setStalk('L'); });
turnR.addEventListener('click', () => { ensureAudio(); setStalk('R'); });

/* ── mode presets ── */
const presets = [...document.querySelectorAll<HTMLButtonElement>('.preset')];
presets.forEach((p) => p.addEventListener('click', () => {
  ensureAudio(); relayTick();
  presets.forEach((x) => x.setAttribute('aria-pressed', String(x === p)));
  const mode = p.dataset.mode as TunnelMode;
  setStalk(null);
  tunnel.setMode(mode);
  S.modeBeforeStalk = mode;
  $('modeTxt').textContent = 'MODE · ' + mode.toUpperCase();
  const station = currentLang() === 'en'
    ? (p.dataset.stationEn ?? p.dataset.station ?? '')
    : (p.dataset.station ?? '');
  $('ticker').textContent = (station + ' ・ ').repeat(3);
  renderBeam();
}));

/* ── section tabs ── */
const tabs = [...document.querySelectorAll<HTMLButtonElement>('.src')];
const panels: Record<string, string> = {
  shop: 'p-shop', lab: 'p-lab', fitment: 'p-fitment', builds: 'p-builds', about: 'p-about',
};
let activePanel = 'shop';
function selectTab(key: string): void {
  activePanel = key;
  tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.panel === key)));
  for (const k of Object.keys(panels)) $(panels[k]).classList.toggle('active', k === key);
  $('srcTag').textContent = 'SRC · ' + key.toUpperCase();
}
tabs.forEach((t) => t.addEventListener('click', () => { ensureAudio(); relayTick(); selectTab(t.dataset.panel!); }));

/* ── featured products ── */
function renderFeatured(): void {
  const garage = readGarage();
  const featured = CATALOG.filter((p) =>
    ['gs400-infinity-tails', 's197-tribar-tails', 'custom-infinity-headlights'].includes(p.slug));
  $('featured').innerHTML = featured.map((p) => {
    const fit = fitsChassis(p, garage?.chassis ?? null)
      ? `<span class="fit yes">${L(`✓ ${garage!.chassis}に適合`, `✓ FITS YOUR ${garage!.chassis}`)}</span>`
      : p.kind === 'build' ? `<span class="fit build">${L('受注製作', 'BUILT TO ORDER')}</span>` : '';
    return `<div class="prod">
      <span class="nm">${pName(p)}</span>
      <span class="sku">${p.sku}${pEta(p) ? ' ・ ' + pEta(p) : ''}</span>
      <span class="pr">${fmtPrice(p.price)}</span>
      ${fit}
      <span style="font-size:11.5px;color:var(--silk);line-height:1.5;">${pDesc(p)}</span>
    </div>`;
  }).join('');
}
renderFeatured();

/* ── blueprint mini sheet + registry chips ── */
const labEngine = new LampEngine($('labMini') as unknown as HTMLCanvasElement);
labEngine.setBlueprint(getBlueprint('gs400-s160')!);
labEngine.setMode('CYCLE');
function renderBpChips(): void {
  $('bpChips').innerHTML = BLUEPRINTS.map((b) =>
    `<span class="bp-chip${b.status === 'drafting' ? ' q' : ''}">${b.chassis}${b.status === 'drafting' ? L(' · 製図中', ' · QUEUED') : L(' · 稼働中', ' · LIVE')}</span>`,
  ).join('');
}
renderBpChips();

/* ── fitment ── */
mountFitment($('fitmentMount'));
function renderGarage(g: ResolvedVehicle | null): void {
  const chip = $('garChip');
  chip.textContent = 'GARAGE · ' + (g ? g.chassis : '—');
  chip.classList.toggle('on', Boolean(g));
  renderFeatured();
}
renderGarage(readGarage());
document.addEventListener('im:vehicle-resolved', ((e: CustomEvent<ResolvedVehicle>) => {
  renderGarage(e.detail);
}) as EventListener);

/* ── render loop ── */
const mirrorEl = document.querySelector<HTMLElement>('.mirrorwrap');
let lastHal = '';
function loop(now: number): void {
  tunnel.frame(now);
  // M-7 — housing picks up the lamp's spill
  const hal = S.powered ? tunnel.halationCSS() : 'rgba(0,0,0,0)';
  if (hal !== lastHal && mirrorEl) {
    mirrorEl.style.setProperty('--halation', hal);
    lastHal = hal;
  }
  if (activePanel === 'lab') labEngine.frame(now);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

initLang();
