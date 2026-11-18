import React from 'react';
import { CheckCircle2, CloudUpload, LogOut, Menu, RotateCcw } from 'lucide-react';
import type { User } from 'firebase/auth';
import type { NavSection } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface TopBarProps {
  activeSection: NavSection;
  user: User;
  hasUnsavedChanges: boolean;
  savingConfig: boolean;
  onPublishConfig: () => Promise<void>;
  onResetDraft: () => void;
  onOpenMobileMenu: () => void;
  onSignOut: () => Promise<void>;
  apkUrl?: string;
}

const SECTION_TITLES: Record<NavSection, string> = {
  overview: 'Genel Bakış',
  access: 'Erişim Kontrolleri',
  settings: 'Uygulama Ayarları',
  publish: 'Yayın ve Yöneticiler',
};

export const TopBar: React.FC<TopBarProps> = ({
  activeSection,
  user,
  hasUnsavedChanges,
  savingConfig,
  onPublishConfig,
  onResetDraft,
  onOpenMobileMenu,
  onSignOut,
  apkUrl,
}) => {
  const initial = (user.displayName || user.email || 'Y').charAt(0).toUpperCase();

  return (
    <header className="h-16 bg-[#111827] border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 -ml-1 rounded-lg text-slate-300 hover:bg-slate-800 border border-slate-800"
          aria-label="Menüyü aç"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 text-xs sm:text-sm min-w-0">
          <span className="text-slate-400 hidden sm:inline truncate">YenGeç Kontrol Merkezi</span>
          <span className="text-slate-600 hidden sm:inline">/</span>
          <h1 className="font-semibold text-slate-100 truncate">
            {SECTION_TITLES[activeSection]}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        <div className="hidden md:flex items-center gap-1.5 text-xs">
          {hasUnsavedChanges ? (
            <span className="text-amber-400 font-medium whitespace-nowrap">
              Yayınlanmamış değişiklik var
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium whitespace-nowrap">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Senkronize
            </span>
          )}
        </div>

        {hasUnsavedChanges && (
          <button
            type="button"
            onClick={onResetDraft}
            disabled={savingConfig}
            className="hidden sm:inline-flex h-9 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Geri Al</span>
          </button>
        )}

        <button
          type="button"
          onClick={onPublishConfig}
          disabled={!hasUnsavedChanges || savingConfig}
          className="h-9 px-2.5 sm:px-3.5 rounded-lg bg-[#2563EB] hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:border disabled:border-slate-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
        >
          <CloudUpload className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {savingConfig ? 'Yayınlanıyor...' : 'Ayarları Yayınla'}
          </span>
          <span className="sm:hidden">{savingConfig ? '...' : 'Yayınla'}</span>
        </button>

        <PWAInstallButton appName="YenGeç Kontrol Merkezi" apkUrl={apkUrl} compact />

        <div className="h-6 w-px bg-slate-800 hidden sm:block" />

        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200 shrink-0"
            title={user.email || ''}
          >
            {initial}
          </div>
          <div className="hidden xl:block text-left leading-tight">
            <div className="text-xs font-medium text-slate-200 max-w-[140px] truncate">
              {user.displayName || 'Yönetici'}
            </div>
            <div className="text-[11px] text-slate-400 max-w-[140px] truncate">{user.email}</div>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className="h-9 px-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            title="Oturumu kapat"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Çıkış</span>
          </button>
        </div>
      </div>
    </header>
  );
};
