import React from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { PluginPage } from '@grafana/runtime';
import { Button, useStyles2 } from '@grafana/ui';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { prefixRoute } from '../utils/utils.routing';
import { ROUTES } from '../constants';

type DashboardLocationState = { dashboardUrl?: string; dashboardTitle?: string };

function DashboardView() {
  const styles = useStyles2(getStyles);
  const navigate = useNavigate();
  const location = useLocation();
  const { uid = '' } = useParams<{ uid: string }>();
  const dashboardState = location.state as DashboardLocationState | null;
  const dashboardUrl = dashboardState?.dashboardUrl || `/d/${encodeURIComponent(uid)}`;
  const dashboardTitle = dashboardState?.dashboardTitle || 'Dashboard';

  return (
    <PluginPage>
      <main className={styles.page}>
        <div className={styles.header}>
          <Button title="Back to dashboards" variant="secondary" onClick={() => navigate(prefixRoute(ROUTES.DASHBOARDS))}>
            Back to dashboards
          </Button>
          <h1>{dashboardTitle}</h1>
        </div>
        <iframe
          className={styles.dashboard}
          title="Grafana dashboard"
          src={dashboardUrl}
          referrerPolicy="same-origin"
          allow="fullscreen"
        >
          Your Grafana configuration does not allow embedded dashboards. Set GF_SECURITY_ALLOW_EMBEDDING=true.
        </iframe>
      </main>
    </PluginPage>
  );
}

export default DashboardView;

const getStyles = (theme: GrafanaTheme2) => ({
  page: css`
    width: 100%;
    min-height: 80vh;
  `,
  header: css`
    display: flex;
    align-items: center;
    gap: ${theme.spacing(3)};
    margin-bottom: ${theme.spacing(2)};
  `,
  dashboard: css`
    display: block;
    width: 100%;
    min-height: 75vh;
    border: 1px solid ${theme.colors.border.weak};
    background: ${theme.colors.background.canvas};
  `,
});
