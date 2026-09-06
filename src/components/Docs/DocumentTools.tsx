import React, { ChangeEvent, FormEvent, useRef } from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { Button, Combobox, Field, Input, useStyles2 } from '@grafana/ui';

type DocumentToolsProps = {
  folders: string[];
  selectedFolder: string;
  newFolder: string;
  searchTerm: string;
  onFolderChange: (folder: string) => void;
  onNewFolderChange: (folder: string) => void;
  onSearchChange: (searchTerm: string) => void;
  onCreateFolder: (event: FormEvent<HTMLFormElement>) => void;
  onImport: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function DocumentTools({
  folders,
  selectedFolder,
  newFolder,
  searchTerm,
  onFolderChange,
  onNewFolderChange,
  onSearchChange,
  onCreateFolder,
  onImport,
}: DocumentToolsProps) {
  const styles = useStyles2(getStyles);
  const importInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <section className={styles.controlsPanel} aria-label="Document tools">
        <div className={styles.folderField}>
          <Field label="Folder">
            <Combobox
              aria-label="Folder"
              options={[{ label: 'Root', value: '' }, ...folders.map((folder) => ({ label: folder, value: folder }))]}
              value={selectedFolder}
              onChange={(option) => onFolderChange(option?.value ?? '')}
            />
          </Field>
        </div>
        <form onSubmit={onCreateFolder} className={styles.folderForm}>
          <Field label="New folder">
            <Input aria-label="New folder" value={newFolder} onChange={(event) => onNewFolderChange(event.currentTarget.value)} />
          </Field>
          <Button title="Create folder" variant="secondary" type="submit" data-testid="create-folder">Create folder</Button>
        </form>
        <div className={styles.searchField}>
          <Field label="Search documents">
            <Input
              aria-label="Search documents"
              value={searchTerm}
              placeholder="Search by filename"
              onChange={(event) => onSearchChange(event.currentTarget.value)}
            />
          </Field>
        </div>
      </section>
      <section className={styles.importRow} aria-label="Import documents">
        <Field label="Import Markdown">
          <div className={styles.importControl}>
            <input
              ref={importInputRef}
              aria-label="Import Markdown"
              data-testid="import-markdown"
              id="import-markdown-file"
              type="file"
              multiple
              accept=".md,text/markdown"
              className={styles.hiddenFileInput}
              onChange={onImport}
            />
            <Button variant="secondary" onClick={() => importInputRef.current?.click()}>
              Choose files
            </Button>
          </div>
        </Field>
      </section>
    </>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  controlsPanel: css`
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    align-items: end;
    gap: ${theme.spacing(2)};
    margin-bottom: ${theme.spacing(2)};
    padding: ${theme.spacing(2)};
    border: 1px solid ${theme.colors.border.weak};
    background: ${theme.colors.background.secondary};

    > * {
      min-width: 0;
    }

    @media (max-width: 900px) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    @media (max-width: 600px) {
      grid-template-columns: 1fr;
    }
  `,
  folderField: css`
    grid-column: span 4;

    @media (max-width: 900px) {
      grid-column: span 1;
    }
  `,
  searchField: css`
    grid-column: span 12;

    @media (max-width: 900px) {
      grid-column: span 2;
    }
  `,
  folderForm: css`
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: ${theme.spacing(2)};
    grid-column: span 8;

    > * {
      min-width: 0;
    }

    @media (max-width: 900px) {
      grid-column: span 1;
    }

    @media (max-width: 600px) {
      grid-column: span 1;
      grid-template-columns: 1fr;
    }
  `,
  importRow: css`
    display: flex;
    align-items: center;
    margin-bottom: ${theme.spacing(3)};
  `,
  importControl: css`
    position: relative;
    display: inline-flex;
  `,
  hiddenFileInput: css`
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    white-space: nowrap;
  `,
});
