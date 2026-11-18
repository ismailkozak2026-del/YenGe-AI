import type {
  AccessPolicyFormValues,
  AccessStatus,
  AuditAction,
  EditableAppConfig,
  RoleTier,
  SubjectType,
  VoiceName,
} from '../types';

export const BOOTSTRAPPED_ADMIN_EMAIL = 'ismailkozak2026@gmail.com';

export const VALID_ID_REGEX = /^[a-zA-Z0-9_\-]+$/;

export const FIELD_LIMITS = {
  appName: { min: 1, max: 80 },
  maintenanceMessage: { min: 0, max: 500 },
  defaultModel: { min: 1, max: 80 },
  defaultSystemPrompt: { min: 0, max: 2000 },
  bannerText: { min: 0, max: 300 },
  minSupportedVersion: { min: 1, max: 30 },
  yengecApkUrl: { min: 0, max: 500 },
  kontrolApkUrl: { min: 0, max: 500 },
  dailyMessageLimit: { min: 0, max: 100000 },
  dailyImageLimit: { min: 0, max: 10000 },
  maxUploadSizeMb: { min: 1, max: 100 },
  policySubjectKey: { min: 1, max: 160 },
  policyDisplayName: { min: 1, max: 120 },
  policyReason: { min: 0, max: 400 },
  adminUid: { min: 1, max: 128 },
  adminEmail: { min: 3, max: 160 },
  adminDisplayName: { min: 1, max: 120 },
  auditSummary: { min: 1, max: 300 },
} as const;

export const DEFAULT_EDITABLE_CONFIG: EditableAppConfig = {
  appName: 'YenGeç AI',
  maintenanceMode: false,
  maintenanceMessage:
    'YenGeç şu anda planlı bakım ve altyapı güncellemesi altındadır. Kısa süre içinde yeniden aktif olacaktır.',
  publicAccessEnabled: true,
  requireEmailVerification: false,
  defaultModel: 'gemini-3.5-flash-lite',
  defaultThinkingLevel: 'LOW',
  defaultVoice: 'Kore',
  defaultSystemPrompt:
    'Sen YenGeç adlı yeni nesil Türkçe yapay zeka asistanısın. Doğru, net, hızlı ve kaynaklara dayalı yanıtlar üret.',
  allowWebSearch: true,
  allowImageGeneration: true,
  allowLiveVoice: true,
  allowPhoneCalling: true,
  allowQuickStudio: true,
  allowHtmlPreview: true,
  dailyMessageLimit: 250,
  dailyImageLimit: 0,
  maxUploadSizeMb: 20,
  bannerEnabled: false,
  bannerText: 'Yeni sürüm yayında: Hızlı Stüdyo ve sesli yanıt motoru güncellendi.',
  minSupportedVersion: '1.0.0',
  yengecApkUrl: '',
  kontrolApkUrl: '',
};

export const EMPTY_POLICY_FORM: AccessPolicyFormValues = {
  subjectType: 'everyone',
  subjectKey: 'all_users',
  displayName: 'Tüm YenGeç Kullanıcıları',
  accessStatus: 'allowed',
  roleTier: 'standard',
  canChat: true,
  canSearch: true,
  canGenerateImage: true,
  canUseVoice: true,
  canMakeCalls: true,
  customDailyLimit: 250,
  customDailyImageLimit: 0,
  reason: 'Varsayılan genel erişim politikası',
};

export const AVAILABLE_MODELS = [
  { value: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash Lite (Varsayılan Hızlı)' },
  { value: 'gemini-4-hydrogen', label: 'Gemini 4 Hydrogen (Yeni Nesil)' },
  { value: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash (Dengeli)' },
  { value: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash (Yüksek Doğruluk)' },
  { value: 'gemini-flash-latest', label: 'Gemini Flash Latest (Otomatik)' },
];

export const AVAILABLE_VOICES: { value: VoiceName; label: string }[] = [
  { value: 'Kore', label: 'Kore — Doğal & Net (Varsayılan)' },
  { value: 'Aoede', label: 'Aoede — Sıcak & Akıcı' },
  { value: 'Puck', label: 'Puck — Enerjik & Hızlı' },
  { value: 'Charon', label: 'Charon — Derin & Otoriter' },
  { value: 'Fenrir', label: 'Fenrir — Güçlü & Vurgulu' },
];

export const SUBJECT_TYPE_LABELS: Record<SubjectType, string> = {
  everyone: 'Herkes (Global)',
  role: 'Rol Katmanı',
  domain: 'E-posta Alan Adı',
  user: 'Belirli Kullanıcı',
};

export const ACCESS_STATUS_LABELS: Record<AccessStatus, string> = {
  allowed: 'İzinli',
  restricted: 'Kısıtlı',
  blocked: 'Engelli',
};

export const ROLE_TIER_LABELS: Record<RoleTier, string> = {
  guest: 'Misafir',
  standard: 'Standart',
  pro: 'Pro',
  vip: 'VIP',
  moderator: 'Moderatör',
};

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  config_updated: 'Ayarlar Güncellendi',
  policy_created: 'Politika Eklendi',
  policy_updated: 'Politika Güncellendi',
  policy_deleted: 'Politika Silindi',
  maintenance_toggled: 'Bakım Modu Değişti',
  admin_added: 'Yönetici Eklendi',
};

export function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, Math.round(num)));
}

export function sanitizeString(value: unknown, maxLen: number, fallback = ''): string {
  const str = typeof value === 'string' ? value.trim() : fallback;
  return str.slice(0, maxLen);
}

export function sanitizeApkUrl(value: unknown, maxLen = FIELD_LIMITS.yengecApkUrl.max): string {
  const str = typeof value === 'string' ? value.trim() : '';
  if (!str) return '';
  const sliced = str.slice(0, maxLen);
  if (sliced.startsWith('https://') || sliced.startsWith('/')) {
    return sliced;
  }
  return '';
}

export function sanitizeEditableConfig(raw: EditableAppConfig): EditableAppConfig {
  return {
    appName: sanitizeString(raw.appName, FIELD_LIMITS.appName.max, 'YenGeç AI') || 'YenGeç AI',
    maintenanceMode: Boolean(raw.maintenanceMode),
    maintenanceMessage: sanitizeString(raw.maintenanceMessage, FIELD_LIMITS.maintenanceMessage.max),
    publicAccessEnabled: Boolean(raw.publicAccessEnabled),
    requireEmailVerification: Boolean(raw.requireEmailVerification),
    defaultModel:
      sanitizeString(raw.defaultModel, FIELD_LIMITS.defaultModel.max, 'gemini-3.5-flash-lite') ||
      'gemini-3.5-flash-lite',
    defaultThinkingLevel: raw.defaultThinkingLevel === 'HIGH' ? 'HIGH' : 'LOW',
    defaultVoice: ['Kore', 'Aoede', 'Puck', 'Charon', 'Fenrir'].includes(raw.defaultVoice)
      ? raw.defaultVoice
      : 'Kore',
    defaultSystemPrompt: sanitizeString(raw.defaultSystemPrompt, FIELD_LIMITS.defaultSystemPrompt.max),
    allowWebSearch: Boolean(raw.allowWebSearch),
    allowImageGeneration: Boolean(raw.allowImageGeneration),
    allowLiveVoice: Boolean(raw.allowLiveVoice),
    allowPhoneCalling: Boolean(raw.allowPhoneCalling),
    allowQuickStudio: Boolean(raw.allowQuickStudio),
    allowHtmlPreview: Boolean(raw.allowHtmlPreview),
    dailyMessageLimit: clampInt(
      raw.dailyMessageLimit,
      FIELD_LIMITS.dailyMessageLimit.min,
      FIELD_LIMITS.dailyMessageLimit.max,
      250
    ),
    dailyImageLimit: clampInt(
      raw.dailyImageLimit,
      FIELD_LIMITS.dailyImageLimit.min,
      FIELD_LIMITS.dailyImageLimit.max,
      0
    ),
    maxUploadSizeMb: clampInt(
      raw.maxUploadSizeMb,
      FIELD_LIMITS.maxUploadSizeMb.min,
      FIELD_LIMITS.maxUploadSizeMb.max,
      20
    ),
    bannerEnabled: Boolean(raw.bannerEnabled),
    bannerText: sanitizeString(raw.bannerText, FIELD_LIMITS.bannerText.max),
    minSupportedVersion:
      sanitizeString(raw.minSupportedVersion, FIELD_LIMITS.minSupportedVersion.max, '1.0.0') ||
      '1.0.0',
    yengecApkUrl: sanitizeApkUrl(raw.yengecApkUrl, FIELD_LIMITS.yengecApkUrl.max),
    kontrolApkUrl: sanitizeApkUrl(raw.kontrolApkUrl, FIELD_LIMITS.kontrolApkUrl.max),
  };
}

export function sanitizePolicyForm(raw: AccessPolicyFormValues): AccessPolicyFormValues {
  const subjectType: SubjectType = ['everyone', 'role', 'user', 'domain'].includes(raw.subjectType)
    ? raw.subjectType
    : 'everyone';
  const rawSubjectKey =
    sanitizeString(raw.subjectKey, FIELD_LIMITS.policySubjectKey.max, 'all_users') || 'all_users';
  const normalizedSubjectKey =
    subjectType === 'domain' || (subjectType === 'user' && rawSubjectKey.includes('@'))
      ? rawSubjectKey.toLowerCase()
      : rawSubjectKey;

  return {
    subjectType,
    subjectKey: normalizedSubjectKey,
    displayName:
      sanitizeString(raw.displayName, FIELD_LIMITS.policyDisplayName.max, 'Yeni Erişim Politikası') ||
      'Yeni Erişim Politikası',
    accessStatus: ['allowed', 'restricted', 'blocked'].includes(raw.accessStatus)
      ? raw.accessStatus
      : 'allowed',
    roleTier: ['guest', 'standard', 'pro', 'vip', 'moderator'].includes(raw.roleTier)
      ? raw.roleTier
      : 'standard',
    canChat: Boolean(raw.canChat),
    canSearch: Boolean(raw.canSearch),
    canGenerateImage: Boolean(raw.canGenerateImage),
    canUseVoice: Boolean(raw.canUseVoice),
    canMakeCalls: Boolean(raw.canMakeCalls),
    customDailyLimit: clampInt(
      raw.customDailyLimit,
      FIELD_LIMITS.dailyMessageLimit.min,
      FIELD_LIMITS.dailyMessageLimit.max,
      250
    ),
    customDailyImageLimit: clampInt(
      raw.customDailyImageLimit,
      FIELD_LIMITS.dailyImageLimit.min,
      FIELD_LIMITS.dailyImageLimit.max,
      0
    ),
    reason: sanitizeString(raw.reason, FIELD_LIMITS.policyReason.max),
  };
}
