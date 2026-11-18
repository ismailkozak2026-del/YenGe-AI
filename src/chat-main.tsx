import { createRoot } from 'react-dom/client';
import { RootShell } from './RootShell';
import './index.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => {
        regs.forEach((reg) => {
          const scriptUrl = reg.active?.scriptURL || reg.installing?.scriptURL || '';
          if (
            scriptUrl.endsWith('/sw.js') ||
            scriptUrl.endsWith('/dev-sw.js') ||
            scriptUrl.endsWith('/sw-kontrol.js')
          ) {
            reg.unregister().catch(() => {});
          }
        });
      })
      .catch(() => {});

    navigator.serviceWorker
      .register('/sw-yengec.js', { scope: '/' })
      .catch((err) => console.warn('SW register notice:', err?.message));
  });
}

createRoot(document.getElementById('root')!).render(<RootShell />);
