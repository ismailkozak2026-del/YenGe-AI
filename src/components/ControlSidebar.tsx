import React from 'react';
import {
  FileCode2,
  LayoutDashboard,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import type { NavSection } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface ControlSidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  maintenanceMode: boolean;
  publicAccessEnabled: boolean;
  policyCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onSwitchToChat?: () => void;
  apkUrl?: string;
}

const NAV_ITEMS: {
  id: NavSection;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'overview',
    label: 'Genel Bakış',
    sublabel: 'Erişim özeti ve son işlemler',
    icon: LayoutDashboard,
  },
  {
    id: 'access',
    label: 'Erişim Kontrolleri',
    sublabel: 'Herkes için izinler ve politikalar',
    icon: ShieldCheck,
  },
  {
    id: 'settings',
    label: 'Uygulama Ayarları',
    sublabel: 'Model, ses, sistem komutu ve kotalar',
    icon: SlidersHorizontal,
  },
  {
    id: 'publish',
    label: 'Yayın ve Yöneticiler',
    sublabel: 'Canlı JSON, ekip ve denetim günlüğü',
    icon: FileCode2,
  },
];

export const ControlSidebar: React.FC<ControlSidebarProps> = ({
  activeSection,
  onSelectSection,
  maintenanceMode,
  publicAccessEnabled,
  policyCount,
  mobileOpen,
  onCloseMobile,
  onSwitchToChat,
  apkUrl,
}) => {
  const handleSelect = (section: NavSection) => {
    onSelectSection(section);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="h-full flex flex-col bg-[#111827] border-r border-slate-800 w-[260px]">
      <div className="h-16 px-5 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="/kontrol-icon-192.png"
            alt="YenGeç Kontrol Merkezi"
            className="w-8 h-8 rounded-lg border border-slate-700 object-cover bg-slate-900 shrink-0"
          />
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-50 truncate">YenGeç</div>
            <div className="text-[11px] font-medium text-slate-400 truncate">Kontrol Merkezi</div>
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800"
          aria-label="Menüyü kapat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Ana gezinme">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg flex items-start gap-3 transition-colors cursor-pointer ${
                isActive
                  ? 'bg-[#2563EB]/15 text-blue-400 border border-[#2563EB]/40'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-slate-100 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold truncate">{item.label}</span>
                  {item.id === 'access' && (
                    <span className="text-[11px] font-mono tabular-nums text-slate-400">
                      {policyCount}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">{item.sublabel}</div>
              </div>
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-800 shrink-0">
        <div className="bg-[#161E2E] border border-slate-800 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-300">Canlı Yayın Durumu</span>
            {maintenanceMode ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-400">
                <ShieldAlert className="w-3.5 h-3.5" />
                Bakım Modu
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                Aktif
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 leading-relaxed">
            {maintenanceMode
              ? 'Tüm kullanıcı erişimi geçici olarak durduruldu.'
              : publicAccessEnabled
              ? 'YenGeç tüm misafir ve üyelere açık.'
              : 'Yalnızca yetkili ve doğrulanmış hesaplara açık.'}
          </div>
          <button
            type="button"
            onClick={() => handleSelect('access')}
            className="w-full h-8 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
          >
            Erişim Kapılarını Yönet
          </button>
        </div>
        <div className="mt-2.5 space-y-2">
          <PWAInstallButton appName="YenGeç Kontrol Merkezi" apkUrl={apkUrl} />
          {onSwitchToChat && (
            <button
              type="button"
              onClick={() => {
                onCloseMobile();
                onSwitchToChat();
              }}
              className="w-full h-9 px-3 rounded-lg bg-transparent hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 cursor-pointer"
            >
              YenGeç AI Sohbetine Geç
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block shrink-0">{sidebarContent}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/65"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full">{sidebarContent}</div>
        </div>
      )}
    </>
  );
};
