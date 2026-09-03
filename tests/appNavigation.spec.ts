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
    await page.locator('[data-testid="main-docs-link"]').click({ force: true });
    await expect(page.getByText('Documentation Center')).toBeVisible();

    await page.locator('[data-testid="add-new-document"]').click({ force: true });
    await page.getByLabel('New document').fill('runbook.md');
    await page.locator('[data-testid="create-document"]').click({ force: true });
    await expect(page.getByText('runbook.md')).toBeVisible();
    const markdownContent = page.locator('textarea[aria-label="Markdown content"]');
    await expect(markdownContent).toBeVisible({ timeout: 3000 });
    await markdownContent.fill('# Runbook\n\nStart here.', { timeout: 3000 });
    await page.locator('[data-testid="save-document"]').click({ force: true });
    await expect(page.locator('[role="status"]')).toHaveText('Saved');
    await expect(page.locator('[data-testid="edit-document"]')).toBeVisible();
    await expect(page.locator('[data-testid="markdown-preview"] h1')).toHaveText('Runbook');
    await page.locator('[data-testid="delete-document"]').click({ force: true });
    await expect(page.locator('[data-testid="confirm-delete"]')).toBeVisible();
    await page.locator('[data-testid="cancel-delete"]').click({ force: true });
    await expect(page.locator('[data-testid="delete-document"]')).toBeVisible();
  });

  test('imports a markdown file into the document editor', async ({ gotoPage, page }) => {
    await gotoPage(`/${ROUTES.DOCS}`);
    await page.locator('#import-markdown-file').setInputFiles({
      name: 'imported.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from('# Imported document\n\nImported content.'),
    });

    await page.getByLabel('Imported document name').fill('renamed.md');
    await page.locator('[data-testid="open-imported-document"]').click({ force: true });
    await expect(page.locator('[data-testid="document-title"]')).toHaveText('renamed.md');
      await expect(page.locator('textarea[aria-label="Markdown content"]')).toHaveValue('# Imported document\n\nImported content.');
      await page.locator('[data-testid="save-document"]').click({ force: true });
    await expect(page.locator('[role="status"]')).toHaveText('Saved');
    await expect(page.locator('[data-testid="markdown-preview"] h1')).toHaveText('Imported document');
  });

});
