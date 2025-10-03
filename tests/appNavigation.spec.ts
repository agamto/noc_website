import { test, expect } from './fixtures';
import { ROUTES } from '../src/constants';

test.describe('navigating app', () => {
  test('main page', async ({ gotoPage, page }) => {
    await gotoPage(`/${ROUTES.One}`);
    await expect(page.getByText('main page')).toBeVisible();
  });

  test('page contacts should render successfully', async ({ gotoPage, page }) => {
    await gotoPage(`/${ROUTES.CONTACTS}`);
    await expect(page.getByText('contacts')).toBeVisible();
  });

});
