import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { sanitizeApkUrl } from '../constants/defaults';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  appName: string;
  compact?: boolean;
  apkUrl?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  appName,
  compact,
  apkUrl,
}) => {
  const { isInstallable, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  const safeApkUrl = sanitizeApkUrl(apkUrl);
  const isAiStudioProxyHost =
    typeof window !== 'undefined' &&
    (window.location.hostname.startsWith('ais-dev-') ||
      window.location.hostname.startsWith('ais-pre-'));

  if (safeApkUrl) {
    return (
      <a
        href={safeApkUrl}
        download
        rel="noopener noreferrer"
        className={
          compact
            ? 'h-8 px-2.5 rounded-lg bg-[#2563EB] hover:bg-blue-500 text-xs font-semibold text-white inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors'
            : 'w-full h-10 px-3 rounded-lg bg-[#2563EB] hover:bg-blue-500 text-xs font-semibold text-white inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors'
        }
        title={`${appName} Android APK İndir`}
      >
        <Smartphone className="w-3.5 h-3.5 shrink-0" />
        <span className={compact ? 'hidden sm:inline' : ''}>APK İndir</span>
        {compact && <span className="sm:hidden">APK</span>}
      </a>
    );
  }

  const handleClick = async () => {
    // On ais-dev/ais-pre proxy hosts, Chrome's native WebAPK prompt always fails
    // with "Bu uygulama yüklenemez" because webapk.googleapis.com has no session cookies.
    if (isInstallable && !isAiStudioProxyHost) {
      const accepted = await install();
      if (accepted) return;
    }
    setShowGuide(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={
          compact
            ? 'h-8 px-2.5 rounded-lg bg-[#2563EB] hover:bg-blue-500 text-xs font-semibold text-white inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors'
            : 'w-full h-10 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-100 inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors'
        }
        title={`${appName} — Cihaza Yükle`}
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span className={compact ? 'hidden sm:inline' : ''}>Uygulamayı Yükle</span>
        {compact && <span className="sm:hidden">Yükle</span>}
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
          <div className="w-full max-w-md bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-4 text-left">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-50">{appName} — Cihaza Ekle</h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <p className="text-xs text-slate-300 leading-relaxed">
                1. Safari araç çubuğundaki <strong>Paylaş</strong> simgesine dokunun.
                <br />
                2. Aşağı kaydırıp <strong>Ana Ekrana Ekle</strong> seçeneğine dokunun.
              </p>
            ) : (
              <div className="text-xs text-slate-300 leading-relaxed space-y-2.5">
                {isAiStudioProxyHost ? (
                  <p>
                    Bu adres AI Studio oturum korumalı (<code className="font-mono text-slate-200">ais-dev</code> /{' '}
                    <code className="font-mono text-slate-200">ais-pre</code>) olduğu için
                    Chrome’un <strong>Yükle</strong> seçeneği burada hata verir. Bunun yerine
                    aşağıdaki adımdan <strong>Kısayol oluştur</strong>’u seçin:
                  </p>
                ) : (
                  <p>Tarayıcınızdan ana ekrana eklemek için şu adımı izleyin:</p>
                )}
                <div className="p-3 rounded-lg bg-[#161E2E] border border-slate-800 space-y-1">
                  <div className="font-semibold text-slate-100">Android Chrome:</div>
                  <p>
                    Sağ üst <strong>⋮ → Ana ekrana ekle → Kısayol oluştur</strong> seçeneğine
                    dokunun (<em>“Yükle” değil “Kısayol oluştur”</em>).
                  </p>
                  <div className="font-semibold text-slate-100 pt-1.5">Bilgisayar Chrome:</div>
                  <p>Sağ üst <strong>⋮ → Kaydet ve paylaş → Kısayol oluştur</strong>’a tıklayın.</p>
                </div>
                <p className="text-[11px] text-slate-400">
                  Tam PWA kurulumu veya tek tuşla <strong>.apk</strong> indirme için uygulamayı
                  ücretsiz Render/Firebase Hosting’e yayınlayıp Kontrol Merkezi’nden APK linkini
                  ekleyebilirsiniz.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full h-9 rounded-lg bg-[#2563EB] hover:bg-blue-500 text-xs font-semibold text-white cursor-pointer"
            >
              Tamam
            </button>
          </div>
        </div>
      )}
    </>
  );
};
