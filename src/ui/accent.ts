/* Accent scheme toggle — three liveries for the same housing:
     pink     ホットピンク primary (default)
     classic  the original amber
     breathe  --acc slowly cycles pink → cyan → amber (the site's three
              primaries) via a CSS keyframe on :root
   The chip shows the CURRENT scheme; its dot paints itself with the
   live accent, so in breathe mode the dot breathes too. */

import { ensureAudio, relayTick } from './sound';

const KEY = 'im-accent';
export type Accent = 'pink' | 'classic' | 'breathe';
const ORDER: Accent[] = ['pink', 'classic', 'breathe'];
const LABEL: Record<Accent, string> = {
  pink: 'PINK', classic: 'CLASSIC', breathe: 'BREATHE',
};

export function currentAccent(): Accent {
  try {
    const v = localStorage.getItem(KEY) as Accent | null;
    return v && ORDER.includes(v) ? v : 'pink';
  } catch { return 'pink'; }
}

function apply(a: Accent): void {
  document.documentElement.setAttribute('data-accent', a);
  document.querySelectorAll<HTMLElement>('[data-accent-toggle]').forEach((b) => {
    b.innerHTML = `<span class="accdot" aria-hidden="true">●</span> ${LABEL[a]}`;
    b.setAttribute('aria-label', 'Color scheme: ' + LABEL[a]);
  });
}

export function initAccent(): void {
  apply(currentAccent());
  document.querySelectorAll<HTMLElement>('[data-accent-toggle]').forEach((b) =>
    b.addEventListener('click', () => {
      ensureAudio(); relayTick();
      const next = ORDER[(ORDER.indexOf(currentAccent()) + 1) % ORDER.length];
      try { localStorage.setItem(KEY, next); } catch { /* session-only */ }
      apply(next);
    }));
}
