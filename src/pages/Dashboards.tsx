import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2, PageLayoutType } from '@grafana/data';
import { getBackendSrv, PluginPage } from '@grafana/runtime';
import { Button, Combobox, Input, useStyles2 } from '@grafana/ui';
import { useNavigate } from 'react-router-dom';
import { AppPageHeader } from '../components/AppPageHeader';
import { BackToMainLink } from '../components/BackToMainLink';

type Dashboard = { uid: string; title: string; url: string; folderTitle?: string };

function Dashboards() {
  const styles = useStyles2(getStyles);
  const navigate = useNavigate();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadDashboards = useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const result = await getBackendSrv().get<Dashboard[]>('/api/search?type=dash-db&limit=1000');
      setDashboards(Array.isArray(result) ? result : []);
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboards();
  }, [loadDashboards]);

  const folders = useMemo(
    () => Array.from(new Set(dashboards.map((dashboard) => dashboard.folderTitle || 'General'))).sort(),
    [dashboards]
  );
  const visibleDashboards = useMemo(() => {
    const words = searchTerm.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return dashboards.filter((dashboard) => {
      const folder = dashboard.folderTitle || 'General';
      return (selectedFolder === 'all' || folder === selectedFolder) && words.every((word) => `${dashboard.title} ${folder}`.toLowerCase().includes(word));
    });
  }, [dashboards, searchTerm, selectedFolder]);
  const hasFilters = Boolean(searchTerm) || selectedFolder !== 'all';
  const clearFilters = () => { setSearchTerm(''); setSelectedFolder('all'); };

  return (
    <PluginPage layout={PageLayoutType.Canvas}>
      <main className={styles.page}>
        <AppPageHeader><BackToMainLink /></AppPageHeader>
        <div className={styles.content}>
          <header className={styles.header}>
            <h1>Dashboards</h1>
            <p aria-live="polite">{isLoading ? 'Loading dashboards' : `${visibleDashboards.length} of ${dashboards.length} dashboards`}</p>
          </header>
          <div className={styles.filters}>
            <Input aria-label="Search dashboards" placeholder="Search dashboards" value={searchTerm} onChange={(event) => setSearchTerm(event.currentTarget.value)} />
            <Combobox aria-label="Filter dashboards by folder" options={[{ label: 'All folders', value: 'all' }, ...folders.map((folder) => ({ label: folder, value: folder }))]} value={selectedFolder} onChange={(option) => setSelectedFolder(option?.value ?? 'all')} />
            {hasFilters && <Button title="Clear dashboard filters" variant="secondary" onClick={clearFilters}>Clear filters</Button>}
          </div>
          {isLoading && <div className={styles.state} role="status">Loading dashboards...</div>}
          {loadError && <div className={styles.error} role="alert"><span>Unable to load dashboards.</span><Button variant="secondary" onClick={() => void loadDashboards()}>Retry</Button></div>}
          {!isLoading && !loadError && visibleDashboards.length === 0 && <div className={styles.state}>{dashboards.length ? 'No dashboards match these filters.' : 'No dashboards are available.'}</div>}
          {!isLoading && !loadError && visibleDashboards.length > 0 && <ul className={styles.grid}>
            {visibleDashboards.map((dashboard) => (
              <li key={dashboard.uid}><article className={styles.card}>
                <div><span className={styles.folder}>{dashboard.folderTitle || 'General'}</span><h2>{dashboard.title}</h2></div>
                <Button title={`Open ${dashboard.title}`} aria-label={`Open dashboard ${dashboard.title}`} variant="secondary" onClick={() => navigate(`${dashboard.uid}`, { state: { dashboardUrl: dashboard.url, dashboardTitle: dashboard.title } })}>Open dashboard</Button>
              </article></li>
            ))}
          </ul>}
        </div>
      </main>
    </PluginPage>
  );
}

export default Dashboards;

const getStyles = (theme: GrafanaTheme2) => ({
  page: css`width: 100%; min-height: 100%;`,
  content: css`
    box-sizing: border-box; width: min(100%, 1280px); margin: 0 auto; padding: ${theme.spacing(3)};
    @media (max-width: 600px) { padding: ${theme.spacing(2)}; }
  `,
  header: css`
    margin-bottom: ${theme.spacing(3)};
    h1 { margin: 0; }
    p { margin: ${theme.spacing(0.5)} 0 0; color: ${theme.colors.text.secondary}; }
  `,
  filters: css`
    display: grid; grid-template-columns: minmax(0, 1fr) minmax(220px, 320px) auto; gap: ${theme.spacing(2)}; align-items: end; margin-bottom: ${theme.spacing(3)};
    @media (max-width: 700px) { grid-template-columns: 1fr; }
  `,
  grid: css`
    display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: ${theme.spacing(2)}; margin: 0; padding: 0; list-style: none;
    @media (max-width: 1000px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    @media (max-width: 600px) { grid-template-columns: 1fr; }
  `,
  card: css`
    box-sizing: border-box; min-width: 0; min-height: 148px; display: flex; flex-direction: column; justify-content: space-between; gap: ${theme.spacing(2)}; padding: ${theme.spacing(2.5)}; border: 1px solid ${theme.colors.border.weak}; border-radius: 6px; background: ${theme.colors.background.secondary}; transition: border-color 120ms ease, background 120ms ease;
    h2 { margin: ${theme.spacing(1)} 0 0; overflow-wrap: anywhere; font-size: 18px; font-weight: 600; line-height: 1.4; }
    &:hover, &:focus-within { border-color: ${theme.colors.primary.border}; background: ${theme.colors.action.hover}; }
  `,
  folder: css`display: block; overflow: hidden; color: ${theme.colors.text.secondary}; font-size: 12px; text-overflow: ellipsis; white-space: nowrap;`,
  state: css`min-height: 96px; padding: ${theme.spacing(3)}; border: 1px dashed ${theme.colors.border.weak}; color: ${theme.colors.text.secondary};`,
  error: css`display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: ${theme.spacing(2)}; padding: ${theme.spacing(3)}; border: 1px solid ${theme.colors.error.border}; color: ${theme.colors.error.text};`,
});
