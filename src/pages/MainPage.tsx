import React from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { LinkButton, useStyles2 } from '@grafana/ui';
import { prefixRoute } from '../utils/utils.routing';
import { ROUTES } from '../constants';
import { PluginPage } from '@grafana/runtime';

function PageOne() {
  const s = useStyles2(getStyles);

  return (
    <PluginPage>
      <div className={s.mainContent}>
        main page
        <div className={s.appLinks}>
          <LinkButton className={s.appLink} href={prefixRoute(ROUTES.CONTACTS)}>
            to contacts
          </LinkButton>
          <LinkButton className={s.appLink} href={prefixRoute(ROUTES.DOCS)}>
            to docs
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
