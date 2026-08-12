/* ─── matrix kanji rain — the side gutters bleed light ───────────
   Ported from the MangoMatrix (dragonfruit-drive) gutter rain and
   re-cut for the lightworks: kanji + kana on BOTH sides, columns
   toned in the site's three primaries — pink / cyan / amber — with
   hot heads, the destination-out trail fade, ~18fps cadence, one
   static pre-run frame under reduced motion, and display:none on
   viewports too narrow to have gutters. */

const CELL = 22;
const TICK_MS = 55;                       // ~18fps — rain, not strobe

/* not noise — every column rains a real word, top to bottom.
   Two currents: the road and the spirit. */
const WORDS = [
  // 道 — the road
  '尾灯',      // taillight
  '前照灯',    // headlight
  '走り屋',    // street racer
  '峠',        // mountain pass
  '湾岸',      // wangan
  '首都高',    // Shuto expressway
  '環状',      // the kanjo loop
  '深夜走行',  // midnight run
  '全開',      // full throttle
  '加速',      // acceleration
  '愛車',      // beloved car
  '車魂',      // car soul
  '改',        // modified
  // 魂 — the spirit
  '無限',      // infinity
  '鏡',        // mirror
  '光',        // light
  '魂',        // soul
  '禅',        // zen
  '無我',      // selflessness
  '永遠',      // eternity
  '輪廻',      // samsara — rebirth, the loop
  '悟り',      // enlightenment
  '合掌',      // pressed hands — the builder's 🙏
  '匠',        // master craftsman
  '道',        // the way
  '誠',        // sincerity
  '光明',      // radiance
  '職人魂',    // craftsman's soul
  '一期一会',  // once-in-a-lifetime encounter
  // where they meet
  '走馬灯',    // the revolving lantern — life flashing past
  '灯火',      // lamplight
  '無限鏡',    // infinity mirror
  '光の回廊',  // corridor of light
  '八十八',    // 88 — the IM-∞88
];
const GAP = '　';  // full-width space — the silence between words

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
  let queues: string[] = [];

  /** next glyph for column i — words stream whole, gaps between them,
      and each new word re-rolls the column's tone */
  function takeChar(i: number): string {
    if (!queues[i]) {
      tones[i] = Math.floor(Math.random() * TONES.length);
      queues[i] = WORDS[Math.floor(Math.random() * WORDS.length)] +
        (Math.random() < 0.6 ? GAP : GAP + GAP);
    }
    const ch = queues[i][0];
    queues[i] = queues[i].slice(1);
    return ch;
  }

  function resize(): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    w = canvas.clientWidth; h = canvas.clientHeight;
    if (!w || !h) { w = 0; h = 0; return; }     // display:none → skip frames
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.max(1, Math.floor(w / CELL));
    drops = []; tones = []; queues = [];
    for (let i = 0; i < cols; i++) {
      drops[i] = Math.floor(Math.random() * -42);
      tones[i] = Math.floor(Math.random() * TONES.length);
      queues[i] = '';
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
      const ch = takeChar(i);
      if (ch !== GAP) {
        const t = TONES[tones[i]];
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = bench ? t.bodyBench : t.body;
        ctx.fillText(ch, x, y);
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = bench ? t.headBench : t.head;
        ctx.fillText(ch, x, y);
        ctx.globalAlpha = 1;
      }
      drops[i]++;
      if (y > h && Math.random() > 0.975) {
        drops[i] = Math.floor(Math.random() * -18);
        queues[i] = '';   // restart clean on a fresh word + tone
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
