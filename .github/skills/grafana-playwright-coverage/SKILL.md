---
name: grafana-playwright-coverage
description: 'Write and review deterministic Playwright E2E coverage for this Grafana plugin. Use for new UI workflows, regressions, browser interactions, test failures, selectors, cleanup, and flaky test diagnosis.'
argument-hint: 'Describe the workflow or regression to cover'
user-invocable: true
---
# Grafana Playwright Coverage

Use this workflow to add or repair reliable end-to-end coverage.

## Procedure
1. Read the affected component, route, existing tests, and `tests/fixtures.ts` before writing a test.
2. Ask Playwright Test Specialist for the smallest deterministic user-flow test.
3. Use `gotoPage`, `ROUTES`, accessible locators, and existing `data-testid` hooks. Add a test ID only when no stable user-facing locator exists.
4. Create unique resource data through authenticated Grafana APIs when the workflow needs data; clean it up in `finally` with bounded requests.
5. Assert setup succeeded, the user action occurred, and the visible outcome changed. Cover pagination/filter boundaries when those are the behavior under test.
6. Ask Playwright Test Reviewer to audit selector stability, waits, assertions, cleanup, and parallel safety.
7. Run the narrowest matching Playwright spec before widening to the full suite.

## Rules
- Do not use arbitrary sleeps, coordinate clicks, or styling selectors.
- Do not rely on pre-existing dashboard or document inventory.
- Wait for semantic UI state or the relevant API response.
- Preserve the original test failure when cleanup also fails.
