import React, { useEffect, useState } from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { getBackendSrv, PluginPage } from '@grafana/runtime';
import { LinkButton, Button, Combobox, Input, useStyles2 } from '@grafana/ui';
import { useNavigate } from 'react-router-dom';
import { prefixRoute } from '../utils/utils.routing';
import { ROUTES } from '../constants';

type Dashboard = {
  id?: number;
  uid: string;
  title: string;
  url: string;
  folderTitle?: string;
};

function Dashboards() {
  const styles = useStyles2(getStyles);
  const navigate = useNavigate();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState('Loading dashboards...');

  useEffect(() => {
    getBackendSrv()
      .get<Dashboard[]>('/api/search?type=dash-db&limit=1000')
      .then((result) => {
        setDashboards(Array.isArray(result) ? result : []);
        setStatus('');
      })
      .catch(() => setStatus('Unable to load dashboards'));
  }, []);

  const folders = Array.from(new Set(dashboards.map((dashboard) => dashboard.folderTitle || 'General'))).sort();
  const searchWords = searchTerm.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const visibleDashboards = dashboards.filter((dashboard) => {
    const matchesFolder = selectedFolder === 'all' || (dashboard.folderTitle || 'General') === selectedFolder;
    const searchableText = `${dashboard.title} ${dashboard.folderTitle || 'General'}`.toLowerCase();
    return matchesFolder && searchWords.every((word) => searchableText.includes(word));
  });

  return (
    <PluginPage>
      <main className={styles.page}>
        <div className={styles.header}>
          <LinkButton title="to main page" href={prefixRoute(ROUTES.Main)}>
            to main page
          </LinkButton>
        </div>
        <div className={styles.filters}>
          <Input
            aria-label="Search dashboards"
            placeholder="Search dashboards"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.currentTarget.value)}
          />
          <Combobox
            aria-label="Filter dashboards by folder"
            options={[
              { label: 'All folders', value: 'all' },
              ...folders.map((folder) => ({ label: folder, value: folder })),
            ]}
            value={selectedFolder}
            onChange={(option) => setSelectedFolder(option?.value ?? 'all')}
          />
        </div>
        {status && <p role="status">{status}</p>}
        {!status && visibleDashboards.length === 0 && <p>No dashboards available in this folder.</p>}
        <div className={styles.grid}>
          {visibleDashboards.map((dashboard) => (
            <article className={styles.card} key={dashboard.uid}>
              <div>
                <span className={styles.badge}>Dashboard</span>
                <h2>{dashboard.title}</h2>
                <p className={styles.folder}>{dashboard.folderTitle || 'General'}</p>
              </div>
              <Button
                title={`Open ${dashboard.title}`}
                variant="secondary"
                onClick={() => navigate(`${dashboard.uid}`, { state: { dashboardUrl: dashboard.url, dashboardTitle: dashboard.title } })}
              >
                Open dashboard
              </Button>
            </article>
          ))}
        </div>
      </main>
    </PluginPage>
  );
}

export default Dashboards;

const getStyles = (theme: GrafanaTheme2) => ({
  page: css`
    width: 100%;
    align-items: center;
  `,
  header: css`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: ${theme.spacing(1)};
    margin-bottom: ${theme.spacing(3)};
  `,
  grid: css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: ${theme.spacing(2)};
  `,
  filters: css`
    display: flex;
    align-items: center;
    gap: ${theme.spacing(2)};
    width: min(100%, 760px);
    margin-bottom: ${theme.spacing(3)};

    input {
      flex: 1;
    }

  `,
  card: css`
    min-height: 160px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: ${theme.spacing(3)};
    padding: ${theme.spacing(3)};
    border: 1px solid ${theme.colors.border.weak};
    background: ${theme.colors.background.secondary};
  `,
  badge: css`
    color: ${theme.colors.text.secondary};
    font-size: 12px;
    text-transform: uppercase;
  `,
  folder: css`
    margin: 0;
    color: ${theme.colors.text.secondary};
  `,
});
