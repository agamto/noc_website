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
      <div>
        main page
        <div className={s.marginTop}>
          <LinkButton href={prefixRoute(ROUTES.CONTACTS)}>
            to contacts
          </LinkButton>
        </div>
      </div>
    </PluginPage>
  );
}

export default PageOne;

const getStyles = (theme: GrafanaTheme2) => ({
  marginTop: css`
    margin-top: ${theme.spacing(2)};
  `,
});
