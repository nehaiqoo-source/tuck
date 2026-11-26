# Devpost Submission Copy for Tuck

Use the fields below directly on the #BuildHybridAI 2026 Devpost submission form (`https://firebasehybridaihackathon.devpost.com/`).

## Project name

Tuck

## Elevator pitch (under 200 chars)

Read it later, actually. Save open tabs and screenshots once, then clear three a day with Firebase AI Logic on-device AI and masked Cloud Gemini.

## Try it out links

- Live web app: https://tucktabs.app
- Chrome Web Store (live extension, v0.3.1): https://chromewebstore.google.com/detail/tuck-read-it-later-actual/mjmekpiibndmcecdchamahmhfmijgjlh
- Android (Google Play 14-day Closed Testing track, v0.4.3, `app.tucktabs.android`): https://play.google.com/apps/testing/app.tucktabs.android
- GitHub (Apache 2.0 open source, Web, Chrome, Android, iOS): https://github.com/nehaiqoo-source/tuck
- Privacy policy: https://tucktabs.app/privacy.html
- Demo video (upload `demo/tuck-demo-2026-live.mp4` to YouTube first): [PASTE YOUTUBE DEMO LINK HERE]

## Built with

firebase, firebase-ai-logic, gemini-nano, gemini-3.5-flash-lite, firestore, firebase-app-check, firebase-auth, firebase-hosting, react, typescript, vite, chrome-extension, kotlin, jetpack-compose, swiftui

---

## Story (paste into Devpost Description)

## Inspiration

Most people carry dozens of open browser tabs and hundreds of screenshots in their camera roll. Saving a recipe, a clinic receipt, or an engineering thread feels productive in the moment, yet another list of 400 bookmarks turns into a backlog nobody opens.

Screenshots make this harder because phones mix everything together: travel maps sit right next to dental receipts, bank transfer confirmations, and personal chats. Sending raw personal screenshots straight to a cloud LLM feels uncomfortable, so those saves sit untouched for months.

We built Tuck to fix two problems at once: clearing older saves in small daily bites instead of piling up another endless inbox, and keeping private details on the user's device first.

## What it does

Tuck ("Read it later, actually.") works across Web (`tucktabs.app`), Chrome Extension (live on the Chrome Web Store), Android (live on Google Play Closed Testing), and an open-source SwiftUI iOS package, all backed by one Firebase project.

1. Zero-sorting capture across four platforms: Paste a link, record a voice note with Web Speech, drop a screenshot, tuck or rescue all open Chrome tabs in one click (`#tuck-batch=` handoff), or share directly from the Android Share Sheet (`ACTION_SEND`). New users start on a calm blank shelf, with an optional "Load sample demo items" button if reviewers want instant cards.
2. Daily 3-card triage deck: Instead of showing an intimidating wall of unread links, Tuck surfaces three older saves per day with a short AI summary, suggested next step, and three decisions (Do it, Keep on shelf, or Let it go).
3. One-click executable actions: Cards detect actionable tasks and generate an `.ics` calendar file download, a ready-to-copy email draft, or interactive mini-checklists right inside the card.
4. Separate Read Later and Bookmarks tabs with a visual Connection Map: Temporary links live in Read Later (with 14-day stale decay detection and one-click sweep), while keepers move to Bookmarks. The interactive SVG Connection Map groups saves by shared topic hubs so users can turn an entire cluster into a Cloud Gemini plan.
5. Ask your shelf: Natural-language Q&A lets users ask plain questions across saved tabs, receipts, and notes with direct source card citations.
6. Two-stage Local Privacy Shield: Before any query or synthesis leaves for Cloud Gemini, sensitive strings (emails, phone numbers, currency amounts, policy or claim IDs, and honorific names) are masked locally (`[EMAIL_1]`, `[PHONE_1]`, `[AMOUNT_1]`) and restored back only on the user's screen.

## How we built it

Everything shares a single Firebase backend (`tuck-hybrid-ai-2026-1d24c`) with Google Sign-In, Email/Password authentication, Firebase App Check (reCAPTCHA Enterprise), and offline-first Firestore rules (`firebase/firestore.rules`) that restrict every read and write to `users/{uid}/items/{itemId}` and block `imageDataUrl` uploads whenever `isPrivate` is true.

- Web app (`web/`): Built with React, Vite, and TypeScript, hosted live at `https://tucktabs.app`. Uses `firebase/ai` with `InferenceMode.PREFER_ON_DEVICE` (Chrome built-in Gemini Nano via Prompt API) and automatic fallback to Cloud Gemini (`gemini-3.5-flash-lite`) with JSON schema responses, 25s timeouts, and a live Hybrid AI inference log in the header.
- Chrome Extension (`chrome-extension/`, v0.3.1): Manifest V3 extension published on the Chrome Web Store. Offers one-click "Tuck this tab", right-click context menus, and "Rescue all open tabs (N)" batch cleanup that closes tab clutter and passes links to `https://tucktabs.app`.
- Native Android app (`android/`, v0.4.3): Built in Kotlin and Jetpack Compose under package `app.tucktabs.android`, targeting Android 16 (API 36) with R8 shrinking (`7.4 MB` signed release `.aab`) and edge-to-edge system bar insets. Uses `firebase-ai:17.11.0` and `firebase-ai-ondevice:16.0.0-beta01` (`PREFER_ON_DEVICE` via Android AICore), Android `ACTION_SEND` Share Sheet intents for text and images, `PrivacyShield.kt`, Ask Your Shelf, Read Later vs Bookmarks tabs, and real-time Firestore sync.
- Native iOS package (`ios/`): SwiftUI package built against `firebase-ios-sdk` (`FirebaseAI`), targeting Apple Foundation Models on-device with Cloud Gemini (`gemini-3.5-flash-lite`) fallback and the same Firestore document schema.

Multi-item Cloud Synthesis (`ONLY_IN_CLOUD`) triggers when a user selects two or more items on the shelf or clicks a topic cluster in the Connection Map, turning scattered links into a unified checklist or itinerary.

## Challenges we ran into

- Model availability across tiers: Older model IDs like `gemini-2.5-flash` returned `404` on new Firebase projects and larger preview models hit long timeouts on the Spark tier. Switching Cloud fallback and synthesis to `gemini-3.5-flash-lite` with token limits and `responseMimeType: 'application/json'` brought responses down to 2.7s to 5.5s.
- Android Firebase AI package imports: Moving to `firebase-ai:17.11.0` and `firebase-ai-ondevice:16.0.0-beta01` required discovering that `InferenceMode` and `OnDeviceConfig` moved to `com.google.firebase.ai` with `@OptIn(PublicPreviewAPI::class)`, alongside writing R8 ProGuard keep rules so Firestore model deserialization stayed intact in release builds.
- Firebase App Check setup: Classic reCAPTCHA v3 is deprecated in Firebase App Check, so web requests initially failed with `401` until we configured a reCAPTCHA Enterprise key inside the same GCP project.
- Android 16 edge-to-edge insets: Targeting API 36 caused top headers to collide with the status bar and washed out white system icons on our light cream paper background. Adding `enableEdgeToEdge` with explicit `SystemBarStyle.light` and `WindowInsets.safeDrawing` resolved both on the emulator.
- Store reviews and package conflicts: `com.tuck.app` was already taken on Google Play, so we moved to our domain-matched `app.tucktabs.android`. New personal Google Play developer accounts also require 14 continuous days of closed testing with 12 opted-in testers before Production opens, so the Android release is live on Play Closed Testing now while Production waits out the 14-day clock.

## Accomplishments that we are proud of

- Shipped three working user entry points live before submission: the web app at `https://tucktabs.app`, the Manifest V3 Chrome Extension live on the Chrome Web Store, and the native Android app approved on Google Play Closed Testing, plus the open-source SwiftUI iOS codebase.
- Built real privacy protection instead of a marketing toggle: private images are stripped before Firestore writes, security rules reject them at the backend, and the two-stage Local Privacy Shield masks and unmasks sensitive tokens around Cloud Gemini calls.
- Designed a cross-platform tool where people actually clear saves instead of hoarding them, starting every new user on an uncluttered blank shelf synced in real time across Web, Chrome, and Android.

## What we learned

Hybrid AI works well when on-device inference and cloud models handle different jobs: fast, offline-capable single-card summaries and privacy masking run locally first, and Cloud Gemini handles multi-item reasoning across several saved items once private fields are masked. Shipping across Chrome, Play Console, and Firebase Hosting in parallel also taught us how strict store compliance (API 36, R8 shrinking, App Check Enterprise, and privacy disclosures) shapes real production code early.

## What is next for Tuck

- Complete the remaining days of Google Play's mandatory 14-day closed testing window with our testers and publish `app.tucktabs.android` directly to Google Play Production.
- Publish the iOS App Store build using the `ios/` SwiftUI package and shared Firebase backend.
- Add optional daily reminder notifications on Android and Web Push when older saves hit the 14-day stale decay window.

## Platform status and testing notes for judges

- Live Web App (`https://tucktabs.app`): Publicly live now. Works immediately without login in local preview mode, or click "Sign in to sync" (Google or Email/Password) to test real-time Firestore sync.
- Chrome Extension (`https://chromewebstore.google.com/detail/tuck-read-it-later-actual/mjmekpiibndmcecdchamahmhfmijgjlh`): Published and live on the Chrome Web Store (`v0.3.1`). Install directly in Chrome to test 1-click tab tucking and "Rescue all open tabs".
- Android App (`https://play.google.com/apps/testing/app.tucktabs.android`): Release `v0.4.3` (`app.tucktabs.android`) passed Google Play review and is currently in Google Play's mandatory 14-day Closed Testing phase required for personal developer accounts (12 testers for 14 days before public Production unlocks). Full source code and signed release configuration live in `android/`.
- iOS App (`ios/`): Complete SwiftUI implementation ready to build in Xcode with `GoogleService-Info.plist`.
