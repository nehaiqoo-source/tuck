# Tuck

Tuck is an app for Web, Chrome, Android, and iOS that deals with the open tabs, screenshots, and saved links people plan to check later and never open again.

Live web app: https://tuck-hybrid-ai-2026-1d24c.web.app

Built for the #BuildHybridAI 2026 Firebase Hybrid AI Hackathon.

## Why hybrid inference

Screenshots and open tabs often contain private details like medical receipts, personal chats, or bank notes. Tuck runs Firebase AI Logic in `PREFER_ON_DEVICE` mode first so private captures are summarized and tagged locally on the device, even offline:

- Web (Chrome): `firebase/ai` using `InferenceMode.PREFER_ON_DEVICE` (Gemini Nano in Chrome) with automatic fallback to `gemini-3.8-flash`.
- Android (Kotlin and Jetpack Compose): `firebase-ai` + `firebase-ai-ondevice` with `InferenceMode.PREFER_ON_DEVICE` (Gemini Nano via Android AICore) and Android Share Sheet support for links and screenshots.
- iOS (SwiftUI): Firebase iOS SDK (`FirebaseAI`) targeting Apple Foundation Models on-device with Cloud Gemini fallback.
- Chrome Extension (Manifest V3): One-click "Tuck this tab" popup and right-click menu that closes tab clutter and hands off to Tuck Web.

When you select two or more saved items on your shelf to combine into a single plan (for example, turning saved Kyoto tabs and screenshots into a weekend itinerary), Tuck explicitly calls `InferenceMode.ONLY_IN_CLOUD` (`gemini-3.8-flash`) for multi-item synthesis.

## Repository layout

- `web/` - React, Vite, and TypeScript web app with live Hybrid AI inference log and daily 3-card triage deck
- `chrome-extension/` - Manifest V3 extension for one-click tab tucking and Web handoff
- `android/` - Native Kotlin and Jetpack Compose app with `firebase-ai-ondevice` and Share Sheet
- `ios/` - Native SwiftUI package with `FirebaseAI` and shared Firestore data model
- `firebase/` - Validated owner-only Firestore Security Rules and composite indexes

## Running locally

### 1. Web app

```bash
cd web
cp .env.example .env.local   # Add your Firebase Web config
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
