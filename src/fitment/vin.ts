/* ═══════════════════════════════════════════════════════════════════
   VIN DECODE — ported from XAT Racing's ymm.js (NHTSA vPIC, free,
   keyless, CORS-open), upgraded with the two things that build was
   missing: ISO 3779 check-digit validation and a localStorage memo
   (vPIC responses are immutable per VIN, so cache forever).
   ═══════════════════════════════════════════════════════════════════ */

const VPIC = 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/';
const CACHE_KEY = 'im-vin-cache';
const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/; // 17 chars, no I O Q — ever

export interface VinResult {
  vin: string;
  year: number;
  make: string;
  model: string;
  series: string;
  trim: string;
  bodyClass: string;
}

/** ISO 3779 position-9 check digit. Returns true when the VIN is
    internally consistent (catches typos before any network call). */
export function vinCheckDigit(vin: string): boolean {
  const translit: Record<string, number> = {
    A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
    J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
    S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
  };
  const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const ch = vin[i];
    const v = ch >= '0' && ch <= '9' ? Number(ch) : translit[ch];
    if (v === undefined) return false;
    sum += v * weights[i];
  }
  const rem = sum % 11;
  const check = rem === 10 ? 'X' : String(rem);
  return vin[8] === check;
}

export function vinFormatOk(vin: string): boolean {
  return VIN_RE.test(vin);
}

function readCache(): Record<string, VinResult> {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); }
  catch { return {}; }
}

function writeCache(cache: Record<string, VinResult>): void {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch { /* full/blocked — skip */ }
}

/** Decode via vPIC. Throws Error with a user-facing message on failure. */
export async function decodeVin(raw: string): Promise<VinResult> {
  const vin = raw.trim().toUpperCase();
  if (!vinFormatOk(vin)) throw new Error('VIN must be 17 characters (no I, O, Q).');
  if (!vinCheckDigit(vin)) throw new Error('Check digit failed — re-read the plate (position 9 is a checksum).');

  const cache = readCache();
  if (cache[vin]) return cache[vin];

  let d: { Results?: Array<Record<string, string>> };
  try {
    const r = await fetch(VPIC + vin + '?format=json');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    d = await r.json();
  } catch {
    throw new Error('VIN service unreachable — use the Year/Make/Model picker.');
  }
  const row = (d.Results && d.Results[0]) || {};
  const year = Number(row.ModelYear) || 0;
  if (!year || !row.Make) throw new Error('Could not decode that VIN.');

  const result: VinResult = {
    vin,
    year,
    make: String(row.Make || ''),
    model: String(row.Model || ''),
    series: String(row.Series || ''),
    trim: String(row.Trim || ''),
    bodyClass: String(row.BodyClass || ''),
  };
  cache[vin] = result;
  writeCache(cache);
  return result;
}
