import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  ExternalLink,
  Save,
  Shield,
  Smartphone,
  Trash2,
  UserPlus,
} from 'lucide-react';
import {
  AUDIT_ACTION_LABELS,
  BOOTSTRAPPED_ADMIN_EMAIL,
  FIELD_LIMITS,
  sanitizeApkUrl,
  VALID_ID_REGEX,
} from '../constants/defaults';
import { firebaseConfig } from '../firebase';
import type { AdminRole, AdminUser, AuditLog, EditableAppConfig } from '../types';

interface PublishAndAdminsSectionProps {
  liveConfig: EditableAppConfig;
  draftConfig: EditableAppConfig;
  hasUnsavedChanges: boolean;
  savingConfig: boolean;
  onChangeConfig: React.Dispatch<React.SetStateAction<EditableAppConfig>>;
  onPublishConfig: () => Promise<void>;
  admins: AdminUser[];
  auditLogs: AuditLog[];
  currentUserUid: string;
  currentUserEmail: string | null;
  savingAdmin: boolean;
  onAddAdmin: (payload: {
    uid: string;
    email: string;
    displayName: string;
    role: AdminRole;
  }) => Promise<void>;
  onRemoveAdmin: (admin: AdminUser) => Promise<void>;
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

function isApkUrlFormatValid(val: string): boolean {
  const trimmed = val.trim();
  if (!trimmed) return true;
  return trimmed.startsWith('https://') || trimmed.startsWith('/');
}

function normalizeOriginInput(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) {
    return typeof window !== 'undefined' ? window.location.origin : 'https://yengec.run.app';
  }
  return trimmed;
}

export const PublishAndAdminsSection: React.FC<PublishAndAdminsSectionProps> = ({
  liveConfig,
  draftConfig,
  hasUnsavedChanges,
  savingConfig,
  onChangeConfig,
  onPublishConfig,
  admins,
  auditLogs,
  currentUserUid,
  currentUserEmail,
  savingAdmin,
  onAddAdmin,
  onRemoveAdmin,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [deployBaseUrl, setDeployBaseUrl] = useState<string>(() =>
    typeof window !== 'undefined' ? window.location.origin : ''
  );

  const [uid, setUid] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<AdminRole>('moderator');
  const [formError, setFormError] = useState<string | null>(null);
  const [adminToDelete, setAdminToDelete] = useState<AdminUser | null>(null);

  const normalizedOrigin = useMemo(() => normalizeOriginInput(deployBaseUrl), [deployBaseUrl]);
  const isPreviewHost =
    normalizedOrigin.includes('ais-dev-') || normalizedOrigin.includes('ais-pre-');

  const yengecKortexaJson = useMemo(
    () =>
      JSON.stringify(
        {
          name: draftConfig.appName || 'YenGeç AI',
          packageName: 'com.yengec.ai',
          versionName: draftConfig.minSupportedVersion || '1.0.0',
          versionCode: 1,
          startUrl: `${normalizedOrigin}/`,
          manifestUrl: `${normalizedOrigin}/manifest-yengec.webmanifest`,
          iconUrl: `${normalizedOrigin}/pwa-512x512.png`,
        },
        null,
        2
      ),
    [draftConfig.appName, draftConfig.minSupportedVersion, normalizedOrigin]
  );

  const kontrolKortexaJson = useMemo(
    () =>
      JSON.stringify(
        {
          name: 'YenGeç Kontrol Merkezi',
          packageName: 'com.yengec.kontrol',
          versionName: draftConfig.minSupportedVersion || '1.0.0',
          versionCode: 1,
          startUrl: `${normalizedOrigin}/?app=kontrol`,
          manifestUrl: `${normalizedOrigin}/manifest-kontrol.webmanifest`,
          iconUrl: `${normalizedOrigin}/kontrol-icon-512.png`,
        },
        null,
        2
      ),
    [draftConfig.minSupportedVersion, normalizedOrigin]
  );

  const yengecApkError = !isApkUrlFormatValid(draftConfig.yengecApkUrl)
    ? 'APK linki https:// veya / ile başlamalıdır.'
    : null;
  const kontrolApkError = !isApkUrlFormatValid(draftConfig.kontrolApkUrl)
    ? 'APK linki https:// veya / ile başlamalıdır.'
    : null;
  const hasApkErrors = Boolean(yengecApkError || kontrolApkError);

  const liveYengecApk = sanitizeApkUrl(liveConfig.yengecApkUrl);
  const liveKontrolApk = sanitizeApkUrl(liveConfig.kontrolApkUrl);

  const formattedJson = JSON.stringify(
    {
      firestoreDocumentPath: 'app_configs/global',
      projectId: firebaseConfig.projectId,
      firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
      config: liveConfig,
    },
    null,
    2
  );

  const isBootstrappedOwner =
    currentUserEmail?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey((curr) => (curr === key ? null : curr));
      }, 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleDownloadJson = () => {
    const blob = new Blob([formattedJson], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'yengec-remote-config.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSubmitAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUid = uid.trim();
    const cleanEmail = email.trim();
    const cleanName = displayName.trim();

    if (!cleanUid || !VALID_ID_REGEX.test(cleanUid) || cleanUid.length > FIELD_LIMITS.adminUid.max) {
      setFormError(
        'UID yalnızca harf, rakam, alt çizgi (_) ve tire (-) içerebilir (1-128 karakter).'
      );
      return;
    }
    if (!cleanEmail || cleanEmail.length < FIELD_LIMITS.adminEmail.min || !cleanEmail.includes('@')) {
      setFormError('Geçerli bir Google hesap e-posta adresi girin.');
      return;
    }
    if (!cleanName) {
      setFormError('Yönetici adı boş bırakılamaz.');
      return;
    }

    setFormError(null);
    await onAddAdmin({
      uid: cleanUid,
      email: cleanEmail.slice(0, FIELD_LIMITS.adminEmail.max),
      displayName: cleanName.slice(0, FIELD_LIMITS.adminDisplayName.max),
      role,
    });
    setUid('');
    setEmail('');
    setDisplayName('');
    setRole('moderator');
  };

  return (
    <div className="space-y-6">
      <section className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Smartphone className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
            <div>
              <h2 className="text-sm font-bold text-slate-50">
                Android APK Paketleme ve Tek Tuşla İndirme
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Deploy edilmiş adresinizle Kortexa veya PWABuilder üzerinden imzalı .apk üretip
                linkleri buraya kaydettiğinizde, uygulama içi butonlar tek tuşla APK indirir.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={savingConfig || hasApkErrors || !hasUnsavedChanges}
            onClick={onPublishConfig}
            className="h-9 px-3.5 rounded-lg bg-[#2563EB] hover:bg-blue-500 disabled:opacity-50 text-xs font-semibold text-white inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{savingConfig ? 'Kaydediliyor...' : 'APK Linklerini Yayınla'}</span>
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Herkese Açık Yayın (Deploy) Adresi
            </label>
            <input
              type="url"
              value={deployBaseUrl}
              onChange={(e) => setDeployBaseUrl(e.target.value)}
              placeholder="https://yengec-xxx.run.app"
              className="w-full h-9 px-3 rounded-lg bg-[#0B0F17] border border-slate-700 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
            />
            {isPreviewHost && (
              <div className="mt-2 p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/60 flex items-start gap-2 text-[11px] text-amber-200">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Şu an <code className="font-mono">ais-dev</code> / <code className="font-mono">ais-pre</code>{' '}
                  önizleme adresi seçili. APK’nın telefonda AI Studio giriş ekranına düşmemesi için
                  sağ üstten <strong>Deploy</strong> yapıp çıkan <code className="font-mono">https://...run.app</code>{' '}
                  adresini buraya yapıştırın.
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src="/pwa-192x192.png"
                    alt="YenGeç AI"
                    className="w-8 h-8 rounded-lg border border-slate-700 object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-100 truncate">1. YenGeç AI</div>
                    <div className="text-[11px] font-mono text-slate-400 truncate">
                      com.yengec.ai
                    </div>
                  </div>
                </div>
                <span
                  className={`text-[11px] font-semibold ${
                    liveYengecApk ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  {liveYengecApk ? 'Tek Tuşla APK Aktif' : 'APK Linki Yok'}
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-slate-300">
                    Kortexa / TWA Yapılandırma JSON
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => copyText('kortexa-yengec', yengecKortexaJson)}
                      className="h-7 px-2 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-medium text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'kortexa-yengec' ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedKey === 'kortexa-yengec' ? 'Kopyalandı' : 'JSON Kopyala'}</span>
                    </button>
                    <a
                      href={`https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(`${normalizedOrigin}/`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-7 px-2 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-medium text-blue-300 inline-flex items-center gap-1"
                    >
                      <span>PWABuilder</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
                <pre className="p-3 rounded-lg bg-[#111827] border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
                  {yengecKortexaJson}
                </pre>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  YenGeç AI İmzalı APK İndirme Linki
                </label>
                <input
                  type="text"
                  maxLength={FIELD_LIMITS.yengecApkUrl.max}
                  value={draftConfig.yengecApkUrl}
                  onChange={(e) =>
                    onChangeConfig((prev) => ({ ...prev, yengecApkUrl: e.target.value }))
                  }
                  placeholder="https://.../yengec-ai.apk veya /yengec-ai.apk"
                  className="w-full h-9 px-3 rounded-lg bg-[#111827] border border-slate-700 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
                />
                {yengecApkError && (
                  <p className="text-[11px] text-red-400 mt-1">{yengecApkError}</p>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src="/kontrol-icon-192.png"
                    alt="YenGeç Kontrol Merkezi"
                    className="w-8 h-8 rounded-lg border border-slate-700 object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-100 truncate">
                      2. YenGeç Kontrol Merkezi
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 truncate">
                      com.yengec.kontrol
                    </div>
                  </div>
                </div>
                <span
                  className={`text-[11px] font-semibold ${
                    liveKontrolApk ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  {liveKontrolApk ? 'Tek Tuşla APK Aktif' : 'APK Linki Yok'}
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-slate-300">
                    Kortexa / TWA Yapılandırma JSON
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => copyText('kortexa-kontrol', kontrolKortexaJson)}
                      className="h-7 px-2 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-medium text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'kortexa-kontrol' ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedKey === 'kortexa-kontrol' ? 'Kopyalandı' : 'JSON Kopyala'}</span>
                    </button>
                    <a
                      href={`https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(`${normalizedOrigin}/?app=kontrol`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-7 px-2 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-medium text-blue-300 inline-flex items-center gap-1"
                    >
                      <span>PWABuilder</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
                <pre className="p-3 rounded-lg bg-[#111827] border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
                  {kontrolKortexaJson}
                </pre>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Kontrol Merkezi İmzalı APK İndirme Linki
                </label>
                <input
                  type="text"
                  maxLength={FIELD_LIMITS.kontrolApkUrl.max}
                  value={draftConfig.kontrolApkUrl}
                  onChange={(e) =>
                    onChangeConfig((prev) => ({ ...prev, kontrolApkUrl: e.target.value }))
                  }
                  placeholder="https://.../yengec-kontrol.apk veya /yengec-kontrol.apk"
                  className="w-full h-9 px-3 rounded-lg bg-[#111827] border border-slate-700 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
                />
                {kontrolApkError && (
                  <p className="text-[11px] text-red-400 mt-1">{kontrolApkError}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-50">
              Canlı Yapılandırma Çıktısı (Firestore: app_configs/global)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              YenGeç istemcileri bu belgeyi doğrudan okuyarak erişim kontrollerini ve ayarları anında uygular.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => copyText('live-json', formattedJson)}
              className="h-9 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 inline-flex items-center gap-1.5 cursor-pointer"
            >
              {copiedKey === 'live-json' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedKey === 'live-json' ? 'Kopyalandı' : 'JSON Kopyala'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadJson}
              className="h-9 px-3 rounded-lg bg-[#2563EB] hover:bg-blue-500 text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>JSON İndir</span>
            </button>
          </div>
        </div>

        <div className="p-5">
          <pre className="p-4 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs font-mono text-slate-200 overflow-x-auto max-h-80">
            {formattedJson}
          </pre>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <h2 className="text-sm font-bold text-slate-50">Yeni Yönetici Ekle</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Yetkisiz giriş ekranında görünen Firebase UID ile ekip üyesi yetkilendirin.
            </p>
          </div>

          <form onSubmit={handleSubmitAdmin} className="p-5 space-y-3.5">
            {formError && (
              <div className="p-3 rounded-lg bg-red-950/60 border border-red-800/80 text-xs text-red-200">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Firebase Kullanıcı UID
              </label>
              <input
                type="text"
                required
                value={uid}
                onChange={(e) => setUid(e.target.value)}
                placeholder="Örn. aB3xYz98..."
                className="w-full h-9 px-3 rounded-lg bg-[#0B0F17] border border-slate-700 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Google E-posta Adresi
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yonetici@gmail.com"
                className="w-full h-9 px-3 rounded-lg bg-[#0B0F17] border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Ad Soyad
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Örn. Ahmet Yılmaz"
                className="w-full h-9 px-3 rounded-lg bg-[#0B0F17] border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Yönetici Rolü
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as AdminRole)}
                className="w-full h-9 px-3 rounded-lg bg-[#0B0F17] border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="moderator">Moderatör</option>
                <option value="super_admin">Süper Yönetici</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={savingAdmin}
              className="w-full h-9 rounded-lg bg-[#2563EB] hover:bg-blue-500 disabled:opacity-60 text-xs font-semibold text-white inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{savingAdmin ? 'Ekleniyor...' : 'Yöneticiyi Yetkilendir'}</span>
            </button>
          </form>
        </section>

        <section className="xl:col-span-2 bg-[#111827] border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-50">Yetkili Yöneticiler</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Erişim kontrolleri ve ayarları düzenlemeye yetkili Google hesapları.
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-400">
              {admins.length} kişi
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-[#0F1623]">
                  <th className="py-2.5 px-4">Yönetici</th>
                  <th className="py-2.5 px-4">UID</th>
                  <th className="py-2.5 px-4">Rol</th>
                  <th className="py-2.5 px-4 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-xs">
                {admins.map((admin) => {
                  const isSelf = admin.uid === currentUserUid;
                  return (
                    <tr key={admin.id} className="hover:bg-slate-800/35">
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-100">{admin.displayName}</div>
                        <div className="text-[11px] text-slate-400">{admin.email}</div>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-400">
                        {admin.uid}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-400">
                          <Shield className="w-3.5 h-3.5" />
                          {admin.role === 'super_admin' ? 'Süper Yönetici' : 'Moderatör'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        {isSelf ? (
                          <span className="text-[11px] text-slate-500">Aktif Oturum</span>
                        ) : isBootstrappedOwner ? (
                          <button
                            type="button"
                            onClick={() => setAdminToDelete(admin)}
                            className="p-1.5 rounded-md bg-slate-800 hover:bg-red-950/70 border border-slate-700 hover:border-red-800 text-slate-300 hover:text-red-300 cursor-pointer"
                            title="Yetkiyi kaldır"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-500">Korumalı</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-50">Tam Denetim Günlüğü (Audit Logs)</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Değiştirilemez güvenlik ve ayar geçmişi.
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-400">
            Son {auditLogs.length} kayıt
          </span>
        </div>

        {auditLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Henüz kayıtlı işlem bulunmuyor.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-[#0F1623]">
                  <th className="py-2.5 px-4">Olay</th>
                  <th className="py-2.5 px-4">Açıklama</th>
                  <th className="py-2.5 px-4">Hedef ID</th>
                  <th className="py-2.5 px-4">Yönetici</th>
                  <th className="py-2.5 px-4 text-right">Tarih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-xs">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/35">
                    <td className="py-2.5 px-4 font-semibold text-slate-200 whitespace-nowrap">
                      {AUDIT_ACTION_LABELS[log.action] || log.action}
                    </td>
                    <td className="py-2.5 px-4 text-slate-300">{log.summary}</td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-400">
                      {log.targetId}
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
      </section>

      {adminToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-md bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-50">Yönetici Yetkisini Kaldır</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              <strong className="text-slate-200">{adminToDelete.displayName}</strong> (
              {adminToDelete.email}) hesabının yönetici yetkisini kaldırmak istiyor musunuz?
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setAdminToDelete(null)}
                disabled={savingAdmin}
                className="h-9 px-3.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onRemoveAdmin(adminToDelete);
                  setAdminToDelete(null);
                }}
                disabled={savingAdmin}
                className="h-9 px-4 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-semibold text-white cursor-pointer"
              >
                {savingAdmin ? 'Kaldırılıyor...' : 'Evet, Kaldır'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
