# Production Console entry guide

These answers describe version 1.0.0 (5), package com.littlematch.adventure. This document is prepared for owner entry; no Play Console submission has been made. Answer the exact questions shown in your current Console. Google can change categories, SDK requirements, and eligibility checks.

## App access
All gameplay is available without login, membership, QR code, location restriction, or special credentials. No reviewer credentials are required. Ads need a network connection; no-fill does not block gameplay.

## Ads
Yes, the app contains ads. It uses Google AdMob interstitial and rewarded ads, with no banner or mediation adapters added by the developer. Interstitials are requested between games after every three completions. Hints offer a rewarded ad and grant a free fallback if no ad is available. Live units are configured for the production release.

## Target audience and content
Select both “Ages 5 and under” and “Ages 6–8”, as confirmed by the owner. The app is directed to children, not a mixed audience requiring an age screen. All requests use child-directed treatment, under-age-of-consent treatment, maximum G content rating, and non-personalized advertising. No chat, account registration, social networking, user-generated content, real-money gambling, or in-app purchasing.

Complete the Families declarations. Confirm the exact installed Google Mobile Ads SDK version (24.7.0) is permitted by the current Families self-certified SDK list, and review AdMob app/unit settings, categories, and serving restrictions for a children-only app. Check real served creatives, close controls, and rewarded-hint presentation against current Families ad-format requirements. A child flag or G rating alone does not establish compliance. Do not click your own live ads while testing; use a registered test device or the internal test-ad build.

## Advertising ID
The merged release manifest is checked to exclude com.google.android.gms.permission.AD_ID; the app also removes AdServices ID/attribution/topics permissions. Answer “No” for use of Android Advertising ID for this artifact. This is distinct from the Data safety category “Device or other IDs,” which can cover other SDK identifiers.

## Data safety — SDK-aware draft
Do not select “No data collected”: native Google SDKs send information off the device. Do not treat non-personalized ads as zero collection. Review Google's current Mobile Ads SDK disclosure before submitting:
https://developers.google.com/admob/android/privacy/play-data-disclosure
https://developers.google.com/admob/android/privacy

The automated environment could not access these official pages (HTTP 403), so the table below is a conservative starting point, not a verified current vendor disclosure. Confirm collection/sharing, purpose, optionality, and child-directed exceptions with the current disclosure and your AdMob account configuration. No mediation or extra analytics SDK is bundled.

| Data safety category | Expected SDK handling to verify | Purposes to verify |
| --- | --- | --- |
| Approximate location | Collected/shared via IP-based location; no GPS/precise-location permission | Advertising or marketing; analytics; fraud prevention, security and compliance |
| App activity → App interactions | Collected/shared for ad impressions, taps and video interactions | Advertising or marketing; analytics; fraud prevention, security and compliance |
| App info and performance → Crash logs, Diagnostics | Collected/shared for SDK diagnostics and performance | Analytics; fraud prevention, security and compliance |
| Device or other IDs | Confirm SDK identifiers remaining with child-directed flags and advertising-ID permission absent; disclose those actually processed | Advertising or marketing; analytics; fraud prevention, security and compliance |

- The app does not collect user-entered names, email, birth dates, precise GPS location, financial/payment details, contacts, messages, photos, audio, files/documents, health/fitness, or browsing history. A support email voluntarily sent outside the app is different from in-app collection.
- The developer's own game saves stay in local WebView storage; do not list stages/preferences as off-device developer analytics. Android account backup/device transfer may preserve them according to system settings; disclose this in the privacy policy.
- SDK traffic uses HTTPS; answer encryption in transit based on current SDK documentation as well as the app's cleartext-disabled configuration.
- Do not claim all SDK data is processed ephemerally or that all users can opt out merely because offline gameplay is possible. SDK startup occurs when online. Default to required SDK collection unless the verified disclosure establishes otherwise.
- No account can be created; account-deletion requirements do not imply an account exists. There is no developer server storing a player profile. Local data can be cleared in Android Settings. Do not promise SDK server deletion or invent a deletion URL. Contact oneday1fact@gmail.com for privacy requests; Google controls its own records and retention.
- Data safety “sharing” exceptions must be assessed using Google's current definitions, not assumed from the label “service provider.”

## Content rating (IARC)
Complete the questionnaire for a matching/puzzle game: no violence, sexual content, strong language, gambling, controlled substances, user interaction, location sharing, or paid random items. Ads are present. Do not pre-select a final “Everyone” or PEGI rating; IARC assigns ratings from the answers.

## Other app-content declarations
No news service, financial features, health features, government affiliation, or foreground-service use is implemented. No camera, microphone, storage, contacts, location, or notification runtime permission is requested. If a Console question covers a broader definition, answer that actual question instead of blindly copying this list.

## Owner-side release steps still required
1. Confirm production access on Dashboard. If closed testing or an access application is required, finish that before production. Successful internal testing alone does not establish eligibility.
2. Confirm support email, verified developer identity and any required trader/business/contact details in Console; these cannot be inferred from the repository.
3. Save listing text and artwork from store/. Open the live privacy URL in a signed-out browser and on a phone; it must be accessible without login, geographic restriction, or a PDF download.
4. Complete App content with the answers above after checking current SDK documentation and Families requirements.
5. In AdMob, confirm this app's Play link and units, G/child-directed serving settings, policy center, consent/privacy messages where applicable, and app readiness. Set a developer website you control. Host the account-provided app-ads.txt at the WEBSITE DOMAIN ROOT; a file only under this GitHub project path does not satisfy root-domain verification. Do not invent a verified domain.
6. Select all available production countries/regions as requested, subject to account eligibility and Google restrictions. Complete pricing/free status and regional requirements.
7. Create a production release, upload downloads/little-match-adventure-release.aab (1.0.0, code 5), retain existing Play App Signing, add release notes, and review pre-launch/device reports. Do not upload the archived internal or debug artifact.
8. Resolve Console errors, confirm ad/policy configuration on a registered test device without generating live clicks, and submit for Google review. Start rollout only when the Console allows it and all owner declarations are accurate. The owner requested worldwide availability but has not yet confirmed production-access status.

No production submission, approval, live ad fill, worldwide availability, or policy acceptance is established by a successful local build.
