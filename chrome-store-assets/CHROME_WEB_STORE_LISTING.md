# Tuck: Chrome Web Store Submission Kit

## Package to Upload
- `releases/tuck-chrome-extension-v0.2.0.zip` (`manifest.json` at root, icons 16/32/48/128 included)

## Store Listing
- **Title:** Tuck: Read it later, actually.
- **Category:** Productivity
- **Homepage URL:** `https://tucktabs.app`
- **Privacy Policy URL:** `https://tucktabs.app/privacy.html`

## Store Description (Humanized)
Most people keep 40 or 80 Chrome tabs open because closing a tab feels like forgetting it forever. Bookmark folders rarely help because you never go back to sort them.

Tuck rescues open tabs in one click. Click the Tuck icon (or right-click any page or link) to capture the page title and key details locally, close the noisy tab right away, and hand it off to Tuck (tucktabs.app). Every day, Tuck shows you three older saves as simple cards so you can act on them, keep them on your shelf, or let them go.

What Tuck does:
- One-click tab capture with optional automatic tab closing
- Right-click context menu ("Tuck this page for daily triage")
- Privacy-first on-device summarization and tagging via Firebase AI Logic
- Direct handoff to Tuck Web, synced with Android and iOS
- Free and open source under the Apache 2.0 license

## Privacy & Permission Justifications
- **Single purpose:** Save and summarize the active Chrome tab locally, close tab clutter, and hand off saved tabs to Tuck (tucktabs.app) for daily triage.
- **tabs:** Read the active tab title and URL when the user clicks "Tuck this tab", and close the tab when "Close tab after tucking" is enabled.
- **activeTab:** Temporary access only to the currently active tab when the user clicks the extension icon.
- **scripting:** Runs a one-time snippet on the active tab on click to read the meta description and first 600 characters for local summarization.
- **storage:** Stores recently tucked tabs locally in `chrome.storage.local`.
- **contextMenus:** Adds a right-click "Tuck this page for daily triage" menu item on web pages and links.
- **Remote code:** No.

## Graphic Assets in This Folder
- `screenshot-1-extension-1280x800.png` (1280 x 800 — Screenshot 1)
- `screenshot-2-daily-triage-1280x800.png` (1280 x 800 — Screenshot 2)
- `small-promo-440x280.png` (440 x 280 — Small Promo Tile)
- `marquee-promo-1400x560.png` (1400 x 560 — Marquee Promo Tile)
