import type { TuckItem } from '../types';

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

function normalizeKey(item: TuckItem): string {
  if (item.url) {
    return `url:${item.url.trim().replace(/\/+$/, '').toLowerCase()}`;
  }
  return `txt:${item.title.trim().toLowerCase().slice(0, 60)}`;
}

/**
 * Finds duplicate items (keeping the newest one, returning older duplicate IDs).
 */
export function findDuplicateIds(items: TuckItem[]): string[] {
  const active = items.filter((i) => i.status !== 'let-go');
  const seen = new Set<string>();
  const duplicates: string[] = [];

  for (const item of active) {
    const key = normalizeKey(item);
    if (seen.has(key)) {
      duplicates.push(item.id);
    } else {
      seen.add(key);
    }
  }
  return duplicates;
}

/**
 * Finds temporary Read-Later items untouched for 14+ days.
 */
export function isStaleReadLater(item: TuckItem): boolean {
  return (
    item.status === 'tucked' &&
    Date.now() - item.updatedAt > FOURTEEN_DAYS_MS
  );
}

export function findStaleIds(items: TuckItem[]): string[] {
  return items.filter(isStaleReadLater).map((i) => i.id);
}

/**
 * Parses Chrome / Pocket / Raindrop bookmarks.html into TuckItem entries.
 */
export function parseBookmarksHtml(
  htmlText: string,
  existingItems: TuckItem[]
): { imported: TuckItem[]; skippedDuplicates: number } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, 'text/html');
  const anchors = Array.from(doc.querySelectorAll('a[href]'));

  const existingUrls = new Set(
    existingItems
      .filter((i) => i.url)
      .map((i) => i.url!.trim().replace(/\/+$/, '').toLowerCase())
  );

  const imported: TuckItem[] = [];
  let skippedDuplicates = 0;
  const now = Date.now();

  for (const a of anchors) {
    const href = (a.getAttribute('href') || '').trim();
    if (!/^https?:\/\//i.test(href)) continue;

    const normalized = href.replace(/\/+$/, '').toLowerCase();
    if (existingUrls.has(normalized)) {
      skippedDuplicates += 1;
      continue;
    }
    existingUrls.add(normalized);

    const rawTitle = (a.textContent || '').trim() || href;
    const title =
      rawTitle.length > 80 ? `${rawTitle.slice(0, 77)}...` : rawTitle;
    let host = '';
    try {
      host = new URL(href).hostname.replace(/^www\./, '');
    } catch {
      host = 'web';
    }

    imported.push({
      id: `bm-${now}-${imported.length}-${Math.random().toString(36).slice(2, 5)}`,
      title,
      rawContent: `${title} - ${href}`,
      url: href,
      source: 'link',
      summary: `Imported bookmark from ${host}.`,
      nextAction: `Open ${host} when you need this reference.`,
      tags: ['bookmark', host.split('.')[0] || 'web'].slice(0, 2),
      isPrivate: false,
      status: 'kept',
      inferenceMeta: {
        source: 'on-device',
        model: 'Local HTML Bookmark Importer',
        latencyMs: 4,
        modeUsed: 'prefer_on_device',
      },
      createdAt: now - imported.length * 1000,
      updatedAt: now,
    });
  }

  return { imported, skippedDuplicates };
}

export function exportItemsAsMarkdown(items: TuckItem[]) {
  const active = items.filter((i) => i.status !== 'let-go');
  const lines = [
    '# Tuck Export',
    '',
    `Exported ${active.length} items from tucktabs.app on ${new Date().toISOString().slice(0, 10)}.`,
    '',
  ];

  const readLater = active.filter((i) => i.status === 'tucked');
  const bookmarks = active.filter((i) => i.status === 'kept');
  const done = active.filter((i) => i.status === 'done');

  const appendSection = (heading: string, list: TuckItem[]) => {
    if (list.length === 0) return;
    lines.push(`## ${heading}`, '');
    for (const item of list) {
      const link = item.url ? ` ([link](${item.url}))` : '';
      lines.push(`- **${item.title}**${link}`);
      lines.push(`  - Summary: ${item.summary}`);
      lines.push(`  - Next step: ${item.nextAction}`);
      if (item.tags.length > 0) {
        lines.push(`  - Tags: ${item.tags.map((t) => `#${t}`).join(' ')}`);
      }
    }
    lines.push('');
  };

  appendSection('Read Later Queue', readLater);
  appendSection('Permanent Bookmarks', bookmarks);
  appendSection('Completed', done);

  triggerDownload(
    `tuck-export-${new Date().toISOString().slice(0, 10)}.md`,
    lines.join('\n'),
    'text/markdown;charset=utf-8'
  );
}

export function exportItemsAsJson(items: TuckItem[]) {
  const active = items.filter((i) => i.status !== 'let-go');
  triggerDownload(
    `tuck-backup-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify(active, null, 2),
    'application/json;charset=utf-8'
  );
}

function triggerDownload(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
