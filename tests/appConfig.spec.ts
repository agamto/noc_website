import { test, expect } from './fixtures';
import pluginJson from '../src/plugin.json';

test.describe.configure({ mode: 'serial' });

test('should be possible to save app configuration', async ({ appConfigPage, page }) => {
  const saveButton = page.locator('[data-testid="save-db-settings"]');

  // enter some valid values
  const passwordInput = page.locator('#password');
  if (await passwordInput.isEditable()) {
    await passwordInput.fill('test password');
  }
  await page.locator('#dbport').fill('5432');
  await page.locator('#dbname').fill('users');
  await page.locator('#dbhost').fill('172.27.104.0');
  await page.locator('#user').fill('postgress');
  // listen for the server response on the saved form
  const saveResponse = appConfigPage.waitForSettingsResponse();

  await saveButton.click({ force: true });
  await expect(saveResponse).toBeOK();
});

// Leaving the plugin on S3 routes every later docs test at a bucket that does not exist.
// Each settings write restarts the plugin backend, so only write when there is S3 state to undo.
test.afterEach(async ({ page }) => {
  const response = await page.request.get(`/api/plugins/${pluginJson.id}/settings`);
  if (!response.ok()) {
    return;
  }
  const settings = await response.json();
  if (settings.jsonData?.documentStorage !== 's3') {
    return;
  }
  await page.request.post(`/api/plugins/${pluginJson.id}/settings`, {
    data: {
      enabled: true,
      pinned: settings.pinned ?? false,
      jsonData: { ...settings.jsonData, documentStorage: 'local' },
    },
  });
});

test('should save S3 document storage settings', async ({ appConfigPage, page }) => {
  const s3Radio = page.getByRole('radio', { name: 'Amazon S3' });
  await s3Radio.click();
  await expect(s3Radio).toBeChecked();
  const s3Bucket = page.getByTestId('document-s3-bucket');
  await expect(s3Bucket).toBeVisible();
  await expect(s3Bucket).toBeEnabled();
  await s3Bucket.fill('noc-public-cloud-documents');
  await page.getByTestId('document-s3-prefix').fill('production/grafana-documents');
  await page.getByTestId('document-s3-region').fill('il-central-1');
  await expect(page.getByTestId('save-document-storage')).toBeEnabled();

  const saveRequest = page.waitForRequest((request) => request.method() === 'POST' && request.url().endsWith(`/api/plugins/${pluginJson.id}/settings`));
  const saveResponse = appConfigPage.waitForSettingsResponse();
  await page.getByTestId('save-document-storage').click();
  const payload = await saveRequest;
  expect(payload.postDataJSON()).toMatchObject({
    jsonData: {
      documentStorage: 's3',
      documentS3Bucket: 'noc-public-cloud-documents',
      documentS3Prefix: 'production/grafana-documents',
      documentS3Region: 'il-central-1',
    },
  });
  await expect(saveResponse).toBeOK();
});
