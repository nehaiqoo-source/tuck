import { useState } from 'react';
import { Search, ShieldCheck, Sparkles } from 'lucide-react';
import type { AskShelfResult, TuckItem } from '../types';
import { InferenceBadge } from './InferenceBadge';

interface AskShelfBarProps {
  items: TuckItem[];
  busy: boolean;
  result: AskShelfResult | null;
  onAsk: (question: string) => Promise<void>;
}

const SAMPLE_QUESTIONS = [
  'Which Kyoto ramen place is cash only?',
  'When is my dentist reimbursement deadline?',
  'What flour ratio is in my focaccia note?',
];

export function AskShelfBar({
  items,
  busy,
  result,
  onAsk,
}: AskShelfBarProps) {
  const [question, setQuestion] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    await onAsk(q);
  };

  const citedItems = result
    ? items.filter((i) => result.citedItemIds.includes(i.id))
    : [];

  return (
    <section className="ask-card" aria-labelledby="ask-shelf-heading">
      <div className="ask-head">
        <div>
          <h2 id="ask-shelf-heading" className="section-title" style={{ fontSize: '1.45rem' }}>
            Ask your shelf
          </h2>
          <p className="section-meta" style={{ margin: '2px 0 0' }}>
            Ask a natural question across all your saved tabs and screenshots.
            Private details are masked locally before any cloud call.
          </p>
        </div>
      </div>

      <form className="ask-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="search-input"
          placeholder="Ask anything about your saved tabs, receipts, or notes..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={busy}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={busy || !question.trim()}
        >
          <Search size={15} />
          {busy ? 'Thinking...' : 'Ask Tuck'}
        </button>
      </form>

      <div className="filter-pills" style={{ marginTop: 10 }}>
        {SAMPLE_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            className="filter-pill"
            disabled={busy}
            onClick={() => {
              setQuestion(q);
              void onAsk(q);
            }}
          >
            <Sparkles size={11} style={{ marginRight: 4, verticalAlign: '-1px' }} />
            {q}
          </button>
        ))}
      </div>

      {result && (
        <div className="ask-answer">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              flexWrap: 'wrap',
              marginBottom: 8,
            }}
          >
            <InferenceBadge meta={result.inferenceMeta} />
            {result.privacyShield && result.privacyShield.redactedCount > 0 && (
              <span className="shield-pill">
                <ShieldCheck size={13} />
                Privacy Shield: {result.privacyShield.redactedCount} detail
                {result.privacyShield.redactedCount > 1 ? 's' : ''} masked
                locally before Cloud call
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: '0.96rem', color: 'var(--ink)' }}>
            {result.answer}
          </p>
          {citedItems.length > 0 && (
            <div className="tag-row" style={{ marginTop: 10, marginBottom: 0 }}>
              <span className="section-meta" style={{ fontSize: '0.76rem' }}>
                Source:
              </span>
              {citedItems.map((c) => (
                <span key={c.id} className="tag">
                  {c.title}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
