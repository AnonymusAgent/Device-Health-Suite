# Veylo product audit and improvement plan

Audit baseline: merged commit `c9126569b4ecc695b1ee32e095832b101508836f` on `main`.
Scope: source, configuration, native adapters, local persistence, server, documentation, tests and generated asset metadata. This is an incremental improvement of the existing application, not a replacement.

## Baseline verification

Executed before implementation changes:

| Check | Actual baseline result |
| --- | --- |
| `npm ci` | Passed; existing Expo asset patch applied |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed, zero warnings |
| `npm test` | 24/24 passed |
| `npm run web:build` | Passed; 16 static routes; entry approximately 3.32 MB uncompressed |
| `npm run server:build` | Passed |
| Existing `npm run test:e2e` | 9/9 passed in Chromium |
| `npm audit` | 25 advisories: 1 low, 20 moderate, 4 high, 0 critical |
| `npx expo install --check` | Could not reach Expo's version service from this sandbox; not a compatibility certification |

Installed React/React Native/Expo versions are 19.1.0 / 0.81.5 / 54.0.38. Some declared ranges are looser than the SDK's bundled ranges even where the currently locked version is compatible. Browser tests do not verify native hardware, native lifecycle behavior or purchases.

## Prioritized findings

### P0 — measurement truth, lifecycle and data safety

1. **Native battery capability is not checked before reading.** `lib/device-info.ts` calls `getPowerStateAsync()` directly. Expo exposes `isAvailableAsync()`, which is false on iOS simulators. Unsupported low-power reporting can also return a default false; that must not become a measured “off” state.
2. **Battery observations are backdated.** `SessionContext` creates a frame sample first and attaches a later asynchronous battery response to that earlier timestamp. Slow permission/API calls can therefore misstate when charge was observed.
3. **Frame cadence can manufacture zero.** A nonpositive elapsed interval is converted to 0 fps. It should be omitted. Cadence currently continues globally while benchmarks run, but the UI does not identify that measurement interference.
4. **Snapshot/network freshness is incomplete.** Pausing activity also stops snapshot refresh; browser online/offline changes do not trigger a refresh. Display dimensions are not labeled as an app window rather than physical screen resolution.
5. **Settings have a hydration/write race.** A change made before AsyncStorage loads can be overwritten by hydration or overwrite previously persisted preferences. Updates are not schema-validated and storage failures are not distinguished from successful persistence in the control state.
6. **Benchmark configuration is not persisted structurally.** Reports contain formatted metric strings, so historical comparisons cannot reliably match duration, working-set cap, workload version and runtime. Repeated manual saving creates duplicate reports. The engine's screen-local guard does not prevent overlapping work during rapid unmount/remount.
7. **Invalid benchmark memory options can bypass the intended cap.** A nonfinite/invalid cap is not explicitly validated. Cancellation should interrupt a yield promptly and remove its listener. Elapsed time and actual workload time need clearer separation.
8. **Sensor lifecycle needs hardening.** Permission responses can arrive after leaving the screen; a recheck can overlap a motion subscription. Native light-sensor capability is supported by the installed SDK but is always labeled unavailable. iOS motion usage description is not explicitly configured.

### P1 — useful product depth and a coherent interface

9. **Insights are too shallow.** `deriveChecks` supplies a title/description but not a consistent evidence/source/limitation/recommendation model. “Looking good” can sound like an overall hardware-health verdict even when only connectivity is available.
10. **Report evidence is flattened.** Snapshot values and sources are concatenated into strings; status, observation time and explanations are not first-class report fields. CSV lacks those columns. Existing reports must remain readable.
11. **No historical comparison.** There is no safe matching rule or completed-run comparison in benchmark/report screens. Comparing unlike configurations or including cancelled work would be misleading.
12. **Visual system is inconsistent.** Many 9–11 px labels, repeated inline styles, string comparison against a background hex value to infer theme, uneven breakpoints based on window rather than content width, and decorative hero artwork compete with diagnostic evidence.
13. **Accessibility gaps.** Segmented controls have radio semantics without complete keyboard arrow navigation; small touch targets; removed input focus outlines; inconsistent heading hierarchy; no explicit modal focus management; charts need concise accessible summaries and missing-data handling.
14. **State presentation is uneven.** Initial loading, unavailable capabilities, empty search results, failed storage and successful exports need consistent reusable treatment. Error recovery still uses a generic blue/black template rather than Veylo's interface.
15. **Privacy copy needs qualification.** Local app storage is not encrypted by Veylo. Native billing necessarily communicates with RevenueCat/store services when configured. Temporary native exports and browser site-data behavior should be explained accurately.

### P2 — rendering, maintainability and verification

16. **Inactive screens remain mounted.** `app/(tabs)/_layout.tsx` uses a Stack despite custom tab navigation. Every visited screen subscribes to the same session context; each sample re-renders unrelated screens. Battery updates scan the entire history array.
17. **Chart work is repeated and gaps are hardcoded.** Filtering, scaling and path construction repeat each render; a fixed 15-second gap threshold ignores the selected sampling interval. Chart summaries do not expose averages/limits as clearly as the surrounding cards.
18. **Dead scaffolding remains.** Unused legacy Expo Go landing template (including an external QR script), empty route-registration module, stale `@shared` alias, unused chart/ring/bar wrappers and compatibility re-export remain. Direct dependencies need a documented usage check rather than removal by guesswork.
19. **Test coverage misses important boundaries.** Existing tests are useful but do not cover native capability denial, per-reading timestamps, malformed semantic readings, settings hydration, like-for-like comparisons, invalid memory caps, engine-level concurrent starts, keyboard navigation or missing browser APIs.
20. **Release constraints remain.** Upstream SDK/toolchain advisories, CI workflow permissions, native compilation/signing, physical sensors and sandbox purchases are not solved by browser tests. No cloud sync or analytics is authorized.

## Improvement roadmap (approved scope of this request)

### Checkpoint A — correctness foundations
- Preserve the current Expo Router / provider / local-store architecture.
- Add observation timestamps and explicit measurement explanations; gate native battery reads; qualify low-power and storage semantics.
- Separate device snapshot state from high-frequency session samples; refresh on foreground/connectivity changes; record actual battery observation times and benchmark interference.
- Serialize settings hydration/updates and validate patches.
- Add a versioned benchmark configuration, engine-level exclusion, prompt abort cleanup and strict bounds. Add regression tests before relying on these changes.

### Checkpoint B — evidence, insights and history
- Introduce deterministic insight objects with measured evidence, reason, source, confidence/limitations and an action; never emit a health score.
- Add a backward-compatible structured report format while retaining legacy report readability.
- Persist timestamps/status/source/explanation and benchmark configuration; export these in JSON/CSV.
- Compare only completed, compatible runs; display raw values and differences, not rankings or repair diagnoses.
- Improve search, summaries, duplicate-save protection and confirmed deletion.

### Checkpoint C — interface and accessibility
- Centralize spacing, typography, radii and semantic colors; retain the green Veylo pulse identity.
- Replace the decorative overview hero with a restrained evidence-led summary; use fewer containers and clearer hierarchy.
- Refine activity, benchmarks, specifications, reports, settings and privacy using shared controls and states.
- Use actual tab navigation with the existing custom shell; support mobile/tablet/desktop and safe areas.
- Add keyboard/focus behavior, larger text/targets, reduced-motion support and accessible chart summaries.

### Checkpoint D — quality gate
- Remove only proven dead code; keep optional native billing isolated and all local features free.
- Review modified files and privacy/network behavior; inspect exported data and storage failure recovery.
- Run typecheck, lint, all core tests, web build, server build, aggregate check and expanded E2E tests.
- Capture desktop/tablet/mobile and light/dark previews. Record actual results and remaining native-only tests in `docs/VALIDATION.md`.

## Explicit non-goals

No fabricated telemetry, health score, CPU temperature/frequency/utilization, system RAM utilization, battery-condition inference, cloud synchronization, analytics, forced Expo major upgrade, store submission or paid-feature lock on existing local functionality. Test doubles may simulate API absence/failure in tests only; production adapters continue to use real platform APIs.

## Acceptance criteria

- Unsupported APIs produce unavailable evidence, never plausible-looking substitute readings.
- Every insight and exported diagnostic row can identify its source and limitations.
- Benchmark comparisons reject mismatched configurations and partial/failed runs.
- Existing local reports remain readable; corrupt data is not silently replaced.
- Benchmark cancellation releases resources; only one engine run can be active.
- Navigation, themes, exports, deletion and settings survive browser regression tests at multiple widths.
- All required validation commands have recorded outcomes; native-only claims remain explicitly unverified.
