import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { AccessControlsSection } from './components/AccessControlsSection';
import { AppSettingsSection } from './components/AppSettingsSection';
import { AuthLoadingScreen, SignInScreen, UnauthorizedScreen } from './components/AuthGate';
import { ControlSidebar } from './components/ControlSidebar';
import { OverviewSection } from './components/OverviewSection';
import { PublishAndAdminsSection } from './components/PublishAndAdminsSection';
import { TopBar } from './components/TopBar';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  DEFAULT_EDITABLE_CONFIG,
  FIELD_LIMITS,
  sanitizeEditableConfig,
  sanitizePolicyForm,
  VALID_ID_REGEX,
} from './constants/defaults';
import {
  auth,
  db,
  firebaseConfig,
  googleProvider,
  handleFirestoreError,
  OperationType,
  testFirestoreConnection,
} from './firebase';
import type {
  AccessPolicy,
  AccessPolicyFormValues,
  AdminRole,
  AdminUser,
  AuditAction,
  AuditLog,
  EditableAppConfig,
  NavSection,
} from './types';

function extractEditableConfig(data: Record<string, any>): EditableAppConfig {
  return sanitizeEditableConfig({
    appName: data.appName ?? DEFAULT_EDITABLE_CONFIG.appName,
    maintenanceMode: Boolean(data.maintenanceMode),
    maintenanceMessage: data.maintenanceMessage ?? DEFAULT_EDITABLE_CONFIG.maintenanceMessage,
    publicAccessEnabled: Boolean(data.publicAccessEnabled ?? DEFAULT_EDITABLE_CONFIG.publicAccessEnabled),
    requireEmailVerification: Boolean(data.requireEmailVerification),
    defaultModel: data.defaultModel ?? DEFAULT_EDITABLE_CONFIG.defaultModel,
    defaultThinkingLevel: data.defaultThinkingLevel === 'HIGH' ? 'HIGH' : 'LOW',
    defaultVoice: data.defaultVoice ?? DEFAULT_EDITABLE_CONFIG.defaultVoice,
    defaultSystemPrompt: data.defaultSystemPrompt ?? DEFAULT_EDITABLE_CONFIG.defaultSystemPrompt,
    allowWebSearch: Boolean(data.allowWebSearch ?? DEFAULT_EDITABLE_CONFIG.allowWebSearch),
    allowImageGeneration: Boolean(
      data.allowImageGeneration ?? DEFAULT_EDITABLE_CONFIG.allowImageGeneration
    ),
    allowLiveVoice: Boolean(data.allowLiveVoice ?? DEFAULT_EDITABLE_CONFIG.allowLiveVoice),
    allowPhoneCalling: Boolean(
      data.allowPhoneCalling ?? DEFAULT_EDITABLE_CONFIG.allowPhoneCalling
    ),
    allowQuickStudio: Boolean(data.allowQuickStudio ?? DEFAULT_EDITABLE_CONFIG.allowQuickStudio),
    allowHtmlPreview: Boolean(data.allowHtmlPreview ?? DEFAULT_EDITABLE_CONFIG.allowHtmlPreview),
    dailyMessageLimit: Number(data.dailyMessageLimit ?? DEFAULT_EDITABLE_CONFIG.dailyMessageLimit),
    dailyImageLimit: Number(data.dailyImageLimit ?? DEFAULT_EDITABLE_CONFIG.dailyImageLimit),
    maxUploadSizeMb: Number(data.maxUploadSizeMb ?? DEFAULT_EDITABLE_CONFIG.maxUploadSizeMb),
    bannerEnabled: Boolean(data.bannerEnabled),
    bannerText: data.bannerText ?? DEFAULT_EDITABLE_CONFIG.bannerText,
    minSupportedVersion:
      data.minSupportedVersion ?? DEFAULT_EDITABLE_CONFIG.minSupportedVersion,
    yengecApkUrl: data.yengecApkUrl ?? DEFAULT_EDITABLE_CONFIG.yengecApkUrl,
    kontrolApkUrl: data.kontrolApkUrl ?? DEFAULT_EDITABLE_CONFIG.kontrolApkUrl,
  });
}

function formatFriendlyError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('Quota exceeded')) {
    return `Firestore günlük ücretsiz kota sınırına ulaşıldı. Detaylar: https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId}/data?openUpgradeDialog=true`;
  }
  if (raw.includes('permission-denied') || raw.includes('Missing or insufficient permissions')) {
    return 'Bu işlem için Firestore güvenlik kuralları yetkisi reddedildi. Lütfen yönetici rolünüzü kontrol edin.';
  }
  return 'İşlem sırasında beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.';
}

export default function App({ onSwitchToChat }: { onSwitchToChat?: () => void } = {}) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAuthorizedAdmin, setIsAuthorizedAdmin] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [configExists, setConfigExists] = useState(false);
  const [liveConfig, setLiveConfig] = useState<EditableAppConfig>(DEFAULT_EDITABLE_CONFIG);
  const [draftConfig, setDraftConfig] = useState<EditableAppConfig>(DEFAULT_EDITABLE_CONFIG);
  const [policies, setPolicies] = useState<AccessPolicy[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [loadingData, setLoadingData] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const seededConfigRef = useRef(false);
  const hasUnsavedRef = useRef(false);

  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(sanitizeEditableConfig(draftConfig)) !== JSON.stringify(liveConfig);
  }, [draftConfig, liveConfig]);

  useEffect(() => {
    hasUnsavedRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  }, []);

  useEffect(() => {
    testFirestoreConnection();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setAuthError(null);

      if (!nextUser) {
        setIsAuthorizedAdmin(false);
        setAuthReady(true);
        setLoadingData(false);
        seededConfigRef.current = false;
        return;
      }

      if (!nextUser.emailVerified) {
        setIsAuthorizedAdmin(false);
        setAuthReady(true);
        setLoadingData(false);
        return;
      }

      const isBootstrapped =
        nextUser.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();

      try {
        const adminPath = `admins/${nextUser.uid}`;
        let adminSnap;
        try {
          adminSnap = await getDoc(doc(db, 'admins', nextUser.uid));
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, adminPath);
        }

        if (adminSnap && adminSnap.exists()) {
          setIsAuthorizedAdmin(true);
        } else if (isBootstrapped && VALID_ID_REGEX.test(nextUser.uid)) {
          try {
            await setDoc(doc(db, 'admins', nextUser.uid), {
              uid: nextUser.uid,
              email: (nextUser.email || BOOTSTRAPPED_ADMIN_EMAIL).slice(0, FIELD_LIMITS.adminEmail.max),
              displayName: (nextUser.displayName || 'Ana Yönetici').slice(
                0,
                FIELD_LIMITS.adminDisplayName.max
              ),
              role: 'super_admin',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, adminPath);
          }
          setIsAuthorizedAdmin(true);
        } else {
          setIsAuthorizedAdmin(false);
        }
      } catch (err) {
        setAuthError(formatFriendlyError(err));
        setIsAuthorizedAdmin(isBootstrapped);
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady || !user || !isAuthorizedAdmin) {
      return;
    }

    setLoadingData(true);

    const configRef = doc(db, 'app_configs', 'global');
    const unsubConfig = onSnapshot(
      configRef,
      async (snap) => {
        if (snap.exists()) {
          setConfigExists(true);
          const extracted = extractEditableConfig(snap.data());
          setLiveConfig(extracted);
          if (!hasUnsavedRef.current) {
            setDraftConfig(extracted);
          }
          setLoadingData(false);
        } else if (!seededConfigRef.current) {
          seededConfigRef.current = true;
          const initialPayload = sanitizeEditableConfig(DEFAULT_EDITABLE_CONFIG);
          try {
            await setDoc(configRef, {
              ...initialPayload,
              updatedByUid: user.uid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, 'app_configs/global');
          }
          setLoadingData(false);
        }
      },
      (error) => {
        setLoadingData(false);
        handleFirestoreError(error, OperationType.GET, 'app_configs/global');
      }
    );

    const policiesQuery = query(collection(db, 'access_policies'), orderBy('updatedAt', 'desc'));
    const unsubPolicies = onSnapshot(
      policiesQuery,
      (snap) => {
        const list: AccessPolicy[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            subjectType: data.subjectType,
            subjectKey: data.subjectKey,
            displayName: data.displayName,
            accessStatus: data.accessStatus,
            roleTier: data.roleTier,
            canChat: Boolean(data.canChat),
            canSearch: Boolean(data.canSearch),
            canGenerateImage: Boolean(data.canGenerateImage),
            canUseVoice: Boolean(data.canUseVoice),
            canMakeCalls: Boolean(data.canMakeCalls),
            customDailyLimit: Number(data.customDailyLimit ?? 0),
            customDailyImageLimit: Number(data.customDailyImageLimit ?? 0),
            reason: data.reason ?? '',
            ownerUid: data.ownerUid,
            createdAt: data.createdAt ?? null,
            updatedAt: data.updatedAt ?? null,
          };
        });
        setPolicies(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'access_policies');
      }
    );

    const adminsQuery = query(collection(db, 'admins'), orderBy('createdAt', 'asc'));
    const unsubAdmins = onSnapshot(
      adminsQuery,
      (snap) => {
        const list: AdminUser[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            uid: data.uid,
            email: data.email,
            displayName: data.displayName,
            role: data.role,
            createdAt: data.createdAt ?? null,
            updatedAt: data.updatedAt ?? null,
          };
        });
        setAdmins(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'admins');
      }
    );

    const logsQuery = query(
      collection(db, 'audit_logs'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsubLogs = onSnapshot(
      logsQuery,
      (snap) => {
        const list: AuditLog[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            action: data.action,
            summary: data.summary,
            targetId: data.targetId,
            actorUid: data.actorUid,
            actorEmail: data.actorEmail,
            createdAt: data.createdAt ?? null,
          };
        });
        setAuditLogs(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'audit_logs');
      }
    );

    return () => {
      unsubConfig();
      unsubPolicies();
      unsubAdmins();
      unsubLogs();
    };
  }, [authReady, user, isAuthorizedAdmin]);

  const recordAuditLog = useCallback(
    async (action: AuditAction, summary: string, targetId: string) => {
      if (!user) return;
      const safeTargetId = VALID_ID_REGEX.test(targetId)
        ? targetId.slice(0, 128)
        : 'global';
      const safeEmail = (user.email || 'admin@yengec.ai').slice(0, FIELD_LIMITS.adminEmail.max);
      const safeSummary = summary.trim().slice(0, FIELD_LIMITS.auditSummary.max) || 'Yönetim işlemi';

      try {
        await addDoc(collection(db, 'audit_logs'), {
          action,
          summary: safeSummary,
          targetId: safeTargetId,
          actorUid: user.uid,
          actorEmail: safeEmail,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'audit_logs');
      }
    },
    [user]
  );

  const handleSignIn = async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        setAuthError('Giriş penceresi kapatıldı. Devam etmek için tekrar deneyin.');
      } else if (err?.code === 'auth/popup-blocked') {
        setAuthError('Tarayıcı açılır pencereyi engelledi. Lütfen izin verip tekrar deneyin.');
      } else {
        setAuthError('Google ile giriş yapılırken bir hata oluştu.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const handlePublishConfig = async () => {
    if (!user) return;
    setSavingConfig(true);
    const sanitized = sanitizeEditableConfig(draftConfig);
    try {
      const configRef = doc(db, 'app_configs', 'global');
      if (configExists) {
        try {
          await updateDoc(configRef, {
            ...sanitized,
            updatedByUid: user.uid,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, 'app_configs/global');
        }
      } else {
        try {
          await setDoc(configRef, {
            ...sanitized,
            updatedByUid: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'app_configs/global');
        }
      }

      setLiveConfig(sanitized);
      setDraftConfig(sanitized);
      await recordAuditLog(
        'config_updated',
        `Küresel YenGeç ayarları yayınlandı (Model: ${sanitized.defaultModel}, Limit: ${sanitized.dailyMessageLimit}).`,
        'global'
      );
      showToast('success', 'Tüm erişim kontrolleri ve uygulama ayarları Firestore üzerinde yayınlandı.');
    } catch (err) {
      showToast('error', formatFriendlyError(err));
    } finally {
      setSavingConfig(false);
    }
  };

  const handleToggleMaintenanceImmediate = async (nextState: boolean) => {
    if (!user) return;
    setSavingConfig(true);
    const nextConfig = sanitizeEditableConfig({ ...draftConfig, maintenanceMode: nextState });
    try {
      const configRef = doc(db, 'app_configs', 'global');
      if (configExists) {
        try {
          await updateDoc(configRef, {
            ...nextConfig,
            updatedByUid: user.uid,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, 'app_configs/global');
        }
      } else {
        try {
          await setDoc(configRef, {
            ...nextConfig,
            updatedByUid: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'app_configs/global');
        }
      }
      setLiveConfig(nextConfig);
      setDraftConfig(nextConfig);
      await recordAuditLog(
        'maintenance_toggled',
        nextState
          ? 'Acil küresel bakım modu açıldı.'
          : 'Küresel bakım modu kapatıldı, YenGeç yeniden yayında.',
        'global'
      );
      showToast(
        'success',
        nextState ? 'Bakım modu tüm kullanıcılar için aktif edildi.' : 'Bakım modu kapatıldı.'
      );
    } catch (err) {
      showToast('error', formatFriendlyError(err));
    } finally {
      setSavingConfig(false);
    }
  };

  const handleCreatePolicy = async (values: AccessPolicyFormValues) => {
    if (!user) return;
    setSavingPolicy(true);
    const sanitized = sanitizePolicyForm(values);
    const newRef = doc(collection(db, 'access_policies'));
    try {
      try {
        await setDoc(newRef, {
          ...sanitized,
          ownerUid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `access_policies/${newRef.id}`);
      }
      await recordAuditLog(
        'policy_created',
        `Yeni erişim politikası eklendi: ${sanitized.displayName} (${sanitized.subjectKey})`,
        newRef.id
      );
      showToast('success', `"${sanitized.displayName}" politikası oluşturuldu.`);
    } catch (err) {
      showToast('error', formatFriendlyError(err));
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleUpdatePolicy = async (policyId: string, values: AccessPolicyFormValues) => {
    if (!user) return;
    setSavingPolicy(true);
    const sanitized = sanitizePolicyForm(values);
    const policyRef = doc(db, 'access_policies', policyId);
    try {
      try {
        await updateDoc(policyRef, {
          ...sanitized,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `access_policies/${policyId}`);
      }
      await recordAuditLog(
        'policy_updated',
        `Erişim politikası güncellendi: ${sanitized.displayName} (${sanitized.accessStatus})`,
        policyId
      );
      showToast('success', `"${sanitized.displayName}" politikası güncellendi.`);
    } catch (err) {
      showToast('error', formatFriendlyError(err));
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleDeletePolicy = async (policy: AccessPolicy) => {
    if (!user) return;
    setSavingPolicy(true);
    const policyRef = doc(db, 'access_policies', policy.id);
    try {
      try {
        await deleteDoc(policyRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `access_policies/${policy.id}`);
      }
      await recordAuditLog(
        'policy_deleted',
        `Erişim politikası silindi: ${policy.displayName} (${policy.subjectKey})`,
        policy.id
      );
      showToast('success', `"${policy.displayName}" politikası silindi.`);
    } catch (err) {
      showToast('error', formatFriendlyError(err));
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleSeedDefaultPolicies = async () => {
    if (!user) return;
    setSavingPolicy(true);
    const templates: AccessPolicyFormValues[] = [
      {
        subjectType: 'everyone',
        subjectKey: 'all_users',
        displayName: 'Tüm Standart Kullanıcılar',
        accessStatus: 'allowed',
        roleTier: 'standard',
        canChat: true,
        canSearch: true,
        canGenerateImage: true,
        canUseVoice: true,
        canMakeCalls: true,
        customDailyLimit: 250,
        customDailyImageLimit: 0,
        reason: 'Herkes için temel YenGeç kullanım izinleri (sınırsız görsel üretimi)',
      },
      {
        subjectType: 'role',
        subjectKey: 'guest',
        displayName: 'Girişsiz Misafir Erişimi',
        accessStatus: 'restricted',
        roleTier: 'guest',
        canChat: true,
        canSearch: true,
        canGenerateImage: true,
        canUseVoice: false,
        canMakeCalls: false,
        customDailyLimit: 25,
        customDailyImageLimit: 10,
        reason: 'Misafir ziyaretçiler için korumalı günlük mesaj ve görsel kotası',
      },
    ];

    try {
      for (const tpl of templates) {
        const sanitized = sanitizePolicyForm(tpl);
        const ref = doc(collection(db, 'access_policies'));
        try {
          await setDoc(ref, {
            ...sanitized,
            ownerUid: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `access_policies/${ref.id}`);
        }
        await recordAuditLog(
          'policy_created',
          `Başlangıç politikası eklendi: ${sanitized.displayName}`,
          ref.id
        );
      }
      showToast('success', 'Varsayılan herkes ve misafir erişim politikaları oluşturuldu.');
    } catch (err) {
      showToast('error', formatFriendlyError(err));
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleAddAdmin = async (payload: {
    uid: string;
    email: string;
    displayName: string;
    role: AdminRole;
  }) => {
    if (!user) return;
    setSavingAdmin(true);
    const adminRef = doc(db, 'admins', payload.uid);
    try {
      try {
        await setDoc(adminRef, {
          uid: payload.uid,
          email: payload.email,
          displayName: payload.displayName,
          role: payload.role,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `admins/${payload.uid}`);
      }
      await recordAuditLog(
        'admin_added',
        `Yeni yönetici eklendi: ${payload.displayName} (${payload.email})`,
        payload.uid
      );
      showToast('success', `${payload.displayName} yönetici olarak yetkilendirildi.`);
    } catch (err) {
      showToast('error', formatFriendlyError(err));
    } finally {
      setSavingAdmin(false);
    }
  };

  const handleRemoveAdmin = async (admin: AdminUser) => {
    if (!user) return;
    setSavingAdmin(true);
    try {
      try {
        await deleteDoc(doc(db, 'admins', admin.uid));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `admins/${admin.uid}`);
      }
      showToast('success', `${admin.displayName} yönetici listesinden çıkarıldı.`);
    } catch (err) {
      showToast('error', formatFriendlyError(err));
    } finally {
      setSavingAdmin(false);
    }
  };

  if (!authReady) {
    return <AuthLoadingScreen />;
  }

  if (!user) {
    return (
      <SignInScreen
        onSignIn={handleSignIn}
        loading={signingIn}
        error={authError}
        onSwitchToChat={onSwitchToChat}
      />
    );
  }

  if (!isAuthorizedAdmin) {
    return (
      <UnauthorizedScreen
        user={user}
        onSignOut={handleSignOut}
        onSwitchToChat={onSwitchToChat}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex">
      <ControlSidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        maintenanceMode={draftConfig.maintenanceMode}
        publicAccessEnabled={draftConfig.publicAccessEnabled}
        policyCount={policies.length}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onSwitchToChat={onSwitchToChat}
        apkUrl={liveConfig.kontrolApkUrl}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          activeSection={activeSection}
          user={user}
          hasUnsavedChanges={hasUnsavedChanges}
          savingConfig={savingConfig}
          onPublishConfig={handlePublishConfig}
          onResetDraft={() => setDraftConfig(liveConfig)}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onSignOut={handleSignOut}
          apkUrl={liveConfig.kontrolApkUrl}
        />

        {toast && (
          <div className="px-4 sm:px-6 pt-4">
            <div
              className={`rounded-lg border px-4 py-3 text-xs flex items-center justify-between gap-3 ${
                toast.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                  : 'bg-red-950/60 border-red-800 text-red-200'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {toast.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span className="truncate">{toast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="p-1 rounded hover:bg-white/10 shrink-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {activeSection === 'overview' && (
            <OverviewSection
              config={draftConfig}
              policies={policies}
              auditLogs={auditLogs}
              loadingData={loadingData}
              savingConfig={savingConfig}
              onToggleMaintenanceImmediate={handleToggleMaintenanceImmediate}
              onTogglePublicAccessDraft={() =>
                setDraftConfig((prev) => ({
                  ...prev,
                  publicAccessEnabled: !prev.publicAccessEnabled,
                }))
              }
              onNavigate={setActiveSection}
            />
          )}

          {activeSection === 'access' && (
            <AccessControlsSection
              config={draftConfig}
              onChangeConfig={setDraftConfig}
              policies={policies}
              loadingPolicies={loadingData}
              savingPolicy={savingPolicy}
              onCreatePolicy={handleCreatePolicy}
              onUpdatePolicy={handleUpdatePolicy}
              onDeletePolicy={handleDeletePolicy}
              onSeedDefaultPolicies={handleSeedDefaultPolicies}
            />
          )}

          {activeSection === 'settings' && (
            <AppSettingsSection
              config={draftConfig}
              hasUnsavedChanges={hasUnsavedChanges}
              savingConfig={savingConfig}
              onChangeConfig={setDraftConfig}
              onPublishConfig={handlePublishConfig}
              onResetDraft={() => setDraftConfig(liveConfig)}
            />
          )}

          {activeSection === 'publish' && (
            <PublishAndAdminsSection
              liveConfig={liveConfig}
              draftConfig={draftConfig}
              hasUnsavedChanges={hasUnsavedChanges}
              savingConfig={savingConfig}
              onChangeConfig={setDraftConfig}
              onPublishConfig={handlePublishConfig}
              admins={admins}
              auditLogs={auditLogs}
              currentUserUid={user.uid}
              currentUserEmail={user.email}
              savingAdmin={savingAdmin}
              onAddAdmin={handleAddAdmin}
              onRemoveAdmin={handleRemoveAdmin}
            />
          )}
        </main>
      </div>
    </div>
  );
}
