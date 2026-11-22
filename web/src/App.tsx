import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { LogIn, LogOut, Wifi, WifiOff } from 'lucide-react';
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
    } finally {
      setSynthesizing(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <h1 className="brand-mark">Tuck</h1>
          <span className="brand-sub">
            Rescue the tabs &amp; screenshots you swore you&apos;d check later
          </span>
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
              <option value="only_in_cloud">Cloud: Gemini 2.5 Flash</option>
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
    </div>
  );
}
