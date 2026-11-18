import React, { useCallback, useEffect, useState } from 'react';
import App from './App';
import { YenGecChatApp } from './chat/YenGecChatApp';

export type ActiveAppMode = 'chat' | 'kontrol';

function detectInitialMode(): ActiveAppMode {
  if (typeof window === 'undefined') return 'chat';
  const params = new URLSearchParams(window.location.search);
  if (
    params.get('app') === 'kontrol' ||
    window.location.pathname.startsWith('/kontrol') ||
    window.location.hash === '#kontrol'
  ) {
    return 'kontrol';
  }
  return 'chat';
}

function syncHeadMetadata(mode: ActiveAppMode) {
  if (typeof document === 'undefined') return;
  if (mode === 'kontrol') {
    document.title = 'YenGeç Kontrol Merkezi — Erişim ve Uygulama Ayarları';
    document.body.className = 'bg-[#0B0F17] text-slate-100 antialiased';
  } else {
    document.title = 'YenGeç - Yeni Nesil Yapay Zeka Asistanı';
    document.body.className = 'bg-[#212121] text-[#ececec] antialiased';
  }

  const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
  if (manifestLink) {
    manifestLink.href =
      mode === 'kontrol' ? '/manifest-kontrol.webmanifest' : '/manifest-yengec.webmanifest';
  }

  const icon192 = document.querySelector('link[rel="icon"][sizes="192x192"]') as HTMLLinkElement | null;
  if (icon192) {
    icon192.href = mode === 'kontrol' ? '/kontrol-icon-192.png?v=3' : '/pwa-192x192.png?v=2';
  }

  const icon32 = document.querySelector('link[rel="icon"][sizes="32x32"]') as HTMLLinkElement | null;
  if (icon32) {
    icon32.href = mode === 'kontrol' ? '/kontrol-favicon-32.png?v=3' : '/favicon-32x32.png?v=2';
  }

  const appleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null;
  if (appleIcon) {
    appleIcon.href =
      mode === 'kontrol' ? '/kontrol-apple-touch-icon.png?v=3' : '/apple-touch-icon.png?v=2';
  }
}

export const RootShell: React.FC<{ defaultMode?: ActiveAppMode }> = ({ defaultMode }) => {
  const [mode, setMode] = useState<ActiveAppMode>(() => defaultMode || detectInitialMode());

  useEffect(() => {
    syncHeadMetadata(mode);
  }, [mode]);

  useEffect(() => {
    const onPopState = () => {
      setMode(detectInitialMode());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleSwitchApp = useCallback((next: ActiveAppMode) => {
    const nextUrl = next === 'kontrol' ? '/?app=kontrol' : '/';
    if (window.location.pathname + window.location.search !== nextUrl) {
      window.history.pushState({}, '', nextUrl);
    }
    setMode(next);
  }, []);

  if (mode === 'kontrol') {
    return <App onSwitchToChat={() => handleSwitchApp('chat')} />;
  }

  return <YenGecChatApp onSwitchToKontrol={() => handleSwitchApp('kontrol')} />;
};
