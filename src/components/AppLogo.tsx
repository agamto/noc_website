import React from 'react';
import { css } from '@emotion/css';
import { Link } from 'react-router-dom';
import { prefixRoute } from '../utils/utils.routing';
import { ROUTES } from '../constants';
import logo from '../img/logo.png';

export function AppLogo() {
  return (
    <Link className={styles.logo} title="Return to main" to={prefixRoute(ROUTES.Main)}>
      <img src={logo} alt="NOC public cloud" />
    </Link>
  );
}

const styles = {
  logo: css`
    position: relative;
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    width: fit-content;
    margin: 0;

    img {
      display: block;
      width: min(12vw, 64px);
      height: 64px;
      object-fit: contain;
    }
  `,
};
