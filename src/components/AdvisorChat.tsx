import { useEffect, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Chat, CloseSquare, Discovery, Send, User } from 'react-iconly';
import type { ChatMessage } from '@shared/types';

interface AdvisorChatProps {
  city: string;
  messages: ChatMessage[];
  onSendMessage: (question: string) => Promise<void>;
  isSending: boolean;
}

const STARTER_PROMPTS = [
  'Safe window hours today?',
  'DIY Corsi-Rosenthal steps?',
  'Best masks for kids?',
  '50-home no-burn impact?',
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
    <div className="space-y-1 text-xs leading-relaxed text-slate-700">
      {lines.map((rawLine, i) => {
        const line = rawLine.trim();
        if (!line) return <div key={i} className="h-0.5" />;
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={i} className="flex gap-1.5 pl-0.5">
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
      <AnimatePresence>
        {isOpen && (
          <motion.section
            role="dialog"
            aria-modal="false"
            aria-labelledby="advisor-chat-heading"
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            className="fixed bottom-20 right-4 sm:right-6 z-40 w-[calc(100vw-2rem)] sm:w-[390px] rounded-2xl border border-slate-200 bg-white shadow-xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 border border-teal-200 text-teal-700">
                  <Discovery set="two-tone" size="small" />
                </span>
                <div>
                  <h2 id="advisor-chat-heading" className="text-xs font-bold text-slate-900">
                    Ask AirKin Coach ({city})
                  </h2>
                  <p className="text-[10px] text-slate-500">Gemini Flash</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close AirKin Coach"
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 transition cursor-pointer"
              >
                <CloseSquare set="light" size="small" />
              </button>
            </div>

            <div className="p-3 space-y-2.5">
              <div className="flex flex-wrap gap-1.5">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    disabled={isSending}
                    onClick={() => submitQuestion(prompt)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-900 transition cursor-pointer disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <div
                className="max-h-68 min-h-[150px] overflow-y-auto space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-2.5"
                aria-live="polite"
              >
                {messages.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Tap a prompt above or ask about {city} smog routines, masks, or purifiers.
                  </p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-2 rounded-xl p-2.5 ${
                        msg.role === 'user'
                          ? 'bg-teal-50 border border-teal-200 ml-5'
                          : 'bg-white border border-slate-200 mr-2'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {msg.role === 'user' ? (
                          <User set="two-tone" size={15} primaryColor="#0f766e" />
                        ) : (
                          <Discovery set="two-tone" size={15} primaryColor="#0369a1" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <SafeMessageBody content={msg.content} />
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSubmit} className="flex gap-1.5">
                <label htmlFor="chat-question-input" className="sr-only">
                  Ask AirKin a question
                </label>
                <input
                  id="chat-question-input"
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Ask AirKin Coach..."
                  maxLength={600}
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  disabled={isSending || !draft.trim()}
                  className="inline-flex items-center gap-1 rounded-xl bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50 transition cursor-pointer"
                >
                  <Send set="bold" size={14} primaryColor="#ffffff" />
                  <span>{isSending ? '...' : 'Ask'}</span>
                </button>
              </form>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Hovering Floating Coach Button */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.04, y: -2 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Close Ask AirKin Coach' : 'Open Ask AirKin Coach'}
        className="fixed bottom-5 right-4 sm:right-6 z-40 inline-flex items-center gap-2 rounded-full border border-teal-800/15 bg-teal-700 px-4 py-3 text-xs sm:text-sm font-semibold text-white shadow-lg hover:bg-teal-800 transition cursor-pointer"
      >
        <Chat set="bulk" size="small" primaryColor="#ffffff" />
        <span>Ask AirKin Coach</span>
        {messages.length > 0 && (
          <span className="rounded-full bg-white/25 px-1.5 py-0.5 text-[10px] font-bold">
            {messages.length}
          </span>
        )}
      </motion.button>
    </>
  );
}
