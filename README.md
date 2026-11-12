# Veylo

**A clearer picture of your device.** Private, local-first device check-ins for iOS, Android, and the web. Built with Expo SDK 54, React Native, and TypeScript.

> Review status: the previewed implementation was approved and merged via PR #1.

## What works

- **Overview:** supported battery, storage, memory, processor, and connection readings; actionable check-ins; one-tap device snapshots.
- **Activity:** measured app JavaScript frame cadence and supported battery samples, pause/resume, 1/5/15-minute windows, sampling controls, and CSV export.
- **Benchmarks:** cancellable 5/10/15-second compute checks and bounded memory/integrity checks. Real throughput, no fabricated health scores, temperatures, or battery-drain estimates.
- **Device:** searchable specifications with sources, per-sensor availability checks, and an explicit opt-in motion reading.
- **Reports:** local history, search/filter, detail views, JSON/CSV export, individual deletion, and a 50-report retention limit.
- **Settings:** system/light/dark appearance, reduced motion, sampling interval, automatic saving, confirmed data clearing, and a plain-language privacy notice.
- **Original identity:** the Veylo V-pulse logo, app icon, adaptive icon, monochrome icon, favicon, and splash assets.

All local features are free and work without an account or cloud service. Optional native memberships use real RevenueCat offerings only when configured; web never simulates a purchase or loads the billing SDK.

## Run locally

Requires Node.js 22.12+.

```sh
npm ci
npm run web:preview
```

Open `http://localhost:5000`. The production-style Express server serves the actual Expo web export, handles client-side routes, and exposes `/api/health`. It binds to `0.0.0.0` for container/reverse-proxy previews.

For hot-reloading web development:

```sh
npm run dev
```

For native development:

```sh
npm start
```

Use a compatible Expo Go client or a development build. Native device APIs and store transactions require real-device verification; a browser preview cannot certify them.

## Validate

```sh
npm run typecheck
npm run lint
npm test                 # measurement, benchmark, report, preference, and server tests
npm run web:build
npm run server:build
npx playwright install chromium
npm run test:e2e         # builds must exist; starts/reuses the local server
```

`npm run check` runs typechecking, lint, core tests, and the web export. An example GitHub Actions workflow is included at `docs/ci-workflow.example.yml`; copy it to `.github/workflows/ci.yml` in a checkout whose GitHub connection has workflow-write permission to enable CI.

## Honest measurement boundaries

- Browser storage is a **per-origin quota**, not physical disk capacity.
- Browser memory is a **coarse, capped hint**, not installed RAM or live utilization.
- Frame cadence counts the app’s JavaScript animation-frame callbacks; it is not GPU FPS or CPU utilization.
- Battery charge is shown only when the platform exposes it. Charge level is not battery wear.
- CPU clock/utilization, system RAM utilization, and temperature are not available through the supported APIs and are labeled unavailable.
- Motion sensor availability is checked rather than assumed. Browser API exposure does not guarantee physical hardware.
- Benchmarks compare runs on the same device/runtime. They are not certified hardware rankings or repair diagnoses.

## Privacy and storage

Preferences and up to 50 reports are stored locally (AsyncStorage / browser local storage). Activity samples stay in memory. No device readings, reports, motion samples, or usage analytics are uploaded. Exports are user-initiated. Clear reports in Settings, or clear browser site data / uninstall the native app to remove local data.

See [the privacy screen](app/privacy.tsx), [architecture notes](docs/ARCHITECTURE.md), and [baseline audit](docs/AUDIT.md).

## Optional native billing

Copy the public SDK key names from `.env.example` into your local environment. Only iOS/Android RevenueCat **public** keys are accepted; never embed a secret key. The native entitlement identifier is `premium`. Products, prices, and checkout terms must be configured in RevenueCat and the app stores. Unconfigured billing is explicitly unavailable.

## Brand and release notes

The original vector masters are `assets/veylo-mark.svg` and `assets/veylo-pulse.svg`. Regenerate PNG assets with `npm run icons`.

The app name, scheme (`veylo`), and native identifiers (`com.veylo.app`) are rebranded; the GitHub repository name is unchanged. The coined name has not received trademark or app-store clearance. Native signing, store listings, and purchase/restore verification are separate release steps.

Dependency cleanup removed unused database/auth scaffolding and unnecessary permissions/packages. Some upstream Expo SDK 54/toolchain advisories remain and require a coordinated SDK upgrade; they are not represented as fixed. No cloud resources were provisioned or changed.
