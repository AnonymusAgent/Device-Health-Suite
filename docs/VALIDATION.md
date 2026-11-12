# Validation notes

Preview verification date: 2026-11-11 (UTC).

## Automated checks — passing

- TypeScript: `npm run typecheck` — clean.
- ESLint (zero warnings): `npm run lint` — clean.
- Node core tests: `npm test` — **24/24 pass** (measurement formatting/checks, benchmark completion/cancellation/bounds, report validation/retention/serialization/export safety, preferences, Express health/static/SPA/error behavior).
- Production web export: `npm run web:build` — success, 16 static routes.
- Production server bundle: `npm run server:build` — success (`dist-server/index.mjs`).
- Browser flows: `npm run test:e2e` — **9/9 pass** in Chromium:
  1. Overview loads real capabilities, saves a snapshot, persists appearance, and makes no external requests.
  2. All workspace destinations and specification search work (including motion permission denial surfaced honestly).
  3. Compute and memory checks complete, save, and cancellation stays partial.
  4. Report JSON/CSV downloads, detail view, and confirmed deletion work.
  5. Activity pauses, exports actual samples, and clears only session data.
  6. Settings persist, auto-save can be disabled, and clearing requires confirmation.
  7. Mobile navigation fits a 390×844 viewport with no horizontal overflow; settings remain reachable.
  8. Corrupt report storage is surfaced and can be explicitly cleared.
  9. Membership screen is honestly unavailable on web and loads no billing SDK.

## Preview verification

The app is served on port 5000 by the production-style Express server (`npm run server:prod`). Browser checks use Chromium at 1440×1000 and 390×844. Screenshots are saved under `artifacts/` (gitignored): overview desktop/mobile/dark, activity, benchmarks, device, reports, settings, and paywall.

A dark-mode regression was found and fixed during preview: the navigator’s screen container could retain the light background after toggling theme, leaving light text on a light canvas. `Page` now paints the active theme background explicitly, and the shell content wrapper also uses the theme background. Dark mode was re-verified visually after the fix.

Browser tests can use a normal Playwright Chromium install. For a sandbox without a system browser, `VEYLO_CHROMIUM_PATH` may point to a compatible Chromium executable; library/font environment must be supplied by that environment. This is a test-harness option, not an application dependency.

## CI note

The GitHub connection used for this PR could not push `.github/workflows/ci.yml` (workflow-write permission was unavailable). The workflow is preserved as `docs/ci-workflow.example.yml` and can be installed later without changing application code.

## Dependency audit

`npm audit` currently reports **35 advisories (0 critical)** after safe cleanup and deduplication. They are upstream Expo SDK 54 / toolchain advisories (including `expo`, `expo-router`, `@expo/cli`, `image-size`, `query-string`, and related packages). Fixing them requires a coordinated Expo SDK major upgrade; this work does **not** force incompatible majors or claim a clean audit. The unused database/auth scaffolding and unnecessary packages were removed, and the dependency tree was deduplicated to a single Expo SDK 54 copy.

## Not yet certified

- iOS/Android native binaries, physical sensors, battery behavior, backgrounding, and share-sheet completion require device testing.
- RevenueCat purchase/restore requires configured store products and sandbox store accounts. Web intentionally has no billing SDK.
- The coined Veylo name and native identifiers need store/trademark review before publication.
- No Supabase database, Vercel deployment, Google Drive file, or app-store submission was created.

## Review gate

The user reviewed the live preview and requested merge on 2026-11-11. The implementation was committed to `arena/ec16338e-device-health-suite`, PR #1 was marked ready, and the PR was merged into `main`.
