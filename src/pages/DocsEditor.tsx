import React, { useEffect, useState } from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { getBackendSrv, PluginPage } from '@grafana/runtime';
import { Button, Combobox, useStyles2 } from '@grafana/ui';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { marked } from 'marked';
import { prefixRoute } from '../utils/utils.routing';
import { ROUTES } from '../constants';

type Document = { content: string };
type EditorLocationState = { importedContent?: string };

const encodeDocumentPath = (path: string) => path.split('/').map(encodeURIComponent).join('/');

const resourceUrl = (name: string) => `/api/plugins/main-noc-app/resources/docs/${encodeURIComponent(name)}`;
const markdownRenderer = new marked.Renderer();
markdownRenderer.html = (token) => token.raw.replace(/</g, '&lt;').replace(/>/g, '&gt;');

function DocsEditor() {
  const styles = useStyles2(getStyles);
  const navigate = useNavigate();
  const location = useLocation();
  const { '*': path = '' } = useParams<{ '*': string }>();
  const name = path.split('/').pop() ?? '';
  const currentFolder = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [savedContent, setSavedContent] = useState('');
  const [isDeletePending, setIsDeletePending] = useState(false);
  const [folders, setFolders] = useState<string[]>([]);
  const [folderDocuments, setFolderDocuments] = useState<string[]>([]);
  const [moveFolder, setMoveFolder] = useState(currentFolder);
  const [textDirection, setTextDirection] = useState<'rtl' | 'ltr'>('rtl');

  useEffect(() => {
    setMoveFolder(currentFolder);
  }, [currentFolder]);

  useEffect(() => {
    getBackendSrv()
      .get<string[] | null>('/api/plugins/main-noc-app/resources/docs/folders')
      .then((result) => setFolders(Array.isArray(result) ? result : []))
      .catch(() => setFolders([]));
    getBackendSrv()
      .get<string[] | null>(`/api/plugins/main-noc-app/resources/docs?folder=${encodeURIComponent(currentFolder)}`)
      .then((result) => setFolderDocuments(Array.isArray(result) ? result : []))
      .catch(() => setFolderDocuments([]));

    const importedContent = (location.state as EditorLocationState | null)?.importedContent;
    if (importedContent !== undefined) {
      setContent(importedContent);
      setSavedContent('');
      setIsEditing(true);
      setStatus('Imported. Save to store this document.');
      window.history.replaceState({}, document.title);
      return;
    }

    getBackendSrv()
      .get<Document>(resourceUrl(path))
      .then((document) => {
        setContent(document.content);
        setSavedContent(document.content);
      })
      .catch(() => setStatus('New document'));
  }, [currentFolder, path, location.state]);

  const saveDocument = async () => {
    setStatus('Saving...');
    try {
      await getBackendSrv().put(resourceUrl(path), { name, content });
      setSavedContent(content);
      setIsEditing(false);
      setStatus('Saved');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save document';
      setStatus(`Unable to save document: ${message}`);
    }
  };

  const exitEdit = () => {
    setContent(savedContent);
    setIsEditing(false);
    setStatus('');
  };

  const deleteDocument = async () => {
    setStatus('Deleting...');
    try {
      await getBackendSrv().delete(resourceUrl(path));
      navigate(prefixRoute(ROUTES.DOCS));
    } catch {
      setStatus('Unable to delete document');
      setIsDeletePending(false);
    }
  };

  const moveDocument = async (folder: string) => {
    if (folder === currentFolder) {
      return;
    }
    try {
      await getBackendSrv().post('/api/plugins/main-noc-app/resources/docs/move', { name: path, folder });
      const destination = folder ? `${folder}/${name}` : name;
      navigate(prefixRoute(`${ROUTES.DOCS}/${encodeDocumentPath(destination)}`));
    } catch {
      setStatus('Unable to move document');
      setMoveFolder(currentFolder);
    }
  };

  const openDocument = (documentName: string) => {
    if (!documentName || documentName === name) {
      return;
    }
    const documentPath = currentFolder ? `${currentFolder}/${documentName}` : documentName;
    navigate(prefixRoute(`${ROUTES.DOCS}/${encodeDocumentPath(documentPath)}`));
  };

  const preview = marked.parse(content, { renderer: markdownRenderer }) as string;

  return (
    <PluginPage>
      <div className={styles.page}>
        <div className={styles.header}>
          <Button title="Back to documents" variant="secondary" onClick={() => navigate(prefixRoute(ROUTES.DOCS))}>
            Back to documents
          </Button>
          <h1>{name}</h1>
          <div className={styles.headerActions}>
            <div className={styles.directionControls} aria-label="Text direction">
              <Button
                variant={textDirection === 'rtl' ? 'primary' : 'secondary'}
                aria-pressed={textDirection === 'rtl'}
                onClick={() => setTextDirection('rtl')}
              >
                RTL
              </Button>
              <Button
                variant={textDirection === 'ltr' ? 'primary' : 'secondary'}
                aria-pressed={textDirection === 'ltr'}
                onClick={() => setTextDirection('ltr')}
              >
                LTR
              </Button>
            </div>
            <Combobox
              aria-label="Move document to folder"
              options={[{ label: 'Root', value: '' }, ...folders.map((folder) => ({ label: folder, value: folder }))]}
              value={moveFolder}
              onChange={(option) => moveDocument(option?.value ?? '')}
            />
            <Combobox
              aria-label="Choose document in folder"
              options={folderDocuments.map((documentName) => ({ label: documentName, value: documentName }))}
              value={name}
              placeholder="Choose document"
              onChange={(option) => openDocument(option?.value ?? '')}
            />
            {isEditing ? (
              <>
                <Button title="Save document" data-testid="save-document" onClick={saveDocument}>Save document</Button>
                <Button title="Exit edit" data-testid="exit-edit" variant="secondary" onClick={exitEdit}>Exit edit</Button>
              </>
            ) : (
              <>
                <Button title="Edit" data-testid="edit-document" onClick={() => setIsEditing(true)}>Edit</Button>
                {isDeletePending ? (
                  <>
                    <Button title="Confirm delete" data-testid="confirm-delete" onClick={deleteDocument}>Confirm delete</Button>
                    <Button title="Cancel" data-testid="cancel-delete" variant="secondary" onClick={() => setIsDeletePending(false)}>Cancel</Button>
                  </>
                ) : (
                  <Button title="Delete document" data-testid="delete-document" variant="destructive" onClick={() => setIsDeletePending(true)}>Delete document</Button>
                )}
              </>
            )}
            <span role="status">{status}</span>
          </div>
        </div>
        {isEditing ? (
          <textarea
            aria-label="Markdown content"
            data-testid="markdown-content"
            dir={textDirection}
            className={styles.editor}
            rows={24}
            value={content}
            onChange={(event) => setContent(event.currentTarget.value)}
          />
        ) : (
          <article
            aria-label="Rendered markdown document"
            data-testid="markdown-preview"
            dir={textDirection}
            className={styles.preview}
            dangerouslySetInnerHTML={{ __html: preview }}
          />
        )}
      </div>
    </PluginPage>
  );
}

export default DocsEditor;

const getStyles = (theme: GrafanaTheme2) => ({
  page: css`
    width: 100%;
    max-width: none;
  `,
  header: css`
    display: flex;
    align-items: center;
    gap: ${theme.spacing(3)};
    margin-bottom: ${theme.spacing(4)};
  `,
  headerActions: css`
    display: flex;
    align-items: center;
    gap: ${theme.spacing(2)};
    margin-left: auto;
  `,
  directionControls: css`
    display: flex;
    gap: ${theme.spacing(1)};
  `,
  editor: css`
    box-sizing: border-box;
    width: 100%;
    min-height: 500px;
    padding: ${theme.spacing(2)};
    font-family: monospace;
    text-align: start;
    resize: vertical;
  `,
  preview: css`
    box-sizing: border-box;
    width: 100%;
    min-height: 300px;
    padding: ${theme.spacing(3)};
    border: 1px solid ${theme.colors.border.weak};
    background: ${theme.colors.background.secondary};
    overflow-wrap: anywhere;
    text-align: start;

    h1, h2, h3, h4, h5, h6 {
      margin-top: 0;
      margin-bottom: ${theme.spacing(2)};
    }

    p, ul, ol, blockquote, pre {
      margin: 0 0 ${theme.spacing(2)};
    }

    pre {
      padding: ${theme.spacing(2)};
      overflow-x: auto;
      background: ${theme.colors.background.canvas};
      direction: ltr;
      text-align: left;
    }

    code {
      font-family: monospace;
    }

    blockquote {
      padding-left: ${theme.spacing(2)};
      border-left: 3px solid ${theme.colors.border.medium};
    }
  `,
});
