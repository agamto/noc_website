import React, { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { getBackendSrv, PluginPage } from '@grafana/runtime';
import { LinkButton, Button, Combobox, Field, Input, useStyles2 } from '@grafana/ui';
import { Link, useNavigate } from 'react-router-dom';
import { prefixRoute } from '../utils/utils.routing';
import { ROUTES } from '../constants';

const encodeDocumentPath = (path: string) => path.split('/').map(encodeURIComponent).join('/');
type ImportedDocument = { name: string; content: string };

function Docs() {
  const styles = useStyles2(getStyles);
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<string[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [newFolder, setNewFolder] = useState('');
  const [newName, setNewName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreatingDocument, setIsCreatingDocument] = useState(false);
  const [importedName, setImportedName] = useState('');
  const [importedContent, setImportedContent] = useState('');
  const [importedDocuments, setImportedDocuments] = useState<ImportedDocument[]>([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    getBackendSrv()
      .get<string[] | null>('/api/plugins/main-noc-app/resources/docs/folders')
      .then((result) => setFolders(Array.isArray(result) ? result : []))
      .catch(() => setStatus('Unable to load folders'));
  }, []);

  useEffect(() => {
    getBackendSrv()
      .get<string[]>(`/api/plugins/main-noc-app/resources/docs?folder=${encodeURIComponent(selectedFolder)}`)
      .then((result) => setDocuments(Array.isArray(result) ? result : []))
      .catch(() => setStatus('Unable to load documents'));
  }, [selectedFolder]);

  const createDocument = (event: FormEvent) => {
    event.preventDefault();
    const name = newName.trim().replace(/[^a-zA-Z0-9._-]/g, '-');
    if (!name) {
      return;
    }
    const filename = name.endsWith('.md') ? name : `${name}.md`;
    const path = selectedFolder ? `${selectedFolder}/${filename}` : filename;
    navigate(prefixRoute(`${ROUTES.DOCS}/${encodeDocumentPath(path)}`), {
      state: { newDocument: true },
    });
  };

  const createFolder = async (event: FormEvent) => {
    event.preventDefault();
    const folder = newFolder.trim().replace(/[^a-zA-Z0-9._/-]/g, '-');
    if (!folder) {
      return;
    }
    await getBackendSrv().post('/api/plugins/main-noc-app/resources/docs/folders', { folder });
    setFolders([...folders, folder]);
    setSelectedFolder(folder);
    setNewFolder('');
  };

  const importDocument = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = '';
    const markdownFiles = files.filter((file) => file.name.toLowerCase().endsWith('.md'));
    if (markdownFiles.length === 0) {
      setStatus('Choose a Markdown (.md) file');
      return;
    }

    const imported = await Promise.all(markdownFiles.map(async (file) => ({
      name: file.name.replace(/[^a-zA-Z0-9._-]/g, '-'),
      content: await file.text(),
    })));
    if (imported.length === 1) {
      setImportedName(imported[0].name);
      setImportedContent(imported[0].content);
      setStatus('Choose a name for the imported document');
    } else {
      setImportedDocuments(imported);
      setStatus(`${imported.length} Markdown documents ready to save`);
    }
  };

  const saveImportedDocuments = async () => {
    setStatus('Saving imported documents...');
    try {
      await Promise.all(importedDocuments.map(({ name, content }) => {
        const path = selectedFolder ? `${selectedFolder}/${name}` : name;
        return getBackendSrv().put(`/api/plugins/main-noc-app/resources/docs/${encodeURIComponent(path)}`, { name, content });
      }));
      setImportedDocuments([]);
      setStatus('Imported documents saved');
      const result = await getBackendSrv().get<string[]>(`/api/plugins/main-noc-app/resources/docs?folder=${encodeURIComponent(selectedFolder)}`);
      setDocuments(Array.isArray(result) ? result : []);
    } catch {
      setStatus('Unable to save imported documents');
    }
  };

  const openImportedDocument = (event: FormEvent) => {
    event.preventDefault();
    const name = importedName.trim().replace(/[^a-zA-Z0-9._-]/g, '-');
    if (!name) {
      return;
    }
    const filename = name.toLowerCase().endsWith('.md') ? name : `${name}.md`;
    const path = selectedFolder ? `${selectedFolder}/${filename}` : filename;
    navigate(prefixRoute(`${ROUTES.DOCS}/${encodeDocumentPath(path)}`), {
      state: { importedContent },
    });
  };

  const searchWords = searchTerm.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const visibleDocuments = documents.filter((name) => {
    const normalizedName = name.toLowerCase();
    return searchWords.every((word) => normalizedName.includes(word));
  });

  return (
    <PluginPage>
      <div className={styles.page}>
        <LinkButton className={styles.backButton} title="to main page" href={prefixRoute(ROUTES.Main)}>
            to main page
        </LinkButton>
        <main className={styles.content}>
          <div className={styles.createRow}>
            <h1>Documentation Center</h1>
            <Button title={isCreatingDocument ? 'Close new document' : 'Add new document'} data-testid="add-new-document" onClick={() => setIsCreatingDocument(!isCreatingDocument)}>
              {isCreatingDocument ? 'Close new document' : 'Add new document'}
            </Button>
          </div>
          {isCreatingDocument && (
            <form onSubmit={createDocument} className={styles.creator}>
              <Field label="New document">
                <Input
                  aria-label="New document"
                  value={newName}
                  placeholder="architecture.md"
                  onChange={(event) => setNewName(event.currentTarget.value)}
                />
              </Field>
              <Button title="Create document" type="submit" data-testid="create-document">Create document</Button>
            </form>
          )}
          <Field label="Import Markdown">
            <Input
              aria-label="Import Markdown"
              data-testid="import-markdown"
              id="import-markdown-file"
              type="file"
              multiple
              accept=".md,text/markdown"
              className={styles.importInput}
              onChange={importDocument}
            />
          </Field>
          {importedDocuments.length > 0 && (
            <div className={styles.batchImport}>
              <p>{importedDocuments.map(({ name }) => name).join(', ')}</p>
              <Button title="Save imported documents" data-testid="save-imported-documents" onClick={saveImportedDocuments}>Save imported documents</Button>
            </div>
          )}
          <div className={styles.folderControls}>
            <Field label="Folder">
              <Combobox
                aria-label="Folder"
                options={[{ label: 'Root', value: '' }, ...folders.map((folder) => ({ label: folder, value: folder }))]}
                value={selectedFolder}
                onChange={(option) => setSelectedFolder(option?.value ?? '')}
              />
            </Field>
            <form onSubmit={createFolder} className={styles.folderForm}>
              <Field label="New folder">
                <Input aria-label="New folder" value={newFolder} onChange={(event) => setNewFolder(event.currentTarget.value)} />
              </Field>
              <Button title="Create folder" type="submit" data-testid="create-folder">Create folder</Button>
            </form>
          </div>
          {importedName && (
            <form onSubmit={openImportedDocument} className={styles.importName}>
              <Field label="Imported document name">
                <Input
                  aria-label="Imported document name"
                  value={importedName}
                  onChange={(event) => setImportedName(event.currentTarget.value)}
                />
              </Field>
              <Button title="Open imported document" type="submit" data-testid="open-imported-document">Open imported document</Button>
            </form>
          )}
          <Field label="Search documents">
            <Input
              aria-label="Search documents"
              value={searchTerm}
              placeholder="Search by filename"
              onChange={(event) => setSearchTerm(event.currentTarget.value)}
            />
          </Field>
          <section aria-labelledby="saved-documents-heading">
            <h2 id="saved-documents-heading">Saved documents</h2>
            {visibleDocuments.length === 0 ? <p>No matching documents.</p> : (
              <div className={styles.documentGrid}>
                {visibleDocuments.map((name) => (
                  <Link
                    className={styles.documentCard}
                    key={name}
                    title={name}
                    to={prefixRoute(`${ROUTES.DOCS}/${encodeDocumentPath(selectedFolder ? `${selectedFolder}/${name}` : name)}`)}
                  >
                    <span className={styles.fileBadge}>MD</span>
                    <span className={styles.documentName}>{name}</span>
                    <span className={styles.openLabel}>Open document</span>
                  </Link>
                ))}
              </div>
            )}
          </section>
          <span role="status">{status}</span>
        </main>
      </div>
    </PluginPage>
  );
}

export default Docs;

const getStyles = (theme: GrafanaTheme2) => ({
  page: css`
    position: relative;
    min-height: 70vh;
    display: flex;
    justify-content: center;
  `,
  backButton: css`
    position: absolute;
    top: ${theme.spacing(2)};
    left: ${theme.spacing(2)};
  `,
  content: css`
    width: min(100vw, 1400px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: ${theme.spacing(8)} ${theme.spacing(3)} ${theme.spacing(4)};
  `,
  createRow: css`
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: ${theme.spacing(3)};
    padding: 5vh 5vw;
    margin-bottom: ${theme.spacing(2)};

    h1 {
      margin: 0;
      white-space: nowrap;
    }
  `,
  creator: css`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${theme.spacing(2)};
    width: fit-content;
    margin: 0 auto;
  `,
  documentGrid: css`
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    width: 100%;
    gap: ${theme.spacing(2)};
    margin: 0;
    padding: 0;
    text-align: start;

    @media (max-width: 900px) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

  `,
  documentCard: css`
    box-sizing: border-box;
    min-height: 180px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: space-between;
    padding: ${theme.spacing(3)};
    border: 1px solid ${theme.colors.border.weak};
    background: ${theme.colors.background.secondary};
    color: ${theme.colors.text.primary};
    text-decoration: none;
    transition: border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease;

    &:hover,
    &:focus-visible {
      border-color: ${theme.colors.border.medium};
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.16);
      transform: translateY(-2px);
      text-decoration: none;
    }
  `,
  fileBadge: css`
    padding: ${theme.spacing(0.5)} ${theme.spacing(1)};
    background: ${theme.colors.primary.main};
    color: ${theme.colors.primary.contrastText};
    font-size: 12px;
    font-weight: 700;
  `,
  documentName: css`
    width: 100%;
    overflow: hidden;
    font-size: 16px;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  openLabel: css`
    color: ${theme.colors.text.secondary};
    font-size: 12px;
  `,
  importName: css`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${theme.spacing(2)};
    margin-top: ${theme.spacing(3)};
  `,
  batchImport: css`
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: ${theme.spacing(2)};
    margin-top: ${theme.spacing(3)};

    p {
      margin: 0;
    }
  `,
  folderControls: css`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${theme.spacing(2)};
    margin-top: ${theme.spacing(3)};
  `,
  folderForm: css`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${theme.spacing(2)};
  `,
  importInput: css`
    width: fit-content;
    height: fit-content;
    min-height: 3vh;
    padding: 0.5rem;
    line-height: normal;

    & input[type='file'] {
      width: fit-content;
      height: fit-content;
      min-height: fit-content;
    }
  `,
});
