# Google Play internal testing handoff

## Upload this file

`downloads/little-match-adventure-internal.aab`

- Package: `com.littlematch.adventure`
- Version name: `0.2.1-internal`
- Version code: `3`
- Minimum Android: 6.0 / API 23
- Target Android: Android 16 / API 36
- App label on the device: **Little Match Adventure (Test)**
- Build: non-debuggable, upload-key signed, Google test ads only

The existing `little-match-adventure-test.apk` is the older direct-install debug build. Do not upload it to Play Console. The AAB is installed through Google Play, not by tapping the AAB file on a phone.

## Play Console steps

1. Sign in to your Google Play Console developer account and choose **Create app**. Use **Little Match Adventure**, your preferred default language, **Game**, and **Free**. Complete the declarations accurately for the game and advertising SDK.
2. Open the new app's **Testing → Internal testing** track (it may appear under **Test and release**). Create a new release.
3. When prompted for **Play App Signing**, let Google generate and protect the app signing key. The bundle is already signed with a separate upload key. Keep package `com.littlematch.adventure`; Play package identities cannot be renamed later.
4. Upload `little-match-adventure-internal.aab`. Use release name `0.2.1-internal` and the release notes below. Resolve any requirements or errors displayed by Play Console; no Console upload has been performed from the cloud environment.
5. Add testers under the track's **Testers** tab, using an email list or Google Group. Include the Google account used on your own test phone. Save the list and release configuration.
6. Review and roll out the release to **Internal testing**, then copy the track's opt-in link. Share that link with approved testers. Testers must open it using the Google account you added, opt in, and install the app from Google Play.

The Console's current eligibility and app-content checks are authoritative. This handoff does not establish Play acceptance or review completion.

## Suggested release notes

First internal test of Little Match Adventure:

- Four illustrated animal worlds and 80 matching stages.
- Eleven languages, including Arabic right-to-left layout.
- Separate music and button-sound controls.
- Saved stage and unfinished-board progress.
- Optional rewarded hints and interstitials after every three games, using Google test ads.
- Offline gameplay and animated celebrations.

## Tester guide

Share `docs/INTERNAL_TESTING.md`. Prioritize real-device matching, saved progress after closing the app, language changes, background audio, reward-earned versus cancelled ads, offline/no-fill handling, Android Back, and phone/tablet layouts.

The Play app and the existing `.debug` APK have different package identities, so progress does not transfer between them. Subsequent Play updates should retain the Play app's local progress unless app data is cleared or the app is uninstalled.

## Later production release

Do not promote this test-ad bundle unchanged for live-ad monetization. Each new Play upload must use a higher version code than previously uploaded builds (the current code is 3). After internal testing, build the `release` variant with the same upload key, a higher version code, and the owner's live AdMob configuration; verify that release separately before rollout.

## Upload key ownership and backup

A dedicated upload key was created for this new app. Its encrypted keystore and private password metadata are retained **outside Git**, in the cloud environment at:

- `/workspace/.tools/lma-signing/upload-key.p12`
- `/workspace/.tools/lma-signing/signing.json`

Both files are private; the containing directory is restricted to its owner. They are not served by the game's web server and must not be added to the public repository or shared in chat. Preserve the cloud environment and make a secure owner-controlled backup of both files before deleting or replacing it. Publishing the prepared cloud environment retains its installed filesystem; it is not a substitute for an independent backup.

Only the **public** certificate, `downloads/upload-certificate.pem`, is included in Git. A public certificate cannot sign updates. Google's app signing key and this upload key serve different purposes; retain the upload key for future uploads. If an upload key is lost, use Play Console's upload-key reset process rather than creating an unrelated app/package.

## Rebuilding

In the prepared cloud environment:

```sh
python3 scripts/build-play-bundle.py
```

The helper reads private signing configuration without printing its values, builds `bundleInternal` and `lintInternal`, verifies the bundle's signature, package, API target, non-debuggable status, exact game assets, and test ad IDs, then refreshes the downloadable AAB and public certificate.

For a different development machine, supply `LMA_UPLOAD_KEYSTORE`, `LMA_UPLOAD_STORE_PASSWORD`, `LMA_UPLOAD_KEY_ALIAS`, and `LMA_UPLOAD_KEY_PASSWORD` securely to the process, or point `LMA_SIGNING_CONFIG` to a private JSON configuration with `keystore`, `alias`, `storePassword`, and `keyPassword` fields. Keep those values out of Git and command-line arguments. JDK 17/21 and Android SDK platform 36 are required.

For environment setup or validation without rewriting tracked download artifacts, use `python3 scripts/build-play-bundle.py --no-downloads`. Verified outputs then stay in the ignored Android build directory.
