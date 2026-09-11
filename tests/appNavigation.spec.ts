import { Buffer } from 'node:buffer';
import { test, expect } from './fixtures';
import { ROUTES } from '../src/constants';
import pluginJson from '../src/plugin.json';

const docsResourceUrl = `/api/plugins/${pluginJson.id}/resources/docs`;

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
    const newDocumentForm = page.locator('#new-document-form');
    await expect(newDocumentForm).toBeVisible();
    await newDocumentForm.getByTestId('new-document-name').fill('runbook.md');
    await page.locator('[data-testid="create-document"]').click({ force: true });
    await expect(page.getByText('runbook.md')).toBeVisible();
    const markdownContent = page.locator('textarea[aria-label="Document content"]');
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
      await expect(page.locator('textarea[aria-label="Document content"]')).toHaveValue('# Imported document\n\nImported content.');
      await page.locator('[data-testid="save-document"]').click({ force: true });
    await expect(page.locator('[role="status"]')).toHaveText('Saved');
    await expect(page.locator('[data-testid="markdown-preview"] h1')).toHaveText('Imported document');
  });

  test('downloads the currently open document', async ({ gotoPage, page }) => {
    const documentName = `download-e2e-${test.info().parallelIndex}.md`;
    try {
      await gotoPage(`/${ROUTES.DOCS}`);
      await page.getByTestId('add-new-document').click();
      await page.locator('#new-document-form').getByTestId('new-document-name').fill(documentName);
      await page.locator('[data-testid="create-document"]').click({ force: true });
      const markdownContent = page.locator('textarea[aria-label="Document content"]');
      await expect(markdownContent).toBeVisible();
      await markdownContent.fill('# Download me');
      await page.locator('[data-testid="save-document"]').click({ force: true });
      await expect(page.locator('[role="status"]')).toHaveText('Saved');

      const downloadPromise = page.waitForEvent('download');
      await page.locator('[data-testid="download-document"]').click({ force: true });
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBe(documentName);
      const downloadedPath = await download.path();
      const fs = await import('node:fs/promises');
      const downloadedContent = await fs.readFile(downloadedPath as string, 'utf-8');
      expect(downloadedContent).toBe('# Download me');
    } finally {
      await page.request.delete(`${docsResourceUrl}/${encodeURIComponent(documentName)}`).catch(() => {});
    }
  });

  test('creates a document with a Hebrew name', async ({ gotoPage, page }) => {
    const documentName = `\u05de\u05e1\u05de\u05da-${test.info().parallelIndex}.md`;
    try {
      await gotoPage(`/${ROUTES.DOCS}`);
      await page.getByTestId('add-new-document').click();
      await page.locator('#new-document-form').getByTestId('new-document-name').fill(documentName);
      await page.locator('[data-testid="create-document"]').click({ force: true });
      await expect(page.locator('[data-testid="document-title"]')).toHaveText(documentName);
      const markdownContent = page.locator('textarea[aria-label="Document content"]');
      await expect(markdownContent).toBeVisible();
      await markdownContent.fill('# Hello');
      await page.locator('[data-testid="save-document"]').click({ force: true });
      await expect(page.locator('[role="status"]')).toHaveText('Saved');
      await expect(page.getByText(documentName)).toBeVisible();
    } finally {
      await page.request.delete(`${docsResourceUrl}/${encodeURIComponent(documentName)}`).catch(() => {});
    }
  });

  test('imports an html file into the document editor', async ({ gotoPage, page }) => {
    const documentName = `imported-e2e-${test.info().parallelIndex}.html`;
    try {
      await gotoPage(`/${ROUTES.DOCS}`);
      await page.locator('#import-markdown-file').setInputFiles({
        name: 'imported.html',
        mimeType: 'text/html',
        buffer: Buffer.from('<h1>Imported HTML</h1><p>Hello world.</p>'),
      });

      await page.getByLabel('Imported document name').fill(documentName);
      await page.locator('[data-testid="open-imported-document"]').click({ force: true });
      await expect(page.locator('[data-testid="document-title"]')).toHaveText(documentName);
      await expect(page.locator('textarea[aria-label="Document content"]')).toHaveValue(
        '<h1>Imported HTML</h1><p>Hello world.</p>'
      );
      await page.locator('[data-testid="save-document"]').click({ force: true });
      await expect(page.locator('[role="status"]')).toHaveText('Saved');
      const htmlPreview = page.frameLocator('[data-testid="html-preview"]');
      await expect(htmlPreview.locator('h1')).toHaveText('Imported HTML');
    } finally {
      await page.request.delete(`${docsResourceUrl}/${encodeURIComponent(documentName)}`).catch(() => {});
    }
  });

  test('imports a png image into the document editor', async ({ gotoPage, page }) => {
    const documentName = `imported-e2e-${test.info().parallelIndex}.png`;
    // 1x1 transparent PNG pixel
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64'
    );
    try {
      await gotoPage(`/${ROUTES.DOCS}`);
      await page.locator('#import-markdown-file').setInputFiles({
        name: 'imported.png',
        mimeType: 'image/png',
        buffer: pngBuffer,
      });

      await page.getByLabel('Imported document name').fill(documentName);
      await page.locator('[data-testid="open-imported-document"]').click({ force: true });
      await expect(page.locator('[data-testid="document-title"]')).toHaveText(documentName);
      const imagePreview = page.locator('[data-testid="image-preview"]');
      await expect(imagePreview).toHaveAttribute('src', /^data:image\/png;base64,/);
      await page.locator('[data-testid="save-document"]').click({ force: true });
      await expect(page.locator('[role="status"]')).toHaveText('Saved');
      await expect(imagePreview).toHaveAttribute('src', /^data:image\/png;base64,/);
    } finally {
      await page.request.delete(`${docsResourceUrl}/${encodeURIComponent(documentName)}`).catch(() => {});
    }
  });

  test('imports a docx document into the document editor', async ({ gotoPage, page }) => {
    const documentName = `imported-e2e-${test.info().parallelIndex}.docx`;
    // Minimal valid .docx (zip/OOXML) containing a single paragraph, generated with jszip.
    const docxBuffer = Buffer.from(
      'UEsDBAoAAAAAAOpYK12WsN0udQEAAHUBAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbDw/eG1sIHZlcnNp' +
        'b249IjEuMCIgZW5jb2Rpbmc9IlVURi04IiBzdGFuZGFsb25lPSJ5ZXMiPz48VHlwZXMgeG1sbnM9Imh0' +
        'dHA6Ly9zY2hlbWFzLm9wZW54bWxmb3JtYXRzLm9yZy9wYWNrYWdlLzIwMDYvY29udGVudC10eXBlcyI+' +
        'PERlZmF1bHQgRXh0ZW5zaW9uPSJyZWxzIiBDb250ZW50VHlwZT0iYXBwbGljYXRpb24vdm5kLm9wZW54' +
        'bWxmb3JtYXRzLXBhY2thZ2UucmVsYXRpb25zaGlwcyt4bWwiLz48T3ZlcnJpZGUgUGFydE5hbWU9Ii93' +
        'b3JkL2RvY3VtZW50LnhtbCIgQ29udGVudFR5cGU9ImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0' +
        'cy1vZmZpY2Vkb2N1bWVudC53b3JkcHJvY2Vzc2luZ21sLmRvY3VtZW50Lm1haW4reG1sIi8+PC9UeXBl' +
        'cz5QSwMECgAAAAAA6lgrXQAAAAAAAAAAAAAAAAYAAABfcmVscy9QSwMECgAAAAAA6lgrXZv9N+opAQAA' +
        'KQEAAAsAAABfcmVscy8ucmVsczw/eG1sIHZlcnNpb249IjEuMCIgZW5jb2Rpbmc9IlVURi04IiBzdGFu' +
        'ZGFsb25lPSJ5ZXMiPz48UmVsYXRpb25zaGlwcyB4bWxucz0iaHR0cDovL3NjaGVtYXMub3BlbnhtbGZv' +
        'cm1hdHMub3JnL3BhY2thZ2UvMjAwNi9yZWxhdGlvbnNoaXBzIj48UmVsYXRpb25zaGlwIElkPSJySWQx' +
        'IiBUeXBlPSJodHRwOi8vc2NoZW1hcy5vcGVueG1sZm9ybWF0cy5vcmcvb2ZmaWNlRG9jdW1lbnQvMjAw' +
        'Ni9yZWxhdGlvbnNoaXBzL29mZmljZURvY3VtZW50IiBUYXJnZXQ9IndvcmQvZG9jdW1lbnQueG1sIi8+' +
        'PC9SZWxhdGlvbnNoaXBzPlBLAwQKAAAAAADqWCtdAAAAAAAAAAAAAAAABQAAAHdvcmQvUEsDBAoAAAAA' +
        'AOpYK102tTMk4AAAAOAAAAARAAAAd29yZC9kb2N1bWVudC54bWw8P3htbCB2ZXJzaW9uPSIxLjAiIGVu' +
        'Y29kaW5nPSJVVEYtOCIgc3RhbmRhbG9uZT0ieWVzIj8+PHc6ZG9jdW1lbnQgeG1sbnM6dz0iaHR0cDov' +
        'L3NjaGVtYXMub3BlbnhtbGZvcm1hdHMub3JnL3dvcmRwcm9jZXNzaW5nbWwvMjAwNi9tYWluIj48dzpi' +
        'b2R5Pjx3OnA+PHc6cj48dzp0PkltcG9ydGVkIFdvcmQgZG9jdW1lbnQuPC93OnQ+PC93OnI+PC93OnA+' +
        'PC93OmJvZHk+PC93OmRvY3VtZW50PlBLAQIUAAoAAAAAAOpYK12WsN0udQEAAHUBAAATAAAAAAAAAAAA' +
        'AAAAAAAAAABbQ29udGVudF9UeXBlc10ueG1sUEsBAhQACgAAAAAA6lgrXQAAAAAAAAAAAAAAAAYAAAAA' +
        'AAAAAAAQAAAApgEAAF9yZWxzL1BLAQIUAAoAAAAAAOpYK12b/TfqKQEAACkBAAALAAAAAAAAAAAAAAAA' +
        'AMoBAABfcmVscy8ucmVsc1BLAQIUAAoAAAAAAOpYK10AAAAAAAAAAAAAAAAFAAAAAAAAAAAAEAAAABwD' +
        'AAB3b3JkL1BLAQIUAAoAAAAAAOpYK102tTMk4AAAAOAAAAARAAAAAAAAAAAAAAAAAD8DAAB3b3JkL2Rv' +
        'Y3VtZW50LnhtbFBLBQYAAAAABQAFACABAABOBAAAAAA=',
      'base64'
    );
    try {
      await gotoPage(`/${ROUTES.DOCS}`);
      await page.locator('#import-markdown-file').setInputFiles({
        name: 'imported.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        buffer: docxBuffer,
      });

      await page.getByLabel('Imported document name').fill(documentName);
      await page.locator('[data-testid="open-imported-document"]').click({ force: true });
      await expect(page.locator('[data-testid="document-title"]')).toHaveText(documentName);
      await page.locator('[data-testid="save-document"]').click({ force: true });
      await expect(page.locator('[role="status"]')).toHaveText('Saved');
      const wordPreview = page.frameLocator('[data-testid="word-preview"]');
      await expect(wordPreview.locator('p')).toHaveText('Imported Word document.');
      await expect(page.locator('[data-testid="word-download"]')).toHaveAttribute(
        'href',
        /^data:application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document;base64,/
      );
    } finally {
      await page.request.delete(`${docsResourceUrl}/${encodeURIComponent(documentName)}`).catch(() => {});
    }
  });


  test('paginates saved documents and changes the page limit', async ({ gotoPage, page }) => {
    const prefix = `pagination-e2e-${test.info().parallelIndex}`;
    const documents = Array.from(
      { length: 11 },
      (_, index) => `${prefix}-${String(index + 1).padStart(2, '0')}.md`
    );
    const nonMatchingDocument = `unrelated-document-${test.info().parallelIndex}.md`;
    let mockedListRequestCount = 0;

    await page.route(
      (url) => url.pathname.endsWith(docsResourceUrl),
      async (route) => {
        if (route.request().method() !== 'GET') {
          await route.continue();
          return;
        }

        mockedListRequestCount += 1;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([...documents, nonMatchingDocument]),
        });
      }
    );

    await gotoPage(`/${ROUTES.DOCS}`);
  await expect.poll(() => mockedListRequestCount).toBeGreaterThan(0);
    await page.getByLabel('Search documents').fill(prefix);

    const savedDocuments = page.getByTestId('saved-documents');
    const rows = savedDocuments.locator('tbody tr');
    const rowsPerPage = savedDocuments.getByLabel('Rows per page');
    const pageStatus = savedDocuments.getByText(/^Page \d+ of \d+$/);
    const previousPage = savedDocuments.getByTestId('documents-previous-page');
    const nextPage = savedDocuments.getByTestId('documents-next-page');

    await expect(savedDocuments.getByText(`${prefix}-01.md`)).toBeVisible();
    await expect(pageStatus).toHaveText('Page 1 of 2');
    await expect(rows).toHaveCount(10);
    await expect(savedDocuments.getByText(nonMatchingDocument)).not.toBeVisible();
    await expect(previousPage).toBeDisabled();
    await expect(nextPage).toBeEnabled();

    await rowsPerPage.selectOption('5');
    await expect(pageStatus).toHaveText('Page 1 of 3');
    await expect(rows).toHaveCount(5);

    await nextPage.click();
    await expect(pageStatus).toHaveText('Page 2 of 3');
    await expect(savedDocuments.getByText(`${prefix}-06.md`)).toBeVisible();
    await expect(savedDocuments.getByText(`${prefix}-01.md`)).not.toBeVisible();

    await rowsPerPage.selectOption('10');
    await expect(pageStatus).toHaveText('Page 1 of 2');
    await expect(rows).toHaveCount(10);
    await nextPage.click();
    await expect(pageStatus).toHaveText('Page 2 of 2');
    await expect(rows).toHaveCount(1);
    await expect(savedDocuments.getByText(`${prefix}-11.md`)).toBeVisible();
    await expect(nextPage).toBeDisabled();
  });

});
