import { useEffect, useState, type FormEvent } from 'react';
import { Bot, MessageCircle, Send, User, X } from 'lucide-react';
import type { ChatMessage } from '@shared/types';

interface AdvisorChatProps {
  city: string;
  messages: ChatMessage[];
  onSendMessage: (question: string) => Promise<void>;
  isSending: boolean;
}

const STARTER_PROMPTS = [
  'When is it safest to open windows today?',
  'How do I build a DIY Corsi-Rosenthal box?',
  'What masks & school routines protect kids best?',
  'Impact if 50 homes stop evening leaf burning?',
];

function renderInlineBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

function SafeMessageBody({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <div className="space-y-1.5 text-xs leading-relaxed text-slate-700">
      {lines.map((rawLine, i) => {
        const line = rawLine.trim();
        if (!line) return <div key={i} className="h-1" />;
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="text-teal-700">•</span>
              <span>{renderInlineBold(line.slice(2))}</span>
            </div>
          );
        }
        return <p key={i}>{renderInlineBold(line)}</p>;
      })}
    </div>
  );
}

export function AdvisorChat({
  city,
  messages,
  onSendMessage,
  isSending,
}: AdvisorChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  const submitQuestion = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    setDraft('');
    await onSendMessage(trimmed);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await submitQuestion(draft);
  };

  return (
    <>
      {/* Floating Hovering Coach Panel */}
      {isOpen && (
        <section
          role="dialog"
          aria-modal="false"
          aria-labelledby="advisor-chat-heading"
          className="fixed bottom-20 right-4 sm:right-6 z-40 w-[calc(100vw-2rem)] sm:w-[400px] rounded-2xl border border-slate-200 bg-white shadow-xl flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 border border-teal-200 text-teal-700">
                <Bot className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <h2 id="advisor-chat-heading" className="text-sm font-semibold text-slate-900">
                  Ask AirKin Coach ({city})
                </h2>
                <p className="text-[11px] text-slate-500">Live Gemini atmospheric guidance</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close AirKin Coach"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 transition cursor-pointer"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="p-3.5 space-y-3">
            {/* Quick prompts */}
            <div className="flex flex-wrap gap-1.5">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={isSending}
                  onClick={() => submitQuestion(prompt)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-700 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-900 transition cursor-pointer disabled:opacity-50 text-left"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Chat history */}
            <div
              className="max-h-72 min-h-[160px] overflow-y-auto space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3"
              aria-live="polite"
            >
              {messages.length === 0 ? (
                <p className="text-xs text-slate-500">
                  Ask about safe airing windows in {city}, DIY MERV-13 purifiers, kids’ masks, or neighborhood no-burn pledges.
                </p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 rounded-xl p-2.5 ${
                      msg.role === 'user'
                        ? 'bg-teal-50 border border-teal-200 ml-6'
                        : 'bg-white border border-slate-200 mr-2'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {msg.role === 'user' ? (
                        <User className="h-4 w-4 text-teal-700" aria-hidden="true" />
                      ) : (
                        <Bot className="h-4 w-4 text-sky-700" aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <SafeMessageBody content={msg.content} />
                      {msg.mode && <div className="text-[10px] text-slate-400">Gemini Flash</div>}
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2">
              <label htmlFor="chat-question-input" className="sr-only">
                Ask AirKin a question
              </label>
              <input
                id="chat-question-input"
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask about routines, masks, indoor air..."
                maxLength={600}
                className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={isSending || !draft.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50 transition cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{isSending ? 'Thinking' : 'Ask'}</span>
              </button>
            </form>
          </div>
        </section>
      )}

      {/* Floating Hovering Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Close Ask AirKin Coach' : 'Open Ask AirKin Coach'}
        className="fixed bottom-5 right-4 sm:right-6 z-40 inline-flex items-center gap-2 rounded-full border border-teal-800/15 bg-teal-700 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-teal-800 hover:-translate-y-0.5 transition cursor-pointer"
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        <span>Ask AirKin Coach</span>
        {messages.length > 0 && (
          <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">
            {messages.length}
          </span>
        )}
      </button>
    </>
  );
}
