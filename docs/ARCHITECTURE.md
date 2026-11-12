# Veylo architecture

## Application

Expo SDK 54, React Native 0.81, React 19, TypeScript, and Expo Router. The same screens run on iOS, Android, and web. A responsive application shell provides a desktop sidebar and mobile bottom navigation; it does not depend on a fixed browser chrome inset.

- `app/(tabs)/index.tsx`: capability-aware overview and snapshot capture.
- `monitor.tsx`: actual app JS frame cadence and supported battery samples.
- `stress.tsx`: cooperative compute and bounded memory checks.
- `hardware.tsx`: searchable specifications and explicit sensor availability.
- `reports.tsx` and `app/reports/[id].tsx`: local history, exports, and confirmed deletion.
- `settings.tsx`, `privacy.tsx`: appearance, sampling, retention, privacy, and data controls.

## Measurement boundaries

`lib/device-info.ts` adapts Expo Device/Battery/File System/Network and browser Battery Status/Storage Manager APIs. Every nontrivial reading carries a value, measured/estimated/unavailable status, source, and optional limitation. A missing value is never converted into a zero or random sample.

Browser storage is an origin quota, not a disk. `navigator.deviceMemory` is a coarse, capped hint, not installed RAM or utilization. `navigator.onLine` is connection state, not guaranteed internet reachability. CPU utilization, clock speed, temperature, and system RAM utilization are not exposed by these APIs. Native sensor availability is queried per sensor; motion readings require an explicit user action.

`SessionContext` counts animation-frame callbacks over elapsed monotonic time. It samples only in the foreground, bounds history to 900 samples, and cleans up timers/listeners. Frame cadence is not a GPU FPS measurement. Battery samples are asynchronous and remain unavailable if the platform does not provide them.

## Benchmarks

`lib/benchmarks.ts` uses an AbortSignal and monotonic clock. Compute is a single-threaded integer workload that yields regularly. Memory uses 1 MiB Uint32Array buffers, verifies sampled writes, retains at most the requested cap (16 MiB in the UI; 32 MiB hard limit), and releases buffers in `finally`. Durations are limited to 1–15 seconds. Cancellation is a distinct partial result; errors are not saveable; there are no invented scores, thermal readings, or battery-drain estimates.

## Local data

`lib/reports.ts` validates persisted reports with Zod. `createReportStore` serializes read-modify-write operations, deduplicates report IDs, and retains the latest 50. A failed write leaves stored data unchanged. Corrupt collections are surfaced rather than silently overwritten. Preferences are separately validated. AsyncStorage maps to local storage on web.

JSON exports preserve captured context and sources; CSV exports escape cells and neutralize spreadsheet formulas. Browser exports use Blob downloads. Native exports write a temporary cache file, open the share sheet, and clean up afterward. The share API does not reliably report whether the user completed sharing, so the UI says the sheet opened.

## Billing isolation

All local features are free. `PremiumContext.tsx` is an explicit web no-op and does not import the purchases SDK (whose browser entry loads Stripe). Native builds resolve `PremiumContext.native.tsx`; RevenueCat is configured only when a platform key exists. Entitlements come from customer info, never a cached boolean. Listeners are removed, transactions guarded, cancellation distinguished, and store errors surfaced. No product, price, renewal term, or purchase success is fabricated.

## Serving and deployment

`npm run web:build` creates a real static Expo web export in `dist/`. `server/app.ts` serves it with an anonymous `/api/health`, SPA fallback, hashed-asset caching, request-size limits, and safe errors. It accepts reverse-proxy hosts and does not block iframe embedding. `server/index.ts` binds to `0.0.0.0` and shuts down gracefully. Browser code does not call a hardcoded localhost API.

The old unused plaintext-password schema, in-memory user CRUD, Replit-specific API URL, and Expo Go artifact server were removed. No database or cloud account is needed. Supabase, Vercel, and Google Drive connections are not modified by this work.

## Brand

Veylo is a short coined product name with an original V-shaped pulse mark. `assets/veylo-mark.svg` and `assets/veylo-pulse.svg` are the vector masters; `npm run icons` generates the app, splash, favicon, and adaptive icon assets. The repository identity is unchanged. Native bundle identifiers and URL scheme are rebranded; a store release needs its own signing/provisioning and identity review. The name has not received trademark or app-store clearance.
