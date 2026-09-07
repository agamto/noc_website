import React, { ChangeEvent, FormEvent } from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { Button, Field, Input, useStyles2 } from '@grafana/ui';
import { ImportedDocument } from './types';

type DocumentFormsProps = {
  isCreatingDocument: boolean;
  newName: string;
  importedName: string;
  importedDocuments: ImportedDocument[];
  onNewNameChange: (name: string) => void;
  onImportedNameChange: (name: string) => void;
  onCreateDocument: (event: FormEvent<HTMLFormElement>) => void;
  onOpenImportedDocument: (event: FormEvent<HTMLFormElement>) => void;
  onSaveImportedDocuments: () => void;
};

export function DocumentForms({
  isCreatingDocument,
  newName,
  importedName,
  importedDocuments,
  onNewNameChange,
  onImportedNameChange,
  onCreateDocument,
  onOpenImportedDocument,
  onSaveImportedDocuments,
}: DocumentFormsProps) {
  const styles = useStyles2(getStyles);

  return (
    <>
      {isCreatingDocument && (
        <form id="new-document-form" onSubmit={onCreateDocument} className={`${styles.contextPanel} ${styles.nameForm}`}>
          <Field label="New document">
            <Input
              data-testid="new-document-name"
              aria-label="New document"
              value={newName}
              placeholder="architecture.md"
              onChange={(event: ChangeEvent<HTMLInputElement>) => onNewNameChange(event.currentTarget.value)}
            />
          </Field>
          <Button title="Create document" variant="secondary" type="submit" data-testid="create-document">Create document</Button>
        </form>
      )}
      {importedDocuments.length > 0 && (
        <section className={styles.contextPanel} aria-label="Imported documents ready to save">
          <div className={styles.batchImport}>
            <p>{importedDocuments.map(({ name }) => name).join(', ')}</p>
            <Button title="Save imported documents" data-testid="save-imported-documents" onClick={onSaveImportedDocuments}>
              Save imported documents
            </Button>
          </div>
        </section>
      )}
      {importedName && (
        <form onSubmit={onOpenImportedDocument} className={`${styles.contextPanel} ${styles.nameForm}`}>
          <Field label="Imported document name">
            <Input
              aria-label="Imported document name"
              value={importedName}
              onChange={(event: ChangeEvent<HTMLInputElement>) => onImportedNameChange(event.currentTarget.value)}
            />
          </Field>
          <Button title="Open imported document" type="submit" data-testid="open-imported-document">
            Open imported document
          </Button>
        </form>
      )}
    </>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  contextPanel: css`
    display: flex;
    align-items: end;
    gap: ${theme.spacing(2)};
    margin-bottom: ${theme.spacing(2)};
    padding: ${theme.spacing(2)};
    border: 1px solid ${theme.colors.border.weak};
    background: ${theme.colors.background.secondary};

    @media (max-width: 600px) {
      align-items: stretch;
      flex-direction: column;
    }
  `,
  nameForm: css`
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;

    > * {
      min-width: 0;
    }

    > :first-child {
      margin-bottom: 0;
    }

    @media (max-width: 600px) {
      align-items: stretch;
      grid-template-columns: 1fr;
    }
  `,
  batchImport: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: ${theme.spacing(2)};
    width: 100%;

    p {
      margin: 0;
      overflow-wrap: anywhere;
    }
  `,
});
