/* Web builds show explicitly labeled demos; Android uses the native AdMob bridge. */
window.LMAAds = (() => {
  const dialog = document.querySelector("#ad-dialog");
  let active = false;
  let translate = (key) => key;
  let nativeResult = null;
  let nativePresented = null;
  let requestId = 0;
  const native = () =>
    Boolean(window.AndroidAds && typeof window.AndroidAds.show === "function");
  window.onNativeAdResult = (id, result) => {
    if (nativeResult && id === requestId) nativeResult(result);
  };
  window.onNativeAdPresented = (id) => {
    if (nativePresented && id === requestId) nativePresented();
  };
  function nativeShow(kind) {
    const id = ++requestId;
    return new Promise((resolve) => {
      const timeout = setTimeout(
        () => done({ status: "unavailable", rewarded: false }),
        25000,
      );
      function done(result) {
        clearTimeout(timeout);
        nativeResult = null;
        nativePresented = null;
        resolve(result);
      }
      nativeResult = done;
      nativePresented = () => clearTimeout(timeout);
      try {
        window.AndroidAds.show(kind, id);
      } catch {
        done({ status: "unavailable", rewarded: false });
      }
    });
  }
  function demo(kind) {
    return new Promise((resolve) => {
      let remaining = 5000,
        last = performance.now(),
        timer;
      dialog.innerHTML = `<div class="ad-label">${translate("advert")}</div><div class="ad-frame"><span class="test-label">${translate("testAdvert")}</span><img src="assets/worlds/meadow.svg" alt=""><div class="ad-copy"><span class="brand-mark">✿</span><h2>Little Match Adventure</h2><p>${translate("sponsor")}</p></div></div><p class="ad-disclaimer">${translate("adTestNotice")}</p><button class="button" id="ad-continue" disabled></button>${kind === "rewarded" ? `<button class="text-button" id="ad-cancel">${translate("cancel")}</button>` : ""}`;
      const button = dialog.querySelector("#ad-continue");
      function finish(rewarded) {
        clearInterval(timer);
        dialog.close();
        resolve({ status: "demo", rewarded });
      }
      function tick() {
        const now = performance.now();
        if (!document.hidden) remaining -= Math.min(250, now - last);
        last = now;
        const seconds = Math.max(0, Math.ceil(remaining / 1000));
        button.textContent = seconds
          ? translate("countdown", { n: seconds })
          : translate("adContinue");
        button.disabled = seconds > 0;
        if (seconds === 0) clearInterval(timer);
      }
      button.onclick = () => {
        if (remaining <= 0) finish(true);
      };
      if (kind === "rewarded")
        dialog.querySelector("#ad-cancel").onclick = () => finish(false);
      dialog.oncancel = (event) => {
        event.preventDefault();
        if (kind === "rewarded") finish(false);
      };
      dialog.showModal();
      tick();
      timer = setInterval(tick, 100);
    });
  }
  return {
    isNative: native,
    isActive: () => active,
    async show(kind, t) {
      if (active) return { status: "busy", rewarded: false };
      active = true;
      translate = t;
      window.LMAAudio.pause(true);
      try {
        return native() ? await nativeShow(kind) : await demo(kind);
      } finally {
        active = false;
        window.LMAAudio.pause(false);
      }
    },
  };
})();
