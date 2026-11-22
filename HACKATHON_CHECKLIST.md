# Tuck - #BuildHybridAI 2026 Checklist

Deadline: November 30, 2026 at 2:00 PM PST

## Mandatory Hackathon Requirements
- [x] Monorepo initialized with Apache 2.0 `LICENSE` (preferred by hackathon)
- [x] Public GitHub repository created and pushed (`https://github.com/nehaiqoo-source/tuck`)
- [x] Firebase project (`tuck-hybrid-ai-2026-1d24c`) created, Web/Android/iOS apps registered, Firestore database + security rules + indexes deployed
- [ ] Enable Firebase AI Logic (Gemini Developer API) + Google Auth in Firebase Console (or run `npx -y firebase-tools@latest init ailogic` in terminal)
- [x] **Web App** (`web/`) using `firebase/ai` with `InferenceMode.PREFER_ON_DEVICE` + Cloud Gemini synthesis + live inference source badge (`On-Device` vs `Cloud`)
- [x] **Chrome Extension** (`chrome-extension/`) Manifest V3 one-click "Tuck this tab" + on-device summary + auto-close tab
- [x] **Android App** (`android/`) Kotlin + Jetpack Compose + `firebase-ai-ondevice` (`PREFER_ON_DEVICE`) + Android Share Sheet
- [x] **iOS App** (`ios/`) SwiftUI + Firebase iOS SDK (`FirebaseAI`) + shared Firestore schema
- [x] Live deployed Web URL on Firebase Hosting (`https://tuck-hybrid-ai-2026-1d24c.web.app`)
- [ ] Demo video (<= 3 minutes) showing on-device offline triage + cloud fallback + multi-platform sync
- [ ] Final Devpost submission with repo link, demo video, and write-up

## Judging Criteria Alignment
1. **Technological Implementation:** Real `PREFER_ON_DEVICE` hybrid routing + explicit `ONLY_IN_CLOUD` multi-item synthesis + live latency/source telemetry in UI.
2. **Design:** Warm, quiet, low-friction UI with daily 3-card triage deck (*Do it, Keep it, Let it go*).
3. **Potential Impact:** Solves the universal digital graveyard problem (tabs, screenshots, saved links) while keeping private captures local.
4. **Quality of the Idea:** True cross-platform workflow where Chrome Extension, Web, Android, and iOS each play a natural role.
