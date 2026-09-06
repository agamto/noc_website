import React, { useState } from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { Button, useStyles2 } from '@grafana/ui';
import { Link } from 'react-router-dom';

type SavedDocumentsProps = {
  documentCount: number;
  documents: string[];
  getDocumentUrl: (name: string) => string;
};

export function SavedDocuments({ documentCount, documents, getDocumentUrl }: SavedDocumentsProps) {
  const styles = useStyles2(getStyles);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const emptyMessage = documentCount === 0 ? 'No documents in this folder.' : 'No documents match your search.';
  const pageCount = Math.max(1, Math.ceil(documents.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const pageStart = currentPage * pageSize;
  const paginatedDocuments = documents.slice(pageStart, pageStart + pageSize);

  return (
    <section aria-labelledby="saved-documents-heading">
      <div className={styles.sectionHeader}>
        <h2 id="saved-documents-heading">Saved documents</h2>
        <span>{documents.length} shown</span>
      </div>
      {documents.length === 0 ? (
        <p className={styles.emptyState}>{emptyMessage}</p>
      ) : (
        <>
          <div className={styles.tableContainer}>
            <table className={styles.documentTable}>
              <thead>
                <tr>
                  <th scope="col">Document</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDocuments.map((name) => (
                  <tr key={name}>
                    <td>
                      <Link className={styles.documentLink} title={name} to={getDocumentUrl(name)}>
                        <span className={styles.fileBadge}>MD</span>
                        <span className={styles.documentName}>{name}</span>
                      </Link>
                    </td>
                    <td>
                      <Link className={styles.openLink} to={getDocumentUrl(name)}>
                        Open document
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.pagination}>
            <label className={styles.pageSizeControl}>
              Rows per page
              <select
                aria-label="Rows per page"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(0);
                }}
              >
                {[5, 10, 25, 50].map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </label>
            <span className={styles.pageStatus}>Page {currentPage + 1} of {pageCount}</span>
            <div className={styles.paginationActions}>
              <Button
                title="Previous page"
                variant="secondary"
                disabled={currentPage === 0}
                onClick={() => setPage(currentPage - 1)}
              >
                Previous
              </Button>
              <Button
                title="Next page"
                variant="secondary"
                disabled={currentPage >= pageCount - 1}
                onClick={() => setPage(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  sectionHeader: css`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: ${theme.spacing(2)};
    margin-bottom: ${theme.spacing(2)};

    h2 {
      margin: 0;
    }

    span {
      color: ${theme.colors.text.secondary};
      font-size: 12px;
    }
  `,
  emptyState: css`
    margin: 0;
    padding: ${theme.spacing(3)};
    border: 1px dashed ${theme.colors.border.weak};
    color: ${theme.colors.text.secondary};
  `,
  tableContainer: css`
    width: 100%;
    overflow-x: auto;
    border: 1px solid ${theme.colors.border.weak};
    background: ${theme.colors.background.secondary};
  `,
  documentTable: css`
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    text-align: left;

    th,
    td {
      padding: ${theme.spacing(1.5)} ${theme.spacing(2)};
      border-bottom: 1px solid ${theme.colors.border.weak};
    }

    th {
      color: ${theme.colors.text.secondary};
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    th:last-child,
    td:last-child {
      width: 140px;
      text-align: right;
    }

    tbody tr:last-child td {
      border-bottom: 0;
    }
  `,
  documentLink: css`
    display: flex;
    align-items: center;
    gap: ${theme.spacing(2)};
    min-width: 0;
    color: ${theme.colors.text.primary};
    text-decoration: none;

    &:hover,
    &:focus-visible {
      color: ${theme.colors.primary.text};
      text-decoration: none;
    }

    &:focus-visible {
      outline: 2px solid ${theme.colors.primary.main};
      outline-offset: 2px;
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
    min-width: 0;
    overflow: hidden;
    font-size: 16px;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  openLink: css`
    color: ${theme.colors.text.secondary};
    font-size: 12px;
    text-decoration: none;

    &:hover,
    &:focus-visible {
      color: ${theme.colors.primary.text};
      text-decoration: underline;
    }
  `,
  pagination: css`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: ${theme.spacing(2)};
    margin-top: ${theme.spacing(2)};

    @media (max-width: 600px) {
      justify-content: space-between;
    }
  `,
  pageSizeControl: css`
    display: flex;
    align-items: center;
    gap: ${theme.spacing(1)};
    color: ${theme.colors.text.secondary};
    font-size: 12px;

    select {
      min-height: 32px;
      padding: 0 ${theme.spacing(1)};
      border: 1px solid ${theme.colors.border.weak};
      background: ${theme.colors.background.primary};
      color: ${theme.colors.text.primary};
    }
  `,
  pageStatus: css`
    color: ${theme.colors.text.secondary};
    font-size: 12px;
  `,
  paginationActions: css`
    display: flex;
    gap: ${theme.spacing(1)};
  `,
});
