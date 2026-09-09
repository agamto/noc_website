---
name: grafana-version-upgrade-traps
description: 'Known behavioural differences that break this plugin or its tests on newer Grafana versions, especially Grafana 13 and React 19. Use when code or tests behave differently across the CI Grafana matrix, or when adding a new Grafana version.'
argument-hint: 'Describe the version-specific symptom'
user-invocable: true
---
# Grafana Version Upgrade Traps

Each entry below was confirmed by reproducing against the stated version, not inferred from release notes. The CI matrix is defined in `.github/workflows/ci.yml`.

## Confirmed traps

### React 19: `event.currentTarget` is null inside deferred state updaters
Grafana 13 ships React 19, which resets `currentTarget` after event dispatch. Reading it inside the callback passed to a state setter runs *after* dispatch and throws `TypeError: Cannot read properties of null (reading 'value')`, collapsing the subtree into Grafana's error boundary. The visible symptom is a neighbouring field "disappearing", not an error.

Read the value eagerly:
```tsx
onChange={(event) => {
  const documentS3Bucket = event.currentTarget.value.trim();
  setStorageState((previous) => ({ ...previous, documentS3Bucket }));
}}
```
Handlers that read `event.target.value` directly in the handler body are unaffected.

### Grafana 13: the "What's new" modal breaks every `getByRole` query
On a fresh instance the splash dialog sets `aria-hidden="true"` on the app root. Role-based queries then match **zero** elements while `locator`, `getByTestId` and `getByPlaceholder` keep working — so a suite fails on exactly the lines using `getByRole` and passes everywhere else.

Clicking it closed is unreliable; the page header overlays the Close button. Dismissal lives in server-side user storage at `user-storage/grafana-splash-screen:<userUid>`, and `spec.data.dismissedVersion` must equal `<major>.<minor>.0` **exactly** — a higher value such as `999.0.0` does not suppress it. `tests/fixtures.ts` seeds this before navigation.

### Grafana 13: `@grafana/ui` removed components deprecated since 2023
`Graph`, `GraphWithLegend`, `GraphContextMenu`, `GraphSeriesToggler` and related helpers are gone. Check the v13 removal list before assuming a component regression.

### First-run behaviour only appears on fresh instances
Any Grafana you have used locally has already dismissed onboarding state. Version-specific UI bugs generally require `docker compose down` plus `rm -rf playwright/.auth`.

## Rules
- Reproduce on the exact matrix version before changing code; do not infer behaviour from version numbers.
- Prefer `data-testid` for controls whose accessibility exposure an overlay could suppress.
- When a symptom is version-specific, check whether the failing locators are role-based before suspecting the component.
- Append newly confirmed traps here together with the evidence that verified them, and delete entries disproved by a later version.
