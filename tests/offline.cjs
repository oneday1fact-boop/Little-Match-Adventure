const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const base = process.env.LMA_TEST_URL || "http://127.0.0.1:8000/";
(async () => {
  const executablePath =
    process.env.CHROMIUM_PATH ||
    (fs.existsSync("/usr/bin/chromium")
      ? "/usr/bin/chromium"
      : chromium.executablePath());
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(base);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    assert(await page.evaluate(() => !!navigator.serviceWorker.controller));
    const manifest = await page.evaluate(async () =>
      (await fetch("./manifest.webmanifest")).json(),
    );
    assert.equal(manifest.scope, "./");
    assert.equal(manifest.icons.length, 2);
    await context.setOffline(true);
    await page.reload();
    await page.locator("#play").click();
    assert.equal(await page.locator(".tile").count(), 6);
    await page.locator(".face img").first().waitFor({ state: "attached" });
    assert(
      await page
        .locator(".face img")
        .evaluateAll((images) =>
          images.every((image) => image.complete && image.naturalWidth > 0),
        ),
    );
    await page.evaluate(() => {
      const a = document.querySelector("[data-card]");
      const b = [...document.querySelectorAll("[data-card]")].find(
        (x) => x !== a && x.dataset.animal === a.dataset.animal,
      );
      a.click();
      b.click();
    });
    await page.reload();
    await page.locator("#play").click();
    assert.equal(await page.locator(".tile.matched").count(), 2);
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    assert.equal(
      await page
        .locator(".card-back")
        .first()
        .evaluate((element) => getComputedStyle(element).transitionDuration),
      "0s",
    );
    await context.setOffline(false);
    await context.close();
    const blocked = await browser.newContext({ serviceWorkers: "block" });
    await blocked.addInitScript(() =>
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new DOMException("Blocked storage", "SecurityError");
        },
      }),
    );
    const fallback = await blocked.newPage();
    fallback.on("pageerror", (error) => errors.push(error.message));
    await fallback.goto(base);
    assert(await fallback.locator("#storage-warning").isVisible());
    await fallback.locator("#play").click();
    assert.equal(await fallback.locator(".tile").count(), 6);
    assert.deepEqual(errors, []);
    await blocked.close();
    console.log(
      "PASS: offline launch/artwork/board recovery, scoped PWA manifest, reduced motion, storage-denied fallback, no JS errors.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
