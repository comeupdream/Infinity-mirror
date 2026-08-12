/* ─── M-9 (motion half) — tilt the phone, peer into the lamp ─────
   deviceorientation drives the same parallax the pointer drives on
   desktop: the tunnel's off-axis swing (deep rings lagging harder —
   the real infinity-mirror giveaway) plus a gentle 3D lean on the
   housing itself, like turning the physical unit in your hands.

   · neutral pose is captured from the first reading and drifts
     slowly toward how the phone is actually held, so any grip works
   · axes remap with screen orientation (portrait / landscape)
   · iOS 13+ needs a user-gesture permission — arm() is called from
     the ignition button, so IGN grants the sensors
   · coarse-pointer devices only; reduced-motion never mounts */

const RANGE_DEG = 20;        // tilt reaching full parallax
const LEAN_X = 4.5;          // housing rotateY at full swing (deg)
const LEAN_Y = 3.5;          // housing rotateX at full swing (deg)

interface TiltHandle { arm: () => void }

export function mountTilt(
  unit: HTMLElement,
  apply: (x: number, y: number) => void,
): TiltHandle {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  if (reduce || !coarse || !('DeviceOrientationEvent' in window)) {
    return { arm: () => { /* no sensors to grant */ } };
  }

  let baseB: number | null = null, baseG: number | null = null;
  let tx = 0, ty = 0;          // targets, -1..1
  let cx = 0, cy = 0;          // eased
  let listening = false;
  let raf = 0;

  const onOrient = (e: DeviceOrientationEvent): void => {
    if (e.beta == null || e.gamma == null) return;
    // remap tilt axes to the screen's current rotation
    const angle = (screen.orientation?.angle ?? 0) as number;
    let b = e.beta, g = e.gamma;
    if (angle === 90) { const t = b; b = -g; g = t; }
    else if (angle === -90 || angle === 270) { const t = b; b = g; g = -t; }
    else if (angle === 180) { b = -b; g = -g; }
    if (baseB === null || baseG === null) { baseB = b; baseG = g; }
    // neutral drifts toward the actual grip so long holds re-center
    baseB += (b - baseB) * 0.004;
    baseG += (g - baseG) * 0.004;
    tx = Math.max(-1, Math.min(1, (g - baseG) / RANGE_DEG));
    ty = Math.max(-1, Math.min(1, (b - baseB) / RANGE_DEG));
  };

  const tick = (): void => {
    cx += (tx - cx) * 0.09;
    cy += (ty - cy) * 0.09;
    unit.style.transform = `rotateY(${(cx * LEAN_X).toFixed(2)}deg) rotateX(${(-cy * LEAN_Y).toFixed(2)}deg)`;
    apply(cx, cy);
    raf = requestAnimationFrame(tick);
  };

  const listen = (): void => {
    if (listening) return;
    listening = true;
    addEventListener('deviceorientation', onOrient, { passive: true });
    unit.style.willChange = 'transform';
    raf = raf || requestAnimationFrame(tick);
  };

  const arm = (): void => {
    type PermFn = () => Promise<'granted' | 'denied'>;
    const req = (DeviceOrientationEvent as unknown as { requestPermission?: PermFn }).requestPermission;
    if (typeof req === 'function') {
      req.call(DeviceOrientationEvent)
        .then((r) => { if (r === 'granted') listen(); })
        .catch(() => { /* denied or unavailable — pointer parallax remains */ });
    } else {
      listen();                 // Android / older iOS — no gate
    }
  };

  return { arm };
}
