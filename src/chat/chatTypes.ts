export type ChatMode = 'general' | 'code' | 'creative' | 'analyst' | 'academic' | 'vision';

export interface ChatImageAttachment {
  data: string;
  mimeType: string;
  name?: string;
}

export interface SearchSource {
  web?: {
    uri?: string;
    title?: string;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  images?: ChatImageAttachment[];
  generatedImageUrl?: string;
  searchSources?: SearchSource[];
  timestamp: number;
  isError?: boolean;
}

export interface ChatConversation {
  id: string;
  title: string;
  mode: ChatMode;
  messages: ChatMessage[];
  updatedAt: number;
}

export const CHAT_MODES: { id: ChatMode; label: string; description: string }[] = [
  { id: 'general', label: 'Genel', description: 'Hızlı, net ve çok yönlü asistan' },
  { id: 'code', label: 'Kod Mimarı', description: 'Temiz ve güvenli yazılım geliştirme' },
  { id: 'creative', label: 'Yaratıcı Stüdyo', description: 'Etkileyici metin ve içerik' },
  { id: 'analyst', label: 'Veri & Strateji', description: 'Sayısal analiz ve eylem planı' },
  { id: 'academic', label: 'Akademi', description: 'Feynman tekniğiyle sade anlatım' },
  { id: 'vision', label: 'Görsel Analiz', description: 'Görsel ve tasarım inceleme' },
];
