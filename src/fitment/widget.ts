/* Fitment widget — the YMM cascade + VIN plate, mounted anywhere.
   Renders its own DOM, wires the cascade, and funnels every path into
   resolveVehicle() so the page only listens for `im:vehicle-resolved`. */

import { decodeVin } from './vin';
import {
  coveredYears, makesForYear, matchVehicle, modelsFor, readGarage,
  resolveVehicle, type Vehicle,
} from './ymm';

export function mountFitment(host: HTMLElement): void {
  host.innerHTML = `
    <div class="fit-grid">
      <label class="fit-field"><span>YEAR</span>
        <select data-f="year"><option value="">—</option></select></label>
      <label class="fit-field"><span>MAKE</span>
        <select data-f="make" disabled><option value="">—</option></select></label>
      <label class="fit-field"><span>MODEL</span>
        <select data-f="model" disabled><option value="">—</option></select></label>
    </div>
    <div class="fit-vinrow">
      <label class="fit-field vin"><span>VIN PLATE · <span class="jx" data-en="CHASSIS NO.">車台番号</span></span>
        <input data-f="vin" maxlength="17" spellcheck="false" autocomplete="off"
          placeholder="17 CHARACTERS — DECODES YOUR CHASSIS" /></label>
      <button class="hbtn" data-f="decode">DECODE</button>
    </div>
    <div class="fit-hint vfd cy" data-f="hint" role="status"></div>`;

  const q = <T extends HTMLElement>(sel: string): T => host.querySelector<T>(`[data-f="${sel}"]`)!;
  const yearSel = q<HTMLSelectElement>('year');
  const makeSel = q<HTMLSelectElement>('make');
  const modelSel = q<HTMLSelectElement>('model');
  const vinInput = q<HTMLInputElement>('vin');
  const decodeBtn = q<HTMLButtonElement>('decode');
  const hint = q<HTMLDivElement>('hint');

  const fill = (sel: HTMLSelectElement, opts: { value: string; text: string }[]) => {
    sel.innerHTML = '<option value="">—</option>' +
      opts.map((o) => `<option value="${o.value}">${o.text}</option>`).join('');
  };

  fill(yearSel, coveredYears().map((y) => ({ value: String(y), text: String(y) })));

  yearSel.addEventListener('change', () => {
    const y = Number(yearSel.value);
    makeSel.disabled = !y;
    modelSel.disabled = true;
    modelSel.innerHTML = '<option value="">—</option>';
    if (y) fill(makeSel, makesForYear(y).map((m) => ({ value: m, text: m })));
  });

  makeSel.addEventListener('change', () => {
    const y = Number(yearSel.value);
    modelSel.disabled = !makeSel.value;
    if (!makeSel.value) return;
    // value carries the chassis so the pair round-trips through one select
    fill(modelSel, modelsFor(y, makeSel.value).map((v) => ({
      value: v.chassis, text: `${v.model} · ${v.chassis}`,
    })));
  });

  modelSel.addEventListener('change', () => {
    if (!modelSel.value) return;
    const y = Number(yearSel.value);
    const v = modelsFor(y, makeSel.value).find((x) => x.chassis === modelSel.value);
    if (v) apply(v, `${y} ${v.make} ${v.model}`);
  });

  function apply(v: Vehicle, label: string): void {
    hint.textContent = `→ ${label} · ${v.chassis}` +
      (v.blueprint ? ' · BLUEPRINT ON FILE' : '');
    resolveVehicle(v, label);
  }

  async function runDecode(): Promise<void> {
    hint.textContent = 'DECODING…';
    try {
      const r = await decodeVin(vinInput.value);
      const v = matchVehicle(r.year, r.make, r.model);
      const label = `${r.year} ${r.make} ${r.model}`;
      if (v) apply(v, label);
      else hint.textContent = `DECODED ${label.toUpperCase()} — not in the fitment table yet. Pick the closest chassis manually.`;
    } catch (e) {
      hint.textContent = (e instanceof Error ? e.message : 'Decode failed.').toUpperCase();
    }
  }
  decodeBtn.addEventListener('click', () => void runDecode());
  vinInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') void runDecode(); });

  const g = readGarage();
  if (g) hint.textContent = `GARAGE → ${g.label} · ${g.chassis}`;
}
