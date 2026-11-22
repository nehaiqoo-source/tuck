# Tuck

Tuck is an app for Web, Chrome, Android, and iOS that rescues the open tabs, screenshots, and saved links people plan to check later and never open again.

Built for the #BuildHybridAI 2026 Firebase Hybrid AI Hackathon.

## How hybrid inference works in Tuck

Tuck uses the Firebase AI Logic Hybrid Inference SDK across all platforms:

- On-device first (`PREFER_ON_DEVICE`): Summarizes and tags personal screenshots, saved tabs, and notes locally using Gemini Nano (Chrome and Android) and Apple Foundation Models (iOS). Private items stay on the device and work offline.
- Cloud fallback (`ONLY_IN_CLOUD` / automatic fallback): Handles multi-item synthesis (such as turning a group of saved travel tabs and screenshots into a weekend plan) and covers devices where no local model is available.

## Repository layout

- `web/` - React, Vite, and TypeScript web app using `firebase/ai`
- `chrome-extension/` - Manifest V3 extension for one-click tab tucking
- `android/` - Kotlin and Jetpack Compose app using `firebase-ai-ondevice`
- `ios/` - SwiftUI app using Firebase iOS SDK with Apple Foundation Models
- `firebase/` - Shared Firestore security rules, indexes, and Hosting config

## License

Licensed under the Apache License 2.0. See [LICENSE](LICENSE).
