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
  assert.equal(await page.locator("#reserveButton").getAttribute("href"), "https://mkmkpet.my.canva.site/");
  assert.equal(await page.locator("#reserveButton").textContent(), "我要預約（回到官方網站）");
  assert.equal(await page.locator("#speciesChoices").isVisible(), false);
  await page.close();
}

{
  const { page, errors } = await open(390);
  await page.locator('[data-plan="easy"]').click();
  assert.equal(await page.locator("#speciesChoices").isVisible(), true);
  await page.locator('[data-species="dog"]').click();
  assert.equal(await page.locator("#totalAmount").textContent(), "NT$4,880");
  await page.locator('[data-count-delta="1"]').click();
  assert.equal(await page.locator("#totalAmount").textContent(), "NT$5,380");
  await page.locator('[data-product="strip"][data-product-delta="1"]').click();
  await page.locator('[data-product="canvas30"][data-product-delta="1"]').click();
  assert.equal(await page.locator("#totalAmount").textContent(), "NT$6,530");
  await page.locator('[data-product="strip"][data-product-delta="-1"]').click();
  assert.equal(await page.locator("#totalAmount").textContent(), "NT$6,030");
  assert.equal(await page.locator("#reserveButton").getAttribute("href"), "https://mkmkpet.my.canva.site/");
  assert.equal(await page.locator(".instagram-btn").getAttribute("href"), "https://www.instagram.com/mkmkpet/");
  assert.equal(await page.locator("#reserveButton").getAttribute("rel"), "noopener noreferrer");
  const speciesAlignment = await page.locator('[data-species="dog"]').evaluate((element) => {
    const style = getComputedStyle(element);
    return { display: style.display, alignItems: style.alignItems, justifyContent: style.justifyContent, textAlign: style.textAlign };
  });
  assert.deepEqual(speciesAlignment, { display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" });
  assert.equal(await page.locator(".instagram-btn").getAttribute("rel"), "noopener noreferrer");
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
  const { page, errors } = await open(390);
  await page.locator('[data-plan="guinea"]').click();
  assert.equal(await page.locator("#totalAmount").textContent(), "NT$7,980");
  await page.locator('[data-count-delta="1"]').click();
  assert.equal(await page.locator("#totalAmount").textContent(), "NT$8,480");
  await page.locator('[data-count-delta="1"]').click();
  assert.equal(await page.locator("#totalAmount").textContent(), "NT$9,480");
  assert.equal(await page.locator('[data-count-delta="1"]').isDisabled(), true);
  assert.match(await page.locator('[data-plan="guinea"]').innerText(), /天天好萌聯名/);
  assert.match(await page.locator('[data-plan="guinea"]').innerText(), /7 件實體收藏/);
  assert.deepEqual(errors, []);
  await page.close();
}

{
  const { page, errors } = await open(390);
  await page.locator('[data-plan="easy"]').click();
  await page.locator('[data-species="dog"]').click();
  assert.equal(await page.locator("#totalAmount").textContent(), "NT$4,880");
  assert.equal((await page.locator("#breakdown").innerText()).includes("攝影棚費"), false);
  assert.deepEqual(errors, []);
  await page.close();
}

{
  const { page } = await open(375);
  assert.equal(await page.locator(".limited-heading").textContent(), "室內棚拍活動限定方案｜10/31 前預約");
  assert.equal(await page.locator(".rule-list li").count(), 7);
  const christmasCard = await page.locator('[data-plan="christmas"]').innerText();
  assert.match(christmasCard, /活動期間再贈 10 張日系調色照片電子檔/);
  assert.match(christmasCard, /共 60 張數位影像（無挑片流程）/);
  assert.equal(christmasCard.includes("共 50 張數位影像"), false);
  await page.locator('[data-plan="christmas"]').click();
  await page.locator('[data-species="cat"]').click();
  const breakdown = await page.locator("#breakdown").innerText();
  assert.match(breakdown, /共 60 張數位影像（無挑片流程）/);
  assert.equal(breakdown.includes("共 50 張數位影像"), false);
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

{
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  await page.goto(base + "?embed=1&edit=1", { waitUntil: "networkidle" });
  await page.evaluate(() => {
    localStorage.removeItem("mokomoko-pricing-content-v1");
    localStorage.removeItem("mokomoko-pricing-text-edits-v1");
  });
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.locator("#editToolbar").isVisible(), true);

  await page.locator('[data-plan="christmas"] .radio-dot').click();
  await page.locator('[data-species="cat"]').click();
  assert.equal(await page.locator("#totalAmount").textContent(), "NT$7,980");

  const edited = {
    name: "其他特寵／貓｜聖誕收藏測試版",
    description: "測試用方案說明，價格與規則保持不變。",
    introduction: "測試用完整方案介紹。",
    firstItem: "測試用精修寫真電子檔",
    bonus: "活動測試加贈日系調色照片電子檔",
    summary: "測試用共 60 張數位影像摘要"
  };
  const editText = async (selector, value) => {
    const target = page.locator(selector);
    await target.click();
    assert.equal(await target.evaluate((element) => document.activeElement === element), true);
    await page.keyboard.press("Meta+A");
    await page.keyboard.type(value);
    assert.equal(await target.textContent(), value);
  };

  await editText('[data-plan="christmas"] .choice-title strong', edited.name);
  await editText('[data-plan="christmas"] .choice-detail', edited.description);
  await editText('[data-plan="christmas"] .package-intro', edited.introduction);
  await editText('[data-config-path="plans.christmas.packageItems.0"]', edited.firstItem);
  await editText('[data-config-path="plans.christmas.packageItems.2"]', edited.bonus);
  await editText('[data-plan="christmas"] .package-summary', edited.summary);

  assert.equal(await page.locator("#breakdown .detail-plan-name").textContent(), edited.name);
  assert.equal(await page.locator("#breakdown .detail-summary").textContent(), edited.summary);
  assert.equal(await page.locator("#totalAmount").textContent(), "NT$7,980");

  await page.locator('[data-plan="easy"] .radio-dot').click();
  await page.locator('[data-plan="christmas"] .radio-dot').click();
  assert.equal(await page.locator('[data-plan="christmas"] .choice-title strong').textContent(), edited.name);
  assert.equal(await page.locator('[data-config-path="plans.christmas.packageItems.2"]').textContent(), edited.bonus);
  assert.equal(await page.locator("#breakdown .detail-plan-name").textContent(), edited.name);
  assert.equal(await page.locator("#breakdown .detail-summary").textContent(), edited.summary);

  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.locator('[data-plan="christmas"] .choice-title strong').textContent(), edited.name);
  assert.equal(await page.locator('[data-plan="christmas"] .choice-detail').textContent(), edited.description);
  assert.equal(await page.locator('[data-plan="christmas"] .package-intro').textContent(), edited.introduction);
  assert.equal(await page.locator('[data-config-path="plans.christmas.packageItems.0"]').textContent(), edited.firstItem);
  assert.equal(await page.locator('[data-config-path="plans.christmas.packageItems.2"]').textContent(), edited.bonus);
  assert.equal(await page.locator('[data-plan="christmas"] .package-summary').textContent(), edited.summary);
  assert.equal(await page.locator('[data-plan="christmas"] .package-intro').getAttribute("contenteditable"), "true");

  await page.goto(base + "?embed=1", { waitUntil: "networkidle" });
  assert.equal(await page.locator("#editToolbar").isVisible(), false);
  assert.equal(await page.locator('[data-plan="christmas"] .choice-title strong').textContent(), edited.name);
  assert.equal(await page.locator('[data-plan="christmas"] .package-intro').getAttribute("contenteditable"), null);
  await page.locator('[data-plan="christmas"]').click();
  await page.locator('[data-species="cat"]').click();
  assert.equal(await page.locator("#breakdown .detail-plan-name").textContent(), edited.name);
  assert.equal(await page.locator("#breakdown .detail-summary").textContent(), edited.summary);
  assert.equal(await page.locator("#totalAmount").textContent(), "NT$7,980");

  await page.goto(base + "?embed=1&edit=1", { waitUntil: "networkidle" });
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.locator("#resetEdits").click()
  ]);
  assert.equal(await page.locator('[data-plan="christmas"] .choice-title strong').textContent(), "其他特寵／貓｜聖誕寫真收藏");
  assert.equal(await page.locator('[data-plan="christmas"] .choice-detail').textContent(), "已含棚拍場租（多隻毛孩加購、場租時數依拍攝對象另計算）");
  assert.equal(await page.locator('[data-plan="christmas"] .package-intro').textContent(), "留下一整套今年的聖誕寫真，把這個冬天可愛的樣子完整留下來。");
  assert.equal(await page.locator('[data-config-path="plans.christmas.packageItems.0"]').textContent(), "10 張精修寫真電子檔");
  assert.equal(await page.locator('[data-config-path="plans.christmas.packageItems.2"]').textContent(), "活動期間再贈 10 張日系調色照片電子檔");
  assert.equal(await page.locator('[data-plan="christmas"] .package-summary').textContent(), "共 60 張數位影像（無挑片流程）");
  assert.equal(await page.evaluate(() => localStorage.getItem("mokomoko-pricing-content-v1")), null);
  await page.close();
}

{
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  await page.goto(base + "?embed=1", { waitUntil: "networkidle" });
  assert.equal(await page.locator("#editToolbar").isVisible(), false);
  assert.equal(await page.locator('[data-plan="christmas"] .package-intro').getAttribute("contenteditable"), null);
  await page.close();
}

await browser.close();
console.log(`PASS: ${widths.join(", ")}px mobile, desktop, pricing interactions, and iframe embed`);
