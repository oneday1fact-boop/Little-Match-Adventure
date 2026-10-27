package com.littlematch.adventure;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.widget.FrameLayout;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.annotation.NonNull;
import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import androidx.webkit.WebViewAssetLoader;
import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.RequestConfiguration;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;
import java.util.concurrent.atomic.AtomicBoolean;

/** Local-only WebView host. The JavaScript bridge is never exposed to remote pages. */
public final class MainActivity extends ComponentActivity {
    private static final String ORIGIN = "appassets.androidplatform.net";
    private WebView web;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final AtomicBoolean sdkStarted = new AtomicBoolean(false);
    private boolean adsReady = false;
    private boolean requestActive = false;
    private int activeId = -1;
    private boolean rewardEarned = false;
    private boolean adPresented = false;
    private InterstitialAd interstitial;
    private RewardedAd rewarded;
    private Runnable requestTimeout;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        web = new WebView(this);
        web.setBackgroundColor(0xfffcf7ed);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        WebViewAssetLoader assets = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if ("https".equals(request.getUrl().getScheme()) && ORIGIN.equals(request.getUrl().getHost())) return assets.shouldInterceptRequest(request.getUrl());
                return new WebResourceResponse("text/plain", "UTF-8", 403, "Blocked", java.util.Collections.emptyMap(), new java.io.ByteArrayInputStream(new byte[0]));
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !"https".equals(request.getUrl().getScheme()) || !ORIGIN.equals(request.getUrl().getHost());
            }
        });
        web.addJavascriptInterface(new AdBridge(), "AndroidAds");
        FrameLayout root = new FrameLayout(this);
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets;
        });
        setContentView(root);
        root.requestApplyInsets();
        web.loadUrl("https://" + ORIGIN + "/assets/www/index.html");
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() { handleBack(); }
        });
        requestConsentAndInitialize();
    }

    private void requestConsentAndInitialize() {
        // Applied before SDK initialization or any ad request. No advertising-ID permission.
        RequestConfiguration configuration = new RequestConfiguration.Builder()
            .setTagForChildDirectedTreatment(RequestConfiguration.TAG_FOR_CHILD_DIRECTED_TREATMENT_TRUE)
            .setTagForUnderAgeOfConsent(RequestConfiguration.TAG_FOR_UNDER_AGE_OF_CONSENT_TRUE)
            .setMaxAdContentRating(RequestConfiguration.MAX_AD_CONTENT_RATING_G).build();
        MobileAds.setRequestConfiguration(configuration);
        ConsentInformation consent = UserMessagingPlatform.getConsentInformation(this);
        ConsentRequestParameters parameters = new ConsentRequestParameters.Builder()
            .setTagForUnderAgeOfConsent(true).build();
        consent.requestConsentInfoUpdate(this, parameters, () -> {
            UserMessagingPlatform.loadAndShowConsentFormIfRequired(this, error -> {
                if (consent.canRequestAds()) initializeAds();
            });
        }, error -> { if (consent.canRequestAds()) initializeAds(); });
        if (consent.canRequestAds()) initializeAds();
    }

    private void initializeAds() {
        if (!sdkStarted.compareAndSet(false, true)) return;
        MobileAds.initialize(this, status -> runOnUiThread(() -> { adsReady = true; preloadInterstitial(); preloadRewarded(); }));
    }

    private AdRequest adRequest() {
        Bundle extras = new Bundle(); extras.putString("npa", "1");
        return new AdRequest.Builder().addNetworkExtrasBundle(com.google.ads.mediation.admob.AdMobAdapter.class, extras).build();
    }

    private void preloadInterstitial() {
        if (!adsReady || isFinishing() || isDestroyed()) return;
        InterstitialAd.load(this, BuildConfig.INTERSTITIAL_ID, adRequest(), new InterstitialAdLoadCallback() {
            @Override public void onAdLoaded(@NonNull InterstitialAd ad) { interstitial = ad; }
            @Override public void onAdFailedToLoad(@NonNull LoadAdError error) { interstitial = null; }
        });
    }

    private void preloadRewarded() {
        if (!adsReady || isFinishing() || isDestroyed()) return;
        RewardedAd.load(this, BuildConfig.REWARDED_ID, adRequest(), new RewardedAdLoadCallback() {
            @Override public void onAdLoaded(@NonNull RewardedAd ad) { rewarded = ad; }
            @Override public void onAdFailedToLoad(@NonNull LoadAdError error) { rewarded = null; }
        });
    }

    private final class AdBridge {
        @JavascriptInterface public void show(String kind, int id) { runOnUiThread(() -> showAd(kind, id)); }
    }

    private void showAd(String kind, int id) {
        if (requestActive || isFinishing() || isDestroyed()) { sendResult(id, "unavailable", false); return; }
        requestActive = true; activeId = id; rewardEarned = false; adPresented = false;
        if (!adsReady) { finishRequest(id, "unavailable"); return; }
        requestTimeout = () -> { if (!adPresented) finishRequest(id, "unavailable"); };
        handler.postDelayed(requestTimeout, 15000);
        if ("rewarded".equals(kind)) {
            if (rewarded != null) { presentRewarded(rewarded, id); rewarded = null; }
            else RewardedAd.load(this, BuildConfig.REWARDED_ID, adRequest(), new RewardedAdLoadCallback() {
                @Override public void onAdLoaded(@NonNull RewardedAd ad) { if (requestActive && activeId == id) presentRewarded(ad, id); }
                @Override public void onAdFailedToLoad(@NonNull LoadAdError error) { finishRequest(id, "unavailable"); }
            });
        } else if ("interstitial".equals(kind)) {
            if (interstitial != null) { presentInterstitial(interstitial, id); interstitial = null; }
            else InterstitialAd.load(this, BuildConfig.INTERSTITIAL_ID, adRequest(), new InterstitialAdLoadCallback() {
                @Override public void onAdLoaded(@NonNull InterstitialAd ad) { if (requestActive && activeId == id) presentInterstitial(ad, id); }
                @Override public void onAdFailedToLoad(@NonNull LoadAdError error) { finishRequest(id, "unavailable"); }
            });
        } else finishRequest(id, "unavailable");
    }

    private FullScreenContentCallback callbacks(int id) {
        return new FullScreenContentCallback() {
            @Override public void onAdDismissedFullScreenContent() { finishRequest(id, "closed"); }
            @Override public void onAdFailedToShowFullScreenContent(@NonNull AdError error) { finishRequest(id, "unavailable"); }
        };
    }
    private void markPresented() { adPresented = true; if (requestTimeout != null) handler.removeCallbacks(requestTimeout); web.evaluateJavascript("window.onNativeAdPresented && window.onNativeAdPresented(" + activeId + ")", null); }
    private void presentInterstitial(InterstitialAd ad, int id) {
        markPresented(); ad.setFullScreenContentCallback(callbacks(id)); ad.show(this);
    }
    private void presentRewarded(RewardedAd ad, int id) {
        markPresented(); ad.setFullScreenContentCallback(callbacks(id));
        ad.show(this, reward -> { if (requestActive && activeId == id) rewardEarned = true; });
    }
    private void finishRequest(int id, String status) {
        if (!requestActive || activeId != id) return;
        if (requestTimeout != null) handler.removeCallbacks(requestTimeout);
        sendResult(id, status, rewardEarned);
        requestActive = false; activeId = -1; preloadInterstitial(); preloadRewarded();
    }
    private void sendResult(int id, String status, boolean earned) {
        if (web == null || isDestroyed()) return;
        web.evaluateJavascript("window.onNativeAdResult && window.onNativeAdResult(" + id + ", {status:'" + status + "',rewarded:" + earned + "})", null);
    }
    @Override protected void onPause() { if (web != null) { web.evaluateJavascript("window.LMAAudio && window.LMAAudio.pause(true)", null); web.onPause(); } super.onPause(); }
    @Override protected void onResume() { super.onResume(); if (web != null) { web.onResume(); if (!requestActive) web.evaluateJavascript("window.LMAAudio && window.LMAAudio.pause(false)", null); } }
    private void handleBack() {
        if (requestActive) return;
        web.evaluateJavascript("window.lmaAndroidBack ? window.lmaAndroidBack() : false", result -> { if (!"true".equals(result)) finish(); });
    }
    @Override protected void onDestroy() { handler.removeCallbacksAndMessages(null); if (web != null) { web.removeJavascriptInterface("AndroidAds"); web.destroy(); web = null; } super.onDestroy(); }
}
