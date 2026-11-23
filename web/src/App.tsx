import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { Activity, LogIn, LogOut, Wifi, WifiOff } from 'lucide-react';
import {
  auth,
  isFirebaseConfigured,
  signInWithGoogle,
  signOutUser,
} from './services/firebase';
import {
  summarizeTuckItem,
  synthesizeItemsInCloud,
} from './services/hybridAI';
import {
  loadLocalItems,
  persistItem,
  removeItem,
  saveLocalItems,
  subscribeUserItems,
  updateItemStatus,
} from './services/storage';
import { QuickTuckComposer } from './components/QuickTuckComposer';
import { DailyTriageDeck } from './components/DailyTriageDeck';
import { QuietShelf } from './components/QuietShelf';
import { SynthesisDialog } from './components/SynthesisDialog';
import {
  HybridLogDialog,
  type InferenceLogEntry,
} from './components/HybridLogDialog';
import type {
  HybridMode,
  SynthesisResult,
  TuckItem,
  TuckSource,
} from './types';

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<TuckItem[]>(() => loadLocalItems());
  const [mode, setMode] = useState<HybridMode>('prefer_on_device');
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [busyTuck, setBusyTuck] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [synthesizing, setSynthesizing] = useState(false);
  const [synthesisResult, setSynthesisResult] =
    useState<SynthesisResult | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [inferenceLog, setInferenceLog] = useState<InferenceLogEntry[]>([]);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    return subscribeUserItems(user.uid, (remoteItems) => {
      if (remoteItems.length > 0) {
        setItems(remoteItems);
        saveLocalItems(remoteItems);
      }
    });
  }, [user]);

  const syncLocal = (updater: (prev: TuckItem[]) => TuckItem[]) => {
    setItems((prev) => {
      const next = updater(prev);
      saveLocalItems(next);
      return next;
    });
  };

  const dailyDeck = useMemo(
    () => items.filter((i) => i.status === 'tucked').slice(0, 3),
    [items]
  );

  const clutterCleared = useMemo(
    () => items.filter((i) => i.status === 'done' || i.status === 'let-go').length,
    [items]
  );

  const onDeviceCount = useMemo(
    () => items.filter((i) => i.inferenceMeta.source === 'on-device').length,
    [items]
  );

  const handleTuck = async (payload: {
    rawContent: string;
    url?: string;
    source: TuckSource;
    isPrivate: boolean;
    imageDataUrl?: string;
    imageBase64?: string;
    imageMimeType?: string;
  }) => {
    setBusyTuck(true);
    try {
      const summary = await summarizeTuckItem(
        {
          rawContent: payload.rawContent,
          url: payload.url,
          source: payload.source,
          isPrivate: payload.isPrivate,
          imageBase64: payload.imageBase64,
          imageMimeType: payload.imageMimeType,
        },
        mode
      );

      const now = Date.now();
      const newItem: TuckItem = {
        id: `tuck-${now}-${Math.random().toString(36).slice(2, 6)}`,
        title: summary.title,
        rawContent: payload.rawContent,
        url: payload.url,
        imageDataUrl: payload.imageDataUrl,
        source: payload.source,
        summary: summary.summary,
        nextAction: summary.nextAction,
        tags: summary.tags,
        isPrivate: summary.isPrivate,
        status: 'tucked',
        inferenceMeta: summary.inferenceMeta,
        createdAt: now,
        updatedAt: now,
      };

      syncLocal((prev) => [newItem, ...prev]);
      setInferenceLog((prev) => [
        {
          id: newItem.id,
          task: `Tuck: ${newItem.title}`,
          meta: newItem.inferenceMeta,
          timestamp: now,
        },
        ...prev.slice(0, 14),
      ]);
      await persistItem(user?.uid ?? null, newItem);
    } finally {
      setBusyTuck(false);
    }
  };

  const handleDoNow = async (item: TuckItem) => {
    if (item.url) {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    }
    syncLocal((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, status: 'done', updatedAt: Date.now() } : i
      )
    );
    await updateItemStatus(user?.uid ?? null, item.id, 'done');
  };

  const handleKeep = async (item: TuckItem) => {
    syncLocal((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, status: 'kept', updatedAt: Date.now() } : i
      )
    );
    await updateItemStatus(user?.uid ?? null, item.id, 'kept');
  };

  const handleLetGo = async (item: TuckItem) => {
    syncLocal((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, status: 'let-go', updatedAt: Date.now() } : i
      )
    );
    await updateItemStatus(user?.uid ?? null, item.id, 'let-go');
  };

  const handleDelete = async (id: string) => {
    syncLocal((prev) => prev.filter((i) => i.id !== id));
    setSelectedIds((prev) => prev.filter((x) => x !== id));
    await removeItem(user?.uid ?? null, id);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSynthesize = async () => {
    const chosen = items.filter((i) => selectedIds.includes(i.id));
    if (chosen.length < 2) return;
    setSynthesizing(true);
    try {
      const result = await synthesizeItemsInCloud(chosen);
      setSynthesisResult(result);
      setInferenceLog((prev) => [
        {
          id: result.id,
          task: `Cloud Synthesis (${chosen.length} items)`,
          meta: result.inferenceMeta,
          timestamp: Date.now(),
        },
        ...prev.slice(0, 14),
      ]);
    } finally {
      setSynthesizing(false);
    }
  };

  // Ingest one-click tab handoff from the Tuck Chrome Extension (#tuck=...)
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith('#tuck=')) return;
    try {
      const decoded = JSON.parse(decodeURIComponent(hash.slice(6))) as {
        title?: string;
        url?: string;
        rawContent?: string;
        isPrivate?: boolean;
      };
      window.history.replaceState(null, '', window.location.pathname);
      void handleTuck({
        rawContent: decoded.rawContent || decoded.title || decoded.url || 'Saved tab',
        url: decoded.url,
        source: 'chrome-tab',
        isPrivate: Boolean(decoded.isPrivate),
      });
    } catch {
      // Ignore malformed handoff hash
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <h1 className="brand-mark">
            <a href="/" aria-label="Tuck home" style={{ display: 'inline-block', textDecoration: 'none' }}>
              <img
                src="/tuck-logo.svg"
                alt="Tuck"
                width={138}
                height={36}
                style={{ display: 'block', height: 36, width: 'auto' }}
              />
            </a>
          </h1>
          <span className="brand-sub">Read it later, actually.</span>
        </div>

        <div className="topbar-controls">
          <span className={`status-chip ${isOnline ? '' : 'offline'}`}>
            <span className="status-dot" />
            {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
            {isOnline ? 'Online' : 'Offline (On-Device Ready)'}
          </span>

          <label>
            <span className="sr-only" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}>
              Hybrid inference mode
            </span>
            <select
              className="mode-select"
              value={mode}
              onChange={(e) => setMode(e.target.value as HybridMode)}
              aria-label="Firebase AI Logic inference mode"
            >
              <option value="prefer_on_device">Hybrid: Prefer On-Device</option>
              <option value="only_on_device">Strict: On-Device Only</option>
              <option value="only_in_cloud">Cloud: Gemini 3.5 Flash-Lite</option>
            </select>
          </label>

          {isFirebaseConfigured &&
            (user ? (
              <button
                type="button"
                className="btn"
                onClick={() => void signOutUser()}
              >
                <LogOut size={14} />
                {user.displayName?.split(' ')[0] || 'Sign out'}
              </button>
            ) : (
              <button
                type="button"
                className="btn"
                onClick={() => void signInWithGoogle()}
              >
                <LogIn size={14} />
                Sign in to sync
              </button>
            ))}
        </div>
      </header>

      <div className="stats-strip">
        <span>
          <strong>{onDeviceCount}</strong> summarized on-device
        </span>
        <span>·</span>
        <span>
          <strong>{items.filter((i) => i.isPrivate).length}</strong> kept private
          locally
        </span>
        <span>·</span>
        <span>
          <strong>
            {isFirebaseConfigured ? 'Firebase Connected' : 'Local Preview Mode'}
          </strong>
        </span>
        <span>·</span>
        <button
          type="button"
          className="filter-pill"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
          onClick={() => setLogOpen(true)}
        >
          <Activity size={12} />
          Hybrid AI log ({inferenceLog.length})
        </button>
      </div>

      <QuickTuckComposer busy={busyTuck} onTuck={handleTuck} />

      <main className="main-grid">
        <DailyTriageDeck
          deckItems={dailyDeck}
          clutterCleared={clutterCleared}
          onDoNow={handleDoNow}
          onKeep={handleKeep}
          onLetGo={handleLetGo}
        />

        <QuietShelf
          items={items}
          selectedIds={selectedIds}
          synthesizing={synthesizing}
          onToggleSelect={handleToggleSelect}
          onClearSelection={() => setSelectedIds([])}
          onSynthesize={handleSynthesize}
          onDelete={handleDelete}
        />
      </main>

      <SynthesisDialog
        result={synthesisResult}
        onClose={() => setSynthesisResult(null)}
      />

      <HybridLogDialog
        open={logOpen}
        entries={inferenceLog}
        onClose={() => setLogOpen(false)}
      />

      <footer
        style={{
          marginTop: 56,
          paddingTop: 22,
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          fontSize: '0.82rem',
          color: 'var(--ink-muted)',
        }}
      >
        <span>Tuck · Open source (Apache 2.0)</span>
        <nav aria-label="Guides and resources" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <a href="/blog/" style={{ color: 'inherit' }}>
            Guides
          </a>
          <a href="/how-to-stop-hoarding-browser-tabs.html" style={{ color: 'inherit' }}>
            Tab clutter
          </a>
          <a href="/organize-phone-screenshots-privately.html" style={{ color: 'inherit' }}>
            Private screenshots
          </a>
          <a href="/on-device-ai-vs-cloud-ai-privacy.html" style={{ color: 'inherit' }}>
            On-device AI
          </a>
          <a href="/privacy.html" style={{ color: 'inherit' }}>
            Privacy
          </a>
          <a
            href="https://github.com/nehaiqoo-source/tuck"
            target="_blank"
            rel="noreferrer"
            style={{ color: 'inherit' }}
          >
            GitHub
          </a>
        </nav>
      </footer>
    </div>
  );
}
