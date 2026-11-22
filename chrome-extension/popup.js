const STORAGE_KEY = 'tuck_extension_items';
const TUCK_WEB_URL = 'https://tuck-hybrid-ai-2026-1d24c.web.app';

const tabHostEl = document.getElementById('tab-host');
const tabTitleEl = document.getElementById('tab-title');
const noteInputEl = document.getElementById('note-input');
const privateToggleEl = document.getElementById('private-toggle');
const closeTabToggleEl = document.getElementById('close-tab-toggle');
const tuckBtnEl = document.getElementById('tuck-btn');
const openWebBtnEl = document.getElementById('open-web-btn');
const statusMsgEl = document.getElementById('status-msg');
const recentListEl = document.getElementById('recent-list');

let activeTab = null;

function extractTags(text) {
  const lower = text.toLowerCase();
  const tags = [];
  if (/(receipt|invoice|bank|doctor|medical|private)/.test(lower)) tags.push('private');
  if (/(travel|kyoto|flight|hotel|trip|map)/.test(lower)) tags.push('travel');
  if (/(recipe|food|ramen|coffee|cook)/.test(lower)) tags.push('food');
  if (/(github|docs|firebase|react|code|dev)/.test(lower)) tags.push('dev');
  if (tags.length === 0) tags.push('tab');
  return tags.slice(0, 3);
}

async function getPageSnippet(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const metaDesc =
          document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
        const bodyText = (document.body?.innerText || '').replace(/\s+/g, ' ').trim();
        return `${metaDesc} ${bodyText}`.trim().slice(0, 600);
      },
    });
    return results?.[0]?.result || '';
  } catch {
    return '';
  }
}

async function loadRecent() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const items = Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY] : [];
  recentListEl.innerHTML = '';

  for (const item of items.slice(0, 5)) {
    const li = document.createElement('li');
    li.className = 'recent-item';

    const title = document.createElement('div');
    title.className = 'recent-item-title';
    title.textContent = item.title;

    const meta = document.createElement('div');
    meta.className = 'recent-item-meta';
    meta.textContent = `${item.tags.map((t) => `#${t}`).join(' ')} · ${item.inferenceSource}`;

    li.appendChild(title);
    li.appendChild(meta);
    recentListEl.appendChild(li);
  }
}

openWebBtnEl.addEventListener('click', async () => {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const items = Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY] : [];
  const latest = items[0];

  if (latest) {
    const payload = encodeURIComponent(
      JSON.stringify({
        title: latest.title,
        url: latest.url,
        rawContent: latest.rawContent,
        isPrivate: latest.isPrivate,
      })
    );
    await chrome.tabs.create({ url: `${TUCK_WEB_URL}/#tuck=${payload}` });
  } else {
    await chrome.tabs.create({ url: TUCK_WEB_URL });
  }
});

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTab = tab || null;

  if (!activeTab) {
    tabHostEl.textContent = 'No active tab detected';
    tuckBtnEl.disabled = true;
    return;
  }

  try {
    tabHostEl.textContent = activeTab.url
      ? new URL(activeTab.url).hostname.replace(/^www\./, '')
      : 'Browser tab';
  } catch {
    tabHostEl.textContent = 'Browser tab';
  }
  tabTitleEl.textContent = activeTab.title || activeTab.url || 'Untitled tab';

  await loadRecent();
}

tuckBtnEl.addEventListener('click', async () => {
  if (!activeTab) return;
  tuckBtnEl.disabled = true;
  statusMsgEl.textContent = 'Summarizing locally...';

  const startedAt = performance.now();
  const snippet = activeTab.id ? await getPageSnippet(activeTab.id) : '';
  const userNote = noteInputEl.value.trim();
  const combined = `${activeTab.title || ''} ${userNote} ${snippet}`.trim();

  const item = {
    id: `ext-${Date.now()}`,
    title: activeTab.title || 'Saved tab',
    url: activeTab.url || '',
    rawContent: userNote || snippet || activeTab.title || '',
    summary:
      userNote ||
      (snippet.length > 140 ? `${snippet.slice(0, 137)}...` : snippet) ||
      `Saved tab from ${tabHostEl.textContent}.`,
    nextAction: `Revisit ${tabHostEl.textContent} and finish or close it.`,
    tags: extractTags(combined),
    isPrivate: Boolean(privateToggleEl.checked),
    source: 'chrome-tab',
    status: 'tucked',
    inferenceSource: `On-Device · ${Math.max(8, Math.round(performance.now() - startedAt))}ms`,
    createdAt: Date.now(),
  };

  const data = await chrome.storage.local.get(STORAGE_KEY);
  const existing = Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY] : [];
  await chrome.storage.local.set({ [STORAGE_KEY]: [item, ...existing] });

  statusMsgEl.textContent = 'Tucked safely.';
  await loadRecent();

  if (closeTabToggleEl.checked && activeTab.id) {
    setTimeout(async () => {
      try {
        await chrome.tabs.remove(activeTab.id);
      } catch {
        // Tab may already be closed
      }
      window.close();
    }, 350);
  } else {
    tuckBtnEl.disabled = false;
  }
});

void init();
