import { test, expect } from './fixtures';
import { ROUTES } from '../src/constants';

test.describe('navigating app', () => {
  test('main page', async ({ gotoPage, page }) => {
    await gotoPage(`/${ROUTES.Main}`);
    await expect(page.locator('[data-testid="main-brand"]')).toBeVisible();
    await expect(page.locator('[data-testid="main-logo"]')).toBeVisible();
    await expect(page.locator('[data-testid="main-contacts-link"]')).toBeVisible();
    await expect(page.locator('[data-testid="main-docs-link"]')).toBeVisible();
    await expect(page.locator('[data-testid="main-dashboards-link"]')).toBeVisible();
  });

  test('contacts', async ({ gotoPage, page }) => {
    await gotoPage(`/${ROUTES.CONTACTS}`);
    await expect(page.getByText(/contacts/i).nth(1)).toBeVisible();
  });

  test('opens docs creator from main and saves markdown in an inner page', async ({ gotoPage, page }) => {
    await gotoPage(`/${ROUTES.Main}`);
    await page.getByTestId('main-docs-link').click();
    await expect(page.getByText('Documentation Center')).toBeVisible();

    const addDocumentButton = page.getByTestId('add-new-document');
    await addDocumentButton.click();
    await expect(addDocumentButton).toHaveAttribute('aria-expanded', 'true');
    await page.getByRole('textbox', { name: 'New document' }).fill('runbook.md');
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

  test('paginates saved documents and changes the page limit', async ({ gotoPage, page }) => {
    const runId = `${Date.now()}-${test.info().parallelIndex}`;
    const prefix = `pagination-e2e-${runId}`;
    const documents = Array.from({ length: 11 }, (_, index) => ({
      name: `${prefix}-${String(index + 1).padStart(2, '0')}.md`,
      mimeType: 'text/markdown',
      buffer: Buffer.from(`# Document ${index + 1}`),
    }));
    const nonMatchingDocument = {
      name: `unrelated-document-${runId}.md`,
      mimeType: 'text/markdown',
      buffer: Buffer.from('# Other document'),
    };

    try {
      await gotoPage(`/${ROUTES.DOCS}`);
      await page.getByTestId('import-markdown').setInputFiles([...documents, nonMatchingDocument]);
      await page.getByTestId('save-imported-documents').click();
      await page.getByLabel('Search documents').fill(prefix);

      const savedDocuments = page.getByRole('region', { name: 'Saved documents' });
      const rows = savedDocuments.locator('tbody tr');
      const rowsPerPage = savedDocuments.getByLabel('Rows per page');
      const pageStatus = savedDocuments.getByText(/^Page \d+ of \d+$/);

      await expect(savedDocuments.getByText(`${prefix}-01.md`)).toBeVisible();
      await expect(pageStatus).toHaveText('Page 1 of 2');
      await expect(rows).toHaveCount(10);
      await expect(savedDocuments.getByText(nonMatchingDocument.name)).not.toBeVisible();
      await expect(savedDocuments.getByRole('button', { name: 'Previous' })).toBeDisabled();
      await expect(savedDocuments.getByRole('button', { name: 'Next' })).toBeEnabled();

      await rowsPerPage.selectOption('5');
      await expect(pageStatus).toHaveText('Page 1 of 3');
      await expect(rows).toHaveCount(5);

      await savedDocuments.getByRole('button', { name: 'Next' }).click();
      await expect(pageStatus).toHaveText('Page 2 of 3');
      await expect(savedDocuments.getByText(`${prefix}-06.md`)).toBeVisible();
      await expect(savedDocuments.getByText(`${prefix}-01.md`)).not.toBeVisible();

      await rowsPerPage.selectOption('10');
      await expect(pageStatus).toHaveText('Page 1 of 2');
      await expect(rows).toHaveCount(10);
      await savedDocuments.getByRole('button', { name: 'Next' }).click();
      await expect(pageStatus).toHaveText('Page 2 of 2');
      await expect(rows).toHaveCount(1);
      await expect(savedDocuments.getByText(`${prefix}-11.md`)).toBeVisible();
      await expect(savedDocuments.getByRole('button', { name: 'Next' })).toBeDisabled();
    } finally {
      const cleanupResponses = await Promise.all(
        [...documents, nonMatchingDocument].map(({ name }) => page.request.delete(`/api/plugins/main-noc-app/resources/docs/${name}`))
      );
      cleanupResponses.forEach((response) => expect(response.ok() || response.status() === 404).toBeTruthy());
    }
  });

});
