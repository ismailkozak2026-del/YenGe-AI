import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  EMPTY_POLICY_FORM,
  FIELD_LIMITS,
  ROLE_TIER_LABELS,
  SUBJECT_TYPE_LABELS,
  sanitizePolicyForm,
} from '../constants/defaults';
import type { AccessPolicy, AccessPolicyFormValues, AccessStatus, RoleTier, SubjectType } from '../types';

interface PolicyModalProps {
  open: boolean;
  editingPolicy: AccessPolicy | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: AccessPolicyFormValues) => Promise<void>;
}

const SUBJECT_KEY_HINTS: Record<SubjectType, { placeholder: string; hint: string }> = {
  everyone: {
    placeholder: 'all_users',
    hint: 'Tüm YenGeç kullanıcıları için "all_users" veya "guest_users" kullanın.',
  },
  role: {
    placeholder: 'standard',
    hint: 'Hedef rol anahtarı (ör. guest, standard, pro, vip).',
  },
  domain: {
    placeholder: 'sirket.com',
    hint: 'E-posta alan adı (ör. gmail.com, kurum.edu.tr).',
  },
  user: {
    placeholder: 'kullanici@ornek.com veya UID',
    hint: 'Belirli kullanıcının e-posta adresi veya Firebase UID bilgisi.',
  },
};

export const PolicyModal: React.FC<PolicyModalProps> = ({
  open,
  editingPolicy,
  saving,
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState<AccessPolicyFormValues>(EMPTY_POLICY_FORM);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editingPolicy) {
      setForm({
        subjectType: editingPolicy.subjectType,
        subjectKey: editingPolicy.subjectKey,
        displayName: editingPolicy.displayName,
        accessStatus: editingPolicy.accessStatus,
        roleTier: editingPolicy.roleTier,
        canChat: editingPolicy.canChat,
        canSearch: editingPolicy.canSearch,
        canGenerateImage: editingPolicy.canGenerateImage,
        canUseVoice: editingPolicy.canUseVoice,
        canMakeCalls: editingPolicy.canMakeCalls,
        customDailyLimit: editingPolicy.customDailyLimit,
        customDailyImageLimit: editingPolicy.customDailyImageLimit ?? 0,
        reason: editingPolicy.reason,
      });
    } else {
      setForm(EMPTY_POLICY_FORM);
    }
  }, [open, editingPolicy]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sanitized = sanitizePolicyForm(form);
    if (!sanitized.displayName.trim()) {
      setError('Politika adı boş bırakılamaz.');
      return;
    }
    if (!sanitized.subjectKey.trim()) {
      setError('Hedef anahtarı (Subject Key) boş bırakılamaz.');
      return;
    }
    setError(null);
    await onSubmit(sanitized);
  };

  const hintInfo = SUBJECT_KEY_HINTS[form.subjectType];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-2xl bg-[#111827] border border-slate-800 rounded-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-50">
              {editingPolicy ? 'Erişim Politikasını Düzenle' : 'Yeni Erişim Politikası Oluştur'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Belirli bir kapsam için YenGeç izinlerini, rol katmanını ve günlük mesaj sınırını tanımlayın.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {error && (
            <div className="bg-red-950/60 border border-red-800/80 rounded-lg p-3 text-xs text-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Politika Adı
              </label>
              <input
                type="text"
                required
                maxLength={FIELD_LIMITS.policyDisplayName.max}
                value={form.displayName}
                onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
                placeholder="Örn. Tüm Misafir Kullanıcılar"
                className="w-full h-10 px-3 rounded-lg bg-[#0B0F17] border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Hedef Kapsamı
              </label>
              <select
                value={form.subjectType}
                onChange={(e) => {
                  const nextType = e.target.value as SubjectType;
                  setForm((p) => ({
                    ...p,
                    subjectType: nextType,
                    subjectKey:
                      nextType === 'everyone'
                        ? 'all_users'
                        : nextType === 'role'
                        ? p.roleTier
                        : '',
                  }));
                }}
                className="w-full h-10 px-3 rounded-lg bg-[#0B0F17] border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              >
                {(Object.keys(SUBJECT_TYPE_LABELS) as SubjectType[]).map((key) => (
                  <option key={key} value={key}>
                    {SUBJECT_TYPE_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Hedef Anahtarı
              </label>
              <input
                type="text"
                required
                maxLength={FIELD_LIMITS.policySubjectKey.max}
                value={form.subjectKey}
                onChange={(e) => setForm((p) => ({ ...p, subjectKey: e.target.value }))}
                placeholder={hintInfo.placeholder}
                className="w-full h-10 px-3 rounded-lg bg-[#0B0F17] border border-slate-700 text-sm font-mono text-slate-100 focus:outline-none focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">{hintInfo.hint}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Erişim Durumu
              </label>
              <select
                value={form.accessStatus}
                onChange={(e) =>
                  setForm((p) => {
                    const status = e.target.value as AccessStatus;
                    if (status === 'blocked') {
                      return {
                        ...p,
                        accessStatus: status,
                        canChat: false,
                        canSearch: false,
                        canGenerateImage: false,
                        canUseVoice: false,
                        canMakeCalls: false,
                        customDailyLimit: 0,
                        customDailyImageLimit: 0,
                      };
                    }
                    return { ...p, accessStatus: status };
                  })
                }
                className="w-full h-10 px-3 rounded-lg bg-[#0B0F17] border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="allowed">İzinli — Tam Yetki</option>
                <option value="restricted">Kısıtlı — Seçili Özellikler</option>
                <option value="blocked">Engelli — Erişim Kapalı</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Rol Katmanı
              </label>
              <select
                value={form.roleTier}
                onChange={(e) => setForm((p) => ({ ...p, roleTier: e.target.value as RoleTier }))}
                className="w-full h-10 px-3 rounded-lg bg-[#0B0F17] border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              >
                {(Object.keys(ROLE_TIER_LABELS) as RoleTier[]).map((tier) => (
                  <option key={tier} value={tier}>
                    {ROLE_TIER_LABELS[tier]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Günlük Mesaj Kotası (0 = Sınırsız)
              </label>
              <input
                type="number"
                min={FIELD_LIMITS.dailyMessageLimit.min}
                max={FIELD_LIMITS.dailyMessageLimit.max}
                value={form.customDailyLimit}
                onChange={(e) =>
                  setForm((p) => ({ ...p, customDailyLimit: Number(e.target.value) || 0 }))
                }
                className="w-full h-10 px-3 rounded-lg bg-[#0B0F17] border border-slate-700 text-sm font-mono tabular-nums text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Günlük Görsel Kotası (0 = Sınırsız)
              </label>
              <input
                type="number"
                min={FIELD_LIMITS.dailyImageLimit.min}
                max={FIELD_LIMITS.dailyImageLimit.max}
                value={form.customDailyImageLimit}
                onChange={(e) =>
                  setForm((p) => ({ ...p, customDailyImageLimit: Number(e.target.value) || 0 }))
                }
                className="w-full h-10 px-3 rounded-lg bg-[#0B0F17] border border-slate-700 text-sm font-mono tabular-nums text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4">
            <div className="text-xs font-semibold text-slate-300 mb-3">Özellik İzinleri</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {[
                { key: 'canChat' as const, label: 'Yapay Zeka Sohbeti' },
                { key: 'canSearch' as const, label: 'Web Araması' },
                { key: 'canGenerateImage' as const, label: 'Görsel Üretimi' },
                { key: 'canUseVoice' as const, label: 'Canlı Ses / TTS' },
                { key: 'canMakeCalls' as const, label: 'Telefon Araması' },
              ].map((perm) => (
                <label
                  key={perm.key}
                  className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-[#161E2E] border border-slate-800 cursor-pointer hover:border-slate-700"
                >
                  <span className="text-xs font-medium text-slate-200">{perm.label}</span>
                  <input
                    type="checkbox"
                    checked={form[perm.key]}
                    onChange={(e) => setForm((p) => ({ ...p, [perm.key]: e.target.checked }))}
                    className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                  />
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Yönetici Notu / Sebep ({form.reason.length}/{FIELD_LIMITS.policyReason.max})
            </label>
            <textarea
              rows={2}
              maxLength={FIELD_LIMITS.policyReason.max}
              value={form.reason}
              onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
              placeholder="Bu politikanın uygulanma amacı veya kısıtlama gerekçesi..."
              className="w-full p-3 rounded-lg bg-[#0B0F17] border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-9 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-9 px-4 rounded-lg bg-[#2563EB] hover:bg-blue-500 disabled:opacity-60 text-xs font-semibold text-white cursor-pointer"
            >
              {saving ? 'Kaydediliyor...' : editingPolicy ? 'Politikayı Güncelle' : 'Politikayı Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
