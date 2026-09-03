import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppRootProps } from '@grafana/data';
import { ROUTES } from '../../constants';
const PageOne = React.lazy(() => import('../../pages/MainPage'));
const Contacts = React.lazy(() => import('../../pages/Contacts'));
const Docs = React.lazy(() => import('../../pages/Docs'));
const DocsEditor = React.lazy(() => import('../../pages/DocsEditor'));
const Dashboards = React.lazy(() => import('../../pages/Dashboards'));
const DashboardView = React.lazy(() => import('../../pages/DashboardView'));

function App(props: AppRootProps) {
  return (
    <Routes>
      <Route path={ROUTES.CONTACTS} element={<Contacts/>} />
      <Route path={`${ROUTES.DOCS}/*`} element={<DocsEditor />} />
      <Route path={ROUTES.DOCS} element={<Docs />} />
      <Route path={ROUTES.DASHBOARDS} element={<Dashboards />} />
      <Route path={`${ROUTES.DASHBOARDS}/:uid`} element={<DashboardView />} />
      <Route path="*" element={<PageOne />} />
    </Routes>
  );
}

export default App;
