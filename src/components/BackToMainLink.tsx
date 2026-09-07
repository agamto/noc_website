import React from 'react';
import { LinkButton } from '@grafana/ui';
import { ROUTES } from '../constants';
import { prefixRoute } from '../utils/utils.routing';

export function BackToMainLink() {
  return (
    <LinkButton title="Back to main page" variant="secondary" href={prefixRoute(ROUTES.Main)}>
      Back to main
    </LinkButton>
  );
}
