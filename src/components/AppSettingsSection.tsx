import React from 'react';
import { AVAILABLE_MODELS, AVAILABLE_VOICES, FIELD_LIMITS } from '../constants/defaults';
import type { EditableAppConfig, ThinkingLevel, VoiceName } from '../types';

interface AppSettingsSectionProps {
  config: EditableAppConfig;
  hasUnsavedChanges: boolean;
  savingConfig: boolean;
  onChangeConfig: (updater: (prev: EditableAppConfig) => EditableAppConfig) => void;
  onPublishConfig: () => Promise<void>;
  onResetDraft: () => void;
}

export const AppSettingsSection: React.FC<AppSettingsSectionProps> = ({
  config,
  hasUnsavedChanges,
  savingConfig,
  onChangeConfig,
  onPublishConfig,
  onResetDraft,
}) => {
  return (
    <div className="space-y-6">
      <section className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h2 className="text-sm font-bold text-slate-50">Uygulama Kimliği ve Duyuru Bandı</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Tüm YenGeç istemcilerinde görünen uygulama adı, minimum sürüm kapısı ve üst duyuru ayarları.
          </p>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Uygulama Adı ({config.appName.length}/{FIELD_LIMITS.appName.max})
            </label>
            <input
              type="text"
              maxLength={FIELD_LIMITS.appName.max}
              value={config.appName}
              onChange={(e) =>
                onChangeConfig((prev) => ({ ...prev, appName: e.target.value }))
              }
              className="w-full h-10 px-3 rounded-lg bg-[#0B0F17] border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Minimum Desteklenen İstemci Sürümü
            </label>
            <input
              type="text"
              maxLength={FIELD_LIMITS.minSupportedVersion.max}
              value={config.minSupportedVersion}
              onChange={(e) =>
                onChangeConfig((prev) => ({ ...prev, minSupportedVersion: e.target.value }))
              }
              placeholder="1.0.0"
              className="w-full h-10 px-3 rounded-lg bg-[#0B0F17] border border-slate-700 text-sm font-mono tabular-nums text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="md:col-span-2 pt-2 border-t border-slate-800 space-y-3">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <div className="text-xs font-semibold text-slate-100">
                  Küresel Duyuru Bandını Göster
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Aktif edildiğinde YenGeç arayüzünün üst kısmında herkese açık bilgi şeridi gösterilir.
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.bannerEnabled}
                onChange={(e) =>
                  onChangeConfig((prev) => ({ ...prev, bannerEnabled: e.target.checked }))
                }
                className="w-4 h-4 accent-blue-600 cursor-pointer"
              />
            </label>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Duyuru Metni ({config.bannerText.length}/{FIELD_LIMITS.bannerText.max})
              </label>
              <input
                type="text"
                maxLength={FIELD_LIMITS.bannerText.max}
                value={config.bannerText}
                onChange={(e) =>
                  onChangeConfig((prev) => ({ ...prev, bannerText: e.target.value }))
                }
                placeholder="Örn. Planlı güncelleme bu gece 02:00'de yapılacaktır."
                className="w-full h-10 px-3 rounded-lg bg-[#0B0F17] border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h2 className="text-sm font-bold text-slate-50">
            Yapay Zeka Modeli, Düşünme Düzeyi ve Türkçe Ses
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Tüm kullanıcı oturumları için varsayılan Gemini modelini, akıl yürütme seviyesini ve sistem komutunu yapılandırın.
          </p>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Varsayılan Gemini Modeli
              </label>
              <select
                value={config.defaultModel}
                onChange={(e) =>
                  onChangeConfig((prev) => ({ ...prev, defaultModel: e.target.value }))
                }
                className="w-full h-10 px-3 rounded-lg bg-[#0B0F17] border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              >
                {AVAILABLE_MODELS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Varsayılan Düşünme Düzeyi
              </label>
              <select
                value={config.defaultThinkingLevel}
                onChange={(e) =>
                  onChangeConfig((prev) => ({
                    ...prev,
                    defaultThinkingLevel: e.target.value as ThinkingLevel,
                  }))
                }
                className="w-full h-10 px-3 rounded-lg bg-[#0B0F17] border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="LOW">LOW — Düşük Gecikme / Hızlı</option>
                <option value="HIGH">HIGH — Derin Akıl Yürütme</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Varsayılan Türkçe Ses (TTS)
              </label>
              <select
                value={config.defaultVoice}
                onChange={(e) =>
                  onChangeConfig((prev) => ({
                    ...prev,
                    defaultVoice: e.target.value as VoiceName,
                  }))
                }
                className="w-full h-10 px-3 rounded-lg bg-[#0B0F17] border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              >
                {AVAILABLE_VOICES.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Küresel Sistem Talimatı (System Prompt) ({config.defaultSystemPrompt.length}/
              {FIELD_LIMITS.defaultSystemPrompt.max})
            </label>
            <textarea
              rows={5}
              maxLength={FIELD_LIMITS.defaultSystemPrompt.max}
              value={config.defaultSystemPrompt}
              onChange={(e) =>
                onChangeConfig((prev) => ({ ...prev, defaultSystemPrompt: e.target.value }))
              }
              placeholder="YenGeç'in tüm yanıtlarında uyacağı ana karakter ve doğruluk kuralları..."
              className="w-full p-3 rounded-lg bg-[#0B0F17] border border-slate-700 text-xs leading-relaxed text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </section>

      <section className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h2 className="text-sm font-bold text-slate-50">Küresel Kota ve Yükleme Sınırları</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Özel politikası bulunmayan tüm kullanıcılar için varsayılan günlük kullanım limitleri.
          </p>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Günlük Mesaj Limiti (0 = Sınırsız)
            </label>
            <input
              type="number"
              min={FIELD_LIMITS.dailyMessageLimit.min}
              max={FIELD_LIMITS.dailyMessageLimit.max}
              value={config.dailyMessageLimit}
              onChange={(e) =>
                onChangeConfig((prev) => ({
                  ...prev,
                  dailyMessageLimit: Number(e.target.value) || 0,
                }))
              }
              className="w-full h-10 px-3 rounded-lg bg-[#0B0F17] border border-slate-700 text-sm font-mono tabular-nums text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Günlük Görsel Limiti (0 = Sınırsız)
            </label>
            <input
              type="number"
              min={FIELD_LIMITS.dailyImageLimit.min}
              max={FIELD_LIMITS.dailyImageLimit.max}
              value={config.dailyImageLimit}
              onChange={(e) =>
                onChangeConfig((prev) => ({
                  ...prev,
                  dailyImageLimit: Number(e.target.value) || 0,
                }))
              }
              className="w-full h-10 px-3 rounded-lg bg-[#0B0F17] border border-slate-700 text-sm font-mono tabular-nums text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Maksimum Dosya Boyutu (MB: 1 - 100)
            </label>
            <input
              type="number"
              min={FIELD_LIMITS.maxUploadSizeMb.min}
              max={FIELD_LIMITS.maxUploadSizeMb.max}
              value={config.maxUploadSizeMb}
              onChange={(e) =>
                onChangeConfig((prev) => ({
                  ...prev,
                  maxUploadSizeMb: Math.max(1, Number(e.target.value) || 1),
                }))
              }
              className="w-full h-10 px-3 rounded-lg bg-[#0B0F17] border border-slate-700 text-sm font-mono tabular-nums text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="px-5 py-3.5 bg-[#0F1623] border-t border-slate-800 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">
            {hasUnsavedChanges
              ? 'Kaydedilmemiş değişiklikler yayınlanmayı bekliyor.'
              : 'Tüm uygulama ayarları Firestore ile senkronize.'}
          </span>
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <button
                type="button"
                onClick={onResetDraft}
                disabled={savingConfig}
                className="h-9 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 cursor-pointer"
              >
                Geri Al
              </button>
            )}
            <button
              type="button"
              onClick={onPublishConfig}
              disabled={!hasUnsavedChanges || savingConfig}
              className="h-9 px-4 rounded-lg bg-[#2563EB] hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-xs font-semibold text-white cursor-pointer"
            >
              {savingConfig ? 'Yayınlanıyor...' : 'Ayarları Yayınla'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
