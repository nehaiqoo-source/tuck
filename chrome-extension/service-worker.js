const STORAGE_KEY = 'tuck_extension_items';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'tuck-page',
    title: 'Tuck this page for daily triage',
    contexts: ['page', 'link'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'tuck-page') return;
  const targetUrl = info.linkUrl || info.pageUrl || tab?.url || '';
  const title = tab?.title || targetUrl || 'Saved link';

  const item = {
    id: `ext-${Date.now()}`,
    title,
    url: targetUrl,
    rawContent: targetUrl,
    summary: `Saved via right-click from ${title}.`,
    nextAction: 'Review this link in your daily 3-card deck.',
    tags: ['tab'],
    isPrivate: false,
    source: 'chrome-tab',
    status: 'tucked',
    inferenceSource: 'On-Device · Instant',
    createdAt: Date.now(),
  };

  const data = await chrome.storage.local.get(STORAGE_KEY);
  const existing = Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY] : [];
  await chrome.storage.local.set({ [STORAGE_KEY]: [item, ...existing] });
});
