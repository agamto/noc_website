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

  test('opens docs creator from main and saves markdown in an inner page', async ({ gotoPage, page }) => {
    await gotoPage(`/${ROUTES.Main}`);
    await page.getByRole('link', { name: 'to docs' }).click();
    await expect(page.getByRole('heading', { name: 'Documentation creator' })).toBeVisible();

    await page.getByRole('button', { name: 'Add new document' }).click();
    await page.getByLabel('New document').fill('runbook.md');
    await page.getByRole('button', { name: 'Create document' }).click();
    await expect(page.getByRole('heading', { name: 'runbook.md' })).toBeVisible();
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Markdown content').fill('# Runbook\n\nStart here.');
    await page.getByRole('button', { name: 'Save document' }).click();
    await expect(page.getByRole('status')).toHaveText('Saved');
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Runbook' })).toBeVisible();
    await page.getByRole('button', { name: 'Delete document' }).click();
    await expect(page.getByRole('button', { name: 'Confirm delete' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('button', { name: 'Delete document' })).toBeVisible();
  });

  test('imports a markdown file into the document editor', async ({ gotoPage, page }) => {
    await gotoPage(`/${ROUTES.DOCS}`);
    await page.getByLabel('Import Markdown').setInputFiles({
      name: 'imported.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from('# Imported document\n\nImported content.'),
    });

    await page.getByLabel('Imported document name').fill('renamed.md');
    await page.getByRole('button', { name: 'Open imported document' }).click();
    await expect(page.getByRole('heading', { name: 'renamed.md' })).toBeVisible();
    await expect(page.getByLabel('Markdown content')).toHaveValue('# Imported document\n\nImported content.');
    await page.getByRole('button', { name: 'Save document' }).click();
    await expect(page.getByRole('status')).toHaveText('Saved');
    await expect(page.getByRole('heading', { name: 'Imported document' })).toBeVisible();
  });

});
