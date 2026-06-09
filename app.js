/* ============================================================
   CarbonTrace — Core Application Logic
   Emission factors: IPCC AR6, Carbon Trust, Our World in Data
   ============================================================ */

"use strict";

// ── Emission Factors ─────────────────────────────────────────
const EF = {
  car: 0.000192,
  flight: 0.255,
  transitReduction: [0, 0.05, 0.15, 0.30],
  diet: { vegan:1.5, vegetarian:1.7, flexitarian:2.5, meat_some:3.3, meat_heavy:4.5 },
  localFood: 0.005,
  waste: { low:0, medium:0.1, high:0.25 },
  electricityPerRupee: 0.0000006,
  heating: { electric:0.3, gas:0.5, renewable:0.05, none:0 },
  solar: { no:0, partial:-0.2, yes:-0.5 },
  clothesPerItem: 0.025,
  electronicsPerUnit: 0.3,
  secondhand: { never:0, sometimes:-0.1, often:-0.25 },
};

// ── Avatar colours ────────────────────────────────────────────
const AVATAR_COLORS = [
  "#a8ff3e","#5b8af4","#f4c542","#f48c5b",
  "#c084fc","#34d399","#f87171","#60a5fa",
];

function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

// ── Profile Storage ───────────────────────────────────────────
const STORAGE_KEY = "carbontrace_profiles";
const ACTIVE_KEY  = "carbontrace_active";

const DEFAULT_INPUTS = {
  car:"150", flights:"2", transit:"1",
  diet:"flexitarian", local:"30", waste:"medium",
  electricity:"1500", heating:"gas", solar:"no",
  clothes:"20", electronics:"2", secondhand:"sometimes",
};

function loadProfiles() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}

function saveProfiles(profiles) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

function getActiveId() {
  return localStorage.getItem(ACTIVE_KEY) || null;
}

function setActiveId(id) {
  localStorage.setItem(ACTIVE_KEY, id);
}

// ── Profile UI ────────────────────────────────────────────────
function openProfileOverlay() {
  renderProfileList();
  document.getElementById("profileOverlay").classList.remove("hidden");
}

function closeProfileOverlay() {
  document.getElementById("profileOverlay").classList.add("hidden");
}

function renderProfileList() {
  const profiles = loadProfiles();
  const list = document.getElementById("profileList");
  const ids = Object.keys(profiles);

  if (ids.length === 0) {
    list.innerHTML = `<p style="color:var(--muted);font-size:0.85rem;padding:8px 0;">No profiles yet — add one below.</p>`;
    return;
  }

  list.innerHTML = ids.map(id => {
    const p = profiles[id];
    const initial = p.name.charAt(0).toUpperCase();
    const color = avatarColor(p.name);
    const total = (p.scores
      ? Object.values(p.scores).reduce((a,b) => a+b, 0)
      : 0).toFixed(1);
    const date = p.lastSaved
      ? new Date(p.lastSaved).toLocaleDateString("en-IN", { day:"numeric", month:"short" })
      : "Not saved yet";
    return `
      <div class="profile-item" onclick="selectProfile('${id}')">
        <div class="profile-avatar" style="background:${color}">${initial}</div>
        <div class="profile-item-info">
          <div class="profile-item-name">${p.name}</div>
          <div class="profile-item-meta">${total} t CO₂/yr · last saved ${date}</div>
        </div>
        <button class="profile-item-delete" onclick="deleteProfile(event,'${id}')" title="Delete">✕</button>
      </div>`;
  }).join("");
}

function createProfile() {
  const input = document.getElementById("newProfileName");
  const name = input.value.trim();
  if (!name) { input.focus(); return; }

  const profiles = loadProfiles();
  const id = "p_" + Date.now();
  profiles[id] = { name, inputs: { ...DEFAULT_INPUTS }, scores: null, checkedTips: [], lastSaved: null };
  saveProfiles(profiles);
  input.value = "";
  selectProfile(id);
}

function selectProfile(id) {
  setActiveId(id);
  loadProfileIntoUI(id);
  closeProfileOverlay();
  updateNavProfile();
}

function deleteProfile(e, id) {
  e.stopPropagation();
  const profiles = loadProfiles();
  const name = profiles[id]?.name || "this profile";
  if (!confirm(`Delete ${name}'s data? This cannot be undone.`)) return;
  delete profiles[id];
  saveProfiles(profiles);
  if (getActiveId() === id) {
    localStorage.removeItem(ACTIVE_KEY);
    openProfileOverlay();
  }
  renderProfileList();
}

function updateNavProfile() {
  const id = getActiveId();
  if (!id) return;
  const profiles = loadProfiles();
  const p = profiles[id];
  if (!p) return;
  document.getElementById("navProfileName").textContent = p.name;
  const av = document.getElementById("navAvatar");
  av.textContent = p.name.charAt(0).toUpperCase();
  av.style.background = avatarColor(p.name);
  av.style.display = "flex";
}

// ── Profile Data Load / Save ──────────────────────────────────
function loadProfileIntoUI(id) {
  const profiles = loadProfiles();
  const p = profiles[id];
  if (!p) return;

  const inp = p.inputs || DEFAULT_INPUTS;
  const set = (elId, val) => {
    const el = document.getElementById(elId);
    if (el) el.value = val;
  };
  Object.entries(inp).forEach(([k, v]) => set(k, v));
  updateCalc();

  // Restore checked tips after tips are rendered
  setTimeout(() => {
    const checked = new Set(p.checkedTips || []);
    document.querySelectorAll(".tip-card").forEach(card => {
      if (checked.has(card.dataset.id)) {
        card.classList.add("checked");
        card.querySelector(".tip-check").textContent = "✓";
      }
    });
    recalcPledge();
  }, 50);
}

function saveCurrentProfile() {
  const id = getActiveId();
  if (!id) return;
  const profiles = loadProfiles();
  if (!profiles[id]) return;

  const inputIds = ["car","flights","transit","diet","local","waste",
                    "electricity","heating","solar","clothes","electronics","secondhand"];
  const inputs = {};
  inputIds.forEach(k => {
    const el = document.getElementById(k);
    if (el) inputs[k] = el.value;
  });

  const checkedTips = [...document.querySelectorAll(".tip-card.checked")].map(el => el.dataset.id);

  profiles[id].inputs      = inputs;
  profiles[id].scores      = { ...scores };
  profiles[id].checkedTips = checkedTips;
  profiles[id].lastSaved   = Date.now();
  saveProfiles(profiles);
}

// ── State ─────────────────────────────────────────────────────
let scores = { transport:0, food:0, energy:0, lifestyle:0 };
let pledgedKg = 0;
let tipsData  = [];

// ── Core Calculation ──────────────────────────────────────────
function calcFootprint() {
  const car         = +document.getElementById("car").value;
  const flights     = +document.getElementById("flights").value;
  const transit     = +document.getElementById("transit").value;
  const diet        = document.getElementById("diet").value;
  const local       = +document.getElementById("local").value;
  const waste       = document.getElementById("waste").value;
  const electricity = +document.getElementById("electricity").value;
  const heating     = document.getElementById("heating").value;
  const solar       = document.getElementById("solar").value;
  const clothes     = +document.getElementById("clothes").value;
  const electronics = +document.getElementById("electronics").value;
  const secondhand  = document.getElementById("secondhand").value;

  const weeklyKm   = car * 52;
  const transitSave = EF.transitReduction[transit];

  scores.transport = Math.max(0,
    (weeklyKm * EF.car) + (flights * EF.flight) - (weeklyKm * EF.car * transitSave));

  scores.food = Math.max(0,
    EF.diet[diet] + EF.waste[waste] - (local * EF.localFood));

  scores.energy = Math.max(0,
    (electricity * 12 * EF.electricityPerRupee) + EF.heating[heating] + EF.solar[solar]);

  scores.lifestyle = Math.max(0,
    (clothes * EF.clothesPerItem) + (electronics * EF.electronicsPerUnit) + EF.secondhand[secondhand]);

  return scores;
}

function totalTons() {
  return scores.transport + scores.food + scores.energy + scores.lifestyle;
}

// ── UI Update ─────────────────────────────────────────────────
function updateCalc() {
  const sliders = [
    ["car",     "carVal",     v => `${v} km`],
    ["local",   "localVal",   v => `${v}%`],
    ["clothes", "clothesVal", v => `${v} items`],
  ];
  sliders.forEach(([id, valId, fmt]) => {
    const el = document.getElementById(id);
    if (el) document.getElementById(valId).textContent = fmt(el.value);
  });

  calcFootprint();

  const fmt = t => `${t.toFixed(2)} t`;
  document.getElementById("transportScore").textContent = fmt(scores.transport);
  document.getElementById("foodScore").textContent      = fmt(scores.food);
  document.getElementById("energyScore").textContent    = fmt(scores.energy);
  document.getElementById("lifestyleScore").textContent = fmt(scores.lifestyle);

  const total = totalTons();
  document.getElementById("totalFootprint").textContent = `${total.toFixed(1)} t CO₂`;

  const indiaAvg = 1.9, worldAvg = 4.7;
  document.getElementById("vsIndia").textContent =
    total > indiaAvg ? `+${((total/indiaAvg-1)*100).toFixed(0)}%` : `-${((1-total/indiaAvg)*100).toFixed(0)}%`;
  document.getElementById("vsWorld").textContent =
    total > worldAvg ? `+${((total/worldAvg-1)*100).toFixed(0)}%` : `-${((1-total/worldAvg)*100).toFixed(0)}%`;

  updateRing(total);
  updateDashboard(total);
  updateTips();
  saveCurrentProfile();
}

function updateRing(total) {
  const circumference = 2 * Math.PI * 68;
  const offset = circumference * (1 - Math.min(total / 20, 1));
  const ring = document.getElementById("heroRing");
  const num  = document.getElementById("heroNum");
  ring.style.strokeDashoffset = offset;
  num.textContent = total.toFixed(1);
  ring.style.stroke = total < 4 ? "#2ea043" : total < 10 ? "#d29922" : "#f85149";
}

// ── Dashboard ─────────────────────────────────────────────────
function showDashboard() {
  document.getElementById("dashboard").scrollIntoView({ behavior:"smooth" });
  updateDashboard(totalTons());
}

function updateDashboard(total) {
  renderBarChart();
  renderContextBars(total);
  renderTrendChart(total);
  renderStats(total);
}

function renderBarChart() {
  const max = Math.max(...Object.values(scores), 0.1);
  const cats = [
    { key:"transport", label:"✈ Transport", cls:"transport" },
    { key:"food",      label:"🥗 Food",      cls:"food" },
    { key:"energy",    label:"⚡ Energy",    cls:"energy" },
    { key:"lifestyle", label:"🛍 Lifestyle", cls:"lifestyle" },
  ];
  document.getElementById("barChart").innerHTML = cats.map(c => {
    const w = ((scores[c.key] / max) * 100).toFixed(1);
    return `<div class="bar-row">
      <span class="bar-label">${c.label}</span>
      <div class="bar-track"><div class="bar-fill ${c.cls}" style="width:${w}%"></div></div>
      <span class="bar-num">${scores[c.key].toFixed(2)}t</span>
    </div>`;
  }).join("");
}

function renderContextBars(total) {
  const pct = v => Math.min((v / 4.7) * 100, 200).toFixed(1);
  const bar = document.getElementById("youContextBar");
  const num = document.getElementById("youContextNum");
  if (bar) { bar.style.width = pct(total) + "%"; num.textContent = total.toFixed(1) + "t"; }
}

function renderTrendChart(current) {
  const months = ["J","F","M","A","M","J","J","A","S","O","N","D"];
  const noise  = [0.95,0.97,1.02,1.04,0.98,1.0,1.03,1.01,0.99,0.98,0.97,1.0];
  const vals   = months.map((_,i) => current * noise[i]);
  const peak   = Math.max(...vals);
  document.getElementById("trendChart").innerHTML = vals.map((v,i) => {
    const h = Math.max((v / peak) * 80, 4);
    return `<div class="trend-bar ${i===11?"current":""}" style="height:${h}px" title="${months[i]}: ${v.toFixed(1)}t"></div>`;
  }).join("");
}

function renderStats(total) {
  document.getElementById("statTrees").textContent   = Math.round(total*50).toLocaleString();
  document.getElementById("statFlights").textContent = Math.round(total/0.255);
  document.getElementById("statDriving").textContent = Math.round(total/EF.car).toLocaleString();
  document.getElementById("statKg").textContent      = Math.round((total/12)*1000).toLocaleString();
}

// ── Tips Engine ───────────────────────────────────────────────
function buildTips() {
  const car     = +document.getElementById("car").value;
  const flights = +document.getElementById("flights").value;
  const diet    = document.getElementById("diet").value;
  const solar   = document.getElementById("solar").value;
  const waste   = document.getElementById("waste").value;
  const sh      = document.getElementById("secondhand").value;
  const local   = +document.getElementById("local").value;
  const clothes = +document.getElementById("clothes").value;

  const all = [
    { id:"ev",           title:"Switch to an electric or hybrid vehicle",
      desc:"EVs produce up to 70% less lifecycle CO₂ than petrol cars, especially on India's improving grid.",
      saving:Math.round(car*52*EF.car*0.6*1000), impact:"high", relevant:car>100 },
    { id:"flight_offset",title:"Offset or reduce air travel",
      desc:"One short-haul return flight emits ~255 kg CO₂. Consider train alternatives or carbon offsets.",
      saving:flights>0?Math.round(flights*0.255*0.5*1000):0, impact:"high", relevant:flights>1 },
    { id:"transit",      title:"Use public transport more",
      desc:"Switching one car trip per week to bus or metro can save 200–400 kg CO₂ annually.",
      saving:Math.round(car*52*0.1*EF.car*1000), impact:"high", relevant:car>50 },
    { id:"diet_veg",     title:"Eat plant-based meals 3× per week",
      desc:"Replacing meat meals with vegetarian options is one of the single highest-impact personal choices.",
      saving:["meat_heavy","meat_some"].includes(diet)?300:0, impact:"high",
      relevant:["meat_heavy","meat_some","flexitarian"].includes(diet) },
    { id:"local_food",   title:"Buy local and seasonal produce",
      desc:"Locally sourced food cuts transport and cold-chain emissions. Markets and farm boxes help.",
      saving:Math.round((100-local)*EF.localFood*1000*0.3), impact:"medium", relevant:local<50 },
    { id:"food_waste",   title:"Reduce food waste by meal planning",
      desc:"Food waste accounts for ~8% of global emissions. Plan weekly meals and store food properly.",
      saving:waste==="high"?250:waste==="medium"?100:0, impact:"medium", relevant:waste!=="low" },
    { id:"solar",        title:"Install rooftop solar panels",
      desc:"A 3kW rooftop system in India offsets ~1.5t CO₂/year and pays back in 5–7 years.",
      saving:solar==="no"?500:200, impact:"high", relevant:solar!=="yes" },
    { id:"led",          title:"Switch to LED lighting and smart plugs",
      desc:"LED bulbs use 75% less energy. Smart plugs eliminate standby phantom loads.",
      saving:80, impact:"low", relevant:true },
    { id:"secondhand",   title:"Buy second-hand or repair instead of new",
      desc:"Fast fashion and electronics churn are carbon-intensive. Thrifting, swaps, and repairs extend product life.",
      saving:sh==="never"?200:sh==="sometimes"?100:0, impact:"medium", relevant:sh!=="often" },
    { id:"clothes",      title:"Halve new clothing purchases",
      desc:"Every new garment costs ~25 kg CO₂. A capsule wardrobe and clothing swaps cut emissions fast.",
      saving:Math.round(clothes*0.5*EF.clothesPerItem*1000), impact:"medium", relevant:clothes>10 },
    { id:"compost",      title:"Compost organic kitchen waste",
      desc:"Composting diverts waste from landfill (which produces methane) and enriches your garden.",
      saving:50, impact:"low", relevant:true },
    { id:"cold_wash",    title:"Wash clothes in cold water",
      desc:"90% of washing machine energy goes to heating water. Cold washes clean just as well.",
      saving:60, impact:"low", relevant:true },
  ];
  return all.filter(t => t.relevant).sort((a,b) => b.saving - a.saving);
}

function updateTips() {
  tipsData = buildTips();
  const container = document.getElementById("tipsContainer");
  const checked = new Set([...document.querySelectorAll(".tip-card.checked")].map(el => el.dataset.id));

  container.innerHTML = tipsData.map(tip => {
    const isChecked = checked.has(tip.id);
    const impactLabel = tip.impact==="high"?"🔥 High impact":tip.impact==="medium"?"⚡ Medium impact":"🌱 Low impact";
    return `<div class="tip-card ${isChecked?"checked":""}" data-id="${tip.id}" onclick="toggleTip(this)">
      <div class="tip-check">${isChecked?"✓":""}</div>
      <div class="tip-body">
        <div class="tip-title">${tip.title}</div>
        <div class="tip-desc">${tip.desc}</div>
        <span class="tip-impact ${tip.impact}">${impactLabel} · saves ~${tip.saving} kg CO₂/yr</span>
      </div>
    </div>`;
  }).join("");

  recalcPledge();
}

function toggleTip(card) {
  card.classList.toggle("checked");
  card.querySelector(".tip-check").textContent = card.classList.contains("checked") ? "✓" : "";
  recalcPledge();
  saveCurrentProfile();
}

function recalcPledge() {
  const checked = [...document.querySelectorAll(".tip-card.checked")];
  pledgedKg = 0;
  checked.forEach(card => {
    const tip = tipsData.find(t => t.id === card.dataset.id);
    if (tip) pledgedKg += tip.saving;
  });
  const pct = totalTons() > 0 ? Math.min((pledgedKg / (totalTons()*1000)) * 100, 100) : 0;
  document.getElementById("pledgeSaving").textContent = `${pledgedKg.toLocaleString()} kg`;
  document.getElementById("pledgeProg").style.width = pct + "%";
}

// ── Keyboard: Enter to create profile ────────────────────────
document.addEventListener("keydown", e => {
  if (e.key === "Enter" && document.activeElement?.id === "newProfileName") {
    createProfile();
  }
});

// ── Init ──────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const activeId = getActiveId();
  const profiles = loadProfiles();

  if (activeId && profiles[activeId]) {
    loadProfileIntoUI(activeId);
    updateNavProfile();
    closeProfileOverlay();
  } else {
    openProfileOverlay();
    updateCalc(); // initialise the ring even before profile is chosen
  }

  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute("href"));
      if (target) target.scrollIntoView({ behavior:"smooth" });
    });
  });
});
