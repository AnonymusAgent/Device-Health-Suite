# Veylo — baseline audit and review plan

Base: `7e46423cd2b16e3390361c2d94a14ae57d7d74ae` (DevicePulse).

## Findings

1. Dashboard and monitor CPU, memory, FPS, temperature, and battery histories include random or invented samples. Battery history decreases even without measurements. Health scores treat charge level and connectivity as hardware health.
2. Native RAM usage and CPU frequency are guessed. Web cores default to an invented four; light and proximity sensors are assumed available on all Android devices.
3. The multi-core test runs on the same thread. Memory allocations are unbounded between yields, peak allocation ignores released chunks, and cycles are reported after clearing the array. Battery drain and thermal values are fabricated. Safety-threshold claims are not implemented.
4. Cancellation produces normal-looking benchmark scores. Test execution has no error boundary, concurrent-start guard, or lifecycle cancellation.
5. Premium gating overlays interactive children, so it is not a reliable interaction boundary. Missing or failing billing configuration can restore cached premium access. Paywall copy advertises unsupported thermal tests, extended durations, and ad removal. Restore navigation uses stale state.
6. There is no persistent report history, settings screen, snapshot export, or report deletion. Share failures are silently swallowed.
7. The production server reads a nonexistent `server/templates/landing-page.html`, registers no API routes, and serves Expo Go artifacts rather than the web application. Browser requests can target a Replit-specific domain. There is no web build/typecheck/test/CI gate.
8. Several imports are unused, web uses a hardcoded 67px inset, SVG chart IDs/gradients collide, and charts do not resize to their containers. No accessibility labels or reduced-motion handling on core controls.
9. The Drizzle user/password schema and in-memory user storage are unused by any auth flow. Connecting a database alone would not deliver a product feature or secure authentication.

## Implementation direction

- Original Veylo wordmark and pulse logo; consistent light/dark tokens and a responsive desktop/mobile shell.
- Replace fabricated telemetry with capability-aware native APIs and actual browser battery/storage APIs where supported. Label unavailable readings and JS frame cadence accurately.
- Use cooperative, short CPU checks and explicitly bounded typed-array allocation checks. No thermal or battery-endurance claims without real sensors/longitudinal data. Cancellation and errors remain distinct from completed results.
- Keep session samples in memory and reports/preferences on-device. Do not upload telemetry. Add accessible report history, export, and confirmed deletion.
- Gate actions, not only presentation. Keep native RevenueCat purchases optional and disable billing when unconfigured; never grant entitlements from a cached boolean.
- Serve a real static Expo web build with an API health endpoint and SPA fallback. Preserve native routing. Add validation scripts and tests for measurement, benchmark, storage, and report behavior.

## Platform boundaries

Browser storage quota is not physical disk capacity; browser device memory is a coarse approximation, not RAM usage. A browser cannot expose system-wide CPU utilization, CPU temperature, or arbitrary native sensors. Native Expo does not provide a universal RAM-utilization or thermal API. Device battery APIs may be unavailable on simulators or restricted by browsers. Results are snapshots or app-level measurements, not a repair diagnosis or certified hardware benchmark.

## Acceptance checklist

- [ ] Clean TypeScript check, lint, automated tests, and production web export.
- [ ] Live preview accepts the Arena proxy host and uses relative API URLs.
- [ ] All navigation, settings, report exports/deletion, chart controls, and benchmark start/stop flows work.
- [ ] No random telemetry, guessed thermal values, or fake pass scores.
- [ ] Missing device capabilities are explicit and refresh failures recoverable.
- [ ] Responsive layouts, keyboard-accessible controls, and persistent appearance preference.
- [ ] No billing entitlement bypass or simulated purchase success.
- [ ] Draft PR remains unmerged pending review; final implementation commit awaits preview approval.

External services are not provisioned as part of this local-first scope. Native builds, real-device API behavior, and store purchase/restore flows require device credentials and separate verification.
