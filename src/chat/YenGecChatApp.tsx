import React, { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { collection, doc, onSnapshot, query, where, type QueryDocumentSnapshot } from 'firebase/firestore';
import {
  AlertCircle,
  ArrowUp,
  Ban,
  Download,
  Globe,
  ImagePlus,
  LogIn,
  LogOut,
  Menu,
  Mic,
  Paperclip,
  Phone,
  Plus,
  RefreshCw,
  Settings,
  ShieldAlert,
  Sparkles,
  Square,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import { DEFAULT_EDITABLE_CONFIG, sanitizeEditableConfig } from '../constants/defaults';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  testFirestoreConnection,
} from '../firebase';
import type { AccessPolicy, EditableAppConfig, ThinkingLevel } from '../types';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { ChatMarkdown } from './ChatMarkdown';
import {
  CallModal,
  HtmlPreviewModal,
  LiveVoiceModal,
  QuickStudioModal,
  SettingsModal,
} from './ChatModals';
import {
  CHAT_MODES,
  type ChatConversation,
  type ChatImageAttachment,
  type ChatMessage,
  type ChatMode,
} from './chatTypes';

const STORAGE_KEY = 'yengec_conversations_v2';
const DAILY_COUNT_KEY = 'yengec_daily_usage_v2';
const DAILY_IMAGE_COUNT_KEY = 'yengec_daily_image_usage_v1';

function loadConversations(): ChatConversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getTodayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDailyScopedCount(storageKey: string, scopeKey: string): number {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    if (parsed?.date !== getTodayDateKey()) return 0;
    return Number(parsed?.counts?.[scopeKey]) || 0;
  } catch {
    return 0;
  }
}

function incrementDailyScopedCount(storageKey: string, scopeKey: string): number {
  const today = getTodayDateKey();
  let counts: Record<string, number> = {};
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.date === today && parsed?.counts && typeof parsed.counts === 'object') {
        counts = { ...parsed.counts };
      }
    }
  } catch {
    // ignore parse errors
  }
  const next = (Number(counts[scopeKey]) || 0) + 1;
  counts[scopeKey] = next;
  try {
    localStorage.setItem(storageKey, JSON.stringify({ date: today, counts }));
  } catch {
    // ignore storage errors
  }
  return next;
}

function mapPolicySnapshot(docSnap: QueryDocumentSnapshot): AccessPolicy {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    subjectType: data.subjectType || 'everyone',
    subjectKey: data.subjectKey || 'all_users',
    displayName: data.displayName || docSnap.id,
    accessStatus: data.accessStatus || 'allowed',
    roleTier: data.roleTier || 'standard',
    canChat: data.canChat ?? true,
    canSearch: data.canSearch ?? true,
    canGenerateImage: data.canGenerateImage ?? true,
    canUseVoice: data.canUseVoice ?? true,
    canMakeCalls: data.canMakeCalls ?? true,
    customDailyLimit: typeof data.customDailyLimit === 'number' ? data.customDailyLimit : 0,
    customDailyImageLimit:
      typeof data.customDailyImageLimit === 'number' ? data.customDailyImageLimit : 0,
    reason: data.reason || '',
    ownerUid: data.ownerUid || '',
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  };
}

function pickLatestPolicy(policies: AccessPolicy[]): AccessPolicy | null {
  if (policies.length === 0) return null;
  return [...policies].sort((a, b) => {
    if (a.accessStatus === 'blocked' && b.accessStatus !== 'blocked') return -1;
    if (b.accessStatus === 'blocked' && a.accessStatus !== 'blocked') return 1;
    const aTime = a.updatedAt?.toMillis?.() ?? 0;
    const bTime = b.updatedAt?.toMillis?.() ?? 0;
    return bTime - aTime;
  })[0];
}

export const YenGecChatApp: React.FC<{ onSwitchToKontrol?: () => void }> = ({
  onSwitchToKontrol,
}) => {
  const [remoteConfig, setRemoteConfig] = useState<EditableAppConfig>(DEFAULT_EDITABLE_CONFIG);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [publicPolicies, setPublicPolicies] = useState<AccessPolicy[]>([]);
  const [uidPolicies, setUidPolicies] = useState<AccessPolicy[]>([]);
  const [emailPolicies, setEmailPolicies] = useState<AccessPolicy[]>([]);
  const [domainPolicies, setDomainPolicies] = useState<AccessPolicy[]>([]);

  const [conversations, setConversations] = useState<ChatConversation[]>(() => loadConversations());
  const [activeId, setActiveId] = useState<string | null>(() => {
    const existing = loadConversations();
    return existing[0]?.id || null;
  });

  const [mode, setMode] = useState<ChatMode>('general');
  const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevel>(
    DEFAULT_EDITABLE_CONFIG.defaultThinkingLevel
  );
  const [customInstruction, setCustomInstruction] = useState('');
  const [enableSearch, setEnableSearch] = useState(false);
  const [imageMode, setImageMode] = useState(false);
  const [input, setInput] = useState('');
  const [pendingImages, setPendingImages] = useState<ChatImageAttachment[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [dailyMessageCount, setDailyMessageCount] = useState(0);
  const [dailyImageCount, setDailyImageCount] = useState(0);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickStudioOpen, setQuickStudioOpen] = useState(false);
  const [liveVoiceOpen, setLiveVoiceOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [callInfo, setCallInfo] = useState<{ contactName: string; phoneNumber?: string } | null>(
    null
  );
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const usageScopeKey = user?.uid || 'guest';

  useEffect(() => {
    setDailyMessageCount(getDailyScopedCount(DAILY_COUNT_KEY, usageScopeKey));
    setDailyImageCount(getDailyScopedCount(DAILY_IMAGE_COUNT_KEY, usageScopeKey));
  }, [usageScopeKey]);

  useEffect(() => {
    testFirestoreConnection();
    const unsubAuth = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });

    const unsubConfig = onSnapshot(
      doc(db, 'app_configs', 'global'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const sanitized = sanitizeEditableConfig({
            ...DEFAULT_EDITABLE_CONFIG,
            ...data,
          });
          setRemoteConfig(sanitized);
          setThinkingLevel(sanitized.defaultThinkingLevel);
        }
      },
      (error) => {
        console.warn('Config listener notice:', error?.message);
        try {
          handleFirestoreError(error, OperationType.GET, 'app_configs/global');
        } catch {
          // keep fallback config if permission/offline happens for guest
        }
      }
    );

    const unsubPublicPolicies = onSnapshot(
      query(collection(db, 'access_policies'), where('subjectType', 'in', ['everyone', 'role'])),
      (snap) => {
        setPublicPolicies(snap.docs.map(mapPolicySnapshot));
      },
      (error) => {
        console.warn('Public access policy listener notice:', error?.message);
      }
    );

    return () => {
      unsubAuth();
      unsubConfig();
      unsubPublicPolicies();
    };
  }, []);

  useEffect(() => {
    setUidPolicies([]);
    setEmailPolicies([]);
    setDomainPolicies([]);

    if (!user?.uid) return;

    const unsubs: (() => void)[] = [];

    unsubs.push(
      onSnapshot(
        query(
          collection(db, 'access_policies'),
          where('subjectType', '==', 'user'),
          where('subjectKey', '==', user.uid)
        ),
        (snap) => {
          setUidPolicies(snap.docs.map(mapPolicySnapshot));
        },
        (error) => {
          console.warn('User UID policy listener notice:', error?.message);
        }
      )
    );

    const normalizedEmail = user.emailVerified && user.email ? user.email.toLowerCase() : '';
    if (normalizedEmail) {
      unsubs.push(
        onSnapshot(
          query(
            collection(db, 'access_policies'),
            where('subjectType', '==', 'user'),
            where('subjectKey', '==', normalizedEmail)
          ),
          (snap) => {
            setEmailPolicies(snap.docs.map(mapPolicySnapshot));
          },
          (error) => {
            console.warn('User email policy listener notice:', error?.message);
          }
        )
      );

      const emailParts = normalizedEmail.split('@');
      if (emailParts.length === 2 && emailParts[1]) {
        unsubs.push(
          onSnapshot(
            query(
              collection(db, 'access_policies'),
              where('subjectType', '==', 'domain'),
              where('subjectKey', '==', emailParts[1])
            ),
            (snap) => {
              setDomainPolicies(snap.docs.map(mapPolicySnapshot));
            },
            (error) => {
              console.warn('Domain policy listener notice:', error?.message);
            }
          )
        );
      }
    }

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [user?.uid, user?.email, user?.emailVerified]);

  const activePolicy = useMemo<AccessPolicy | null>(() => {
    const userPolicy = pickLatestPolicy([...uidPolicies, ...emailPolicies]);
    if (userPolicy) return userPolicy;

    const domainPolicy = pickLatestPolicy(domainPolicies);
    if (domainPolicy) return domainPolicy;

    const roleKey = user ? 'standard' : 'guest';
    const rolePolicy = pickLatestPolicy(
      publicPolicies.filter((p) => p.subjectType === 'role' && p.subjectKey === roleKey)
    );
    if (rolePolicy) return rolePolicy;

    const everyonePolicy =
      publicPolicies.find((p) => p.subjectType === 'everyone' && p.subjectKey === 'all_users') ||
      pickLatestPolicy(publicPolicies.filter((p) => p.subjectType === 'everyone'));
    return everyonePolicy || null;
  }, [uidPolicies, emailPolicies, domainPolicies, publicPolicies, user]);

  const effectiveCanChat = activePolicy ? activePolicy.canChat : true;
  const effectiveCanSearch =
    remoteConfig.allowWebSearch && (activePolicy ? activePolicy.canSearch : true);
  const effectiveCanGenerateImage =
    remoteConfig.allowImageGeneration && (activePolicy ? activePolicy.canGenerateImage : true);
  const effectiveCanUseVoice =
    remoteConfig.allowLiveVoice && (activePolicy ? activePolicy.canUseVoice : true);
  const effectiveCanMakeCalls =
    remoteConfig.allowPhoneCalling && (activePolicy ? activePolicy.canMakeCalls : true);

  const isSpecificPolicy = Boolean(
    activePolicy && ['user', 'domain', 'role'].includes(activePolicy.subjectType)
  );

  const effectiveDailyMessageLimit = useMemo(() => {
    if (!activePolicy) return remoteConfig.dailyMessageLimit;
    if (isSpecificPolicy) return activePolicy.customDailyLimit;
    if (remoteConfig.dailyMessageLimit > 0 && activePolicy.customDailyLimit > 0) {
      return Math.min(remoteConfig.dailyMessageLimit, activePolicy.customDailyLimit);
    }
    return activePolicy.customDailyLimit || remoteConfig.dailyMessageLimit;
  }, [activePolicy, isSpecificPolicy, remoteConfig.dailyMessageLimit]);

  const effectiveDailyImageLimit = useMemo(() => {
    if (!activePolicy) return remoteConfig.dailyImageLimit;
    if (isSpecificPolicy) return activePolicy.customDailyImageLimit;
    if (remoteConfig.dailyImageLimit > 0 && activePolicy.customDailyImageLimit > 0) {
      return Math.min(remoteConfig.dailyImageLimit, activePolicy.customDailyImageLimit);
    }
    return activePolicy.customDailyImageLimit || remoteConfig.dailyImageLimit;
  }, [activePolicy, isSpecificPolicy, remoteConfig.dailyImageLimit]);

  useEffect(() => {
    if (!effectiveCanSearch && enableSearch) {
      setEnableSearch(false);
    }
  }, [effectiveCanSearch, enableSearch]);

  useEffect(() => {
    if (!effectiveCanGenerateImage && imageMode) {
      setImageMode(false);
    }
  }, [effectiveCanGenerateImage, imageMode]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId]
  );

  const persistConversations = (next: ChatConversation[]) => {
    setConversations(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(0, 40)));
    } catch {
      // ignore storage quota
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages.length, isStreaming]);

  const handleNewChat = () => {
    const id = `conv_${Date.now()}`;
    const nextConv: ChatConversation = {
      id,
      title: 'Yeni Sohbet',
      mode,
      messages: [],
      updatedAt: Date.now(),
    };
    const nextList = [nextConv, ...conversations];
    persistConversations(nextList);
    setActiveId(id);
    setSidebarOpen(false);
  };

  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = conversations.filter((c) => c.id !== id);
    persistConversations(next);
    if (activeId === id) {
      setActiveId(next[0]?.id || null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    setUploadError(null);
    if (files.length === 0) return;

    const maxBytes = remoteConfig.maxUploadSizeMb * 1024 * 1024;
    const loaded: ChatImageAttachment[] = [];

    for (const file of files.slice(0, 3)) {
      if (file.size > maxBytes) {
        setUploadError(`Dosya boyutu en fazla ${remoteConfig.maxUploadSizeMb} MB olabilir.`);
        continue;
      }
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result || '');
          resolve(result.includes(',') ? result.split(',')[1] : result);
        };
        reader.readAsDataURL(file);
      });
      loaded.push({
        data: base64,
        mimeType: file.type || 'image/png',
        name: file.name,
      });
    }

    if (loaded.length > 0) {
      setPendingImages((prev) => [...prev, ...loaded].slice(0, 3));
    }
  };

  const handlePlayTts = async (msg: ChatMessage) => {
    if (!effectiveCanUseVoice) return;
    if (playingMsgId === msg.id) {
      audioRef.current?.pause();
      setPlayingMsgId(null);
      return;
    }
    setPlayingMsgId(msg.id);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: msg.text,
          voiceName: remoteConfig.defaultVoice,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.audio) throw new Error(data.error || 'Ses oluşturulamadı');
      const audio = new Audio(`data:${data.mimeType || 'audio/wav'};base64,${data.audio}`);
      audioRef.current = audio;
      audio.onended = () => setPlayingMsgId(null);
      await audio.play();
    } catch {
      setPlayingMsgId(null);
    }
  };

  const generateDirectImage = async (promptText: string) => {
    if (!promptText || isStreaming) return;

    if (!effectiveCanGenerateImage) {
      setUploadError(
        activePolicy?.reason ||
          'Görsel oluşturma yetkiniz Kontrol Merkezi üzerinden kısıtlanmıştır.'
      );
      return;
    }

    const currentImgCount = getDailyScopedCount(DAILY_IMAGE_COUNT_KEY, usageScopeKey);
    if (effectiveDailyImageLimit > 0 && currentImgCount >= effectiveDailyImageLimit) {
      setUploadError(
        `Günlük görsel oluşturma sınırına (${effectiveDailyImageLimit}) ulaşıldı.`
      );
      return;
    }

    setUploadError(null);

    let conv = activeConversation;
    let list = [...conversations];
    if (!conv) {
      conv = {
        id: `conv_${Date.now()}`,
        title: promptText.slice(0, 42) || 'Görsel Oluşturma',
        mode,
        messages: [],
        updatedAt: Date.now(),
      };
      list = [conv, ...list];
      setActiveId(conv.id);
    }

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: promptText,
      timestamp: Date.now(),
    };

    const assistantMsgId = `a_${Date.now() + 1}`;
    const placeholderAssistant: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      text: 'Görsel oluşturuluyor...',
      timestamp: Date.now(),
    };

    const updatedConv: ChatConversation = {
      ...conv,
      title: conv.messages.length === 0 ? promptText.slice(0, 42) || 'Görsel Oluşturma' : conv.title,
      mode,
      messages: [...conv.messages, userMsg, placeholderAssistant],
      updatedAt: Date.now(),
    };

    list = list.map((c) => (c.id === updatedConv.id ? updatedConv : c));
    setConversations(list);
    setInput('');
    setPendingImages([]);
    setIsStreaming(true);

    try {
      const imgRes = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          aspectRatio: '1:1',
          style: 'photorealistic',
        }),
      });
      const imgData = await imgRes.json();
      if (!imgRes.ok || !imgData.imageUrl) {
        throw new Error(imgData.error || 'Görsel oluşturulamadı.');
      }

      const nextImgCount = incrementDailyScopedCount(DAILY_IMAGE_COUNT_KEY, usageScopeKey);
      setDailyImageCount(nextImgCount);

      setConversations((prev) => {
        const finalized = prev.map((c) =>
          c.id === updatedConv.id
            ? {
                ...c,
                updatedAt: Date.now(),
                messages: c.messages.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        text: 'İstediğiniz görsel oluşturuldu.',
                        generatedImageUrl: imgData.imageUrl,
                      }
                    : m
                ),
              }
            : c
        );
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(finalized.slice(0, 40)));
        } catch {
          // ignore
        }
        return finalized;
      });
    } catch (err: any) {
      const errMsg = err?.message || 'Görsel oluşturulamadı.';
      setConversations((prev) => {
        const errored = prev.map((c) =>
          c.id === updatedConv.id
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, text: errMsg, isError: true }
                    : m
                ),
              }
            : c
        );
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(errored.slice(0, 40)));
        } catch {
          // ignore
        }
        return errored;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const sendMessage = async (overrideText?: string) => {
    const trimmed = (overrideText ?? input).trim();
    if ((!trimmed && pendingImages.length === 0) || isStreaming) return;

    if (imageMode && !overrideText && pendingImages.length === 0) {
      await generateDirectImage(trimmed);
      return;
    }

    if (!effectiveCanChat) {
      setUploadError(
        activePolicy?.reason ||
          'Sohbet erişiminiz Kontrol Merkezi üzerinden kısıtlanmıştır.'
      );
      return;
    }

    const currentMsgCount = getDailyScopedCount(DAILY_COUNT_KEY, usageScopeKey);
    if (effectiveDailyMessageLimit > 0 && currentMsgCount >= effectiveDailyMessageLimit) {
      setUploadError(
        `Günlük mesaj sınırına (${effectiveDailyMessageLimit}) ulaşıldı.`
      );
      return;
    }

    setUploadError(null);
    const nextMsgCount = incrementDailyScopedCount(DAILY_COUNT_KEY, usageScopeKey);
    setDailyMessageCount(nextMsgCount);

    let conv = activeConversation;
    let list = [...conversations];
    if (!conv) {
      conv = {
        id: `conv_${Date.now()}`,
        title: trimmed.slice(0, 42) || 'Yeni Sohbet',
        mode,
        messages: [],
        updatedAt: Date.now(),
      };
      list = [conv, ...list];
      setActiveId(conv.id);
    }

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: trimmed || 'Görseli incele',
      images: pendingImages.length > 0 ? pendingImages : undefined,
      timestamp: Date.now(),
    };

    const assistantMsgId = `a_${Date.now() + 1}`;
    const placeholderAssistant: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      text: '',
      timestamp: Date.now(),
    };

    const updatedConv: ChatConversation = {
      ...conv,
      title: conv.messages.length === 0 ? trimmed.slice(0, 42) || 'Yeni Sohbet' : conv.title,
      mode,
      messages: [...conv.messages, userMsg, placeholderAssistant],
      updatedAt: Date.now(),
    };

    list = list.map((c) => (c.id === updatedConv.id ? updatedConv : c));
    setConversations(list);
    if (!overrideText) setInput('');
    setPendingImages([]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const combinedSystem = [remoteConfig.defaultSystemPrompt, customInstruction]
      .filter(Boolean)
      .join('\n\n');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedConv.messages
            .filter((m) => m.id !== assistantMsgId && !m.isError)
            .map((m) => ({
              role: m.role,
              text: m.text,
              images: m.images,
            })),
          mode,
          systemInstruction: combinedSystem,
          thinkingLevel,
          enableSearch: effectiveCanSearch && enableSearch,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        let errText = 'Yanıt oluşturulamadı';
        try {
          const errJson = await response.json();
          errText = errJson.error || errText;
        } catch {
          // ignore parse failure
        }
        throw new Error(errText);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let fullText = '';
      let searchSources: any[] = [];
      let detectedCall: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const ev of events) {
          const line = ev
            .split('\n')
            .find((l) => l.startsWith('data:'));
          if (!line) continue;
          const payloadStr = line.slice(5).trim();
          if (!payloadStr) continue;
          const payload = JSON.parse(payloadStr);

          if (payload.error) {
            throw new Error(payload.error);
          }

          if (payload.chunk) {
            fullText += payload.chunk;
            setConversations((prev) =>
              prev.map((c) =>
                c.id === updatedConv.id
                  ? {
                      ...c,
                      messages: c.messages.map((m) =>
                        m.id === assistantMsgId ? { ...m, text: fullText } : m
                      ),
                    }
                  : c
              )
            );
          }

          if (payload.done) {
            if (payload.fullText) fullText = payload.fullText;
            if (payload.searchSources) searchSources = payload.searchSources;
            if (payload.functionCall) detectedCall = payload.functionCall;
          }
        }
      }

      let generatedImageUrl: string | undefined;

      if (detectedCall?.name === 'make_phone_call') {
        if (!effectiveCanMakeCalls) {
          fullText =
            fullText ||
            activePolicy?.reason ||
            'Telefon arama özelliği hesabınız veya rolünüz için yönetici tarafından kısıtlanmıştır.';
        } else {
          const contactName = detectedCall.args?.contact_name || 'Kişi';
          const phoneNumber = detectedCall.args?.phone_number || '';
          setCallInfo({ contactName, phoneNumber });
          if (!fullText.trim()) {
            fullText = `${contactName} için arama penceresi hazırlandı.`;
          }
        }
      } else if (detectedCall?.name === 'generate_image') {
        const currentImgCount = getDailyScopedCount(DAILY_IMAGE_COUNT_KEY, usageScopeKey);
        if (!effectiveCanGenerateImage) {
          fullText =
            fullText ||
            activePolicy?.reason ||
            'Görsel üretimi şu anda yönetici tarafından Erişim Kontrolleri üzerinden devre dışı bırakılmış.';
        } else if (
          effectiveDailyImageLimit > 0 &&
          currentImgCount >= effectiveDailyImageLimit
        ) {
          fullText = `Günlük görsel oluşturma sınırına (${effectiveDailyImageLimit}) ulaşıldı.`;
        } else {
          const imgRes = await fetch('/api/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: detectedCall.args?.prompt || trimmed,
              aspectRatio: detectedCall.args?.aspect_ratio || '1:1',
              style: detectedCall.args?.style || 'photorealistic',
            }),
          });
          const imgData = await imgRes.json();
          if (imgRes.ok && imgData.imageUrl) {
            generatedImageUrl = imgData.imageUrl;
            const nextImgCount = incrementDailyScopedCount(DAILY_IMAGE_COUNT_KEY, usageScopeKey);
            setDailyImageCount(nextImgCount);
            if (!fullText.trim()) {
              fullText = 'İstediğiniz görsel oluşturuldu.';
            }
          }
        }
      }

      setConversations((prev) => {
        const finalized = prev.map((c) =>
          c.id === updatedConv.id
            ? {
                ...c,
                updatedAt: Date.now(),
                messages: c.messages.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        text: fullText || 'Yanıt tamamlandı.',
                        generatedImageUrl,
                        searchSources,
                      }
                    : m
                ),
              }
            : c
        );
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(finalized.slice(0, 40)));
        } catch {
          // ignore
        }
        return finalized;
      });
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      const errMsg = err?.message || 'Failed to fetch';
      setConversations((prev) => {
        const errored = prev.map((c) =>
          c.id === updatedConv.id
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, text: errMsg, isError: true }
                    : m
                ),
              }
            : c
        );
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(errored.slice(0, 40)));
        } catch {
          // ignore
        }
        return errored;
      });
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  if (remoteConfig.maintenanceMode) {
    return (
      <div className="min-h-screen bg-[#212121] text-[#ececec] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-[#2a2a2a] border border-white/10 rounded-2xl p-6 space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-950/70 border border-red-800/70 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6 text-red-400" />
          </div>
          <h1 className="text-lg font-bold text-white">{remoteConfig.appName} — Bakım Modu</h1>
          <p className="text-sm text-neutral-300 leading-relaxed">
            {remoteConfig.maintenanceMessage}
          </p>
          <button
            type="button"
            onClick={() => onSwitchToKontrol?.()}
            className="inline-block text-xs font-medium text-blue-400 hover:text-blue-300 cursor-pointer"
          >
            Yönetici Kontrol Paneline Git →
          </button>
        </div>
      </div>
    );
  }

  if (authReady && !remoteConfig.publicAccessEnabled && !user) {
    return (
      <div className="min-h-screen bg-[#212121] text-[#ececec] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-[#2a2a2a] border border-white/10 rounded-2xl p-6 space-y-5 text-center">
          <img
            src="/pwa-192x192.png"
            alt={remoteConfig.appName}
            className="w-14 h-14 rounded-2xl mx-auto border border-white/10"
          />
          <div>
            <h1 className="text-lg font-bold text-white">{remoteConfig.appName}</h1>
            <p className="text-xs text-neutral-400 mt-1">
              Misafir erişimi yönetici tarafından kapatıldı. Devam etmek için Google hesabınızla giriş yapın.
            </p>
          </div>
          <button
            type="button"
            onClick={() => signInWithPopup(auth, googleProvider).catch(() => {})}
            className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold cursor-pointer"
          >
            Google ile Giriş Yap
          </button>
          <button
            type="button"
            onClick={() => onSwitchToKontrol?.()}
            className="block w-full text-xs text-neutral-400 hover:text-neutral-200 cursor-pointer"
          >
            Kontrol Merkezi
          </button>
        </div>
      </div>
    );
  }

  if (authReady && remoteConfig.requireEmailVerification && user && !user.emailVerified) {
    return (
      <div className="min-h-screen bg-[#212121] text-[#ececec] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-[#2a2a2a] border border-white/10 rounded-2xl p-6 space-y-4 text-center">
          <h1 className="text-lg font-bold text-white">E-posta Doğrulaması Gerekli</h1>
          <p className="text-xs text-neutral-300">
            Hesabınızın e-posta adresi doğrulanmadığı için erişim kısıtlandı.
          </p>
          <button
            type="button"
            onClick={() => signOut(auth)}
            className="h-10 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white cursor-pointer"
          >
            Çıkış Yap
          </button>
        </div>
      </div>
    );
  }

  if (authReady && activePolicy?.accessStatus === 'blocked') {
    return (
      <div className="min-h-screen bg-[#212121] text-[#ececec] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-[#2a2a2a] border border-red-900/60 rounded-2xl p-6 space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-950/70 border border-red-800/70 flex items-center justify-center mx-auto">
            <Ban className="w-6 h-6 text-red-400" />
          </div>
          <h1 className="text-lg font-bold text-white">Erişim Engellendi</h1>
          <p className="text-sm text-neutral-300 leading-relaxed">
            {activePolicy.reason ||
              `${remoteConfig.appName} erişiminiz yönetici tarafından (${activePolicy.displayName}) engellendi.`}
          </p>
          <div className="flex flex-col gap-2 pt-1">
            {user ? (
              <button
                type="button"
                onClick={() => signOut(auth)}
                className="h-10 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white cursor-pointer"
              >
                Farklı Hesapla Giriş Yap ({user.email})
              </button>
            ) : (
              <button
                type="button"
                onClick={() => signInWithPopup(auth, googleProvider).catch(() => {})}
                className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white cursor-pointer"
              >
                Google ile Giriş Yap
              </button>
            )}
            <button
              type="button"
              onClick={() => onSwitchToKontrol?.()}
              className="text-xs font-medium text-blue-400 hover:text-blue-300 cursor-pointer pt-1"
            >
              Kontrol Merkezi →
            </button>
          </div>
        </div>
      </div>
    );
  }

  const messages = activeConversation?.messages || [];

  return (
    <div className="min-h-screen h-screen bg-[#212121] text-[#ececec] flex overflow-hidden">
      <aside
        className={`${
          sidebarOpen ? 'fixed inset-y-0 left-0 z-40 flex' : 'hidden'
        } md:flex md:static w-[260px] bg-[#171717] border-r border-white/10 flex-col shrink-0`}
      >
        <div className="h-14 px-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/pwa-192x192.png"
              alt={remoteConfig.appName}
              className="w-7 h-7 rounded-lg"
            />
            <span className="text-sm font-bold text-white">{remoteConfig.appName}</span>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-neutral-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3">
          <button
            type="button"
            onClick={handleNewChat}
            className="w-full h-10 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Sohbet</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => {
                setActiveId(conv.id);
                setSidebarOpen(false);
              }}
              className={`group px-3 py-2.5 rounded-xl flex items-center justify-between gap-2 text-xs cursor-pointer ${
                conv.id === activeId
                  ? 'bg-[#2a2a2a] text-white font-medium'
                  : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200'
              }`}
            >
              <span className="truncate">{conv.title}</span>
              <button
                type="button"
                onClick={(e) => handleDeleteConversation(conv.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 text-neutral-400 hover:text-red-400"
                title="Sil"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-white/10 space-y-2">
          {user ? (
            <div className="px-2 py-1.5 flex items-center justify-between gap-2 text-[11px] text-neutral-400">
              <span className="truncate">{user.email}</span>
              <button
                type="button"
                onClick={() => signOut(auth)}
                className="p-1 rounded hover:bg-white/10 text-neutral-300"
                title="Çıkış"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => signInWithPopup(auth, googleProvider).catch(() => {})}
              className="w-full h-9 px-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-xs font-medium text-blue-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Google ile Giriş Yap</span>
            </button>
          )}
          <PWAInstallButton
            appName={remoteConfig.appName}
            apkUrl={remoteConfig.yengecApkUrl}
          />
          <button
            type="button"
            onClick={() => {
              setSidebarOpen(false);
              onSwitchToKontrol?.();
            }}
            className="w-full h-9 px-3 rounded-xl bg-[#242424] hover:bg-[#2f2f2f] border border-white/10 text-xs font-medium text-neutral-300 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Kontrol Merkezi</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {remoteConfig.bannerEnabled && remoteConfig.bannerText && (
          <div className="px-4 py-2 bg-blue-600/20 border-b border-blue-500/30 text-center text-xs text-blue-200">
            {remoteConfig.bannerText}
          </div>
        )}

        <header className="h-14 px-3 sm:px-4 border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 -ml-1 rounded-lg text-neutral-300 hover:bg-white/10 shrink-0"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-white truncate max-w-[78px] sm:max-w-none">
              {remoteConfig.appName}
            </span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as ChatMode)}
              className="h-8 px-2 rounded-lg bg-[#2a2a2a] border border-white/10 text-xs text-neutral-200 focus:outline-none max-w-[84px] sm:max-w-none"
            >
              {CHAT_MODES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onSwitchToKontrol?.()}
              className="h-8 px-2 sm:px-2.5 rounded-lg bg-[#2a2a2a] hover:bg-[#333333] border border-white/10 text-xs font-medium text-neutral-200 inline-flex items-center gap-1.5 cursor-pointer"
              title="YenGeç Kontrol Merkezi"
            >
              <span>Kontrol</span>
            </button>
            <PWAInstallButton
              appName={remoteConfig.appName}
              apkUrl={remoteConfig.yengecApkUrl}
              compact
            />
            {remoteConfig.allowQuickStudio && (
              <button
                type="button"
                onClick={() => setQuickStudioOpen(true)}
                className="h-8 px-3 rounded-lg bg-[#2a2a2a] hover:bg-[#333333] border border-white/10 text-xs font-medium text-neutral-200 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Hızlı Stüdyo</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="h-8 px-2.5 rounded-lg bg-[#2a2a2a] hover:bg-[#333333] border border-white/10 text-xs text-neutral-200 cursor-pointer"
              title="Tercihler"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-5">
              <img
                src="/pwa-192x192.png"
                alt={remoteConfig.appName}
                className="w-16 h-16 rounded-2xl border border-white/10"
              />
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {remoteConfig.appName} ile ne yapmak istersin?
                </h2>
                <p className="text-xs text-neutral-400 mt-1.5">
                  Hızlı yanıtlar, kod geliştirme, web araması, görsel üretimi ve Türkçe sesli destek.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left">
                {[
                  'Bugünün önemli teknoloji haberlerini özetle',
                  'Modern bir HTML hesap makinesi sayfası tasarla',
                  'Hızlı ve sağlıklı 15 dakikalık akşam yemeği öner',
                  'React useEffect ve useMemo farkını kısaca anlat',
                ].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => sendMessage(prompt)}
                    className="p-3.5 rounded-xl bg-[#2a2a2a] hover:bg-[#323232] border border-white/10 text-xs text-neutral-200 transition-colors cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-5">
              {messages.map((msg) =>
                msg.role === 'user' ? (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-[#2f2f2f] text-sm text-[#ececec] space-y-2">
                      {msg.images && msg.images.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {msg.images.map((img, i) => (
                            <img
                              key={i}
                              src={`data:${img.mimeType};base64,${img.data}`}
                              alt={img.name || 'Görsel'}
                              className="max-h-40 rounded-lg border border-white/10"
                            />
                          ))}
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                ) : (
                  <div key={msg.id} className="flex items-start gap-3">
                    <img
                      src="/pwa-192x192.png"
                      alt="YenGeç"
                      className="w-7 h-7 rounded-full border border-white/10 mt-0.5 shrink-0"
                    />
                    <div className="flex-1 min-w-0 space-y-2">
                      {msg.isError ? (
                        <div className="p-4 rounded-2xl bg-red-950/50 border border-red-800/70 space-y-2.5">
                          <div className="flex items-center gap-2 text-sm font-semibold text-red-200">
                            <AlertCircle className="w-4 h-4 text-red-400" />
                            <span>Yanıt Oluşturulamadı</span>
                          </div>
                          <p className="text-xs text-red-300">{msg.text}</p>
                          <button
                            type="button"
                            onClick={() => {
                              const prevUser = [...messages]
                                .reverse()
                                .find((m) => m.role === 'user');
                              if (prevUser) sendMessage(prevUser.text);
                            }}
                            className="h-8 px-3 rounded-lg bg-red-900/60 hover:bg-red-800/70 text-xs font-medium text-white inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Tekrar Dene</span>
                          </button>
                        </div>
                      ) : (
                        <>
                          {msg.text ? (
                            <ChatMarkdown
                              content={msg.text}
                              allowHtmlPreview={remoteConfig.allowHtmlPreview}
                              onPreviewHtml={setPreviewHtml}
                            />
                          ) : (
                            <span className="text-xs text-neutral-400">Yanıt yazılıyor...</span>
                          )}

                          {msg.generatedImageUrl && (
                            <div className="mt-2 space-y-1.5">
                              <img
                                src={msg.generatedImageUrl}
                                alt="Üretilen görsel"
                                className="max-w-sm rounded-xl border border-white/10"
                              />
                              <div>
                                <a
                                  href={msg.generatedImageUrl}
                                  download={`yengec-gorsel-${msg.id}.png`}
                                  className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-neutral-300"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Görseli İndir</span>
                                </a>
                              </div>
                            </div>
                          )}

                          {msg.searchSources && msg.searchSources.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {msg.searchSources
                                .filter((s) => s.web?.uri)
                                .slice(0, 4)
                                .map((s, idx) => (
                                  <a
                                    key={idx}
                                    href={s.web!.uri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1 rounded-lg bg-[#2a2a2a] hover:bg-[#333] border border-white/10 text-[11px] text-blue-300 truncate max-w-[200px]"
                                  >
                                    {s.web!.title || s.web!.uri}
                                  </a>
                                ))}
                            </div>
                          )}

                          {msg.text && !isStreaming && effectiveCanUseVoice && (
                            <div className="pt-1">
                              <button
                                type="button"
                                onClick={() => handlePlayTts(msg)}
                                className="h-7 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-neutral-300 inline-flex items-center gap-1.5 cursor-pointer"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                                <span>{playingMsgId === msg.id ? 'Durdur' : 'Sesli Dinle'}</span>
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        <footer className="px-4 pb-4 pt-2 shrink-0">
          <div className="max-w-3xl mx-auto space-y-2">
            {activePolicy?.accessStatus === 'restricted' && (
              <div className="px-3 py-2 rounded-xl bg-amber-950/50 border border-amber-700/60 text-xs text-amber-200 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Hesabınızda yönetici kısıtlaması aktif
                  {activePolicy.reason ? `: ${activePolicy.reason}` : '.'}
                </span>
              </div>
            )}

            {uploadError && (
              <div className="px-3 py-2 rounded-xl bg-red-950/60 border border-red-800/70 text-xs text-red-200 flex items-center justify-between">
                <span>{uploadError}</span>
                <button type="button" onClick={() => setUploadError(null)}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {pendingImages.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {pendingImages.map((img, i) => (
                  <div key={i} className="relative">
                    <img
                      src={`data:${img.mimeType};base64,${img.data}`}
                      alt={img.name || 'Ek'}
                      className="w-14 h-14 object-cover rounded-xl border border-white/15"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setPendingImages((prev) => prev.filter((_, idx) => idx !== i))
                      }
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/80 text-white flex items-center justify-center cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-[#2f2f2f] border border-white/10 rounded-3xl px-4 py-3 space-y-2">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={
                  imageMode
                    ? 'Oluşturmak istediğiniz görseli tarif edin...'
                    : `${remoteConfig.appName}'e dilediğin konuyu sor veya danış...`
                }
                className="w-full bg-transparent text-sm text-white placeholder-neutral-400 focus:outline-none resize-none max-h-36"
              />

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-8 h-8 rounded-full hover:bg-white/10 text-neutral-300 flex items-center justify-center cursor-pointer"
                    title="Görsel ekle"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  {effectiveCanGenerateImage && (
                    <button
                      type="button"
                      onClick={() => setImageMode((v) => !v)}
                      className={`h-8 px-3 rounded-full text-xs font-medium inline-flex items-center gap-1.5 border cursor-pointer ${
                        imageMode
                          ? 'bg-purple-600/25 border-purple-400/50 text-purple-200'
                          : 'bg-transparent border-white/10 text-neutral-300 hover:bg-white/10'
                      }`}
                      title="Doğrudan görsel üret"
                    >
                      <ImagePlus className="w-3.5 h-3.5" />
                      <span>Görsel</span>
                    </button>
                  )}

                  {effectiveCanSearch && (
                    <button
                      type="button"
                      onClick={() => setEnableSearch((v) => !v)}
                      className={`h-8 px-3 rounded-full text-xs font-medium inline-flex items-center gap-1.5 border cursor-pointer ${
                        enableSearch
                          ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                          : 'bg-transparent border-white/10 text-neutral-300 hover:bg-white/10'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Arama</span>
                    </button>
                  )}

                  {effectiveCanMakeCalls && (
                    <button
                      type="button"
                      onClick={() => setCallInfo({ contactName: 'Hızlı Arama', phoneNumber: '' })}
                      className="w-8 h-8 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center cursor-pointer"
                      title="Telefon Araması"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {effectiveCanUseVoice && (
                    <button
                      type="button"
                      onClick={() => setLiveVoiceOpen(true)}
                      className="w-8 h-8 rounded-full hover:bg-white/10 text-neutral-300 flex items-center justify-center cursor-pointer"
                      title="Canlı Sesli Asistan"
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {isStreaming ? (
                  <button
                    type="button"
                    onClick={() => abortControllerRef.current?.abort()}
                    className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center cursor-pointer"
                    title="Durdur"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => sendMessage()}
                    disabled={!input.trim() && pendingImages.length === 0}
                    className="w-8 h-8 rounded-full bg-white disabled:bg-white/20 text-black disabled:text-neutral-500 flex items-center justify-center cursor-pointer"
                    title={imageMode ? 'Görsel Oluştur' : 'Gönder'}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-neutral-500 tabular-nums">
              <span>{remoteConfig.appName} hata yapabilir. Önemli bilgileri kontrol edin.</span>
              {effectiveCanGenerateImage && (
                <span className="text-neutral-400">
                  Görsel hakkı:{' '}
                  {effectiveDailyImageLimit === 0
                    ? 'Sınırsız'
                    : `${Math.max(0, effectiveDailyImageLimit - dailyImageCount)}/${effectiveDailyImageLimit}`}
                </span>
              )}
              {effectiveDailyMessageLimit > 0 && (
                <span className="text-neutral-400">
                  Mesaj hakkı: {Math.max(0, effectiveDailyMessageLimit - dailyMessageCount)}/{effectiveDailyMessageLimit}
                </span>
              )}
            </div>
          </div>
        </footer>
      </div>

      <QuickStudioModal
        open={quickStudioOpen}
        onClose={() => setQuickStudioOpen(false)}
        onInsertResult={(prompt, result) => {
          const convId = activeId || `conv_${Date.now()}`;
          const existing = conversations.find((c) => c.id === convId);
          const nextMsgs: ChatMessage[] = [
            ...(existing?.messages || []),
            { id: `u_${Date.now()}`, role: 'user', text: prompt, timestamp: Date.now() },
            { id: `a_${Date.now() + 1}`, role: 'assistant', text: result, timestamp: Date.now() },
          ];
          const updated: ChatConversation = existing
            ? { ...existing, messages: nextMsgs, updatedAt: Date.now() }
            : {
                id: convId,
                title: prompt.slice(0, 42) || 'Hızlı Stüdyo',
                mode,
                messages: nextMsgs,
                updatedAt: Date.now(),
              };
          const nextList = existing
            ? conversations.map((c) => (c.id === convId ? updated : c))
            : [updated, ...conversations];
          persistConversations(nextList);
          setActiveId(convId);
        }}
      />

      <LiveVoiceModal
        open={liveVoiceOpen}
        voiceName={remoteConfig.defaultVoice}
        systemInstruction={remoteConfig.defaultSystemPrompt}
        onClose={() => setLiveVoiceOpen(false)}
        onExchange={(userText, assistantText) => {
          const convId = activeId || `conv_${Date.now()}`;
          const existing = conversations.find((c) => c.id === convId);
          const nextMsgs: ChatMessage[] = [
            ...(existing?.messages || []),
            { id: `u_${Date.now()}`, role: 'user', text: userText, timestamp: Date.now() },
            {
              id: `a_${Date.now() + 1}`,
              role: 'assistant',
              text: assistantText,
              timestamp: Date.now(),
            },
          ];
          const updated: ChatConversation = existing
            ? { ...existing, messages: nextMsgs, updatedAt: Date.now() }
            : {
                id: convId,
                title: userText.slice(0, 42) || 'Sesli Sohbet',
                mode,
                messages: nextMsgs,
                updatedAt: Date.now(),
              };
          const nextList = existing
            ? conversations.map((c) => (c.id === convId ? updated : c))
            : [updated, ...conversations];
          persistConversations(nextList);
          setActiveId(convId);
        }}
      />

      <HtmlPreviewModal html={previewHtml} onClose={() => setPreviewHtml(null)} />
      <CallModal callInfo={callInfo} onClose={() => setCallInfo(null)} />
      <SettingsModal
        open={settingsOpen}
        mode={mode}
        thinkingLevel={thinkingLevel}
        customInstruction={customInstruction}
        onChangeMode={setMode}
        onChangeThinkingLevel={setThinkingLevel}
        onChangeCustomInstruction={setCustomInstruction}
        onClearChats={() => {
          persistConversations([]);
          setActiveId(null);
        }}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
};
