import { test, expect } from './fixtures';

test('should be possible to save app configuration', async ({ appConfigPage, page }) => {
  const saveButton = page.getByRole('button', { name: /Save DB settings/i });

  // reset the configured secret
  await page.getByRole('button', { name: /reset/i }).click();

  // enter some valid values
  await page.getByRole('textbox', { name: 'password' }).fill('test password');
  await page.getByRole('textbox', { name: 'port' }).clear();
  await page.getByRole('textbox', { name: 'port' }).fill('5432');
  await page.getByRole('textbox', { name: 'dbname' }).clear();
  await page.getByRole('textbox', { name: 'dbname' }).fill('users');
  await page.getByRole('textbox', { name: 'host' }).clear();
  await page.getByRole('textbox', { name: 'host' }).fill('172.27.104.0');
  await page.getByRole('textbox', { name: 'user' }).clear();
  await page.getByRole('textbox', { name: 'user' }).fill('postgress');
  // listen for the server response on the saved form
  const saveResponse = appConfigPage.waitForSettingsResponse();

  await saveButton.click();
  await expect(saveResponse).toBeOK();
});
