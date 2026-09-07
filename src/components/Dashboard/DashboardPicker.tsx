import React from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { Button, Input, useStyles2 } from '@grafana/ui';
import { DashboardOption } from './types';

type DashboardPickerProps = {
  folders: string[];
  selectedFolder: string;
  searchTerm: string;
  dashboards: DashboardOption[];
  isFullscreen: boolean;
  onSelectedFolderChange: (folder: string) => void;
  onSearchTermChange: (searchTerm: string) => void;
  onDashboardClick: (dashboard: DashboardOption) => void;
  onDashboardDragStart: (dashboardId: string) => void;
  onDashboardDragEnd: () => void;
  onToggleFullscreen: () => void;
  onAddPane: () => void;
  onRefresh: () => void;
};

export function DashboardPicker({
  folders,
  selectedFolder,
  searchTerm,
  dashboards,
  isFullscreen,
  onSelectedFolderChange,
  onSearchTermChange,
  onDashboardClick,
  onDashboardDragStart,
  onDashboardDragEnd,
  onToggleFullscreen,
  onAddPane,
  onRefresh,
}: DashboardPickerProps) {
  const styles = useStyles2(getStyles);

  return (
    <div className={styles.container} data-testid="dashboard-picker">
      <div className={styles.filters}>
        <Input
          aria-label="Search dashboards"
          placeholder="Search dashboards"
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.currentTarget.value)}
        />
        <select
          className={styles.select}
          aria-label="Filter dashboards by folder"
          value={selectedFolder}
          onChange={(event) => onSelectedFolderChange(event.target.value)}
        >
          <option value="all">All folders</option>
          {folders.map((folder) => (
            <option key={folder} value={folder}>
              {folder}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.dashboardList}>
        {dashboards.length === 0 ? (
          <p className={styles.emptyList}>No dashboards match</p>
        ) : (
          dashboards.map((dashboard) => (
            <Button
              key={dashboard.uid}
              data-testid={`dashboard-picker-dashboard-${dashboard.uid}`}
              variant="secondary"
              draggable
              className={styles.dashboardItem}
              onClick={() => onDashboardClick(dashboard)}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'copy';
                event.dataTransfer.setData('text/plain', dashboard.uid);
                onDashboardDragStart(dashboard.uid);
              }}
              onDragEnd={(event) => {
                event.dataTransfer.clearData();
                onDashboardDragEnd();
              }}
            >
              {dashboard.title}
            </Button>
          ))
        )}
      </div>

      <div className={styles.actionRow}>
        <Button
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          variant="secondary"
          onClick={onToggleFullscreen}
        >
          {isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        </Button>
        <Button variant="secondary" onClick={onAddPane}>
          Add pane
        </Button>
        <Button data-testid="dashboard-picker-refresh" title="Refresh dashboard list" variant="secondary" onClick={onRefresh}>
          Refresh
        </Button>
      </div>
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  container: css`
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing(2)};
    margin-bottom: ${theme.spacing(3)};
    padding: ${theme.spacing(2)};
    border: 1px solid ${theme.colors.border.weak};
    background: ${theme.colors.background.secondary};
  `,
  filters: css`
    display: flex;
    gap: ${theme.spacing(2)};
    align-items: center;
    margin: ${theme.spacing(2)} 0;

    input {
      flex: 1;
    }
  `,
  select: css`
    width: 100%;
    min-height: 36px;
    padding: ${theme.spacing(1)} ${theme.spacing(2)};
    border: 1px solid ${theme.colors.border.weak};
    background: ${theme.colors.background.canvas};
    color: ${theme.colors.text.primary};
  `,
  dashboardList: css`
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing(1)};
    max-height: 60vh;
    overflow-y: auto;
  `,
  dashboardItem: css`
    && {
      width: 100%;
      justify-content: flex-start;
      cursor: grab;
    }
  `,
  emptyList: css`
    margin: 0;
    color: ${theme.colors.text.secondary};
  `,
  actionRow: css`
    display: flex;
    gap: ${theme.spacing(2)};
    flex-wrap: wrap;
  `,
});
