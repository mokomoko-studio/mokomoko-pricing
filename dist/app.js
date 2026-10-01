"use strict";

// 所有方案、品項、價格與條件規則集中於此，未來只需修改這一處。
const pricingConfig = Object.freeze({
  plans: {
    christmas: { name: "聖誕寫真收藏", price: 6980, type: "limited", allowed: ["cat", "exotic"], description: "適用：貓咪／特寵｜已包含基本攝影棚費用" },
    guinea: { name: "天竺鼠聯名角色收藏", price: 7980, type: "limited", allowed: ["guinea"], description: "適用：天竺鼠｜已包含基本攝影棚費用" },
    easy: { name: "輕鬆體驗", price: 4880, type: "regular", allowed: ["dog", "cat", "exotic"], description: "包含精修照片 8 張" },
    cp: { name: "CP首選", price: 5980, type: "regular", allowed: ["dog", "cat", "exotic"], description: "包含精修照片 10 張＋調色毛片 40 張" },
    luxury: { name: "豪華套餐", price: 8080, type: "regular", allowed: ["dog", "cat", "exotic"], description: "包含精修照片 15 張、調色毛片 40 張、寵生四格照 12 條、30×30cm 無框畫 1 幅" }
  },
  species: {
    dog: { label: "狗狗", max: 3 },
    cat: { label: "貓咪", max: 2 },
    exotic: { label: "特寵", max: 4 },
    guinea: { label: "天竺鼠", max: 4 }
  },
  products: [
    { id: "strip", name: "寵生四格照 12 條", price: 500 },
    { id: "canvas15", name: "15×15cm 無框畫", price: 500 },
    { id: "canvas30", name: "30×30cm 無框畫", price: 650 }
  ],
  extraPetPrice: 500,
  studioHourlyPrice: 1000,
  limitedIncludedHours: 1
});

const state = { plan: null, species: null, count: 1, environment: null, products: { strip: 0, canvas15: 0, canvas30: 0 } };
const { plans, species: speciesInfo, products } = pricingConfig;
const money = (amount) => "NT$" + amount.toLocaleString("zh-TW");
const currentPlan = () => state.plan ? plans[state.plan] : null;

function initializePageMode() {
  const params = new URLSearchParams(location.search);
  const isEmbed = params.get("embed") === "1" || params.get("mode") === "embed";
  document.body.classList.toggle("embed-mode", isEmbed);
}

function renderStaticChoices() {
  const planCard = ([key, plan]) => `
    <button type="button" class="choice-card plan-card" data-plan="${key}" role="radio" aria-checked="false">
      <span class="choice-inner"><span class="radio-dot" aria-hidden="true"></span><span class="choice-content">
        <span class="choice-title"><strong>${plan.name}</strong>${plan.type === "limited" ? '<span class="limited-tag">期間限定</span>' : ""}</span>
        <span class="choice-price">${money(plan.price)}</span>
        <span class="choice-detail">${plan.description}</span>
      </span></span>
    </button>`;
  const entries = Object.entries(plans);
  document.getElementById("limitedPlans").innerHTML = entries.filter(([, p]) => p.type === "limited").map(planCard).join("");
  document.getElementById("regularPlans").innerHTML = entries.filter(([, p]) => p.type === "regular").map(planCard).join("");
  document.getElementById("speciesChoices").innerHTML = Object.entries(speciesInfo).map(([key, info]) => `
    <button type="button" class="choice-card species-card hidden-panel" data-species="${key}" role="radio" aria-checked="false">${info.label}</button>`).join("");
}

function requiresEnvironmentChoice() {
  const plan = currentPlan();
  return !!plan && plan.type === "regular" && (state.species === "cat" || state.species === "exotic");
}

function getStudioHours() {
  if (!state.species || !state.count) return 0;
  if (state.species === "cat") return 2;
  if (state.species === "exotic" || state.species === "guinea") {
    if (state.count <= 2) return 1;
    if (state.count === 3) return 1.5;
    return 2;
  }
  if (state.species === "dog") {
    if (state.count === 1) return 1;
    if (state.count === 2) return 1.5;
    return 2;
  }
  return 0;
}

function hasCompletedRequiredFields() {
  if (!state.plan || !state.species || state.count < 1) return false;
  return !(requiresEnvironmentChoice() && !state.environment);
}

function selectPlan(planKey) {
  state.plan = planKey;
  const selectedPlan = plans[planKey];
  if (planKey === "guinea") {
    state.species = "guinea"; state.count = 1; state.environment = "indoor";
  } else if (!selectedPlan.allowed.includes(state.species)) {
    state.species = null; state.count = 1; state.environment = null;
  } else if (selectedPlan.type === "limited") {
    state.environment = "indoor";
  } else if (state.species === "dog") {
    state.environment = "outdoor";
  } else {
    state.environment = null;
  }
  render();
}

function selectSpecies(speciesKey) {
  const plan = currentPlan();
  if (!plan || !plan.allowed.includes(speciesKey)) return;
  state.species = speciesKey;
  state.count = 1;
  state.environment = plan.type === "limited" ? "indoor" : speciesKey === "dog" ? "outdoor" : null;
  render();
}

function changePetCount(delta) {
  if (!state.species) return;
  state.count = Math.max(1, Math.min(speciesInfo[state.species].max, state.count + delta));
  render();
}

function changeProductCount(productId, delta) {
  state.products[productId] = Math.max(0, state.products[productId] + delta);
  render();
}

function renderAnimalCounter() {
  const holder = document.getElementById("animalCounters");
  if (!state.species) { holder.innerHTML = ""; return; }
  const info = speciesInfo[state.species];
  holder.innerHTML = `<div class="counter-row soft-note">
    <div class="counter-copy"><div class="counter-title"><strong>${info.label}數量 <span class="required-mark">必填</span></strong></div><p>最少 1 隻，最多 ${info.max} 隻</p></div>
    <div class="counter"><button class="counter-btn" type="button" data-count-delta="-1" aria-label="減少${info.label}數量" ${state.count <= 1 ? "disabled" : ""}>−</button><span class="counter-value" aria-live="polite">${state.count}</span><button class="counter-btn" type="button" data-count-delta="1" aria-label="增加${info.label}數量" ${state.count >= info.max ? "disabled" : ""}>＋</button></div>
  </div>`;
}

function renderEnvironment() {
  const holder = document.getElementById("environmentChoices");
  const note = document.getElementById("environmentNote");
  const plan = currentPlan();
  if (!plan || !state.species) { holder.innerHTML = ""; note.textContent = "請先完成拍攝方案與毛孩種類選擇。"; return; }
  if (plan.type === "limited") {
    state.environment = "indoor";
    holder.innerHTML = '<div class="choice-card is-selected"><strong>室內棚拍</strong><p>期間限定方案已包含基本棚租，僅依方案規則計算特殊數量加價。</p></div>';
    note.textContent = "聖誕寫真收藏與天竺鼠聯名角色收藏皆已包含 1 小時基本棚租；若因毛孩數量需要增加拍攝時數，將依一般棚拍費 NT$1,000／小時加收。貓咪 1–2 隻皆以 2 小時計算；特寵 3 隻以 1.5 小時計算；特寵 4 隻以 2 小時計算。";
    return;
  }
  if (state.species === "dog") {
    state.environment = "outdoor";
    holder.innerHTML = '<div class="choice-card is-selected"><strong>戶外拍攝</strong><p>一般狗狗方案維持戶外拍攝，攝影棚費為 NT$0。</p></div>';
    note.textContent = "狗狗戶外拍攝不加攝影棚費。";
    return;
  }
  holder.innerHTML = ["outdoor", "indoor"].map((environment) => {
    const selected = state.environment === environment;
    const title = environment === "outdoor" ? "戶外拍攝" : "室內棚拍";
    const detail = environment === "outdoor" ? "不加攝影棚費。" : "依毛孩數量與預估拍攝時數計算棚拍費。";
    return `<button type="button" data-environment="${environment}" class="choice-card ${selected ? "is-selected" : ""}" role="radio" aria-checked="${selected}"><strong>${title}</strong><p>${detail}</p></button>`;
  }).join("");
  note.textContent = state.environment === "indoor" ? "已選擇室內棚拍，費用明細將列出預估時數與棚拍費。" : state.environment === "outdoor" ? "已選擇戶外拍攝，不加攝影棚費。" : "請選擇拍攝環境以完成費用試算。";
}

function renderProducts() {
  document.getElementById("productCounters").innerHTML = products.map((product) => {
    const quantity = state.products[product.id];
    return `<div class="counter-row soft-note"><div class="counter-copy"><div class="counter-title"><strong>${product.name} <span class="required-mark">必填</span></strong><span class="completion-chip">已填寫 ${quantity}</span></div><p>每份 +${money(product.price)}｜填寫 0 即表示不加購</p></div><div class="counter"><button type="button" class="counter-btn" data-product="${product.id}" data-product-delta="-1" aria-label="減少${product.name}" ${quantity <= 0 ? "disabled" : ""}>−</button><span class="counter-value" aria-live="polite">${quantity}</span><button type="button" class="counter-btn" data-product="${product.id}" data-product-delta="1" aria-label="增加${product.name}">＋</button></div></div>`;
  }).join("");
}

function calculate() {
  const lines = [];
  let total = 0;
  const plan = currentPlan();
  if (plan) { lines.push({ name: plan.name, amount: plan.price, base: true }); total += plan.price; }
  if (plan && state.species && state.count > 1) {
    const petFee = (state.count - 1) * pricingConfig.extraPetPrice;
    lines.push({ name: `毛孩加價（第 2–${state.count} 隻）`, amount: petFee }); total += petFee;
  }
  if (plan && state.species) {
    if (plan.type === "regular" && state.environment === "indoor") {
      const hours = getStudioHours();
      const studioFee = hours * pricingConfig.studioHourlyPrice;
      lines.push({ name: `攝影棚費（預估 ${hours} 小時 × NT$1,000）`, amount: studioFee }); total += studioFee;
    }
    if (plan.type === "regular" && state.species === "dog" && state.environment === "outdoor") lines.push({ name: "攝影棚費（狗狗戶外拍攝）", amount: 0 });
    if (plan.type === "regular" && state.environment === "outdoor" && state.species !== "dog") lines.push({ name: "攝影棚費（戶外拍攝）", amount: 0 });
    if (plan.type === "limited") {
      const hours = getStudioHours();
      const extraFee = Math.max(0, hours - pricingConfig.limitedIncludedHours) * pricingConfig.studioHourlyPrice;
      lines.push({ name: "期間限定方案已含 1 小時棚租", amount: 0 });
      lines.push({ name: `額外棚拍費（${hours} 小時－已含 1 小時）`, amount: extraFee });
      total += extraFee;
    }
  }
  products.forEach((product) => {
    const quantity = state.products[product.id];
    if (quantity > 0) { const amount = product.price * quantity; lines.push({ name: `${product.name} × ${quantity}`, amount }); total += amount; }
  });
  return { lines, total };
}

function renderSummary() {
  const result = calculate();
  document.getElementById("breakdown").innerHTML = result.lines.length === 0
    ? '<p>請先選擇拍攝方案，費用會在這裡即時整理。</p>'
    : result.lines.map((line) => `<div class="detail-row ${line.base ? "base" : ""}"><span class="detail-name">${line.name}</span><span class="detail-amount">${line.base ? money(line.amount) : line.amount === 0 ? "NT$0" : "+" + money(line.amount)}</span></div>`).join("");
  document.getElementById("totalAmount").textContent = money(result.total);
}

function renderValidation() {
  const planMessage = document.getElementById("planValidation");
  const speciesMessage = document.getElementById("speciesValidation");
  const environmentMessage = document.getElementById("environmentValidation");
  planMessage.classList.toggle("hidden-panel", !!state.plan); planMessage.textContent = "請選擇一個拍攝方案。";
  const needsSpecies = !!state.plan && !state.species;
  speciesMessage.classList.toggle("hidden-panel", !needsSpecies); speciesMessage.textContent = "請選擇毛孩種類與數量。";
  const needsEnvironment = requiresEnvironmentChoice() && !state.environment;
  environmentMessage.classList.toggle("hidden-panel", !needsEnvironment); environmentMessage.textContent = "請選擇拍攝環境。";
  document.querySelectorAll(".plan-card").forEach((el) => el.classList.toggle("is-invalid", !state.plan));
  document.querySelectorAll(".species-card").forEach((el) => el.classList.toggle("is-invalid", needsSpecies && !el.classList.contains("hidden-panel")));
  const notice = document.getElementById("completionNotice");
  const complete = hasCompletedRequiredFields();
  notice.textContent = complete ? "必填欄位已完成，您可查看完整預估費用。" : !state.plan ? "請先完成必填欄位：拍攝方案。" : !state.species ? "請完成必填欄位：毛孩種類與數量。" : needsEnvironment ? "請完成必填欄位：拍攝環境。" : "請完成必填欄位後，即可啟用「我要預約」。";
  const reserveButton = document.getElementById("reserveButton");
  reserveButton.disabled = !complete; reserveButton.setAttribute("aria-disabled", String(!complete));
}

function render() {
  const plan = currentPlan();
  document.querySelectorAll(".plan-card").forEach((el) => { const selected = el.dataset.plan === state.plan; el.classList.toggle("is-selected", selected); el.setAttribute("aria-checked", String(selected)); });
  document.querySelectorAll(".species-card").forEach((el) => { const key = el.dataset.species; const allowed = !!plan && plan.allowed.includes(key); const selected = key === state.species; el.classList.toggle("hidden-panel", !allowed); el.classList.toggle("is-selected", selected); el.setAttribute("aria-checked", String(selected)); });
  renderAnimalCounter(); renderEnvironment(); renderProducts(); renderSummary(); renderValidation();
}

document.addEventListener("click", (event) => {
  const planCard = event.target.closest("[data-plan]"); if (planCard) return selectPlan(planCard.dataset.plan);
  const speciesCard = event.target.closest("[data-species]"); if (speciesCard) return selectSpecies(speciesCard.dataset.species);
  const countButton = event.target.closest("[data-count-delta]"); if (countButton) return changePetCount(Number(countButton.dataset.countDelta));
  const environmentButton = event.target.closest("[data-environment]"); if (environmentButton) { state.environment = environmentButton.dataset.environment; render(); return; }
  const productButton = event.target.closest("[data-product]"); if (productButton) changeProductCount(productButton.dataset.product, Number(productButton.dataset.productDelta));
});

initializePageMode();
renderStaticChoices();
render();

// 僅供瀏覽器內驗收使用，不影響 UI。
window.__MOKOMOKO_CALCULATOR__ = { pricingConfig, state, calculate, selectPlan, selectSpecies, changePetCount, changeProductCount };
