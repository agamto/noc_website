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
      <main className={s.mainContent}>
        <div className={s.brand} data-testid="main-brand">
          <img data-testid="main-logo" src={logo} alt="NOC public cloud logo" />
          <h1 className={s.brandText}>NOC Public Cloud</h1>
        </div>
        <nav className={s.appLinks} aria-label="Plugin sections">
          <LinkButton data-testid="main-contacts-link" className={s.appLink} href={prefixRoute(ROUTES.CONTACTS)}>
            Contacts
          </LinkButton>
          <LinkButton data-testid="main-docs-link" className={s.appLink} href={prefixRoute(ROUTES.DOCS)}>
            Documentation
          </LinkButton>
          <LinkButton data-testid="main-dashboards-link" className={s.appLink} href={prefixRoute(ROUTES.DASHBOARDS)}>
            Dashboards
          </LinkButton>
        </nav>
      </main>
    </PluginPage>
  );
}

export default PageOne;

const getStyles = (theme: GrafanaTheme2) => ({
  mainContent: css`
    box-sizing: border-box;
    width: 100%;
    max-width: 960px;
    min-height: 100%;
    margin: 0 auto;
    padding: ${theme.spacing(6)} ${theme.spacing(3)};
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    text-align: center;
  `,
  brand: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: ${theme.spacing(2)};
    margin-bottom: ${theme.spacing(3)};

    img {
      display: block;
      width: 160px;
      max-width: 45vw;
      height: 140px;
      object-fit: contain;
    }
  `,
  brandText: css`
    margin: 0;
    font-size: 40px;
    font-weight: 600;

    @media (max-width: 720px) {
      font-size: 32px;
    }
  `,
  appLinks: css`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    width: min(100%, 880px);
    gap: ${theme.spacing(2)};

    @media (max-width: 720px) {
      grid-template-columns: 1fr;
    }
  `,
  appLink: css`
    box-sizing: border-box;
    min-height: 72px;
    padding: ${theme.spacing(2)};
    border: 1px solid ${theme.colors.border.weak};
    border-radius: 6px;
    background: ${theme.colors.background.secondary};
    color: ${theme.colors.text.primary};
    box-shadow: 0 1px 2px ${theme.colors.background.primary};
    font-size: 18px;
    font-weight: 600;
    transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;

    && {
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
    }

    &:hover {
      border-color: ${theme.colors.primary.border};
      background: ${theme.colors.action.hover};
      color: ${theme.colors.text.primary};
      transform: translateY(-2px);
    }

    &&:focus-visible {
      outline: 2px solid ${theme.colors.primary.main};
      outline-offset: 2px;
    }

    @media (max-width: 720px) {
      min-height: 64px;
      font-size: 16px;
    }
  `,
});
