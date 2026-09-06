import React, { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2,PageLayoutType } from '@grafana/data';
import { getBackendSrv, PluginPage } from '@grafana/runtime';
import { useStyles2 } from '@grafana/ui';
import { useNavigate } from 'react-router-dom';
import { prefixRoute } from '../utils/utils.routing';
import { ROUTES } from '../constants';
import { AppPageHeader } from '../components/AppPageHeader';
import { BackToMainLink } from '../components/BackToMainLink';
import { DocumentForms } from '../components/Docs/DocumentForms';
import { DocsHeader } from '../components/Docs/DocsHeader';
import { DocumentTools } from '../components/Docs/DocumentTools';
import { SavedDocuments } from '../components/Docs/SavedDocuments';
import { ImportedDocument } from '../components/Docs/types';

const encodeDocumentPath = (path: string) => path.split('/').map(encodeURIComponent).join('/');

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
    let isCurrent = true;

    getBackendSrv()
      .get<string[]>(`/api/plugins/main-noc-app/resources/docs?folder=${encodeURIComponent(selectedFolder)}`)
      .then((result) => {
        if (isCurrent) {
          setDocuments(Array.isArray(result) ? result : []);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setStatus('Unable to load documents');
        }
      });

    return () => {
      isCurrent = false;
    };
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
    <PluginPage layout={PageLayoutType.Canvas}>
      <AppPageHeader>
        <BackToMainLink />
      </AppPageHeader>
      <div className={styles.page}>
        <main className={styles.content}>
          <DocsHeader
            documentCount={documents.length}
            isCreatingDocument={isCreatingDocument}
            onToggleCreate={() => setIsCreatingDocument((isCreating) => !isCreating)}
          />
          <DocumentForms
            isCreatingDocument={isCreatingDocument}
            newName={newName}
            importedName={importedName}
            importedDocuments={importedDocuments}
            onNewNameChange={setNewName}
            onImportedNameChange={setImportedName}
            onCreateDocument={createDocument}
            onOpenImportedDocument={openImportedDocument}
            onSaveImportedDocuments={() => void saveImportedDocuments()}
          />
          <DocumentTools
            folders={folders}
            selectedFolder={selectedFolder}
            newFolder={newFolder}
            searchTerm={searchTerm}
            onFolderChange={setSelectedFolder}
            onNewFolderChange={setNewFolder}
            onSearchChange={setSearchTerm}
            onCreateFolder={createFolder}
            onImport={importDocument}
          />
          <SavedDocuments
            documentCount={documents.length}
            documents={visibleDocuments}
            getDocumentUrl={(name) => prefixRoute(`${ROUTES.DOCS}/${encodeDocumentPath(selectedFolder ? `${selectedFolder}/${name}` : name)}`)}
          />
          {status && <span className={styles.status} role="status" aria-live="polite">{status}</span>}
        </main>
      </div>
    </PluginPage>
  );
}

export default Docs;

const getStyles = (theme: GrafanaTheme2) => ({
  page: css`
    min-height: 100%;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    padding: ${theme.spacing(2)} 0;
  `,
  content: css`
    box-sizing: border-box;
    width: min(100%, 1200px);
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    padding: ${theme.spacing(3)};
  `,
  status: css`
    display: block;
    margin-top: ${theme.spacing(2)};
    color: ${theme.colors.text.secondary};
  `,
});
