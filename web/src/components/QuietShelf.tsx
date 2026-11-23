import { useMemo, useRef, useState } from 'react';
import {
  Bookmark,
  Clock,
  Cloud,
  CopyCheck,
  Download,
  ExternalLink,
  Inbox,
  Lock,
  Network,
  Trash2,
  Upload,
} from 'lucide-react';
import type { TuckItem } from '../types';
import {
  exportItemsAsJson,
  exportItemsAsMarkdown,
  findDuplicateIds,
  findStaleIds,
  isStaleReadLater,
  parseBookmarksHtml,
} from '../services/shelfTools';
import { InferenceBadge } from './InferenceBadge';
import { ConnectionMap } from './ConnectionMap';

interface QuietShelfProps {
  items: TuckItem[];
  selectedIds: string[];
  synthesizing: boolean;
  onToggleSelect: (id: string) => void;
  onClearSelection: () => void;
  onSynthesize: () => void;
  onSynthesizeCluster: (clusterItems: TuckItem[]) => void;
  onMoveToBookmarks: (id: string) => void;
  onRemoveMany: (ids: string[]) => void;
  onImportItems: (imported: TuckItem[]) => void;
  onDelete: (id: string) => void;
}

type ShelfTab = 'read-later' | 'bookmarks' | 'map';

export function QuietShelf({
  items,
  selectedIds,
  synthesizing,
  onToggleSelect,
  onClearSelection,
  onSynthesize,
  onSynthesizeCluster,
  onMoveToBookmarks,
  onRemoveMany,
  onImportItems,
  onDelete,
}: QuietShelfProps) {
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<ShelfTab>('read-later');
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const readLaterItems = useMemo(
    () => items.filter((i) => i.status === 'tucked'),
    [items]
  );

  const bookmarkItems = useMemo(
    () => items.filter((i) => i.status === 'kept' || i.status === 'done'),
    [items]
  );

  const duplicateIds = useMemo(() => findDuplicateIds(items), [items]);
  const staleIds = useMemo(() => findStaleIds(items), [items]);

  const tabItems = activeTab === 'bookmarks' ? bookmarkItems : readLaterItems;

  const allTags = useMemo(() => {
    const set = new Set<string>();
    tabItems.forEach((item) => item.tags.forEach((t) => set.add(t)));
    return Array.from(set).slice(0, 8);
  }, [tabItems]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tabItems.filter((item) => {
      if (activeTag !== 'all' && !item.tags.includes(activeTag)) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [tabItems, search, activeTag]);

  const handleBookmarkHtmlFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const html = String(reader.result || '');
      const { imported, skippedDuplicates } = parseBookmarksHtml(html, items);
      if (imported.length > 0) {
        onImportItems(imported);
        setActiveTab('bookmarks');
      }
      setImportNotice(
        `Imported ${imported.length} bookmark${imported.length === 1 ? '' : 's'}${skippedDuplicates > 0 ? `, skipped ${skippedDuplicates} duplicate${skippedDuplicates === 1 ? '' : 's'}` : ''}.`
      );
      setTimeout(() => setImportNotice(null), 5000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <section aria-labelledby="shelf-heading">
      <div className="section-header">
        <div>
          <h2 id="shelf-heading" className="section-title">
            Your quiet shelf
          </h2>
          <span className="section-meta">
            Temporary Read Later stays separate from Permanent Bookmarks. Select
            2+ items to connect them in Cloud Gemini.
          </span>
        </div>

        <div className="view-toggle" role="tablist" aria-label="Shelf sections">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'read-later'}
            className={`filter-pill ${activeTab === 'read-later' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('read-later');
              setActiveTag('all');
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
          >
            <Inbox size={13} />
            Read Later ({readLaterItems.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'bookmarks'}
            className={`filter-pill ${activeTab === 'bookmarks' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('bookmarks');
              setActiveTag('all');
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
          >
            <Bookmark size={13} />
            Bookmarks ({bookmarkItems.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'map'}
            className={`filter-pill ${activeTab === 'map' ? 'active' : ''}`}
            onClick={() => setActiveTab('map')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
          >
            <Network size={13} />
            Connection Map
          </button>
        </div>
      </div>

      {/* Maintenance & Portability Bar (Duplicates, Stale Decay, Import/Export) */}
      <div className="tools-strip">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {duplicateIds.length > 0 && (
            <button
              type="button"
              className="action-chip"
              onClick={() => onRemoveMany(duplicateIds)}
            >
              <CopyCheck size={13} />
              Clean {duplicateIds.length} duplicate
              {duplicateIds.length > 1 ? 's' : ''}
            </button>
          )}
          {staleIds.length > 0 && (
            <button
              type="button"
              className="action-chip"
              onClick={() => onRemoveMany(staleIds)}
            >
              <Clock size={13} />
              Sweep {staleIds.length} stale (14d+)
            </button>
          )}
          {importNotice && (
            <span className="shield-pill">{importNotice}</span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            ref={importInputRef}
            type="file"
            accept=".html,.htm"
            hidden
            onChange={handleBookmarkHtmlFile}
          />
          <button
            type="button"
            className="filter-pill"
            onClick={() => importInputRef.current?.click()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
          >
            <Upload size={12} />
            Import bookmarks.html
          </button>
          <button
            type="button"
            className="filter-pill"
            onClick={() => exportItemsAsMarkdown(items)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
          >
            <Download size={12} />
            Export MD
          </button>
          <button
            type="button"
            className="filter-pill"
            onClick={() => exportItemsAsJson(items)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
          >
            <Download size={12} />
            Export JSON
          </button>
        </div>
      </div>

      {activeTab === 'map' ? (
        <ConnectionMap
          items={items}
          synthesizing={synthesizing}
          onSynthesizeCluster={onSynthesizeCluster}
        />
      ) : (
        <>
          <div className="shelf-toolbar">
            <input
              type="search"
              className="search-input"
              placeholder={
                activeTab === 'bookmarks'
                  ? 'Search permanent bookmarks...'
                  : 'Search Read Later queue...'
              }
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
                All ({tabItems.length})
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

          {filtered.length === 0 ? (
            <div className="deck-empty" style={{ padding: '28px 20px' }}>
              <p className="section-meta" style={{ margin: 0 }}>
                {activeTab === 'bookmarks'
                  ? 'No permanent bookmarks yet. Click "Keep on shelf" on any card or import your Chrome/Pocket bookmarks.html.'
                  : 'Your Read Later queue is clean.'}
              </p>
            </div>
          ) : (
            <div className="shelf-grid">
              {filtered.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                const stale = isStaleReadLater(item);
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
                      {stale && (
                        <span
                          className="tag"
                          style={{ background: '#fdf2ee', color: '#9e3d1e' }}
                        >
                          Stale (14d+)
                        </span>
                      )}
                      {item.tags.map((tag) => (
                        <span key={tag} className="tag">
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <div className="shelf-card-foot">
                      <InferenceBadge meta={item.inferenceMeta} />
                      <div style={{ display: 'flex', gap: 4 }}>
                        {activeTab === 'read-later' && (
                          <button
                            type="button"
                            className="btn-ghost"
                            style={{ padding: 6, borderRadius: 999 }}
                            onClick={() => onMoveToBookmarks(item.id)}
                            title="Move to permanent Bookmarks"
                            aria-label={`Move ${item.title} to Bookmarks`}
                          >
                            <Bookmark size={14} />
                          </button>
                        )}
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
          )}
        </>
      )}
    </section>
  );
}
