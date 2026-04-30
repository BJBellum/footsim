import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { ToastViewport } from '@/components/ui/Toast';
import { startThemeCycle } from '@/lib/theme';

export default function App() {
  useEffect(() => {
    const stop = startThemeCycle();
    return stop;
  }, []);
  return (
    <>
      <RouterProvider router={router} />
      <ToastViewport />
    </>
  );
}
