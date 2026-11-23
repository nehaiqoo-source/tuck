import { useMemo, useState } from 'react';
import { Cloud, ExternalLink, Lock, Trash2 } from 'lucide-react';
import type { TuckItem } from '../types';
import { InferenceBadge } from './InferenceBadge';

interface QuietShelfProps {
  items: TuckItem[];
  selectedIds: string[];
  synthesizing: boolean;
  onToggleSelect: (id: string) => void;
  onClearSelection: () => void;
  onSynthesize: () => void;
  onDelete: (id: string) => void;
}

export function QuietShelf({
  items,
  selectedIds,
  synthesizing,
  onToggleSelect,
  onClearSelection,
  onSynthesize,
  onDelete,
}: QuietShelfProps) {
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string>('all');

  const allTags = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => item.tags.forEach((t) => set.add(t)));
    return Array.from(set).slice(0, 8);
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (item.status === 'let-go') return false;
      if (activeTag !== 'all' && !item.tags.includes(activeTag)) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [items, search, activeTag]);

  return (
    <section aria-labelledby="shelf-heading">
      <div className="section-header">
        <h2 id="shelf-heading" className="section-title">
          Your quiet shelf
        </h2>
        <span className="section-meta">
          Select 2+ items to connect them into a plan with Cloud Gemini
        </span>
      </div>

      <div className="shelf-toolbar">
        <input
          type="search"
          className="search-input"
          placeholder="Search saved tabs, screenshots, or tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search saved items"
        />

        <div className="filter-pills">
          <button
            type="button"
            className={`filter-pill ${activeTag === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTag('all')}
          >
            All ({items.filter((i) => i.status !== 'let-go').length})
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`filter-pill ${activeTag === tag ? 'active' : ''}`}
              onClick={() => setActiveTag(tag)}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {selectedIds.length >= 2 && (
        <div className="synthesis-bar">
          <span>
            <strong>{selectedIds.length} items selected</strong>, ready to
            combine into one plan using Cloud Gemini (<code>ONLY_IN_CLOUD</code>).
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClearSelection}
            >
              Clear
            </button>
            <button
              type="button"
              className="btn btn-cloud"
              onClick={onSynthesize}
              disabled={synthesizing}
            >
              <Cloud size={15} />
              {synthesizing ? 'Synthesizing...' : 'Connect dots in Cloud'}
            </button>
          </div>
        </div>
      )}

      <div className="shelf-grid">
        {filtered.map((item) => {
          const isSelected = selectedIds.includes(item.id);
          return (
            <article
              key={item.id}
              className={`shelf-card ${isSelected ? 'selected' : ''}`}
            >
              <div className="shelf-card-head">
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(item.id)}
                    style={{ marginTop: 4, accentColor: '#284f7e' }}
                    aria-label={`Select ${item.title} for cloud synthesis`}
                  />
                  <h3 className="shelf-card-title">{item.title}</h3>
                </label>

                {item.isPrivate && (
                  <Lock
                    size={14}
                    style={{ color: '#1f5c41', flexShrink: 0, marginTop: 2 }}
                    aria-label="Private on-device item"
                  />
                )}
              </div>

              <p className="shelf-card-summary">{item.summary}</p>

              <div className="tag-row" style={{ marginBottom: 4 }}>
                {item.tags.map((tag) => (
                  <span key={tag} className="tag">
                    #{tag}
                  </span>
                ))}
              </div>

              <div className="shelf-card-foot">
                <InferenceBadge meta={item.inferenceMeta} />
                <div style={{ display: 'flex', gap: 4 }}>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-ghost"
                      style={{
                        padding: 6,
                        borderRadius: 999,
                        display: 'inline-flex',
                      }}
                      aria-label={`Open ${item.title}`}
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ padding: 6, borderRadius: 999 }}
                    onClick={() => onDelete(item.id)}
                    aria-label={`Delete ${item.title}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
