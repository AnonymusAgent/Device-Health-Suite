# Veylo

**A clearer picture of your device.** A local-first device health app built with Expo, React Native, and TypeScript for iOS, Android, and the web.

This draft PR is a review checkpoint, not a release. The implementation is being developed for an interactive preview before the final changes are committed.

## Planned experience

- Overview: supported device readings, actionable checks, and a device snapshot.
- Activity: a pausable, time-based session with responsive charts and CSV export.
- Benchmarks: short, cancellable compute and bounded allocation checks, with honest limitations.
- Device: searchable specifications and explicitly detected sensor availability.
- Reports: locally saved checks, device snapshots, JSON/CSV export, and deletion controls.
- Settings: appearance, local-data controls, privacy information, and native subscription management where configured.

## Review scope

See [the project audit](docs/AUDIT.md) for baseline issues, platform limitations, and acceptance criteria. The web preview will identify browser measurements and unavailable native readings rather than substitute simulated data.

No cloud account, database migration, deployment, purchase, or app-store submission is required to review the local experience.
