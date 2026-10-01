import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const base = process.env.TEST_URL || "http://127.0.0.1:4173/";
const widths = [320, 360, 375, 390, 414, 430];
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
});

async function open(width, embed = true) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const errors = [];
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(base + (embed ? "?embed=1" : ""), { waitUntil: "networkidle" });
  return { page, errors };
}

for (const width of widths) {
  const { page, errors } = await open(width);
  const overflow = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    const offenders = [...document.querySelectorAll("body *")].filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.right > viewport + 0.5 || rect.left < -0.5 || el.scrollWidth > el.clientWidth + 1;
    }).map((el) => ({ tag: el.tagName, cls: el.className, right: el.getBoundingClientRect().right, scroll: el.scrollWidth, client: el.clientWidth })).slice(0, 10);
    return { html: document.documentElement.scrollWidth - viewport, body: document.body.scrollWidth - viewport, offenders };
  });
  assert.equal(overflow.html, 0, `${width}px html horizontal overflow: ${JSON.stringify(overflow)}`);
  assert.equal(overflow.body, 0, `${width}px body horizontal overflow: ${JSON.stringify(overflow)}`);
  assert.deepEqual(overflow.offenders, [], `${width}px element overflow: ${JSON.stringify(overflow.offenders)}`);
  assert.deepEqual(errors, [], `${width}px console errors: ${errors.join("\n")}`);
  await page.close();
}

{
  const { page, errors } = await open(390);
  await page.locator('[data-plan="easy"]').click();
  await page.locator('[data-species="dog"]').click();
  assert.equal(await page.locator("#totalAmount").textContent(), "NT$4,880");
  await page.locator('[data-count-delta="1"]').click();
  assert.equal(await page.locator("#totalAmount").textContent(), "NT$5,380");
  await page.locator('[data-product="strip"][data-product-delta="1"]').click();
  await page.locator('[data-product="canvas30"][data-product-delta="1"]').click();
  assert.equal(await page.locator("#totalAmount").textContent(), "NT$6,530");
  await page.locator('[data-product="strip"][data-product-delta="-1"]').click();
  assert.equal(await page.locator("#totalAmount").textContent(), "NT$6,030");
  assert.equal(await page.locator("#reserveButton").isEnabled(), true);
  assert.deepEqual(errors, []);
  await page.close();
}

{
  const { page, errors } = await open(375);
  await page.locator('[data-plan="christmas"]').click();
  await page.locator('[data-species="cat"]').click();
  await page.locator('[data-count-delta="1"]').click();
  assert.equal(await page.locator("#totalAmount").textContent(), "NT$8,480");
  assert.deepEqual(errors, []);
  await page.close();
}

{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(base, { waitUntil: "networkidle" });
  assert.equal(await page.locator(".content-grid").evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length >= 2), true);
  assert.equal(await page.locator(".site-header").isVisible(), true);
  assert.deepEqual(errors, []);
  await page.close();
}

{
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  await page.setContent(`<iframe id="embed" src="${base}?embed=1" style="width:100%;border:0;height:5000px"></iframe>`);
  const frame = page.frameLocator("#embed");
  await frame.locator('[data-plan="cp"]').click();
  await frame.locator('[data-species="cat"]').click();
  await frame.locator('[data-environment="indoor"]').click();
  assert.equal(await frame.locator("#totalAmount").textContent(), "NT$7,980");
  assert.equal(await frame.locator(".site-header").isVisible(), false);
  await page.close();
}

await browser.close();
console.log(`PASS: ${widths.join(", ")}px mobile, desktop, pricing interactions, and iframe embed`);
