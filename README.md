# Infinity Mirror Works 光

Flagship UI + store for a custom lightworks: **infinity-mirror headlights and
tail lights**. The site doesn't show the product — it *is* the product. You
arrive inside a sealed lamp: press **IGN** and dive through the mirror tunnel;
the housing UI materializes around you. Same design religion as the
MangoMatrix MM-9255 head unit (a page that is a physical device, VFD glow,
machined bezels, honest switchgear) — re-machined from audio to optics,
音 → 光.

## Pages

| Page | What it is |
|------|-----------|
| `index.html` | **IM-∞88 LIGHT ENGINE** — the lamp itself. Ignition, rotary intensity knob, turn stalks (relay-timed), beam select, six light modes driving the infinity tunnel, and five sections (SHOP / LAB / FITMENT / BUILDS / ABOUT). |
| `lab.html` | **BLUEPRINT LAB** — procedural tail-light prints. Pick a chassis, drive PARK / BRAKE / SEQ TURN / REVERSE / SHOW / FULL CYCLE. Deep-link with `?bp=<id>`. |
| `store.html` | **STORE** — catalog with honest fitment badges, the BUILD SHEET (cart), and draft-quote checkout. |

## The blueprint scaffold (start with one, scale to many)

A car's tail light is **pure data** — `src/lamp/blueprints/<car>.ts` exports a
`LampBlueprint`: housing outline, lens elements (pods) with roles + infinity
depth, LED runs, dimension callouts. `src/lamp/engine.ts` renders any
blueprint as a living cyan technical print and runs the light programs; it
knows *roles*, never car names.

- **Live sheets:** Lexus GS400 (S160) — the flagship — and Ford Mustang
  (S197) tri-bar with the 1-2-3 sequential (`seq` ordering on elements is all
  the engine needs).
- **Drafting queue:** Supra A80, R34, S14 kouki, DC2, JZX100, Camaro 5G,
  Challenger LC, IS300 — registered in `src/lamp/registry.ts`, geometry lands
  as reference photos arrive. **Adding a car = one data file + one registry
  line.**

GS400 geometry is a stylized draft awaiting photo-match against the real
lamps (reference shots incoming) — tuning is coordinate editing only.

## Auto tech (ported from XAT Racing, upgraded)

- **VIN decode** (`src/fitment/vin.ts`) — NHTSA vPIC `DecodeVinValues`
  (free, keyless, CORS-open), plus the two things the original lacked:
  ISO 3779 check-digit validation and a localStorage memo (vPIC responses
  are immutable per VIN).
- **YMM** (`src/fitment/ymm.ts`) — hand-curated year-range-per-platform
  table with chassis codes; Year dropdown is the union of real coverage.
  Platforms link to their Blueprint Lab sheet. Both the picker and the VIN
  path funnel into one `im:vehicle-resolved` event.
- **Fitment rule** (`src/store/catalog.ts`) — "FITS YOUR CAR" requires
  **positive evidence** (product explicitly lists your chassis); build slots
  never badge. Garage persists in localStorage with stale-key sanitation.
- **Cart** (`src/store/cart.ts`) — option-aware line keys
  (`slug::OPTION`), cross-tab sync, stale-slug sanitation, draft-quote
  checkout (mailto + copyable sheet).

## Run it

```bash
npm install
npm run dev        # index.html · /lab.html · /store.html
npm run build      # type-check + bundle to dist/
```

## Before launch

- Set `ORDERS_EMAIL` in `src/store/cart.ts` (currently a placeholder).
- Drop build photos/reels into the BUILDS panel slots.
- Photo-match the GS400 sheet, then clear the drafting queue one data file
  at a time.
