---
name: frontend-reviewed-change
description: 'Implement a focused Grafana React or CSS change using the frontend specialist, independent CSS/React reviewers, and targeted validation. Use for UI behavior, layout, component, accessibility, or responsive styling work.'
argument-hint: 'Describe the page, behavior, or visual problem to change'
user-invocable: true
---
# Frontend Reviewed Change

Use this workflow for a focused frontend change that needs implementation and independent review.

## Procedure
1. Start from the specific page, component, visual defect, or behavior failure.
2. Delegate CSS/layout work to Frontend CSS Specialist and React/state work to React Specialist only when each is relevant.
3. Keep routing, API calls, and state ownership in the current owner unless the change requires a clear boundary.
4. After implementation, request Frontend CSS Reviewer for layout, overflow, theme, focus, and responsive checks.
5. Request React Reviewer for state, events, accessibility, route/API preservation, and regression checks.
6. Fix only confirmed findings, then run the narrowest validation available: typecheck, focused test, or browser screenshot and viewport check.

## Required Outcomes
- Preserve Grafana UI and Emotion CSS conventions.
- Preserve existing labels, test IDs, routes, and API contracts unless intentionally changed.
- Report what was changed, reviewer findings addressed, validation evidence, and blockers.
