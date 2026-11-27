import { useState, type FormEvent } from 'react';
import { Bot, Send, User } from 'lucide-react';
import type { ChatMessage } from '@shared/types';

interface AdvisorChatProps {
  city: string;
  messages: ChatMessage[];
  onSendMessage: (question: string) => Promise<void>;
  isSending: boolean;
}

const STARTER_PROMPTS = [
  'When is it safest to open windows today?',
  'How do I build a $40 DIY Corsi-Rosenthal box?',
  'What masks & school routines protect kids best?',
  'What happens if 50 homes on our block stop leaf burning?',
];

function renderInlineBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold text-white">
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
    <div className="space-y-1.5 text-xs leading-relaxed text-slate-200">
      {lines.map((rawLine, i) => {
        const line = rawLine.trim();
        if (!line) return <div key={i} className="h-1" />;
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="text-emerald-400">•</span>
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
  const [draft, setDraft] = useState('');

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
    <section
      aria-labelledby="advisor-chat-heading"
      className="rounded-2xl border border-slate-800 bg-slate-900/75 p-4 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          <h2 id="advisor-chat-heading" className="text-sm font-semibold text-slate-100">
            Ask AirKin Coach ({city})
          </h2>
        </div>
        <span className="text-[11px] text-slate-400">Context-aware guidance</span>
      </div>

      {/* Quick prompts */}
      <div className="flex flex-wrap gap-1.5">
        {STARTER_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={isSending}
            onClick={() => submitQuestion(prompt)}
            className="rounded-lg border border-slate-700/80 bg-slate-950/70 px-2.5 py-1 text-[11px] text-slate-300 hover:border-emerald-500/50 hover:text-emerald-200 transition cursor-pointer disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat history */}
      <div
        className="max-h-80 min-h-[180px] overflow-y-auto space-y-2.5 rounded-xl border border-slate-800 bg-slate-950/80 p-3"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <p className="text-xs text-slate-400">
            Ask anything about timing ventilation, low-cost HEPA/Corsi-Rosenthal builds, winter cooking/heating swaps, kids’ masks, or neighborhood clean-air pledges.
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 rounded-xl p-2.5 ${
                msg.role === 'user'
                  ? 'bg-slate-800/80 ml-6'
                  : 'bg-slate-900/90 border border-slate-800 mr-2'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {msg.role === 'user' ? (
                  <User className="h-4 w-4 text-sky-400" aria-hidden="true" />
                ) : (
                  <Bot className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <SafeMessageBody content={msg.content} />
                {msg.mode && (
                  <div className="text-[10px] text-slate-500">Gemini 2.5 Flash</div>
                )}
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
          placeholder="Ask about indoor hacks, routines, masks, or community impact..."
          maxLength={600}
          className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
        />
        <button
          type="submit"
          disabled={isSending || !draft.trim()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50 transition cursor-pointer"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          <span>{isSending ? 'Thinking' : 'Ask'}</span>
        </button>
      </form>
    </section>
  );
}
