import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppRootProps } from '@grafana/data';
import { ROUTES } from '../../constants';
const PageOne = React.lazy(() => import('../../pages/PageOne'));
const Contacts = React.lazy(() => import('../../pages/Contacts'));

function App(props: AppRootProps) {
  return (
    <Routes>
      <Route path={ROUTES.CONTACTS} element={<Contacts/>} />
      <Route path="*" element={<PageOne />} />
    </Routes>
  );
}

export default App;
