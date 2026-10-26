# Android test APK

Download `little-match-adventure-test.apk` on Android, open the downloaded file, and follow Android's installation prompts. If prompted, allow installation from the browser you used.

This is an installable debug build for Android 6.0 and later. It bundles the game for offline play and uses **Google test ads**, which do not earn revenue. Browser progress and APK progress are separate. Progress inside the APK persists across restarts and upgrades signed with the same key; uninstalling or clearing app data removes it.

The APK was built from the accompanying version 0.2.0 sources, passed Android lint, and had its APK signature and bundled assets verified. Real-device gameplay, audio quality, and native ad delivery still need testing. Production distribution uses the release AdMob configuration and requires the owner's release signing key.

`SHA256SUMS` records the download's checksum. The Android project and build instructions are in the repository root README. Android APK workflow artifacts may be signed with a different debug key from this cloud build; use this download for same-key cloud-built updates.
