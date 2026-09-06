import { test, expect } from './fixtures';
import { ROUTES } from '../src/constants';

const dashboardSearchPath = '/api/search?type=dash-db&limit=1000';

function dashboardPayload(uid: string, title: string) {
  return {
    dashboard: {
      uid,
      title,
      panels: [],
      schemaVersion: 41,
    },
    overwrite: true,
  };
}

test.describe('dashboard picker refresh', () => {
  test('shows a dashboard created after the manual refresh', async ({ gotoPage, page }) => {
    const runId = `${Date.now()}-${test.info().parallelIndex}-${Math.random().toString(36).slice(2, 8)}`;
    const anchorUid = `picker-anchor-${runId}`;
    const addedUid = `picker-added-${runId}`;
    const anchorTitle = `Picker anchor ${runId}`;
    const addedTitle = `Picker added ${runId}`;
    let testBodyPassed = false;

    try {
      const anchorResponse = await page.request.post('/api/dashboards/db', { data: dashboardPayload(anchorUid, anchorTitle) });
      expect(anchorResponse.ok()).toBeTruthy();
      await gotoPage(`/${ROUTES.DASHBOARDS}/${anchorUid}`);
      await expect(page.getByTestId(`dashboard-picker-dashboard-${anchorUid}`)).toBeVisible();

      const createResponse = await page.request.post('/api/dashboards/db', { data: dashboardPayload(addedUid, addedTitle) });
      expect(createResponse.ok()).toBeTruthy();
      await expect(page.getByTestId(`dashboard-picker-dashboard-${addedUid}`)).toHaveCount(0);

      await Promise.all([
        page.waitForResponse((response) => response.request().method() === 'GET' && response.url().includes(dashboardSearchPath)),
        page.getByTestId('dashboard-picker-refresh').click(),
      ]);
      await expect(page.getByTestId(`dashboard-picker-dashboard-${addedUid}`)).toBeVisible();
      testBodyPassed = true;
    } finally {
      const cleanupResults = await Promise.allSettled(
        [anchorUid, addedUid].map((uid) => page.request.delete(`/api/dashboards/uid/${uid}`, { timeout: 5_000 }))
      );
      if (testBodyPassed) {
        cleanupResults.forEach((result) => {
          if (result.status === 'rejected') {
            throw result.reason;
          }
          expect(result.value.ok() || result.value.status() === 404).toBeTruthy();
        });
      }
    }
  });

  test('refreshes when focus returns to the dashboard panel', async ({ gotoPage, page }) => {
    const runId = `${Date.now()}-${test.info().parallelIndex}-${Math.random().toString(36).slice(2, 8)}`;
    const anchorUid = `focus-anchor-${runId}`;
    const addedUid = `focus-added-${runId}`;
    let testBodyPassed = false;

    try {
      const anchorResponse = await page.request.post('/api/dashboards/db', { data: dashboardPayload(anchorUid, `Focus anchor ${runId}`) });
      expect(anchorResponse.ok()).toBeTruthy();
      await gotoPage(`/${ROUTES.DASHBOARDS}/${anchorUid}`);
      await expect(page.getByTestId(`dashboard-picker-dashboard-${anchorUid}`)).toBeVisible();

      const addedResponse = await page.request.post('/api/dashboards/db', { data: dashboardPayload(addedUid, `Focus added ${runId}`) });
      expect(addedResponse.ok()).toBeTruthy();
      await expect(page.getByTestId(`dashboard-picker-dashboard-${addedUid}`)).toHaveCount(0);

      await Promise.all([
        page.waitForResponse((response) => response.request().method() === 'GET' && response.url().includes(dashboardSearchPath)),
        page.evaluate(() => window.dispatchEvent(new Event('focus'))),
      ]);
      await expect(page.getByTestId(`dashboard-picker-dashboard-${addedUid}`)).toBeVisible();
      testBodyPassed = true;
    } finally {
      const cleanupResults = await Promise.allSettled(
        [anchorUid, addedUid].map((uid) => page.request.delete(`/api/dashboards/uid/${uid}`, { timeout: 5_000 }))
      );
      if (testBodyPassed) {
        cleanupResults.forEach((result) => {
          if (result.status === 'rejected') {
            throw result.reason;
          }
          expect(result.value.ok() || result.value.status() === 404).toBeTruthy();
        });
      }
    }
  });
});
