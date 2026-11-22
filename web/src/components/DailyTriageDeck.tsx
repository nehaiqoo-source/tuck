import {
  BookmarkCheck,
  Check,
  ExternalLink,
  Lock,
  Smartphone,
  Globe,
  Image as ImageIcon,
  StickyNote,
  Trash2,
} from 'lucide-react';
import type { TuckItem, TuckSource } from '../types';
import { InferenceBadge } from './InferenceBadge';

interface DailyTriageDeckProps {
  deckItems: TuckItem[];
  clutterCleared: number;
  onDoNow: (item: TuckItem) => void;
  onKeep: (item: TuckItem) => void;
  onLetGo: (item: TuckItem) => void;
}

function sourceLabel(source: TuckSource) {
  switch (source) {
    case 'chrome-tab':
      return { text: 'Chrome Tab', Icon: Globe };
    case 'screenshot':
      return { text: 'Screenshot', Icon: ImageIcon };
    case 'android':
      return { text: 'Android', Icon: Smartphone };
    case 'ios':
      return { text: 'iOS', Icon: Smartphone };
    case 'link':
      return { text: 'Saved Link', Icon: Globe };
    default:
      return { text: 'Quick Note', Icon: StickyNote };
  }
}

function daysAgoLabel(ts: number): string {
  const days = Math.floor((Date.now() - ts) / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'Tucked today';
  if (days === 1) return 'Tucked yesterday';
  return `Tucked ${days} days ago`;
}

export function DailyTriageDeck({
  deckItems,
  clutterCleared,
  onDoNow,
  onKeep,
  onLetGo,
}: DailyTriageDeckProps) {
  const current = deckItems[0];

  return (
    <section aria-labelledby="daily-deck-heading">
      <div className="section-header">
        <h2 id="daily-deck-heading" className="section-title">
          Today&apos;s 3 forgotten saves
        </h2>
        <div className="deck-progress">
          <span>
            {deckItems.length > 0
              ? `${deckItems.length} left in today's deck`
              : 'All caught up for today'}
          </span>
          <span>·</span>
          <span>{clutterCleared} cleared</span>
        </div>
      </div>

      {!current ? (
        <div className="deck-empty">
          <h3 className="triage-title" style={{ marginBottom: 6 }}>
            Desk is clear for today.
          </h3>
          <p className="section-meta" style={{ margin: 0 }}>
            Tuck a new link or screenshot above, or combine saved items on your
            shelf below.
          </p>
        </div>
      ) : (
        <article className="triage-card">
          <div className="triage-top">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {(() => {
                const { text, Icon } = sourceLabel(current.source);
                return (
                  <span className="source-pill">
                    <Icon size={12} />
                    {text}
                  </span>
                );
              })()}
              <span className="section-meta">{daysAgoLabel(current.createdAt)}</span>
            </div>
            <InferenceBadge meta={current.inferenceMeta} />
          </div>

          <h3 className="triage-title">{current.title}</h3>
          <p className="triage-summary">{current.summary}</p>

          {current.imageDataUrl && (
            <img
              className="triage-image"
              src={current.imageDataUrl}
              alt={current.title}
            />
          )}

          <div className="next-action-box">
            <div className="next-action-label">Suggested next step</div>
            <div className="next-action-text">{current.nextAction}</div>
          </div>

          <div className="tag-row">
            {current.isPrivate && (
              <span className="tag tag-private">
                <Lock size={11} style={{ verticalAlign: '-1px', marginRight: 4 }} />
                Private on-device
              </span>
            )}
            {current.tags.map((tag) => (
              <span key={tag} className="tag">
                #{tag}
              </span>
            ))}
          </div>

          <div className="triage-actions">
            <button
              type="button"
              className="btn btn-sage"
              onClick={() => onDoNow(current)}
            >
              <Check size={15} />
              Do it now
              {current.url && <ExternalLink size={13} />}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => onKeep(current)}
            >
              <BookmarkCheck size={15} />
              Keep on shelf
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => onLetGo(current)}
            >
              <Trash2 size={15} />
              Let it go
            </button>
          </div>
        </article>
      )}
    </section>
  );
}
