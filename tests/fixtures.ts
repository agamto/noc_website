import { AppConfigPage, AppPage, test as base } from '@grafana/plugin-e2e';
import type { Page } from '@playwright/test';
import pluginJson from '../src/plugin.json';

type AppTestFixture = {
  appConfigPage: AppConfigPage;
  gotoPage: (path?: string) => Promise<AppPage>;
};

// Grafana 13 opens a "What's new" modal on first login. It sets aria-hidden on the app
// root, so every getByRole query matches nothing while it is open. Clicking it closed is
// unreliable (the page header overlays the button), and dismissal is stored server-side
// per user keyed to an exact "<major>.<minor>.0" version, so record it up front.
let splashDismissed = false;

const dismissWhatsNewSplash = async (page: Page) => {
  if (splashDismissed) {
    return;
  }
  splashDismissed = true;

  const settings = await page.request.get('/api/frontend/settings');
  if (!settings.ok()) {
    return;
  }
  const [major, minor] = String((await settings.json())?.buildInfo?.version ?? '').split('.');
  if (!major || !minor) {
    return;
  }

  const user = await page.request.get('/api/user');
  if (!user.ok()) {
    return;
  }
  const collection = '/apis/userstorage.grafana.app/v0alpha1/namespaces/default/user-storage';
  const resource = {
    apiVersion: 'userstorage.grafana.app/v0alpha1',
    kind: 'UserStorage',
    metadata: { name: `grafana-splash-screen:${(await user.json()).uid}` },
    spec: { data: { dismissedVersion: `${major}.${minor}.0` } },
  };

  const created = await page.request.post(collection, { data: resource });
  if (created.status() === 409) {
    await page.request.put(`${collection}/${resource.metadata.name}`, { data: resource });
  }
};

export const test = base.extend<AppTestFixture>({
  appConfigPage: async ({ gotoAppConfigPage, page }, use) => {
    await dismissWhatsNewSplash(page);
    const configPage = await gotoAppConfigPage({
      pluginId: pluginJson.id,
    });
    await page.keyboard.press('Escape');
    await page.addStyleTag({ content: '#grafana-portal-container { pointer-events: none !important; }' });
    await use(configPage);
  },
  gotoPage: async ({ gotoAppPage, page }, use) => {
    await dismissWhatsNewSplash(page);
    await use(async (path) => {
      const appPage = await gotoAppPage({
        path,
        pluginId: pluginJson.id,
      });
      await page.keyboard.press('Escape');
      await page.addStyleTag({ content: '#grafana-portal-container { pointer-events: none !important; }' });
      return appPage;
    });
  },
});

export { expect } from '@grafana/plugin-e2e';
