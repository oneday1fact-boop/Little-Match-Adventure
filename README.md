# Little Match Adventure

A colorful animal memory game with original illustrations, four themed worlds, 80 stages, and 11 languages. Built with HTML, CSS, and JavaScript, with a native Android host for Google AdMob.

## Try the browser game

No build or runtime dependencies are required:

```sh
python3 -m http.server 8000 --bind 0.0.0.0
```

Serve the repository root. GitHub Pages can continue using `main` and `/ (root)`. All asset and service-worker paths are relative, including when hosted under a repository subpath. The browser game can be installed to the Android home screen and works offline after its first successful load. Use HTTPS or localhost for installation/offline support.

## What is included

- English, Spanish, Traditional Chinese, Simplified Chinese, Arabic (RTL), Hindi, Portuguese, French, Japanese, German, and Korean. Language preferences persist; changing language keeps the current board.
- Four sequentially unlocked worlds: Sunny Meadow, Whispering Woods, Ocean Explorers, and Safari Sunshine. Each contains 20 stages, increasing from 3 to 8 pairs.
- 31 original animal SVG portraits and four original landscape backgrounds. No gameplay emoji or remote artwork.
- Original gentle pentatonic background music and separate button sounds, each with its own saved on/off control. Music starts only after a user gesture, pauses while the app is hidden or showing an ad, and is off by default.
- Animated card flips, match feedback, confetti, stars, dancing animals, and progress celebrations; reduced-motion preferences are respected.
- Stage progress, sound/language settings, completed-game count, and the current board's matched pairs save locally after changes. Original v1 Meadow progress migrates automatically. Storage failures are disclosed on-screen. Browser and APK storage are separate; clearing app/site data clears its progress.
- Parent corner and age badge removed.

## Advertisements

**AdMob is native Android functionality, not a GitHub Pages integration.** The browser version shows explicitly labeled five-second _test previews_ with no ad network traffic or revenue. Those previews are not live advertisements.

In the Android app, the Google Mobile Ads SDK requests an interstitial after every three completed games, including replayed stages. AdMob controls the ad duration and dismiss button. Hint requests open an opt-in rewarded-ad prompt. A hint is granted only after the SDK's reward-earned callback and dismissal; cancelling a reward yields no hint. If the ad cannot load, play continues and a requested hint is given free. Progress saves before a scheduled ad, and pending scheduled breaks survive a browser reload.

| Build   | App ID                                   | Interstitial                             | Rewarded                                 |
| ------- | ---------------------------------------- | ---------------------------------------- | ---------------------------------------- |
| Debug   | Google's official sample app             | Google test unit                         | Google test unit                         |
| Release | `ca-app-pub-9967525901358281~6387998613` | `ca-app-pub-9967525901358281/1786408629` | `ca-app-pub-9967525901358281/9910768661` |

Debug builds always use Google's official test IDs. These public identifiers are stored in `android/app/build.gradle`; they are not account credentials. Live ad serving depends on AdMob app/unit readiness and inventory and must be validated on a device before release.

The Android host configures child-directed treatment, under-age-of-consent treatment, G-rated inventory, and non-personalized requests before initializing ads. It uses Google's User Messaging Platform before requesting ads and removes the advertising-ID permission. Unlike the standalone web game, the Android advertising SDK communicates with Google; the publisher's privacy disclosures must describe that behavior.

## Download the Android test APK

Download [little-match-adventure-test.apk](downloads/little-match-adventure-test.apk) on an Android device, then open the downloaded file and follow Android's install prompts. This is a Google-test-ad build. The file is also available at the site's `/downloads/little-match-adventure-test.apk` path after deployment.

## Build an Android APK

Requires JDK 17 or 21 and Android SDK platform 35. Android 6.0 / API 23 and later are supported. Set `ANDROID_HOME` to the SDK, or use an ignored `android/local.properties` containing `sdk.dir=/your/sdk/path`.

```sh
cd android
./gradlew assembleDebug lintDebug
```

Installable test APK: `android/app/build/outputs/apk/debug/app-debug.apk`.

```sh
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

The APK bundles the web game for offline use; ads require an Internet connection. It loads only its own local HTTPS assets, blocks navigation to remote pages, and exposes the ad bridge only to that local app. Android Back navigates back through the game before closing it.

For an APK download through GitHub, open **Actions → Android APK → Run workflow**. After it finishes, download **Little-Match-Adventure-test-APK** from the run's Artifacts section, extract it, then install `app-debug.apk` on your Android device. This workflow becomes available after these files are pushed.

`./gradlew assembleRelease` produces an unsigned release APK configured with the owner's AdMob IDs. A distributable release must be signed with the owner's release key outside version control. No production signing key is generated or stored here. This project does not publish an app to Google Play.

## Automated checks

Development dependencies are only needed for browser tests:

```sh
npm ci
npx playwright install chromium
npm run check
# Start the local server above in another terminal, then:
npm test
```

`tests/browser.cjs` exercises every stage in all four worlds; saved board/progress migration; 11 languages and RTL; mobile overflow; audio preferences; rewarded success/cancel/no-fill; and the every-third-game ad cadence. It mocks only the external native ad bridge, and separately checks real browser demo timing. `tests/audio.cjs` checks independent music/effects buses and visibility/ad muting. `tests/offline.cjs` checks service-worker offline startup, cached illustration loading, offline board recovery, reduced motion, and denied-storage fallback. Set `CHROMIUM_PATH` for a custom browser or `LMA_TEST_URL` for a different server or subpath.

Native compilation/lint and browser checks do not establish real-device audio quality, live ad delivery, or Play Store approval. Test the APK on an Android device before release. Translation coverage is tested; native-speaker review is still useful before a public launch.
