# GreenMile Frontend

React, Vite, Tailwind, Firebase Authentication, React Router, and Google Maps power the battery-aware journey planner. Backend research calculations remain server-side.

## Run locally

From this directory, with Node and npm available:

```sh
npm install
npm run dev
npm run lint
npm run build
npm run preview
```

The existing backend must run separately. Set `VITE_API_BASE_URL` to its `/api` base; development defaults to `http://localhost:5000/api`. Configure the six `VITE_FIREBASE_*` fields used in `src/firebase/firebase.js` and `VITE_GOOGLE_MAPS_API_KEY` in your local environment. Never put backend credentials in frontend variables or commit `.env` files. This phase did not change configuration values.

## Organization

- `src/api/`: authenticated JSON client and focused endpoint modules.
- `src/context/`: authentication state and account-safe profile orchestration.
- `src/hooks/`: authentication access, atomic battery polling, and route searches.
- `src/components/`: shared auth, vehicle, battery, map, simulation, and route UI.
- `src/pages/`: Home, Login, Register, and VehicleSetup.
- `src/Routes/Route.jsx`: protected routes and vehicle requirements.
- `src/utils/`: geocoding, warning thresholds, formatting, and polyline decoding.

Normal vehicle setup requires an owned battery device identifier and nominal vehicle capacity. Guests receive the backend-provided dedicated demo vehicle. Simulation submits only a cycle count; the backend chooses the target and processes the readings.

## Safe browser tests

`tests/frontend-smoke.mjs` substitutes Firebase, Maps, geocoding, and all backend requests. It never writes to the real database. It uses the already available bundled Playwright package rather than adding a project dependency.

PowerShell on this workstation:

```powershell
$env:GREENMILE_NODE_PACKAGES = 'C:\Users\Mahir(User)\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
npm run test:smoke
```

If Node is absent from `PATH`, invoke the bundled Node executable at `C:\Users\Mahir(User)\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe` with `tests/frontend-smoke.mjs`. The runner defaults to installed Chrome; set `GREENMILE_BROWSER` for another Chromium executable. Other workstations must supply their own existing Playwright directory and browser. Port 4178 must be free. Screenshots and results go to ignored `test-artifacts/`.

See `../FRONTEND_PHASE_REPORT.md` for verification evidence and remaining live checks. Real simulator batches require elapsed time; use ten cycles first on a fresh demo battery when showcasing the AI path.
