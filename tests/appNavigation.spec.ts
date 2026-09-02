import { test, expect } from './fixtures';
import { ROUTES } from '../src/constants';

test.describe('navigating app', () => {
  test('main page', async ({ gotoPage, page }) => {
    await gotoPage(`/${ROUTES.Main}`);
    await expect(page.getByText('main page')).toBeVisible();
  });

  test('contacts', async ({ gotoPage, page }) => {
    await gotoPage(`/${ROUTES.CONTACTS}`);
    await expect(page.getByText(/contacts/i).nth(1)).toBeVisible();
  });

});
