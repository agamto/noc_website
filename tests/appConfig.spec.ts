import { test, expect } from './fixtures';

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
