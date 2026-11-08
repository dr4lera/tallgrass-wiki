# Tallgrass fan-made wiki

Published at https://dr4lera.github.io/tallgrass-wiki/ . Static HTML, CSS and JavaScript; no account connection or game writes.

## Forge update (0.72.2)

Open `#/forge` for the Prism Altar planner: target eligibility, per-look chances, adaptive roll forecasts, sacrifice Dust values and daily queue capacity. `#/guide/prism-altar` explains the process. The Breeding builder now separates forged looks from natural parental bonuses.

Forge settings are the shipped 0.72.2 client defaults, not a read of current online server configuration. The planner accepts local overrides. Existing reference catalogs retain their last full 0.69.0 extraction; new feature guides disclose that boundary.

## Check locally

Run `python3 -m http.server 8766 --bind 127.0.0.1`, then visit `http://127.0.0.1:8766/#/forge`.

Run `node tests/forge.cjs` for price, Dust, transition, adaptive forecast and queue checks, including parity with the bounded shipped formula fixture. `evidence/forge-0.72.2.json` records source identity and limits.
