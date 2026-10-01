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
  const { page, errors } = await open(390);
  const assertCounter = async (species, label, max) => {
    await page.locator(`[data-species="${species}"]`).click();
    assert.match(await page.locator("#animalCounters .counter-title strong").innerText(), new RegExp(`^${label}數量`));
    assert.equal(await page.locator("#animalCounters .counter-copy p").textContent(), `最少 1 隻，最多 ${max} 隻`);
  };
  await page.locator('[data-plan="easy"]').click();
  await assertCounter("dog", "狗狗", 3);
  await assertCounter("cat", "貓咪", 2);
  await assertCounter("exotic", "特寵", 4);
  await assertCounter("dog", "狗狗", 3);
  await page.locator('[data-plan="guinea"]').click();
  assert.match(await page.locator("#animalCounters .counter-title strong").innerText(), /^天竺鼠數量/);
  assert.equal(await page.locator("#animalCounters .counter-copy p").textContent(), "最少 1 隻，最多 3 隻");
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
  assert.match(await page.locator('[data-plan="guinea"]').innerText(), /天天好萌插畫家聯名/);
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
  assert.equal(await page.locator(".limited-heading").textContent(), "11/1-12/10 聖誕室內棚拍（10/31 預約截止）");
  assert.equal(await page.locator(".rule-list li").count(), 7);
  assert.equal(await page.locator(".rule-list li").nth(1).textContent(), "聖誕寫真收藏與天竺鼠聯名聖誕收藏組皆已包含 1 小時基本棚租。");
  assert.equal(await page.locator(".rule-list li").nth(4).textContent(), "特寵 3 隻以 1.5 小時計算；4 隻以 2 小時計算。");
  assert.equal(await page.locator(".rule-list li").nth(5).textContent(), "常態方案仍依一般棚拍費 NT$1,000／小時計算。");
  const christmasCard = await page.locator('[data-plan="christmas"]').innerText();
  assert.match(christmasCard, /✧ 特寵／貓｜聖誕寫真收藏/);
  assert.match(christmasCard, /10 張精修照片電子檔/);
  assert.match(christmasCard, /再贈 10 張日系調色照片電子檔/);
  assert.match(christmasCard, /共 60 張攝影作品/);
  assert.equal(christmasCard.includes("共 50 張數位影像"), false);
  assert.equal(await page.locator('[data-plan="christmas"] .package-intro').count(), 0);
  const guineaCard = await page.locator('[data-plan="guinea"]').innerText();
  assert.match(guineaCard, /✧ 天竺鼠｜聖誕聯名收藏組/);
  assert.match(guineaCard, /天天好萌插畫家聯名/);
  assert.match(guineaCard, /3 張客製聖誕插畫電子檔/);
  assert.match(guineaCard, /3 款\(6入\) 客製專屬聖誕吊飾/);
  assert.match(guineaCard, /✧ 3 款天天好萌客製聖誕角色，每款製作 2 個，共 6 個聖誕吊飾！/);
  assert.match(guineaCard, /共 45 張攝影作品＋3 張客製聖誕插畫電子檔＋7 件實體收藏/);
  assert.match(await page.locator('[data-plan="easy"] .choice-title strong').textContent(), /^✧ 輕鬆體驗$/);
  assert.match(await page.locator('[data-plan="cp"] .choice-title strong').textContent(), /^✧ CP首選$/);
  assert.match(await page.locator('[data-plan="luxury"] .choice-detail').textContent(), /精修照片 15 張＋調色毛片 40 張＋寵生四格照/);
  await page.locator('[data-plan="christmas"]').click();
  await page.locator('[data-species="cat"]').click();
  const breakdown = await page.locator("#breakdown").innerText();
  assert.match(breakdown, /共 60 張攝影作品/);
  assert.equal(breakdown.includes("共 50 張數位影像"), false);
  await page.close();
}

{
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  await page.goto(base + "?embed=1&edit=1", { waitUntil: "networkidle" });
  await page.evaluate(() => {
    localStorage.setItem("mokomoko-pricing-content-v1", JSON.stringify({
      config: {},
      page: {
        "page.#animalCounters/div:1/div:0/div:0/div:0/strong:0": "特寵",
        "page.#environmentNote/p:0": "錯誤的動態提示"
      }
    }));
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.locator('[data-plan="easy"] .radio-dot').click();
  const sequence = [
    ["dog", "狗狗", 3],
    ["cat", "貓咪", 2],
    ["exotic", "特寵", 4],
    ["dog", "狗狗", 3]
  ];
  for (const [species, label, max] of sequence) {
    await page.locator(`[data-species="${species}"]`).click();
    assert.match(await page.locator("#animalCounters .counter-title strong").innerText(), new RegExp(`^${label}數量`));
    assert.equal(await page.locator("#animalCounters .counter-copy p").textContent(), `最少 1 隻，最多 ${max} 隻`);
  }
  assert.equal(await page.locator("#animalCounters .counter-title strong").getAttribute("contenteditable"), null);
  assert.equal(await page.locator("#animalCounters .counter-copy p").getAttribute("contenteditable"), null);
  assert.equal(await page.locator("#environmentNote").getAttribute("contenteditable"), null);
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
    name: "✧ 特寵／貓｜聖誕收藏測試版",
    description: "測試用方案說明，價格與規則保持不變。",
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
  assert.equal(await page.locator('[data-config-path="plans.christmas.packageItems.0"]').textContent(), edited.firstItem);
  assert.equal(await page.locator('[data-config-path="plans.christmas.packageItems.2"]').textContent(), edited.bonus);
  assert.equal(await page.locator('[data-plan="christmas"] .package-summary').textContent(), edited.summary);
  assert.equal(await page.locator('[data-plan="christmas"] .package-intro').count(), 0);

  await page.goto(base + "?embed=1", { waitUntil: "networkidle" });
  assert.equal(await page.locator("#editToolbar").isVisible(), false);
  assert.equal(await page.locator('[data-plan="christmas"] .choice-title strong').textContent(), edited.name);
  assert.equal(await page.locator('[data-plan="christmas"] .package-intro').count(), 0);
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
  assert.equal(await page.locator('[data-plan="christmas"] .choice-title strong').textContent(), "✧ 特寵／貓｜聖誕寫真收藏");
  assert.equal(await page.locator('[data-plan="christmas"] .choice-detail').textContent(), "已含基本棚拍場租（多隻毛孩加購、場租時數依拍攝對象另計算）");
  assert.equal(await page.locator('[data-plan="christmas"] .package-intro').count(), 0);
  assert.equal(await page.locator('[data-config-path="plans.christmas.packageItems.0"]').textContent(), "10 張精修照片電子檔");
  assert.equal(await page.locator('[data-config-path="plans.christmas.packageItems.2"]').textContent(), "再贈 10 張日系調色照片電子檔");
  assert.equal(await page.locator('[data-plan="christmas"] .package-summary').textContent(), "共 60 張攝影作品");
  assert.equal(await page.evaluate(() => localStorage.getItem("mokomoko-pricing-content-v1")), null);
  await page.close();
}

{
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  await page.goto(base + "?embed=1", { waitUntil: "networkidle" });
  assert.equal(await page.locator("#editToolbar").isVisible(), false);
  assert.equal(await page.locator('[data-plan="christmas"] .package-intro').count(), 0);
  await page.close();
}

await browser.close();
console.log(`PASS: ${widths.join(", ")}px mobile, desktop, pricing interactions, and iframe embed`);
