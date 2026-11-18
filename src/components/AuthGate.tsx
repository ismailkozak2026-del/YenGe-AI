import React, { useState } from 'react';
import { Copy, Check, LogOut, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { User } from 'firebase/auth';
import { PWAInstallButton } from './PWAInstallButton';

interface SignInScreenProps {
  onSignIn: () => Promise<void>;
  loading: boolean;
  error: string | null;
  onSwitchToChat?: () => void;
}

export const AuthLoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-800 animate-pulse" />
          <div className="space-y-2 flex-1">
            <div className="h-4 w-40 bg-slate-800 rounded animate-pulse" />
            <div className="h-3 w-56 bg-slate-800/70 rounded animate-pulse" />
          </div>
        </div>
        <div className="h-px bg-slate-800" />
        <div className="space-y-3">
          <div className="h-10 bg-slate-800/80 rounded-lg animate-pulse" />
          <div className="h-4 w-48 bg-slate-800/60 rounded animate-pulse mx-auto" />
        </div>
      </div>
    </div>
  );
};

export const SignInScreen: React.FC<SignInScreenProps> = ({
  onSignIn,
  loading,
  error,
  onSwitchToChat,
}) => {
  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3.5">
            <img
              src="/kontrol-icon-192.png"
              alt="YenGeç Kontrol Merkezi"
              className="w-11 h-11 rounded-lg border border-slate-700 object-cover bg-slate-900"
            />
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-50">
                YenGeç Kontrol Merkezi
              </h1>
              <p className="text-xs text-slate-400">
                Küresel Erişim Kontrolleri ve Uygulama Ayarları
              </p>
            </div>
          </div>

          <div className="bg-[#161E2E] border border-slate-800 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-400">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Yönetici Doğrulaması Gerekli</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-300">
              YenGeç’in herkes için genel erişim izinlerini, bakım modunu, özellik anahtarlarını,
              model ayarlarını ve kotalarını yönetmek için yetkili Google hesabınızla oturum açın.
            </p>
          </div>

          {error && (
            <div className="bg-red-950/50 border border-red-800/70 rounded-lg p-3.5 text-xs text-red-200 leading-relaxed">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={onSignIn}
            disabled={loading}
            className="w-full h-11 px-4 rounded-lg bg-[#2563EB] hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z"
              />
            </svg>
            <span>{loading ? 'Bağlanıyor...' : 'Google ile Yönetici Girişi Yap'}</span>
          </button>

          <PWAInstallButton appName="YenGeç Kontrol Merkezi" />

          {onSwitchToChat && (
            <button
              type="button"
              onClick={onSwitchToChat}
              className="w-full h-9 rounded-lg bg-transparent hover:bg-slate-800/70 border border-slate-800 text-xs font-medium text-slate-300 cursor-pointer transition-colors"
            >
              YenGeç AI Sohbetine Geç
            </button>
          )}
        </div>

        <div className="px-6 py-3.5 bg-[#0F1623] border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>Firebase Auth & Firestore Güvenli Yönetim</span>
          <span className="font-mono">v1.0</span>
        </div>
      </div>
    </div>
  );
};

interface UnauthorizedScreenProps {
  user: User;
  onSignOut: () => Promise<void>;
  onSwitchToChat?: () => void;
}

export const UnauthorizedScreen: React.FC<UnauthorizedScreenProps> = ({
  user,
  onSignOut,
  onSwitchToChat,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyUid = async () => {
    try {
      await navigator.clipboard.writeText(user.uid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg bg-[#111827] border border-slate-800 rounded-xl p-6 sm:p-8 space-y-5">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-red-950/70 border border-red-800/70 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-50">Yönetici Yetkisi Bulunamadı</h1>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Oturum açtığınız hesap YenGeç Kontrol Merkezi yöneticileri listesinde kayıtlı değil
              veya e-posta doğrulaması eksik.
            </p>
          </div>
        </div>

        <div className="bg-[#161E2E] border border-slate-800 rounded-lg p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">E-posta</span>
            <span className="font-medium text-slate-100 truncate">{user.email || 'Bilinmiyor'}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">E-posta Doğrulaması</span>
            <span className={user.emailVerified ? 'text-emerald-400 font-medium' : 'text-amber-400 font-medium'}>
              {user.emailVerified ? 'Doğrulandı' : 'Doğrulanmadı'}
            </span>
          </div>
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-slate-400 block mb-1">Kullanıcı Kimliği (UID)</span>
              <code className="text-[11px] text-slate-200 font-mono break-all">{user.uid}</code>
            </div>
            <button
              type="button"
              onClick={handleCopyUid}
              className="shrink-0 h-8 px-2.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Kopyalandı' : 'UID Kopyala'}</span>
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Yetki almak için ana yöneticinin “Yayın ve Yöneticiler” sekmesinden yukarıdaki UID bilgisini
          yönetici listesine eklemesi gerekir.
        </p>

        <button
          type="button"
          onClick={onSignOut}
          className="w-full h-10 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Farklı Bir Hesapla Giriş Yap</span>
        </button>

        {onSwitchToChat && (
          <button
            type="button"
            onClick={onSwitchToChat}
            className="w-full h-9 rounded-lg bg-transparent hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 cursor-pointer"
          >
            YenGeç AI Sohbetine Dön
          </button>
        )}
      </div>
    </div>
  );
};
