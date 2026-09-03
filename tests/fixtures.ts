import { AppConfigPage, AppPage, test as base } from '@grafana/plugin-e2e';
import pluginJson from '../src/plugin.json';

type AppTestFixture = {
  appConfigPage: AppConfigPage;
  gotoPage: (path?: string) => Promise<AppPage>;
};

export const test = base.extend<AppTestFixture>({
  appConfigPage: async ({ gotoAppConfigPage, page }, use) => {
    const configPage = await gotoAppConfigPage({
      pluginId: pluginJson.id,
    });
    await page.keyboard.press('Escape');
    await page.addStyleTag({ content: '#grafana-portal-container { pointer-events: none !important; }' });
    await use(configPage);
  },
  gotoPage: async ({ gotoAppPage, page }, use) => {
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
