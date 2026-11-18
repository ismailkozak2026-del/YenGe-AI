import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Globe,
  Lock,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import { AUDIT_ACTION_LABELS } from '../constants/defaults';
import type { AccessPolicy, AuditLog, EditableAppConfig, NavSection } from '../types';

interface OverviewSectionProps {
  config: EditableAppConfig;
  policies: AccessPolicy[];
  auditLogs: AuditLog[];
  loadingData: boolean;
  savingConfig: boolean;
  onToggleMaintenanceImmediate: (nextState: boolean) => Promise<void>;
  onTogglePublicAccessDraft: () => void;
  onNavigate: (section: NavSection) => void;
}

function formatTimestamp(ts?: { toDate?: () => Date } | null): string {
  if (!ts || typeof ts.toDate !== 'function') return 'Az önce';
  return ts.toDate().toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({
  config,
  policies,
  auditLogs,
  loadingData,
  savingConfig,
  onToggleMaintenanceImmediate,
  onTogglePublicAccessDraft,
  onNavigate,
}) => {
  const [confirmMaintenanceOpen, setConfirmMaintenanceOpen] = useState(false);

  const enabledFeatureCount = [
    config.allowWebSearch,
    config.allowImageGeneration,
    config.allowLiveVoice,
    config.allowPhoneCalling,
    config.allowQuickStudio,
    config.allowHtmlPreview,
  ].filter(Boolean).length;

  const allowedCount = policies.filter((p) => p.accessStatus === 'allowed').length;
  const restrictedCount = policies.filter((p) => p.accessStatus === 'restricted').length;
  const blockedCount = policies.filter((p) => p.accessStatus === 'blocked').length;

  const handleConfirmMaintenance = async () => {
    await onToggleMaintenanceImmediate(!config.maintenanceMode);
    setConfirmMaintenanceOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Genel Erişim Durumu</span>
            {config.maintenanceMode ? (
              <ShieldAlert className="w-4 h-4 text-red-400" />
            ) : config.publicAccessEnabled ? (
              <Globe className="w-4 h-4 text-emerald-400" />
            ) : (
              <Lock className="w-4 h-4 text-amber-400" />
            )}
          </div>
          <div className="text-lg font-bold text-slate-50">
            {config.maintenanceMode
              ? 'Bakım Modu Aktif'
              : config.publicAccessEnabled
              ? 'Herkese Açık'
              : 'Üye Erişimi'}
          </div>
          <div className="text-xs text-slate-400">
            {config.maintenanceMode
              ? 'Tüm normal kullanıcılar engelli'
              : config.requireEmailVerification
              ? 'E-posta doğrulaması zorunlu'
              : 'Misafir oturumları açık'}
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Etkin Modüller</span>
            <SlidersHorizontal className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-lg font-bold font-mono tabular-nums text-slate-50">
            {enabledFeatureCount} / 6
          </div>
          <div className="text-xs text-slate-400">
            Arama, Görsel, Ses, Telefon, Stüdyo, HTML
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Erişim Politikaları</span>
            <Users className="w-4 h-4 text-slate-300" />
          </div>
          <div className="text-lg font-bold font-mono tabular-nums text-slate-50">
            {policies.length} Kural
          </div>
          <div className="text-xs font-mono tabular-nums text-slate-400">
            {allowedCount} İzinli · {restrictedCount} Kısıtlı · {blockedCount} Engelli
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Günlük Kota & Sürüm</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-bold font-mono tabular-nums text-slate-50">
            {config.dailyMessageLimit.toLocaleString('tr-TR')} mesaj/gün
          </div>
          <div className="text-xs font-mono tabular-nums text-slate-400">
            Min Sürüm: v{config.minSupportedVersion} · {config.defaultModel}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-50">Acil Erişim Kontrolleri</h2>
            <p className="text-xs text-slate-400 mt-1">
              YenGeç’in herkes için genel erişim kapılarını tek adımda yönetin.
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-lg bg-[#161E2E] border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-100">
                  Küresel Bakım Modu
                </span>
                <span
                  className={`text-[11px] font-semibold ${
                    config.maintenanceMode ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {config.maintenanceMode ? 'Kapalı (Bakımda)' : 'Açık (Yayında)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Açıldığında yönetici olmayan tüm kullanıcılar bakım mesajını görür ve istemciler kilitlenir.
              </p>
              <button
                type="button"
                disabled={savingConfig}
                onClick={() => setConfirmMaintenanceOpen(true)}
                className={`w-full h-9 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  config.maintenanceMode
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-red-600/90 hover:bg-red-500 text-white'
                }`}
              >
                {config.maintenanceMode ? 'Bakım Modunu Kapat (Yayına Al)' : 'Acil Bakım Modunu Aç'}
              </button>
            </div>

            <div className="p-3.5 rounded-lg bg-[#161E2E] border border-slate-800 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-100">Herkes İçin Misafir Erişimi</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Giriş yapmadan kullanıma izin ver
                </div>
              </div>
              <button
                type="button"
                onClick={onTogglePublicAccessDraft}
                className={`h-8 px-3 rounded-md text-xs font-semibold border transition-colors cursor-pointer ${
                  config.publicAccessEnabled
                    ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                {config.publicAccessEnabled ? 'Açık' : 'Kapalı'}
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onNavigate('access')}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Tüm erişim kurallarını düzenle</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className="text-xs font-medium text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              Ayarlar
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 bg-[#111827] border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-50">Son Yönetim İşlemleri</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Erişim politikaları ve küresel ayarlar üzerinde yapılan son değişiklikler.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('publish')}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 cursor-pointer"
            >
              Tüm Kayıtlar
            </button>
          </div>

          {loadingData ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3, 4].map((row) => (
                <div key={row} className="h-10 rounded-lg bg-slate-800/60 animate-pulse" />
              ))}
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <p className="text-sm font-medium text-slate-200">Henüz denetim kaydı yok</p>
              <p className="text-xs text-slate-400">
                Ayarları yayınladığınızda veya bir erişim politikası eklediğinizde işlemler burada listelenir.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-[#0F1623]">
                    <th className="py-2.5 px-4">İşlem</th>
                    <th className="py-2.5 px-4">Açıklama</th>
                    <th className="py-2.5 px-4">Yönetici</th>
                    <th className="py-2.5 px-4 text-right">Zaman</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-xs">
                  {auditLogs.slice(0, 7).map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/35">
                      <td className="py-2.5 px-4 font-semibold text-slate-200 whitespace-nowrap">
                        {AUDIT_ACTION_LABELS[log.action] || log.action}
                      </td>
                      <td className="py-2.5 px-4 text-slate-300 max-w-[260px] truncate">
                        {log.summary}
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">
                        {log.actorEmail}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-400 whitespace-nowrap">
                        {formatTimestamp(log.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {confirmMaintenanceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-md bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-950/70 border border-amber-800/70 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-50">
                  {config.maintenanceMode
                    ? 'Bakım Modunu Kapatmak İstiyor musunuz?'
                    : 'Acil Bakım Modunu Açmak İstiyor musunuz?'}
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {config.maintenanceMode
                    ? 'YenGeç tüm kullanıcılar için yeniden erişilebilir hale gelecektir.'
                    : 'Bu işlem Firestore üzerindeki global yapılandırmayı anında günceller ve yönetici olmayan tüm kullanıcıları bakım ekranına alır.'}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmMaintenanceOpen(false)}
                disabled={savingConfig}
                className="h-9 px-3.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleConfirmMaintenance}
                disabled={savingConfig}
                className={`h-9 px-4 rounded-lg text-xs font-semibold text-white cursor-pointer ${
                  config.maintenanceMode
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-red-600 hover:bg-red-500'
                }`}
              >
                {savingConfig
                  ? 'Uygulanıyor...'
                  : config.maintenanceMode
                  ? 'Evet, Yayına Al'
                  : 'Evet, Bakım Modunu Aç'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
