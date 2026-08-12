/* JP / EN accent toggle. The site speaks kanji first — the shop's
   accents are Japanese because the builder is — and the toggle swaps
   every marked accent for a tiny English equivalent in exactly the
   same spot, same styling, slightly smaller so it stays an accent.

   Mark accents:   <span class="jx" data-en="LIGHT">光</span>
   Toggle chips:   <button data-lang-toggle …>
   Dynamic strings (the home ticker) listen for the `im:lang` event. */

import { ensureAudio, relayTick } from './sound';

const KEY = 'im-lang';
export type Lang = 'jp' | 'en';

export function currentLang(): Lang {
  try { return localStorage.getItem(KEY) === 'en' ? 'en' : 'jp'; } catch { return 'jp'; }
}

/** pick per current language — for JS-rendered strings */
export const L = (jp: string, en: string): string =>
  currentLang() === 'en' ? en : jp;

function apply(lang: Lang): void {
  document.documentElement.setAttribute('data-lang', lang);
  document.documentElement.lang = lang === 'jp' ? 'ja' : 'en';
  document.querySelectorAll<HTMLElement>('.jx').forEach((el) => {
    if (el.dataset.jp === undefined) el.dataset.jp = el.textContent ?? '';
    const next = lang === 'en' ? el.dataset.en : el.dataset.jp;
    if (next !== undefined && el.textContent !== next) el.textContent = next;
  });
  // chip shows the language you'd switch TO
  document.querySelectorAll<HTMLElement>('[data-lang-toggle]').forEach((b) => {
    b.textContent = lang === 'jp' ? 'EN' : '日本語';
    b.setAttribute('aria-pressed', String(lang === 'en'));
  });
}

export function setLang(lang: Lang): void {
  try { localStorage.setItem(KEY, lang); } catch { /* session-only */ }
  apply(lang);
  document.dispatchEvent(new CustomEvent<Lang>('im:lang', { detail: lang }));
}

/** call once per page, after the first render */
export function initLang(): void {
  apply(currentLang());
  document.querySelectorAll<HTMLElement>('[data-lang-toggle]').forEach((b) =>
    b.addEventListener('click', () => {
      ensureAudio(); relayTick();
      setLang(currentLang() === 'jp' ? 'en' : 'jp');
    }));
}
