import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import './styles.css';
import { ColorwayProvider } from './app/colorway';
import { routes } from './app/routes';
import { syncSiteMetadata } from './app/site-metadata';

const DevAgentation = import.meta.env.DEV
  ? React.lazy(() => import('agentation').then(({ Agentation }) => ({ default: Agentation })))
  : null;

const router = createBrowserRouter(routes);

router.subscribe(({ location }) => { void syncSiteMetadata(location.pathname); });

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ColorwayProvider>
      <RouterProvider router={router} />
      {DevAgentation && <React.Suspense fallback={null}><DevAgentation appName="MetalUI docs" /></React.Suspense>}
    </ColorwayProvider>
  </React.StrictMode>,
);
