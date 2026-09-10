---
name: grafana-ci-failure-triage
description: 'Diagnose build or Playwright failures that only appear in CI, only on some Grafana versions, or that pass locally but not in CI. Use when triaging a pasted CI error, a version-specific E2E failure, or a suspected flaky test.'
argument-hint: 'Paste the failing CI job output'
user-invocable: true
---
# Grafana CI Failure Triage

Reported errors in this repo are often stale or describe a symptom several steps removed from the cause. Establish what is actually running before forming a theory.

## Procedure
1. Confirm the error is current. Run `git status --short` and `git log --oneline -1`, then grep the committed file for the symbol named in the error. A pasted failure frequently predates a fix that is already on the branch.
2. Confirm the source is on disk. An unsaved editor buffer is invisible to git, webpack and the Go compiler, so `read_file` can show a fix that CI never received. When a tool reports a symbol the compiler cannot find, grep the file through the shell rather than the editor.
3. Confirm `dist/` matches source before any local E2E run: `grep -r "<new-testid-or-string>" dist/`, then `npm run build`. A stale bundle produces "element not found" for markup that exists in source.
4. Reproduce against a fresh Grafana matching the failing matrix entry instead of reasoning from logs:
   ```bash
   docker compose down
   ANONYMOUS_AUTH_ENABLED=false DEVELOPMENT=false \
     GRAFANA_VERSION=<version> GRAFANA_IMAGE=grafana-oss docker compose up -d
   rm -rf playwright/.auth test-results
   npx playwright test <spec> --reporter=list
   ```
   A long-lived local container has already absorbed first-run state and will not reproduce it.
5. Read `test-results/**/error-context.md`. It holds the accessibility snapshot at the moment of failure and usually names the cause outright — error-boundary text, an open dialog, or the element genuinely missing.
6. Distinguish "element absent" from "element not queryable". Compare `page.locator(...).count()` against `getByRole(...).count()`. If the DOM has it and the role query does not, look for an `aria-hidden` or `inert` ancestor.
7. Check cross-test pollution whenever the failure depends on ordering. Any test that writes plugin settings changes behaviour for every other test sharing the instance, and the suite runs 8 workers against one Grafana.
8. Re-verify on a freshly recreated instance, not the container that already holds the dismissed or pre-seeded state.

## Rules
- Do not propose a fix until the failure is reproduced or an artifact identifies the cause.
- A green run on a long-lived local container is not evidence about a CI-only failure.
- Ask before recreating the container; it wipes `grafana.db` and any local dashboards.
- Say explicitly when a change is an unverified guess, and what evidence would confirm it.
- Prefer reading the failure artifact over adding logging or widening timeouts.
