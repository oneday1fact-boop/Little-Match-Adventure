# Internal testing — direct APK 0.2.0 / Play bundle 0.2.2-internal

## Play Console handoff

Use `docs/PLAY_CONSOLE_HANDOFF.md` for the signed `0.2.2-internal` AAB, upload-key ownership, and Play Console release steps. Test ads remain enabled in this build.

## Build and distribution

The existing `downloads/little-match-adventure-test.apk` is installable on Android 6.0 and later and uses Google test ad units. It is suitable for direct distribution to a small tester group.

For Google Play internal testing, prepare a non-debuggable Android App Bundle signed with the owner's upload key. Retain `com.littlematch.adventure` as the package identity unless the owner has already registered a different package. Use Google test ad units for this testing phase. The existing release configuration contains live ad IDs; do not use it unchanged for tester ad interactions. The signed internal AAB is prepared separately from the production variant. No Play Console upload or rollout has been performed.

## First test group

Start with a small group of adults using different Android phones and tablets. Include at least one older supported device and a recent Android device. If caregivers observe children playing, collect feedback from the caregivers rather than collecting personal information from children.

## Tester instructions

1. Install the supplied build. Note the game version, Android version, and device model.
2. Play through three stages. Check that matches stay revealed, mismatches turn back, rapid tapping cannot reveal a third tile, and the completion animation finishes normally.
3. Check that the test interstitial is requested after the third completed game. Native ad timing and close controls belong to AdMob. If an ad cannot load, the game should continue.
4. Request a hint. Try cancelling, closing an ad before earning a reward, and completing a rewarded test ad. Only a confirmed earned reward should unlock the hint; no-fill gives a free hint.
5. Switch music and button sounds independently. Background the app, return, and check that audio does not continue over ads or while the app is hidden.
6. Change language during a game. Include Arabic right-to-left layout, both Chinese scripts, and a language with longer labels. The current board and matched pairs should remain intact.
7. Close and reopen the app after finding a pair and after completing a stage. The board, completed stages, language, and sound preferences should be retained.
8. Turn off Internet access and reopen the app. Gameplay and illustrations should remain available. An unavailable ad should not trap the player.
9. Explore the world map and verify sequential world unlocks. Check both a small board and an eight-pair board on a phone and tablet, in portrait and landscape.
10. Check Android Back: board to world map, map to home, then exit. Verify that text and controls do not overlap status or navigation bars.

Browser and APK saves are separate. Uninstalling or clearing app data removes local progress. Updating an APK preserves progress only when the app identity and signing key remain compatible; avoid swapping between independently signed debug builds during a persistence test.

## Feedback template

- Build/version:
- Device and Android version:
- Language:
- World and stage:
- Steps to reproduce:
- Expected result:
- Actual result:
- How often it occurs:
- Screenshot or short recording, with personal information removed:

## Exit criteria

Fix crashes, blocked navigation, lost progress during ordinary restarts, broken matching, unreadable layouts, and incorrect reward handling before expanding the test. Keep native-device results separate from automated browser results. Record no-fill separately from a successfully displayed test ad; no-fill does not verify native ad presentation.

## Existing verification

The browser suite has exercised all 80 stages, locale coverage/RTL, save migration, in-progress recovery, reward outcomes, ad cadence, offline assets, and storage failure recovery. Android debug compilation, lint, APK signature verification, and bundled-asset checks passed. Real-device findings should be recorded during this internal test. Production signing, live-ad readiness, and Play Console distribution remain separate steps.
