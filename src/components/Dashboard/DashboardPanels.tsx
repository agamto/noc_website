import React, { RefObject } from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { Button, useStyles2 } from '@grafana/ui';
import { DashboardOption } from './types';

type DashboardPanelsProps = {
  splitLayoutRef: RefObject<HTMLDivElement>;
  dashboards: Array<DashboardOption | null>;
  draggedDashboardId: string | null;
  dropTarget: number | null;
  onDragOverPane: (paneIndex: number, event: React.DragEvent<HTMLDivElement>) => void;
  onDragLeavePane: (paneIndex: number) => void;
  onDropDashboard: (paneIndex: number, event: React.DragEvent<HTMLDivElement>) => void;
  onRemovePane: (paneIndex: number) => void;
};

export function DashboardPanels({
  splitLayoutRef,
  dashboards,
  draggedDashboardId,
  dropTarget,
  onDragOverPane,
  onDragLeavePane,
  onDropDashboard,
  onRemovePane,
}: DashboardPanelsProps) {
  const styles = useStyles2(getStyles);

  return (
    <div ref={splitLayoutRef} className={styles.layout}>
      {dashboards.map((dashboard, index) => (
        <div
          key={`${dashboard?.uid ?? 'empty'}-${index}`}
          className={`${styles.dropZone} ${dropTarget === index ? styles.dropZoneActive : ''}`}
          onDragOver={(event) => onDragOverPane(index, event)}
          onDragLeave={() => onDragLeavePane(index)}
          onDrop={(event) => onDropDashboard(index, event)}
        >
          {draggedDashboardId && (
            <div
              className={styles.dropOverlay}
              onDragOver={(event) => onDragOverPane(index, event)}
              onDragLeave={() => onDragLeavePane(index)}
              onDrop={(event) => onDropDashboard(index, event)}
            />
          )}
          {dashboard ? (
            <>
              <Button
                title={`Remove pane ${index + 1}`}
                variant="secondary"
                className={styles.removePaneButton}
                aria-label={`Remove pane ${index + 1}`}
                onClick={() => onRemovePane(index)}
              >
                ×
              </Button>
              <iframe
                className={styles.dashboard}
                title={`Grafana dashboard ${index + 1}`}
                src={dashboard.url}
                referrerPolicy="same-origin"
                allow="fullscreen"
              >
                Your Grafana configuration does not allow embedded dashboards. Set GF_SECURITY_ALLOW_EMBEDDING=true.
              </iframe>
            </>
          ) : (
            <div className={styles.emptyPane}>Drop a dashboard here</div>
          )}
        </div>
      ))}
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  layout: css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: ${theme.spacing(3)};
    align-items: stretch;
    margin-bottom: ${theme.spacing(3)};
  `,
  dropZone: css`
    position: relative;
    min-height: 75vh;
    border: 1px dashed ${theme.colors.border.weak};
    background: ${theme.colors.background.canvas};
    transition: border-color 0.2s ease, background 0.2s ease;
  `,
  dropZoneActive: css`
    border-color: ${theme.colors.primary.border};
    background: ${theme.colors.background.secondary};
  `,
  dropOverlay: css`
    position: absolute;
    inset: 0;
    z-index: 2;
    cursor: copy;
  `,
  removePaneButton: css`
    position: absolute;
    top: ${theme.spacing(1)};
    right: ${theme.spacing(1)};
    z-index: 1;
  `,
  emptyPane: css`
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 75vh;
    color: ${theme.colors.text.secondary};
    font-style: italic;
  `,
  dashboard: css`
    display: block;
    width: 100%;
    min-height: 75vh;
    border: 0;
    background: ${theme.colors.background.canvas};
  `,
});
