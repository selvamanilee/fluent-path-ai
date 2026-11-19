# iOS Safari / iPadOS manual test checklist

Automated tests use Chromium with iPhone 13 / Pixel 7 emulation, because WebKit was not available in CI. Emulation covers viewport, touch and user-agent, **not** Safari's engine. Run this checklist on a real device before release.

| # | Check | Expected |
|---|---|---|
| 1 | Open in Safari → Share → Add to Home Screen | Icon = FluentPath mark; name "FluentPath" |
| 2 | Launch from home screen | Standalone (no Safari UI); dark status bar; content not under the notch or home indicator |
| 3 | Rotate to landscape on the daily session | No horizontal scroll; safe-area padding on the left/right |
| 4 | Focus the writing textarea / chat input | No zoom-in (inputs are 17px); keyboard doesn't cover the Send button after scrolling |
| 5 | Tap a 🔊 button | Word is spoken (first tap after launch must be a user gesture) |
| 6 | Tap 🎤 in Speak (iOS 14.5+) | Mic permission prompt; transcript appears; deny → friendly "type instead" message |
| 7 | Airplane mode → reopen app | App shell + previously opened lessons load; offline banner shown |
| 8 | Deploy a new version → reopen | "A new version is ready — Update" banner |
| 9 | Close app for >15 min, reopen | Still signed in (refresh cookie); progress intact |
| 10 | VoiceOver on dashboard + an MCQ | Buttons and radios announced with labels; progress bars announce values |

Known iOS limits: no `beforeinstallprompt` (install guidance is shown in Settings instead); the speech recognition API exists only in Safari 14.5+; storage may be evicted after weeks of non-use, so content is re-fetched online.
