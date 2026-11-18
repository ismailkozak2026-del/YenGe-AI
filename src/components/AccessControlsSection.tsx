import React, { useMemo, useState } from 'react';
import {
  Ban,
  CheckCircle2,
  Edit3,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  ACCESS_STATUS_LABELS,
  FIELD_LIMITS,
  ROLE_TIER_LABELS,
  SUBJECT_TYPE_LABELS,
} from '../constants/defaults';
import type {
  AccessPolicy,
  AccessPolicyFormValues,
  AccessStatus,
  EditableAppConfig,
  SubjectType,
} from '../types';
import { PolicyModal } from './PolicyModal';

interface AccessControlsSectionProps {
  config: EditableAppConfig;
  onChangeConfig: (updater: (prev: EditableAppConfig) => EditableAppConfig) => void;
  policies: AccessPolicy[];
  loadingPolicies: boolean;
  savingPolicy: boolean;
  onCreatePolicy: (values: AccessPolicyFormValues) => Promise<void>;
  onUpdatePolicy: (policyId: string, values: AccessPolicyFormValues) => Promise<void>;
  onDeletePolicy: (policy: AccessPolicy) => Promise<void>;
  onSeedDefaultPolicies: () => Promise<void>;
}

const FEATURE_GATES: {
  key: keyof Pick<
    EditableAppConfig,
    | 'allowWebSearch'
    | 'allowImageGeneration'
    | 'allowLiveVoice'
    | 'allowPhoneCalling'
    | 'allowQuickStudio'
    | 'allowHtmlPreview'
  >;
  title: string;
  description: string;
}[] = [
  {
    key: 'allowWebSearch',
    title: 'Canlı Web Araması',
    description: 'Google Search grounding ve kaynaklı arama yanıtları.',
  },
  {
    key: 'allowImageGeneration',
    title: 'Yapay Zeka Görsel Üretimi',
    description: 'Metinden görsel oluşturma araçları ve görsel motoru.',
  },
  {
    key: 'allowLiveVoice',
    title: 'Canlı Sesli Asistan & TTS',
    description: 'Türkçe ses sentezi ve gerçek zamanlı mikrofon konuşması.',
  },
  {
    key: 'allowPhoneCalling',
    title: 'Telefon Arama Eylemi',
    description: 'Sesli veya yazılı komutla rehber/numara arama tetikleme.',
  },
  {
    key: 'allowQuickStudio',
    title: 'Hızlı Stüdyo Araçları',
    description: 'Özetleme, kod düzeltme, çeviri ve zihin haritası araçları.',
  },
  {
    key: 'allowHtmlPreview',
    title: 'HTML Canlı Önizleme',
    description: 'Üretilen web arayüzlerini izole pencerede önizleme.',
  },
];

export const AccessControlsSection: React.FC<AccessControlsSectionProps> = ({
  config,
  onChangeConfig,
  policies,
  loadingPolicies,
  savingPolicy,
  onCreatePolicy,
  onUpdatePolicy,
  onDeletePolicy,
  onSeedDefaultPolicies,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AccessStatus>('all');
  const [scopeFilter, setScopeFilter] = useState<'all' | SubjectType>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<AccessPolicy | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AccessPolicy | null>(null);

  const filteredPolicies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return policies.filter((policy) => {
      if (statusFilter !== 'all' && policy.accessStatus !== statusFilter) return false;
      if (scopeFilter !== 'all' && policy.subjectType !== scopeFilter) return false;
      if (!q) return true;
      return (
        policy.displayName.toLowerCase().includes(q) ||
        policy.subjectKey.toLowerCase().includes(q) ||
        policy.reason.toLowerCase().includes(q)
      );
    });
  }, [policies, searchQuery, statusFilter, scopeFilter]);

  const handleOpenCreate = () => {
    setEditingPolicy(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (policy: AccessPolicy) => {
    setEditingPolicy(policy);
    setModalOpen(true);
  };

  const handleSubmitModal = async (values: AccessPolicyFormValues) => {
    if (editingPolicy) {
      await onUpdatePolicy(editingPolicy.id, values);
    } else {
      await onCreatePolicy(values);
    }
    setModalOpen(false);
    setEditingPolicy(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await onDeletePolicy(deleteTarget);
    setDeleteTarget(null);
  };

  const renderStatusBadge = (status: AccessStatus) => {
    if (status === 'allowed') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {ACCESS_STATUS_LABELS[status]}
        </span>
      );
    }
    if (status === 'restricted') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400">
          <ShieldAlert className="w-3.5 h-3.5" />
          {ACCESS_STATUS_LABELS[status]}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-400">
        <Ban className="w-3.5 h-3.5" />
        {ACCESS_STATUS_LABELS[status]}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <section className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h2 className="text-sm font-bold text-slate-50">
            Tüm Herkes İçin Küresel Erişim Kapıları
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Buradaki anahtarlar tüm YenGeç kullanıcılarını etkiler. Değişiklikleri uygulamak için sağ üstten “Ayarları Yayınla”ya basın.
          </p>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <label className="flex items-start justify-between gap-3 p-4 rounded-lg bg-[#161E2E] border border-slate-800 cursor-pointer hover:border-slate-700">
              <div>
                <div className="text-xs font-semibold text-slate-100">Küresel Bakım Modu</div>
                <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Tüm kullanıcı erişimini geçici olarak durdurur ve bakım mesajını gösterir.
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.maintenanceMode}
                onChange={(e) =>
                  onChangeConfig((prev) => ({ ...prev, maintenanceMode: e.target.checked }))
                }
                className="w-4 h-4 mt-0.5 accent-red-500 cursor-pointer shrink-0"
              />
            </label>

            <label className="flex items-start justify-between gap-3 p-4 rounded-lg bg-[#161E2E] border border-slate-800 cursor-pointer hover:border-slate-700">
              <div>
                <div className="text-xs font-semibold text-slate-100">
                  Herkes İçin Misafir Erişimi
                </div>
                <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Giriş yapmayan ziyaretçilerin YenGeç’i doğrudan kullanmasına izin verir.
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.publicAccessEnabled}
                onChange={(e) =>
                  onChangeConfig((prev) => ({ ...prev, publicAccessEnabled: e.target.checked }))
                }
                className="w-4 h-4 mt-0.5 accent-blue-600 cursor-pointer shrink-0"
              />
            </label>

            <label className="flex items-start justify-between gap-3 p-4 rounded-lg bg-[#161E2E] border border-slate-800 cursor-pointer hover:border-slate-700">
              <div>
                <div className="text-xs font-semibold text-slate-100">
                  E-posta Doğrulaması Zorunlu
                </div>
                <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Yalnızca doğrulanmış Google veya e-posta hesaplarının erişimine izin verir.
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.requireEmailVerification}
                onChange={(e) =>
                  onChangeConfig((prev) => ({
                    ...prev,
                    requireEmailVerification: e.target.checked,
                  }))
                }
                className="w-4 h-4 mt-0.5 accent-blue-600 cursor-pointer shrink-0"
              />
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Bakım Modu Ekran Mesajı ({config.maintenanceMessage.length}/
              {FIELD_LIMITS.maintenanceMessage.max})
            </label>
            <textarea
              rows={2}
              maxLength={FIELD_LIMITS.maintenanceMessage.max}
              value={config.maintenanceMessage}
              onChange={(e) =>
                onChangeConfig((prev) => ({ ...prev, maintenanceMessage: e.target.value }))
              }
              placeholder="Bakım sırasında kullanıcılara gösterilecek mesaj..."
              className="w-full p-3 rounded-lg bg-[#0B0F17] border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div className="border-t border-slate-800 pt-5">
            <div className="text-xs font-semibold text-slate-200 mb-3">
              Özellik Bazlı Küresel Erişim İzinleri
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {FEATURE_GATES.map((gate) => {
                const enabled = config[gate.key];
                return (
                  <label
                    key={gate.key}
                    className="flex items-start justify-between gap-3 p-3.5 rounded-lg bg-[#0B0F17] border border-slate-800 cursor-pointer hover:border-slate-700"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-100">{gate.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{gate.description}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) =>
                        onChangeConfig((prev) => ({ ...prev, [gate.key]: e.target.checked }))
                      }
                      className="w-4 h-4 mt-0.5 accent-blue-600 cursor-pointer shrink-0"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-50">
              Hedef Bazlı Erişim Politikaları
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Herkes, belirli roller, e-posta alan adları veya tekil kullanıcılar için kural ve kota tanımlayın.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="h-9 px-3.5 rounded-lg bg-[#2563EB] hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Politika</span>
          </button>
        </div>

        <div className="px-5 py-3 bg-[#0F1623] border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Politika adı, hedef anahtarı veya sebep ara..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#0B0F17] border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-700 bg-[#0B0F17] p-0.5">
              {(
                [
                  { id: 'all', label: 'Tümü' },
                  { id: 'allowed', label: 'İzinli' },
                  { id: 'restricted', label: 'Kısıtlı' },
                  { id: 'blocked', label: 'Engelli' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`h-7 px-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    statusFilter === tab.id
                      ? 'bg-[#2563EB] text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <select
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value as 'all' | SubjectType)}
              className="h-8 px-2.5 rounded-lg bg-[#0B0F17] border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Tüm Kapsamlar</option>
              <option value="everyone">Herkes (Global)</option>
              <option value="role">Rol Katmanı</option>
              <option value="domain">E-posta Alan Adı</option>
              <option value="user">Belirli Kullanıcı</option>
            </select>
          </div>
        </div>

        {loadingPolicies ? (
          <div className="p-5 space-y-2.5">
            {[1, 2, 3].map((idx) => (
              <div key={idx} className="h-11 rounded-lg bg-slate-800/60 animate-pulse" />
            ))}
          </div>
        ) : policies.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <div className="text-sm font-semibold text-slate-100">
              Henüz erişim politikası tanımlanmadı
            </div>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Herkes, misafirler, VIP kullanıcılar veya engellenen hesaplar için özel erişim ve kota kuralları ekleyebilirsiniz.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleOpenCreate}
                className="h-9 px-4 rounded-lg bg-[#2563EB] hover:bg-blue-500 text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>İlk Politikayı Oluştur</span>
              </button>
              <button
                type="button"
                onClick={onSeedDefaultPolicies}
                disabled={savingPolicy}
                className="h-9 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Örnek Başlangıç Kuralları Ekle</span>
              </button>
            </div>
          </div>
        ) : filteredPolicies.length === 0 ? (
          <div className="p-8 text-center space-y-2.5">
            <div className="text-sm font-medium text-slate-200">
              Arama ve filtrelere uygun politika bulunamadı
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setScopeFilter('all');
              }}
              className="h-8 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 cursor-pointer"
            >
              Filtreleri Temizle
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-[#0F1623]">
                  <th className="py-2.5 px-4">Politika</th>
                  <th className="py-2.5 px-4">Kapsam / Hedef</th>
                  <th className="py-2.5 px-4">Durum</th>
                  <th className="py-2.5 px-4">Rol</th>
                  <th className="py-2.5 px-4">İzinli Modüller</th>
                  <th className="py-2.5 px-4 text-right">Günlük Kota</th>
                  <th className="py-2.5 px-4 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-xs">
                {filteredPolicies.map((policy) => {
                  const allowedModules = [
                    policy.canChat ? 'Sohbet' : null,
                    policy.canSearch ? 'Arama' : null,
                    policy.canGenerateImage ? 'Görsel' : null,
                    policy.canUseVoice ? 'Ses' : null,
                    policy.canMakeCalls ? 'Arama+' : null,
                  ].filter(Boolean);

                  return (
                    <tr key={policy.id} className="hover:bg-slate-800/35">
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-100">{policy.displayName}</div>
                        {policy.reason && (
                          <div className="text-[11px] text-slate-400 max-w-[240px] truncate">
                            {policy.reason}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="text-slate-300">
                          {SUBJECT_TYPE_LABELS[policy.subjectType]}
                        </div>
                        <code className="text-[11px] font-mono text-slate-400">
                          {policy.subjectKey}
                        </code>
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        {renderStatusBadge(policy.accessStatus)}
                      </td>
                      <td className="py-2.5 px-4 text-slate-300 whitespace-nowrap">
                        {ROLE_TIER_LABELS[policy.roleTier]}
                      </td>
                      <td className="py-2.5 px-4 text-slate-300 max-w-[200px] truncate">
                        {allowedModules.length > 0 ? allowedModules.join(', ') : 'Yok'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-200 whitespace-nowrap">
                        <div>
                          {policy.customDailyLimit === 0
                            ? 'Sınırsız'
                            : policy.customDailyLimit.toLocaleString('tr-TR')}{' '}
                          <span className="text-[11px] text-slate-400">msj</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {(policy.customDailyImageLimit ?? 0) === 0
                            ? 'Sınırsız'
                            : (policy.customDailyImageLimit ?? 0).toLocaleString('tr-TR')}{' '}
                          görsel
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(policy)}
                            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
                            title="Düzenle"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(policy)}
                            className="p-1.5 rounded-md bg-slate-800 hover:bg-red-950/70 border border-slate-700 hover:border-red-800 text-slate-300 hover:text-red-300 cursor-pointer"
                            title="Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <PolicyModal
        open={modalOpen}
        editingPolicy={editingPolicy}
        saving={savingPolicy}
        onClose={() => {
          setModalOpen(false);
          setEditingPolicy(null);
        }}
        onSubmit={handleSubmitModal}
      />

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-md bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-50">Erişim Politikasını Sil</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              <strong className="text-slate-200">{deleteTarget.displayName}</strong> (
              <code className="font-mono text-slate-300">{deleteTarget.subjectKey}</code>)
              politikasını kalıcı olarak silmek istiyor musunuz?
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={savingPolicy}
                className="h-9 px-3.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={savingPolicy}
                className="h-9 px-4 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-semibold text-white cursor-pointer"
              >
                {savingPolicy ? 'Siliniyor...' : 'Evet, Sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
