/* ═══════════════════════════════════════════════════════════════════
   YEAR / MAKE / MODEL — the XAT Racing pattern: a hand-curated,
   year-range-per-platform table (not a row per model-year), cascading
   dropdowns whose Year list is the union of real coverage, and ONE
   hand-off event both the picker and the VIN decoder funnel into.
   Platforms carry chassis codes and, when the Blueprint Lab has the
   car, a blueprint id — fitment, lab, and store all key off chassis.
   ═══════════════════════════════════════════════════════════════════ */

export interface Vehicle {
  make: string;
  model: string;
  from: number;
  to: number;
  chassis: string;
  /** Blueprint Lab sheet for this platform, when drafted */
  blueprint?: string;
}

export interface ResolvedVehicle {
  chassis: string;
  label: string;
  blueprint?: string;
}

/** Curated 1990s–2014 lightworks coverage. Editing this table IS
    editing the site's fitment — everything else derives from it. */
export const VEHICLES: Vehicle[] = [
  { make: 'Lexus', model: 'GS300 GS400 GS430', from: 1998, to: 2005, chassis: 'S160', blueprint: 'gs400-s160' },
  { make: 'Lexus', model: 'IS300', from: 2001, to: 2005, chassis: 'XE10', blueprint: 'is300-xe10' },
  { make: 'Lexus', model: 'SC300 SC400', from: 1992, to: 2000, chassis: 'Z30' },
  { make: 'Lexus', model: 'LS400', from: 1995, to: 2000, chassis: 'XF20' },
  { make: 'Toyota', model: 'Supra', from: 1993, to: 1998, chassis: 'A80', blueprint: 'supra-a80' },
  { make: 'Toyota', model: 'Chaser', from: 1996, to: 2001, chassis: 'JZX100', blueprint: 'chaser-jzx100' },
  { make: 'Nissan', model: '240SX', from: 1995, to: 1998, chassis: 'S14', blueprint: 's14-kouki' },
  { make: 'Nissan', model: 'Skyline GT-R', from: 1999, to: 2002, chassis: 'BNR34', blueprint: 'skyline-r34' },
  { make: 'Nissan', model: '350Z', from: 2003, to: 2008, chassis: 'Z33' },
  { make: 'Nissan', model: '370Z', from: 2009, to: 2014, chassis: 'Z34' },
  { make: 'Honda', model: 'Civic', from: 1996, to: 2000, chassis: 'EK' },
  { make: 'Honda', model: 'S2000', from: 2000, to: 2009, chassis: 'AP1/AP2' },
  { make: 'Acura', model: 'Integra', from: 1994, to: 2001, chassis: 'DC2', blueprint: 'integra-dc2' },
  { make: 'Mazda', model: 'RX-7', from: 1993, to: 2002, chassis: 'FD3S' },
  { make: 'Mazda', model: 'RX-8', from: 2004, to: 2011, chassis: 'SE3P' },
  { make: 'Mitsubishi', model: 'Lancer Evolution', from: 2003, to: 2006, chassis: 'CT9A' },
  { make: 'Mitsubishi', model: 'Lancer Evolution X', from: 2008, to: 2014, chassis: 'CZ4A' },
  { make: 'Subaru', model: 'Impreza WRX STI', from: 2002, to: 2007, chassis: 'GD' },
  { make: 'Subaru', model: 'WRX STI', from: 2008, to: 2014, chassis: 'GR/GV' },
  { make: 'Ford', model: 'Mustang', from: 1999, to: 2004, chassis: 'SN95-NE' },
  { make: 'Ford', model: 'Mustang', from: 2005, to: 2009, chassis: 'S197', blueprint: 'mustang-s197' },
  { make: 'Ford', model: 'Mustang', from: 2010, to: 2014, chassis: 'S197-II' },
  { make: 'Chevrolet', model: 'Camaro', from: 2010, to: 2014, chassis: 'GEN5', blueprint: 'camaro-5g' },
  { make: 'Dodge', model: 'Challenger', from: 2008, to: 2014, chassis: 'LC', blueprint: 'challenger-lc' },
  { make: 'BMW', model: '3-Series', from: 1999, to: 2006, chassis: 'E46' },
  { make: 'Volkswagen', model: 'Golf GTI', from: 1999, to: 2005, chassis: 'MK4' },
];

export const fits = (v: Vehicle, year: number): boolean => year >= v.from && year <= v.to;

/** Years = union of every platform's real span, newest first — a straight
    min..max range would advertise years nobody's lamp covers. */
export function coveredYears(): number[] {
  const set = new Set<number>();
  for (const v of VEHICLES) for (let y = v.from; y <= v.to; y++) set.add(y);
  return [...set].sort((a, b) => b - a);
}

export function makesForYear(year: number): string[] {
  const set = new Set<string>();
  for (const v of VEHICLES) if (fits(v, year)) set.add(v.make);
  return [...set].sort();
}

export function modelsFor(year: number, make: string): Vehicle[] {
  return VEHICLES.filter((v) => v.make === make && fits(v, year));
}

/** Fuzzy platform match for VIN-decoded make/model strings. */
export function matchVehicle(year: number, make: string, model: string): Vehicle | undefined {
  const mk = make.toLowerCase();
  const md = model.toLowerCase();
  return VEHICLES.find((v) =>
    v.make.toLowerCase() === mk && fits(v, year) &&
    (v.model.toLowerCase().includes(md) ||
      md.includes(v.model.split(' ')[0].toLowerCase())));
}

/* ── garage: the saved vehicle, one per browser ────────────────── */
const GARAGE_KEY = 'im-garage';

export function readGarage(): ResolvedVehicle | null {
  try {
    const g = JSON.parse(localStorage.getItem(GARAGE_KEY) || 'null') as ResolvedVehicle | null;
    // stale-key sanitation: clear picks the table no longer carries
    if (g && !VEHICLES.some((v) => v.chassis === g.chassis)) return null;
    return g;
  } catch { return null; }
}

export function writeGarage(g: ResolvedVehicle | null): void {
  try {
    if (g) localStorage.setItem(GARAGE_KEY, JSON.stringify(g));
    else localStorage.removeItem(GARAGE_KEY);
  } catch { /* blocked — session-only */ }
}

/** The single hand-off contract — picker and VIN both end here. */
export function resolveVehicle(v: Vehicle, label: string): void {
  const detail: ResolvedVehicle = { chassis: v.chassis, label, blueprint: v.blueprint };
  writeGarage(detail);
  document.dispatchEvent(new CustomEvent<ResolvedVehicle>('im:vehicle-resolved', { detail }));
}
