import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Phone, Sparkles, Volume2, X } from 'lucide-react';
import type { ThinkingLevel, VoiceName } from '../types';
import type { ChatMode } from './chatTypes';
import { CHAT_MODES } from './chatTypes';

interface QuickStudioModalProps {
  open: boolean;
  onClose: () => void;
  onInsertResult: (prompt: string, result: string) => void;
}

export const QuickStudioModal: React.FC<QuickStudioModalProps> = ({
  open,
  onClose,
  onInsertResult,
}) => {
  const [action, setAction] = useState('summarize');
  const [input, setInput] = useState('');
  const [targetLang, setTargetLang] = useState('İngilizce');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/tools/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          input: input.trim(),
          options: { targetLang },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'İşlem başarısız');
      onInsertResult(input.trim(), data.result || '');
      setInput('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Hızlı araç çalıştırılamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      <div className="w-full max-w-lg bg-[#262626] border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold text-white">Hızlı Stüdyo</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleRun} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Araç</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[#1a1a1a] border border-white/10 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="summarize">Metin Özetle</option>
              <option value="code-fix">Kod İncele & Hata Düzelt</option>
              <option value="prompt-optimizer">Prompt Geliştir</option>
              <option value="translate">Profesyonel Çeviri</option>
              <option value="mindmap">Zihin Haritası / Plan</option>
              <option value="creative-expand">Fikir Genişletme</option>
            </select>
          </div>

          {action === 'translate' && (
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Hedef Dil
              </label>
              <input
                type="text"
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[#1a1a1a] border border-white/10 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Metin veya Kod
            </label>
            <textarea
              rows={5}
              required
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="İşlenecek içeriği buraya yapıştırın..."
              className="w-full p-3 rounded-xl bg-[#1a1a1a] border border-white/10 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-neutral-200 cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-semibold text-white cursor-pointer"
            >
              {loading ? 'Çalıştırılıyor...' : 'Çalıştır ve Sohbete Aktar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface HtmlPreviewModalProps {
  html: string | null;
  onClose: () => void;
}

export const HtmlPreviewModal: React.FC<HtmlPreviewModalProps> = ({ html, onClose }) => {
  if (!html) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="w-full max-w-5xl h-[85vh] bg-[#1e1e1e] border border-white/15 rounded-2xl overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-200">HTML Canlı Önizleme</span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <iframe
          title="HTML Önizleme"
          sandbox="allow-scripts"
          srcDoc={html}
          className="flex-1 w-full bg-white"
        />
      </div>
    </div>
  );
};

interface CallModalProps {
  callInfo: { contactName: string; phoneNumber?: string } | null;
  onClose: () => void;
}

export const CallModal: React.FC<CallModalProps> = ({ callInfo, onClose }) => {
  if (!callInfo) return null;
  const cleanNumber = (callInfo.phoneNumber || '').replace(/[^\d+]/g, '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      <div className="w-full max-w-sm bg-[#262626] border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center">
            <Phone className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Telefon Araması</h3>
            <p className="text-xs text-neutral-400">
              {callInfo.contactName}
              {cleanNumber ? ` · ${cleanNumber}` : ''}
            </p>
          </div>
        </div>

        {cleanNumber ? (
          <a
            href={`tel:${cleanNumber}`}
            onClick={onClose}
            className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2"
          >
            <Phone className="w-4 h-4" />
            <span>Cihazdan Ara ({cleanNumber})</span>
          </a>
        ) : (
          <p className="text-xs text-neutral-300 leading-relaxed">
            Telefon numarası belirtilmedi. Numarayı sohbete yazarak doğrudan arama bağlantısı oluşturabilirsiniz.
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full h-9 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-neutral-200 cursor-pointer"
        >
          Kapat
        </button>
      </div>
    </div>
  );
};

interface LiveVoiceModalProps {
  open: boolean;
  voiceName: VoiceName;
  systemInstruction: string;
  onClose: () => void;
  onExchange: (userText: string, assistantText: string) => void;
}

export const LiveVoiceModal: React.FC<LiveVoiceModalProps> = ({
  open,
  voiceName,
  systemInstruction,
  onClose,
  onExchange,
}) => {
  const [listening, setListening] = useState(false);
  const [statusText, setStatusText] = useState('Konuşmak için mikrofona dokunun');
  const [transcript, setTranscript] = useState('');
  const [reply, setReply] = useState('');
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!open) {
      recognitionRef.current?.stop?.();
      audioRef.current?.pause?.();
      setListening(false);
    }
  }, [open]);

  if (!open) return null;

  const startListening = () => {
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setStatusText('Tarayıcınız ses tanımayı desteklemiyor.');
      return;
    }

    const rec = new SpeechRec();
    rec.lang = 'tr-TR';
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setListening(true);
      setStatusText('Dinleniyor...');
    };

    rec.onresult = async (event: any) => {
      const spoken = event.results?.[0]?.[0]?.transcript || '';
      setListening(false);
      if (!spoken.trim()) return;
      setTranscript(spoken);
      setStatusText('YenGeç yanıt hazırlıyor...');

      try {
        const chatRes = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', text: spoken }],
            mode: 'general',
            systemInstruction,
            thinkingLevel: 'LOW',
            stream: false,
          }),
        });
        const chatData = await chatRes.json();
        if (!chatRes.ok) throw new Error(chatData.error || 'Yanıt alınamadı');
        const answer = chatData.text || 'Yanıt hazır.';
        setReply(answer);
        onExchange(spoken, answer);
        setStatusText('Seslendiriliyor...');

        const ttsRes = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: answer, voiceName }),
        });
        if (ttsRes.ok) {
          const ttsData = await ttsRes.json();
          if (ttsData.audio) {
            const audio = new Audio(`data:${ttsData.mimeType || 'audio/wav'};base64,${ttsData.audio}`);
            audioRef.current = audio;
            audio.onended = () => setStatusText('Tekrar konuşmak için dokunun');
            await audio.play().catch(() => {});
          }
        }
        setStatusText('Hazır');
      } catch (err: any) {
        setStatusText(err.message || 'Sesli yanıt alınamadı');
      }
    };

    rec.onerror = () => {
      setListening(false);
      setStatusText('Ses algılanamadı, tekrar deneyin.');
    };

    rec.onend = () => {
      setListening(false);
    };

    recognitionRef.current = rec;
    rec.start();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="w-full max-w-md bg-[#262626] border border-white/10 rounded-2xl p-6 space-y-5 text-center">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-300 inline-flex items-center gap-1.5">
            <Volume2 className="w-4 h-4 text-blue-400" />
            Canlı Sesli Asistan ({voiceName})
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={listening ? () => recognitionRef.current?.stop?.() : startListening}
          className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center transition-colors cursor-pointer ${
            listening
              ? 'bg-red-600 hover:bg-red-500 text-white'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          {listening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
        </button>

        <div className="text-xs font-medium text-neutral-300">{statusText}</div>

        {transcript && (
          <div className="p-3 rounded-xl bg-[#1a1a1a] text-left text-xs text-neutral-300">
            <span className="text-neutral-500 block mb-1">Siz:</span>
            {transcript}
          </div>
        )}

        {reply && (
          <div className="p-3 rounded-xl bg-[#1a1a1a] text-left text-xs text-neutral-200 max-h-40 overflow-y-auto">
            <span className="text-neutral-500 block mb-1">YenGeç:</span>
            {reply}
          </div>
        )}
      </div>
    </div>
  );
};

interface SettingsModalProps {
  open: boolean;
  mode: ChatMode;
  thinkingLevel: ThinkingLevel;
  customInstruction: string;
  onChangeMode: (mode: ChatMode) => void;
  onChangeThinkingLevel: (level: ThinkingLevel) => void;
  onChangeCustomInstruction: (val: string) => void;
  onClearChats: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  mode,
  thinkingLevel,
  customInstruction,
  onChangeMode,
  onChangeThinkingLevel,
  onChangeCustomInstruction,
  onClearChats,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      <div className="w-full max-w-md bg-[#262626] border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Sohbet Tercihleri</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Asistan Modu
            </label>
            <select
              value={mode}
              onChange={(e) => onChangeMode(e.target.value as ChatMode)}
              className="w-full h-10 px-3 rounded-xl bg-[#1a1a1a] border border-white/10 text-sm text-white"
            >
              {CHAT_MODES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} — {m.description}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Akıl Yürütme Seviyesi
            </label>
            <select
              value={thinkingLevel}
              onChange={(e) => onChangeThinkingLevel(e.target.value as ThinkingLevel)}
              className="w-full h-10 px-3 rounded-xl bg-[#1a1a1a] border border-white/10 text-sm text-white"
            >
              <option value="LOW">LOW — Hızlı Yanıt</option>
              <option value="HIGH">HIGH — Derin Düşünme</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Ek Kişisel Yönerge
            </label>
            <textarea
              rows={3}
              value={customInstruction}
              onChange={(e) => onChangeCustomInstruction(e.target.value)}
              placeholder="YenGeç'in size nasıl hitap etmesini veya yanıt vermesini istediğinizi yazın..."
              className="w-full p-3 rounded-xl bg-[#1a1a1a] border border-white/10 text-xs text-white"
            />
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                onClearChats();
                onClose();
              }}
              className="h-9 px-3 rounded-xl bg-red-950/60 hover:bg-red-900/60 border border-red-800/60 text-xs font-medium text-red-200 cursor-pointer"
            >
              Sohbet Geçmişini Temizle
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white cursor-pointer"
            >
              Tamam
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
