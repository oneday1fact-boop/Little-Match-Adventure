/* Run: node tests/browser.cjs (requires Playwright and Chromium). */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const base = process.env.LMA_TEST_URL || "http://127.0.0.1:8000/";
const browserPath =
  process.env.CHROMIUM_PATH ||
  (require("node:fs").existsSync("/usr/bin/chromium")
    ? "/usr/bin/chromium"
    : chromium.executablePath());
async function solve(page) {
  await page.evaluate(() => {
    const groups = {};
    document
      .querySelectorAll("[data-card]")
      .forEach((button) => (groups[button.dataset.animal] ||= []).push(button));
    for (const buttons of Object.values(groups))
      for (const button of buttons) button.click();
  });
  await page.locator(".win").waitFor();
}
async function pair(page) {
  await page.evaluate(() => {
    const first = document.querySelector("[data-card]");
    const second = [...document.querySelectorAll("[data-card]")].find(
      (b) => b !== first && b.dataset.animal === first.dataset.animal,
    );
    first.click();
    second.click();
  });
}
(async () => {
  const browser = await chromium.launch({
    executablePath: browserPath,
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 950 },
      serviceWorkers: "block",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      window.__adCalls = [];
      window.__nextAdReply = { status: "closed", rewarded: true };
      window.AndroidAds = {
        show(kind, id) {
          window.__adCalls.push(kind);
          const result = window.__nextAdReply;
          setTimeout(() => {
            window.onNativeAdPresented(id);
            window.onNativeAdResult(id, result);
          }, 20);
        },
      };
    });
    await page.goto(base);
    assert.equal(await page.locator("#parents").count(), 0);
    assert.equal(await page.locator("#language option").count(), 11);
    assert(!/Ages 3|3–5/.test(await page.locator("body").textContent()));
    await page.locator("#play").click();
    // Mismatches lock input and flip back. Exactly one pair for each chosen animal.
    await page.evaluate(() => {
      const cards = [...document.querySelectorAll("[data-card]")];
      cards[0].click();
      cards.find((b) => b.dataset.animal !== cards[0].dataset.animal).click();
    });
    assert.equal(await page.locator(".tile.revealed").count(), 2);
    assert.equal(await page.locator(".tile:enabled").count(), 0);
    await page.waitForTimeout(1100);
    assert.equal(await page.locator(".tile.revealed").count(), 0);
    await pair(page);
    const cardOrder = await page
      .locator("[data-card]")
      .evaluateAll((cards) => cards.map((b) => b.dataset.animal));
    await page.reload();
    await page.locator("#play").click();
    assert.equal(await page.locator(".tile.matched").count(), 2);
    assert.deepEqual(
      await page
        .locator("[data-card]")
        .evaluateAll((cards) => cards.map((b) => b.dataset.animal)),
      cardOrder,
    );
    // Switching languages during a board preserves matched pairs and in-flight state.
    for (const locale of [
      "en",
      "es",
      "zh-Hant",
      "zh-Hans",
      "ar",
      "hi",
      "pt",
      "fr",
      "ja",
      "de",
      "ko",
    ]) {
      await page.locator("#language").selectOption(locale);
      assert.equal(await page.locator("html").getAttribute("lang"), locale);
      assert.equal(
        await page.locator("html").getAttribute("dir"),
        locale === "ar" ? "rtl" : "ltr",
      );
      assert.equal(await page.locator(".tile.matched").count(), 2);
      await page.setViewportSize({ width: 360, height: 800 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `Overflow: ${locale}`,
      );
      const keys = await page.evaluate(() =>
        Object.entries(window.LMA_LOCALES).map(([k, v]) => [
          k,
          Object.keys(v).sort().join(","),
        ]),
      );
      assert(keys.every(([, k]) => k === keys[0][1]));
    }
    await page.locator("#language").selectOption("en");
    await page.locator("#music").click();
    await page.locator("#effects").click();
    await page.reload();
    assert.equal(
      await page.locator("#music").getAttribute("aria-pressed"),
      "true",
    );
    assert.equal(
      await page.locator("#effects").getAttribute("aria-pressed"),
      "false",
    );
    await page.locator("#play").click();
    // A closed, unearned rewarded ad never reveals a pair.
    await page.evaluate(() => {
      window.__nextAdReply = { status: "closed", rewarded: false };
    });
    await page.locator("#hint").click();
    await page.locator("#reward-watch").click();
    await page.waitForTimeout(150);
    assert.equal(await page.locator(".tile.revealed").count(), 0);
    await page.evaluate(() => {
      window.__nextAdReply = { status: "closed", rewarded: true };
    });
    await page.locator("#hint").click();
    await page.locator("#reward-watch").click();
    await page.waitForTimeout(150);
    assert.equal(await page.locator(".tile.revealed").count(), 2);
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
      window.__nextAdReply = { status: "unavailable", rewarded: false };
    });
    await page.locator("#hint").click();
    await page.locator("#reward-watch").click();
    await page.waitForTimeout(150);
    assert.equal(await page.locator(".tile.revealed").count(), 2);
    await page.waitForTimeout(2000);
    console.log(
      "PASS: 11 locales, RTL, board recovery, independent audio persistence, rewarded close/earn/unavailable flows.",
    );
    // Fresh run through all 80 actual boards. Mock only the external native ad SDK.
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator("#play").click();
    for (let world = 0; world < 4; world++) {
      for (let stage = 1; stage <= 20; stage++) {
        assert.equal(
          await page.locator(".tile").count(),
          2 * Math.min(8, 3 + Math.floor((stage - 1) / 3)),
        );
        const animals = await page
          .locator("[data-card]")
          .evaluateAll((cards) => cards.map((b) => b.dataset.animal));
        assert(
          Object.values(
            animals.reduce((r, a) => {
              r[a] = (r[a] || 0) + 1;
              return r;
            }, {}),
          ).every((count) => count === 2),
        );
        await page.waitForFunction(() =>
          [...document.querySelectorAll(".face img")].every(
            (image) => image.complete && image.naturalWidth > 0,
          ),
        );
        assert(
          await page
            .locator(".face img")
            .evaluateAll((images) =>
              images.every((image) => image.complete && image.naturalWidth > 0),
            ),
        );
        await solve(page);
        const save = await page.evaluate(() =>
          JSON.parse(localStorage.getItem("little-match-adventure-v2")),
        );
        assert.equal(save.completed[world], stage);
        assert.equal(save.games, world * 20 + stage);
        if (stage < 20) await page.locator("#next").click();
      }
      console.log(
        `PASS: world ${world + 1}, all 20 stages, unique pairs, artwork loads, progress saved.`,
      );
      if (world < 3) {
        await page.locator("#next").click();
        await page.locator('[data-stage="1"]').click();
      }
    }
    assert.equal(
      await page.evaluate(
        () => window.__adCalls.filter((kind) => kind === "interstitial").length,
      ),
      26,
    );
    await page.reload();
    assert(
      await page
        .locator(".world-count")
        .textContent()
        .then((s) => s.includes("80")),
    );
    assert.equal(await page.locator(".world-card:disabled").count(), 0);
    // Legacy save migration and invalid-save recovery.
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem(
        "little-match-adventure-v1",
        JSON.stringify({ completed: 7, sound: false }),
      );
    });
    await page.reload();
    assert.equal(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("little-match-adventure-v2"))
            .completed[0],
      ),
      7,
    );
    await page.evaluate(() =>
      localStorage.setItem("little-match-adventure-v2", "corrupt"),
    );
    await page.reload();
    assert(await page.locator("#play").isVisible());
    await page.setViewportSize({ width: 1280, height: 950 });
    await page.screenshot({ path: "/tmp/lma-v2-desktop.png", fullPage: true });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({ path: "/tmp/lma-v2-mobile.png", fullPage: true });
    // Real browser demo ads: no hint before opt-in/elapsed time and no interstitial bypass.
    const web = await browser.newContext({
      viewport: { width: 375, height: 812 },
      serviceWorkers: "block",
    });
    const demo = await web.newPage();
    demo.on("pageerror", (error) => errors.push(error.message));
    await demo.goto(base);
    await demo.locator("#play").click();
    await demo.locator("#hint").click();
    await demo.locator("#reward-cancel").click();
    assert.equal(await demo.locator(".tile.revealed").count(), 0);
    await demo.locator("#hint").click();
    await demo.locator("#reward-watch").click();
    assert(await demo.locator("#ad-continue").isDisabled());
    await demo.locator("#ad-cancel").click();
    assert.equal(await demo.locator(".tile.revealed").count(), 0);
    await demo.locator("#hint").click();
    await demo.locator("#reward-watch").click();
    await demo.waitForTimeout(5200);
    await demo.locator("#ad-continue").click();
    assert.equal(await demo.locator(".tile.revealed").count(), 2);
    await demo.waitForTimeout(2000);
    await demo.screenshot({ path: "/tmp/lma-v2-game.png", fullPage: true });
    for (let i = 0; i < 2; i++) {
      await solve(demo);
      await demo.locator("#next").click();
    }
    // Third game has its own pending ad saved before display.
    await demo.evaluate(() => {
      const groups = {};
      document
        .querySelectorAll("[data-card]")
        .forEach((b) => (groups[b.dataset.animal] ||= []).push(b));
      for (const cards of Object.values(groups))
        for (const b of cards) b.click();
    });
    await demo.locator("#ad-dialog[open]").waitFor();
    assert(await demo.locator("#ad-continue").isDisabled());
    await demo.keyboard.press("Escape");
    assert(await demo.locator("#ad-dialog").evaluate((d) => d.open));
    await demo.reload();
    await demo.locator("#ad-dialog[open]").waitFor();
    assert(await demo.locator("#ad-continue").isDisabled());
    await demo.waitForTimeout(5200);
    await demo.locator("#ad-continue").click();
    assert.equal(
      await demo.evaluate(
        () =>
          JSON.parse(localStorage.getItem("little-match-adventure-v2"))
            .pendingAd,
      ),
      false,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: 26 scheduled native interstitial calls, legacy migration, corrupt saves, demo reward opt-in/cancel, mandatory five-second demo and pending-ad recovery. No JS errors.",
    );
    await web.close();
    await context.close();
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
