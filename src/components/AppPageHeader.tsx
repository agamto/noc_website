import React, { ReactNode } from 'react';
import { css } from '@emotion/css';
import { AppLogo } from './AppLogo';

type Props = {
  children: ReactNode;
};

export function AppPageHeader({ children }: Props) {
  return (
    <div className={styles.header}>
      <AppLogo />
      {children}
    </div>
  );
}

const styles = {
  header: css`
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
  `,
};
