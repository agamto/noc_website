import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2, PageLayoutType } from '@grafana/data';
import { getBackendSrv, PluginPage } from '@grafana/runtime';
import { Button, useStyles2 } from '@grafana/ui';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { prefixRoute } from '../utils/utils.routing';
import { ROUTES } from '../constants';
import { AppPageHeader } from '../components/AppPageHeader';
import { BackToMainLink } from '../components/BackToMainLink';
import { DashboardPanels } from '../components/Dashboard/DashboardPanels';
import { DashboardPicker } from '../components/Dashboard/DashboardPicker';
import { DashboardOption } from '../components/Dashboard/types';

type DashboardLocationState = { dashboardUrl?: string; dashboardTitle?: string };

function DashboardView() {
  const styles = useStyles2(getStyles);
  const navigate = useNavigate();
  const location = useLocation();
  const { uid = '' } = useParams<{ uid: string }>();
  const dashboardState = location.state as DashboardLocationState | null;
  const splitLayoutRef = useRef<HTMLDivElement>(null);

  const [dashboardOptions, setDashboardOptions] = useState<DashboardOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [isSearchVisible, setIsSearchVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [draggedDashboardId, setDraggedDashboardId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const [splitDashboards, setSplitDashboards] = useState<Array<DashboardOption | null>>([
    {
      uid,
      title: dashboardState?.dashboardTitle || 'Dashboard',
      url: dashboardState?.dashboardUrl || `/d/${encodeURIComponent(uid)}`,
    },
  ]);

  const refreshDashboardOptions = useCallback(async () => {
    try {
      const result = await getBackendSrv().get<DashboardOption[]>('/api/search?type=dash-db&limit=1000');
      setDashboardOptions(Array.isArray(result) ? result : []);
    } catch {
      setDashboardOptions([]);
    }
  }, []);

  useEffect(() => {
    void refreshDashboardOptions();
  }, [refreshDashboardOptions, uid]);

  useEffect(() => {
    const refreshOnFocus = () => void refreshDashboardOptions();
    window.addEventListener('focus', refreshOnFocus);
    return () => window.removeEventListener('focus', refreshOnFocus);
  }, [refreshDashboardOptions]);

  useEffect(() => {
    const updateFullscreenState = () => setIsFullscreen(document.fullscreenElement === splitLayoutRef.current);
    document.addEventListener('fullscreenchange', updateFullscreenState);
    return () => document.removeEventListener('fullscreenchange', updateFullscreenState);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'F11') {
        return;
      }

      event.preventDefault();
      void toggleFullscreen();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const folders = useMemo(
    () => Array.from(new Set(dashboardOptions.map((dashboard) => dashboard.folderTitle || 'General'))).sort(),
    [dashboardOptions]
  );

  const visibleDashboards = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return dashboardOptions.filter((dashboard) => {
      const matchesFolder = selectedFolder === 'all' || (dashboard.folderTitle || 'General') === selectedFolder;
      const matchesSearch =
        !query ||
        dashboard.title.toLowerCase().includes(query) ||
        (dashboard.folderTitle || 'General').toLowerCase().includes(query);

      return matchesFolder && matchesSearch;
    });
  }, [dashboardOptions, searchTerm, selectedFolder]);

  const addPane = () => {
    setSplitDashboards((current) => [...current, null]);
  };

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await splitLayoutRef.current?.requestFullscreen();
    }
  };

  const handleDragOverPane = (paneIndex: number, event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDropTarget(paneIndex);
  };

  const handleDragLeavePane = (paneIndex: number) => {
    setDropTarget((current) => (current === paneIndex ? null : current));
  };

  const handleDropDashboard = (paneIndex: number, event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDropTarget(null);

    const dashboardId = event.dataTransfer.getData('text/plain') || draggedDashboardId;
    if (!dashboardId) {
      setDraggedDashboardId(null);
      return;
    }

    const dashboard = dashboardOptions.find((item) => item.uid === dashboardId);
    if (dashboard) {
      setSplitDashboards((current) => {
        const next = [...current];

        if (paneIndex >= next.length) {
          next.length = paneIndex + 1;
        }

        if (next[paneIndex]?.uid === dashboard.uid) {
          return next;
        }

        next[paneIndex] = dashboard;
        return next;
      });
    }

    event.dataTransfer.clearData();
    setDraggedDashboardId(null);
  };

  const openDashboardIntoLeftPane = (dashboard: DashboardOption) => {
    setSplitDashboards((current) => {
      const next = [...current];
      next[0] = dashboard;
      return next;
    });
  };

  const removePane = (paneIndex: number) => {
    setSplitDashboards((current) => {
      if (current.length <= 1) {
        return [null];
      }

      const next = [...current];
      next.splice(paneIndex, 1);
      return next;
    });
  };

  return (
    <PluginPage layout={PageLayoutType.Canvas}>
      <main className={styles.page}>
        <div className={styles.header}>
          <AppPageHeader>
            <BackToMainLink />
            <Button title="Back to dashboards" variant="secondary" onClick={() => navigate(prefixRoute(ROUTES.DASHBOARDS))}>
              Back to dashboards
            </Button>
            <Button
              title={isSearchVisible ? 'Hide dashboard search' : 'Show dashboard search'}
              variant="secondary"
              onClick={() => setIsSearchVisible((visible) => !visible)}
            >
              {isSearchVisible ? 'Hide search' : 'Show search'}
            </Button>
          </AppPageHeader>
        </div>

        {isSearchVisible && (
          <DashboardPicker
            folders={folders}
            selectedFolder={selectedFolder}
            searchTerm={searchTerm}
            dashboards={visibleDashboards}
            isFullscreen={isFullscreen}
            onSelectedFolderChange={setSelectedFolder}
            onSearchTermChange={setSearchTerm}
            onDashboardClick={openDashboardIntoLeftPane}
            onDashboardDragStart={(dashboardId) => {
              setDraggedDashboardId(dashboardId);
              setDropTarget(null);
            }}
            onDashboardDragEnd={() => {
              setDraggedDashboardId(null);
              setDropTarget(null);
            }}
            onToggleFullscreen={() => void toggleFullscreen()}
            onAddPane={addPane}
            onRefresh={() => void refreshDashboardOptions()}
          />
        )}

        <DashboardPanels
          splitLayoutRef={splitLayoutRef}
          dashboards={splitDashboards}
          draggedDashboardId={draggedDashboardId}
          dropTarget={dropTarget}
          onDragOverPane={handleDragOverPane}
          onDragLeavePane={handleDragLeavePane}
          onDropDashboard={handleDropDashboard}
          onRemovePane={removePane}
        />
      </main>
    </PluginPage>
  );
}

export default DashboardView;

const getStyles = (theme: GrafanaTheme2) => ({
  page: css`
    box-sizing: border-box;
    width: 100%;
    max-width: none;
    margin: 0;
    min-height: 80vh;
    padding: 0;
  `,
  header: css`
    display: block;
    margin-bottom: ${theme.spacing(2)};
  `,
});
