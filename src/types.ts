import type { Timestamp } from 'firebase/firestore';

export type AdminRole = 'super_admin' | 'moderator';
export type ThinkingLevel = 'LOW' | 'HIGH';
export type VoiceName = 'Kore' | 'Aoede' | 'Puck' | 'Charon' | 'Fenrir';
export type SubjectType = 'everyone' | 'role' | 'user' | 'domain';
export type AccessStatus = 'allowed' | 'restricted' | 'blocked';
export type RoleTier = 'guest' | 'standard' | 'pro' | 'vip' | 'moderator';
export type AuditAction =
  | 'config_updated'
  | 'policy_created'
  | 'policy_updated'
  | 'policy_deleted'
  | 'maintenance_toggled'
  | 'admin_added';

export type NavSection = 'overview' | 'access' | 'settings' | 'publish';

export interface AdminUser {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  role: AdminRole;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface AppConfig {
  appName: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  publicAccessEnabled: boolean;
  requireEmailVerification: boolean;
  defaultModel: string;
  defaultThinkingLevel: ThinkingLevel;
  defaultVoice: VoiceName;
  defaultSystemPrompt: string;
  allowWebSearch: boolean;
  allowImageGeneration: boolean;
  allowLiveVoice: boolean;
  allowPhoneCalling: boolean;
  allowQuickStudio: boolean;
  allowHtmlPreview: boolean;
  dailyMessageLimit: number;
  dailyImageLimit: number;
  maxUploadSizeMb: number;
  bannerEnabled: boolean;
  bannerText: string;
  minSupportedVersion: string;
  yengecApkUrl: string;
  kontrolApkUrl: string;
  updatedByUid: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export type EditableAppConfig = Omit<AppConfig, 'updatedByUid' | 'createdAt' | 'updatedAt'>;

export interface AccessPolicy {
  id: string;
  subjectType: SubjectType;
  subjectKey: string;
  displayName: string;
  accessStatus: AccessStatus;
  roleTier: RoleTier;
  canChat: boolean;
  canSearch: boolean;
  canGenerateImage: boolean;
  canUseVoice: boolean;
  canMakeCalls: boolean;
  customDailyLimit: number;
  customDailyImageLimit: number;
  reason: string;
  ownerUid: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export type AccessPolicyFormValues = Omit<AccessPolicy, 'id' | 'ownerUid' | 'createdAt' | 'updatedAt'>;

export interface AuditLog {
  id: string;
  action: AuditAction;
  summary: string;
  targetId: string;
  actorUid: string;
  actorEmail: string;
  createdAt?: Timestamp | null;
}
