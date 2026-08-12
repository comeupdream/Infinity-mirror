/* Blueprint Lab — pick a chassis, drive its light programs.
   Deep-linkable: /lab.html?bp=gs400-s160 */

import '../fonts.css';
import '../theme.css';
import { LampEngine } from '../lamp/engine';
import { BLUEPRINTS, getBlueprint } from '../lamp/registry';
import type { LampMode } from '../lamp/types';
import { ensureAudio, relayTick } from '../ui/sound';
import { L } from '../ui/lang';
import { initLang } from '../ui/lang';

const $ = <T extends HTMLElement = HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

const engine = new LampEngine($('sheet') as unknown as HTMLCanvasElement);

const params = new URLSearchParams(location.search);
const initial = getBlueprint(params.get('bp') ?? '') ?? BLUEPRINTS[0];
engine.setBlueprint(initial);

/* chassis list */
const list = $('bpList');
function renderList(activeId: string): void {
  list.innerHTML = BLUEPRINTS.map((b) => `
    <button class="bp-item${b.status === 'drafting' ? ' q' : ''}"
      role="option" data-id="${b.id}" aria-pressed="${String(b.id === activeId)}">
      <span>${b.name} · ${b.chassis}</span>
      <span class="yr">${b.years}${b.status === 'drafting' ? ` ・ <span class="st">${L('製図中', 'DRAFTING')}</span>` : ''}</span>
    </button>`).join('');
}
renderList(initial.id);
let activeId = initial.id;
document.addEventListener('im:lang', () => renderList(activeId));
list.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.bp-item');
  if (!btn) return;
  ensureAudio(); relayTick();
  const bp = getBlueprint(btn.dataset.id!);
  if (!bp) return;
  engine.setBlueprint(bp);
  activeId = bp.id;
  renderList(bp.id);
  const url = new URL(location.href);
  url.searchParams.set('bp', bp.id);
  history.replaceState(null, '', url);
});

/* light programs */
const modeBtns = [...$('modes').querySelectorAll<HTMLButtonElement>('.hbtn')];
modeBtns.forEach((b) => b.addEventListener('click', () => {
  ensureAudio(); relayTick();
  modeBtns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  engine.setMode(b.dataset.mode as LampMode);
}));

/* render loop */
function loop(now: number): void {
  engine.frame(now);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

initLang();
