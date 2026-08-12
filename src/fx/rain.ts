/* ─── matrix kanji rain — the side gutters bleed light ───────────
   Ported from the MangoMatrix (dragonfruit-drive) gutter rain and
   re-cut for the lightworks: kanji + kana on BOTH sides, columns
   toned in the site's three primaries — pink / cyan / amber — with
   hot heads, the destination-out trail fade, ~18fps cadence, one
   static pre-run frame under reduced motion, and display:none on
   viewports too narrow to have gutters. */

const CELL = 22;
const TICK_MS = 55;                       // ~18fps — rain, not strobe

/* the shop's alphabet: kana + counting + lightworks kanji */
const JP =
  'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ' +
  'マミムメモヤユヨラリルレロワヲン' +
  '光鏡無限影夜灯赤桃青走車零一二三四五六七八九';

interface Tone { body: string; head: string; bodyBench: string; headBench: string }
const TONES: Tone[] = [
  { body: '#ff4fa8', head: '#ffd2e8', bodyBench: '#b0246d', headBench: '#7a1348' }, // pink
  { body: '#4fd8ff', head: '#d8f5ff', bodyBench: '#0b6d8e', headBench: '#074b63' }, // cyan
  { body: '#ffa028', head: '#ffe6b0', bodyBench: '#a86608', headBench: '#7a4a05' }, // amber
];

function makeRain(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  let w = 0, h = 0, cols = 0;
  let drops: number[] = [], tones: number[] = [];

  function resize(): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    w = canvas.clientWidth; h = canvas.clientHeight;
    if (!w || !h) { w = 0; h = 0; return; }     // display:none → skip frames
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.max(1, Math.floor(w / CELL));
    drops = []; tones = [];
    for (let i = 0; i < cols; i++) {
      drops[i] = Math.floor(Math.random() * -42);
      tones[i] = Math.floor(Math.random() * TONES.length);
    }
  }

  function frame(): void {
    if (!w || !h) return;
    const bench = document.documentElement.getAttribute('data-theme') === 'bench';
    // trail: erase a whisper of everything, keeping the canvas transparent
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,0.085)';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.font = `${CELL * 0.8}px "Hiragino Kaku Gothic ProN","Yu Gothic","Noto Sans JP",sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < cols; i++) {
      const x = i * CELL + CELL / 2, y = drops[i] * CELL + CELL / 2;
      const t = TONES[tones[i]];
      const ch = JP[((i * 13 + drops[i] * 7) % JP.length + JP.length) % JP.length];
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = bench ? t.bodyBench : t.body;
      ctx.fillText(ch, x, y);
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = bench ? t.headBench : t.head;
      ctx.fillText(ch, x, y);
      ctx.globalAlpha = 1;
      drops[i]++;
      if (y > h && Math.random() > 0.975) {
        drops[i] = Math.floor(Math.random() * -18);
        tones[i] = Math.floor(Math.random() * TONES.length);  // recolor each pass
      }
    }
  }

  return { resize, frame };
}

/** call once per page — injects both gutter canvases and runs them */
export function mountRain(): void {
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  let reduce = mq.matches;
  const mk = (side: 'l' | 'r'): HTMLCanvasElement => {
    const cv = document.createElement('canvas');
    cv.className = `rain rain-${side}`;
    cv.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cv);
    return cv;
  };
  const rains = [makeRain(mk('l')), makeRain(mk('r'))];
  const sync = (): void => rains.forEach((r) => r.resize());
  sync();
  addEventListener('resize', sync);
  const still = (): void => { for (let n = 0; n < 50; n++) rains.forEach((r) => r.frame()); };
  if (reduce) still();                       // one static populated frame
  let last = 0;
  const loop = (t: number): void => {
    if (!reduce && t - last > TICK_MS) { rains.forEach((r) => r.frame()); last = t; }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  mq.addEventListener('change', (e) => { reduce = e.matches; if (reduce) { sync(); still(); } });
}
