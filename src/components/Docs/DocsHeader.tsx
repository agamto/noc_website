import React from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { Button, useStyles2 } from '@grafana/ui';

type DocsHeaderProps = {
  documentCount: number;
  isCreatingDocument: boolean;
  onToggleCreate: () => void;
};

export function DocsHeader({ documentCount, isCreatingDocument, onToggleCreate }: DocsHeaderProps) {
  const styles = useStyles2(getStyles);
  const documentLabel = documentCount === 1 ? 'document' : 'documents';

  return (
    <header className={styles.pageHeader}>
      <div>
        <h1>Documentation Center</h1>
        <p className={styles.documentCount}>{documentCount} {documentLabel}</p>
      </div>
      <Button
        title={isCreatingDocument ? 'Close new document' : 'Add new document'}
        variant="secondary"
        data-testid="add-new-document"
        aria-expanded={isCreatingDocument}
        aria-controls={isCreatingDocument ? 'new-document-form' : undefined}
        onClick={onToggleCreate}
      >
        {isCreatingDocument ? 'Close new document' : 'Add new document'}
      </Button>
    </header>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  pageHeader: css`
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: space-between;
    gap: ${theme.spacing(2)};
    margin-bottom: ${theme.spacing(3)};

    h1 {
      margin: 0;
    }

    @media (max-width: 600px) {
      align-items: stretch;
      flex-direction: column;
    }
  `,
  documentCount: css`
    margin: ${theme.spacing(0.5)} 0 0;
    color: ${theme.colors.text.secondary};
  `,
});
