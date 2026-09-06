import React from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { LinkButton, useStyles2 } from '@grafana/ui';
import { prefixRoute } from '../utils/utils.routing';
import { ROUTES } from '../constants';
import { PluginPage } from '@grafana/runtime';
import logo from '../img/logo.png';

function PageOne() {
  const s = useStyles2(getStyles);

  return (
    <PluginPage>
      <div className={s.mainContent}>
        <div className={s.brand} data-testid="main-brand">
          <img data-testid="main-logo" src={logo} alt="NOC public cloud logo" />
          <div className={s.brandText}>NOC public cloud</div>
        </div>
        <div className={s.appLinks}>
          <LinkButton title="to contacts" data-testid="main-contacts-link" className={s.appLink} href={prefixRoute(ROUTES.CONTACTS)}>
            to contacts
          </LinkButton>
          <LinkButton title="to docs" data-testid="main-docs-link" className={s.appLink} href={prefixRoute(ROUTES.DOCS)}>
            to docs
          </LinkButton>
          <LinkButton title="to dashboards" data-testid="main-dashboards-link" className={s.appLink} href={prefixRoute(ROUTES.DASHBOARDS)}>
            to dashboards
          </LinkButton>
        </div>
      </div>
    </PluginPage>
  );
}

export default PageOne;

const getStyles = (theme: GrafanaTheme2) => ({
  mainContent: css`
    box-sizing: border-box;
    width: 100%;
    min-height: 70vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  `,
  brand: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: ${theme.spacing(2)};
    margin-bottom: ${theme.spacing(4)};
    font-size: 24px;
    font-weight: 600;

    img {
      display: block;
      width: min(24vw, 220px);
      max-height: 180px;
      object-fit: contain;
    }
  `,
  brandText: css`
    font-size: 50px;
    font-weight: 600;
  `,
  appLinks: css`
    display: flex;
    flex-wrap: wrap;
    width: min(100%, 90vw);
    justify-content: center;
    align-items: center;
    gap: ${theme.spacing(2)};
    margin-top: ${theme.spacing(3)};
  `,
  appLink: css`
    box-sizing: border-box;
    width: 18vw;
    max-width: 18vw;
    min-width: 0;
    height: 15vh;
    padding: 3vh 2vw;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;

    @media (max-width: 900px) {
      width: 36vw;
      max-width: 36vw;
    }
  `,
});
