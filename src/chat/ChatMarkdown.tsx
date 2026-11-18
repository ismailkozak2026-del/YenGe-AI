import React, { useState } from 'react';
import { Check, Copy, Eye } from 'lucide-react';

interface ChatMarkdownProps {
  content: string;
  allowHtmlPreview: boolean;
  onPreviewHtml: (html: string) => void;
}

export const ChatMarkdown: React.FC<ChatMarkdownProps> = ({
  content,
  allowHtmlPreview,
  onPreviewHtml,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const segments = content.split(/(```[\s\S]*?```)/g);

  const handleCopy = async (code: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="space-y-2.5 text-[15px] leading-relaxed text-[#ececec] break-words">
      {segments.map((segment, idx) => {
        if (segment.startsWith('```') && segment.endsWith('```')) {
          const inner = segment.slice(3, -3);
          const firstNewline = inner.indexOf('\n');
          const lang = firstNewline !== -1 ? inner.slice(0, firstNewline).trim() : '';
          const code = firstNewline !== -1 ? inner.slice(firstNewline + 1) : inner;
          const isHtml =
            lang.toLowerCase() === 'html' ||
            code.trim().toLowerCase().startsWith('<!doctype html') ||
            code.trim().toLowerCase().startsWith('<html');

          return (
            <div
              key={idx}
              className="rounded-xl overflow-hidden border border-white/10 bg-[#141414] my-2"
            >
              <div className="px-3.5 py-2 bg-[#1c1c1c] border-b border-white/10 flex items-center justify-between text-xs text-neutral-400">
                <span className="font-mono uppercase">{lang || 'kod'}</span>
                <div className="flex items-center gap-2">
                  {isHtml && allowHtmlPreview && (
                    <button
                      type="button"
                      onClick={() => onPreviewHtml(code)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Önizle</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleCopy(code, idx)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-neutral-300 cursor-pointer"
                  >
                    {copiedIndex === idx ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Kopyalandı</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Kopyala</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              <pre className="p-3.5 overflow-x-auto text-xs font-mono text-neutral-200 leading-relaxed">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        const lines = segment.split('\n');
        return (
          <div key={idx} className="space-y-1.5">
            {lines.map((line, lIdx) => {
              if (!line.trim()) return <div key={lIdx} className="h-1" />;
              if (line.trim() === '---') {
                return <hr key={lIdx} className="border-white/10 my-2" />;
              }
              const formatted = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, pIdx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return (
                    <strong key={pIdx} className="font-semibold text-white">
                      {part.slice(2, -2)}
                    </strong>
                  );
                }
                if (part.startsWith('`') && part.endsWith('`')) {
                  return (
                    <code
                      key={pIdx}
                      className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[13px] text-neutral-100"
                    >
                      {part.slice(1, -1)}
                    </code>
                  );
                }
                return <React.Fragment key={pIdx}>{part}</React.Fragment>;
              });

              return (
                <p key={lIdx} className="whitespace-pre-wrap">
                  {formatted}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
