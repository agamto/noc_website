import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppRootProps } from '@grafana/data';
import { ROUTES } from '../../constants';
const PageOne = React.lazy(() => import('../../pages/MainPage'));
const Contacts = React.lazy(() => import('../../pages/Contacts'));
const Docs = React.lazy(() => import('../../pages/Docs'));
const DocsEditor = React.lazy(() => import('../../pages/DocsEditor'));

function App(props: AppRootProps) {
  return (
    <Routes>
      <Route path={ROUTES.CONTACTS} element={<Contacts/>} />
      <Route path={`${ROUTES.DOCS}/*`} element={<DocsEditor />} />
      <Route path={ROUTES.DOCS} element={<Docs />} />
      <Route path="*" element={<PageOne />} />
    </Routes>
  );
}

export default App;
