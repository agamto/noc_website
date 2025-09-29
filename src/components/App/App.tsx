import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppRootProps } from '@grafana/data';
import { ROUTES } from '../../constants';
const PageOne = React.lazy(() => import('../../pages/PageOne'));
const PageFive = React.lazy(() => import('../../pages/PageFive'));

function App(props: AppRootProps) {
  return (
    <Routes>
      <Route path={ROUTES.CONTACTS} element={<PageFive/>} />
      <Route path="*" element={<PageOne />} />
    </Routes>
  );
}

export default App;
