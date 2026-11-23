# Tuck: Read it later, actually.

Tuck is an open-source app for Web, Chrome, Android, and iOS that deals with the open tabs, screenshots, and saved links people plan to check later and never open again.

Live web app: https://tucktabs.app  
Privacy policy: https://tucktabs.app/privacy.html

Built for the #BuildHybridAI 2026 Firebase Hybrid AI Hackathon.

## What Tuck does

- Daily 3-card triage deck: Surfaces three older saves each day with a short summary, suggested next step, and one-click executable actions (`.ics` calendar export, email draft copy, and interactive mini-checklists).
- Separate Read Later and Bookmarks tabs: Temporary saves stay in Read Later (with 14-day stale decay detection and one-click sweep), while permanent references live in Bookmarks.
- Ask your shelf: Natural-language Q&A across saved tabs, notes, and screenshots with source card citations.
- Visual Connection Map: Interactive SVG knowledge graph linking saved items by shared topic hubs, with one-click cluster synthesis in Cloud Gemini.
- Two-stage Local Privacy Shield: Before any Cloud Gemini call, sensitive details (emails, phone numbers, currency amounts, policy or claim IDs, and personal titles) are masked locally on-device and restored only on the user's screen.
- Voice tuck, duplicate cleaner, and zero lock-in: Hands-free Web Speech capture, one-click duplicate detection and cleanup, Chrome/Pocket `bookmarks.html` import, and Markdown/JSON export.
- Cross-device sync: Real-time Firestore sync across Web and Android using Google Sign-In or Email/Password.

## How Firebase AI Logic hybrid inference works in Tuck

- Web (Chrome): `firebase/ai` using `InferenceMode.PREFER_ON_DEVICE` (Gemini Nano in Chrome) with automatic fallback to `gemini-3.5-flash-lite`, protected by Firebase App Check (reCAPTCHA Enterprise). Includes a live Hybrid AI inference log in the header.
- Chrome Extension (Manifest V3, v0.3.0): One-click "Tuck this tab" popup, right-click context menu, and a "Rescue all open tabs" panic button that closes tab clutter and hands tabs directly to `https://tucktabs.app`.
- Android (Kotlin and Jetpack Compose, v0.4.0): Uses `firebase-ai` and `firebase-ai-ondevice` with `InferenceMode.PREFER_ON_DEVICE` (Gemini Nano via Android AICore), Android Share Sheet (`ACTION_SEND` for links and screenshots), Local Privacy Shield, Ask Your Shelf, Read Later vs Bookmarks tabs, and Google + Email/Password sync.
- iOS (SwiftUI): Firebase iOS SDK (`FirebaseAI`) targeting Apple Foundation Models on-device with Cloud Gemini (`gemini-3.5-flash-lite`) fallback.
- Multi-item Cloud Synthesis: Selecting two or more saved items (or clicking a topic cluster on the Connection Map) explicitly invokes `InferenceMode.ONLY_IN_CLOUD` (`gemini-3.5-flash-lite`) after running the Local Privacy Shield.

## Repository layout

- `web/` - React, Vite, and TypeScript PWA (`https://tucktabs.app`) + static SEO guides and sitemap
- `chrome-extension/` - Manifest V3 extension (v0.3.0) with icons and batch tab rescue
- `android/` - Native Kotlin and Jetpack Compose app (v0.4.0) with `firebase-ai-ondevice`
- `ios/` - Native SwiftUI package with `FirebaseAI` and shared Firestore schema
- `firebase/` - Validated owner-only Firestore Security Rules and composite indexes
- `play-store-assets/` - Google Play Console graphics, screenshots, and listing copy
- `chrome-store-assets/` - Chrome Web Store screenshots, promo tiles, and permission justifications

## Running locally

### 1. Web app

```bash
cd web
cp .env.example .env.local   # Add your Firebase Web config and reCAPTCHA Enterprise site key
npm install
npm run dev
```

To test on-device Gemini Nano in Chrome Desktop, enable `chrome://flags/#prompt-api-for-gemini-nano` and `chrome://flags/#optimization-guide-on-device-model`, restart Chrome, and toggle offline mode in DevTools while tucking a note.

### 2. Chrome extension

1. Open `chrome://extensions` in Chrome.
2. Turn on Developer mode.
3. Click **Load unpacked** and select `tuck/chrome-extension`.

### 3. Android app

Open `tuck/android` in Android Studio, place your `google-services.json` in `android/app/`, and run on a device or emulator.

### 4. iOS app

Open `tuck/ios` in Xcode (Swift Package Manager resolves `firebase-ios-sdk` v12.13.0+), include `GoogleService-Info.plist`, and build for iOS 18+.

## Privacy and security

Firestore rules in `firebase/firestore.rules` restrict every read and write to `users/{uid}/items/{itemId}` for the authenticated owner, validate field types and size limits on both creates and updates, and block `imageDataUrl` from being stored in Firestore whenever `isPrivate` is `true`.

## License

Licensed under the Apache License 2.0. See [LICENSE](LICENSE).
