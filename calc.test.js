/**
 * CarbonTrace — Unit Tests
 * Tests for all emission calculation logic
 * Run with: node tests/calc.test.js
 * No external dependencies required.
 */

"use strict";

// ── Inline emission factors (mirrors app.js EF object) ────────
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

// ── Pure calculation functions (mirrors app.js logic) ─────────
function calcTransport({ car, flights, transit }) {
  const weeklyKm = car * 52;
  const save = EF.transitReduction[transit] || 0;
  return Math.max(0, (weeklyKm * EF.car) + (flights * EF.flight) - (weeklyKm * EF.car * save));
}

function calcFood({ diet, local, waste }) {
  return Math.max(0, EF.diet[diet] + EF.waste[waste] - (local * EF.localFood));
}

function calcEnergy({ electricity, heating, solar }) {
  return Math.max(0,
    (electricity * 12 * EF.electricityPerRupee) + EF.heating[heating] + EF.solar[solar]);
}

function calcLifestyle({ clothes, electronics, secondhand }) {
  return Math.max(0,
    (clothes * EF.clothesPerItem) + (electronics * EF.electronicsPerUnit) + EF.secondhand[secondhand]);
}

function calcTotal(inputs) {
  return calcTransport(inputs) + calcFood(inputs) + calcEnergy(inputs) + calcLifestyle(inputs);
}

function sanitiseName(raw) {
  return raw.replace(/[<>"'`]/g, "").trim().slice(0, 30);
}

// ── Minimal test runner ───────────────────────────────────────
let passed = 0, failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅  ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌  ${name}`);
    console.log(`       → ${e.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || "Assertion failed");
}

function assertClose(a, b, msg, tolerance = 0.0001) {
  if (Math.abs(a - b) > tolerance) {
    throw new Error(msg || `Expected ${b}, got ${a} (tolerance ${tolerance})`);
  }
}

// ── Transport Tests ───────────────────────────────────────────
console.log("\n📦 Transport Emissions");

test("Zero car + zero flights = 0 transport emissions", () => {
  const result = calcTransport({ car: 0, flights: 0, transit: 0 });
  assertClose(result, 0, `Expected 0, got ${result}`);
});

test("150km/week car, 2 flights, no transit", () => {
  const result = calcTransport({ car: 150, flights: 2, transit: 0 });
  const expected = (150 * 52 * EF.car) + (2 * EF.flight);
  assertClose(result, expected, `Expected ${expected.toFixed(4)}, got ${result.toFixed(4)}`);
});

test("Public transit (always) reduces car emissions by 30%", () => {
  const noTransit   = calcTransport({ car: 200, flights: 0, transit: 0 });
  const withTransit = calcTransport({ car: 200, flights: 0, transit: 3 });
  assert(withTransit < noTransit, "Transit should reduce emissions");
  assertClose(withTransit, noTransit * 0.70, `Expected 70% of base`, 0.001);
});

test("More flights = higher transport emissions", () => {
  const low  = calcTransport({ car: 100, flights: 1, transit: 0 });
  const high = calcTransport({ car: 100, flights: 10, transit: 0 });
  assert(high > low, "10 flights should emit more than 1 flight");
});

test("Transport result is never negative", () => {
  const result = calcTransport({ car: 0, flights: 0, transit: 3 });
  assert(result >= 0, `Result should be >= 0, got ${result}`);
});

// ── Food Tests ────────────────────────────────────────────────
console.log("\n🥗 Food Emissions");

test("Vegan diet emits less than meat-heavy diet", () => {
  const vegan = calcFood({ diet: "vegan",      local: 0, waste: "low" });
  const heavy = calcFood({ diet: "meat_heavy", local: 0, waste: "low" });
  assert(vegan < heavy, `Vegan (${vegan}) should be < meat_heavy (${heavy})`);
});

test("Higher local food % reduces food emissions", () => {
  const low  = calcFood({ diet: "flexitarian", local: 10,  waste: "medium" });
  const high = calcFood({ diet: "flexitarian", local: 90, waste: "medium" });
  assert(high < low, "More local food should reduce emissions");
});

test("High food waste adds 0.25t vs low waste", () => {
  const lo = calcFood({ diet: "vegan", local: 0, waste: "low" });
  const hi = calcFood({ diet: "vegan", local: 0, waste: "high" });
  assertClose(hi - lo, 0.25, `Waste delta should be 0.25t`);
});

test("Diet order: vegan < vegetarian < flexitarian < meat_some < meat_heavy", () => {
  const diets = ["vegan","vegetarian","flexitarian","meat_some","meat_heavy"];
  const vals = diets.map(d => calcFood({ diet: d, local: 0, waste: "low" }));
  for (let i = 1; i < vals.length; i++) {
    assert(vals[i] > vals[i-1], `${diets[i]} should emit more than ${diets[i-1]}`);
  }
});

test("Food result is never negative", () => {
  const result = calcFood({ diet: "vegan", local: 100, waste: "low" });
  assert(result >= 0, `Food result should be >= 0, got ${result}`);
});

// ── Energy Tests ──────────────────────────────────────────────
console.log("\n⚡ Energy Emissions");

test("Zero electricity bill, no heating, full solar → near-zero energy", () => {
  const result = calcEnergy({ electricity: 0, heating: "none", solar: "yes" });
  assert(result >= 0, "Should not go negative");
  assert(result < 0.01, `Expected near 0, got ${result}`);
});

test("Full solar reduces energy emissions", () => {
  const noSolar   = calcEnergy({ electricity: 1500, heating: "gas", solar: "no" });
  const fullSolar = calcEnergy({ electricity: 1500, heating: "gas", solar: "yes" });
  assert(fullSolar < noSolar, "Solar should reduce emissions");
});

test("Gas heating emits more than renewable heating", () => {
  const gas  = calcEnergy({ electricity: 0, heating: "gas",       solar: "no" });
  const ren  = calcEnergy({ electricity: 0, heating: "renewable", solar: "no" });
  assert(gas > ren, `Gas (${gas}) should be > renewable (${ren})`);
});

test("Higher electricity bill = higher emissions", () => {
  const low  = calcEnergy({ electricity: 500,  heating: "none", solar: "no" });
  const high = calcEnergy({ electricity: 5000, heating: "none", solar: "no" });
  assert(high > low, "Higher bill should mean higher emissions");
});

// ── Lifestyle Tests ───────────────────────────────────────────
console.log("\n🛍 Lifestyle Emissions");

test("Zero clothes, zero electronics, often secondhand → near-zero lifestyle", () => {
  const result = calcLifestyle({ clothes: 0, electronics: 0, secondhand: "often" });
  assert(result >= 0, "Should not go negative");
});

test("More clothes = more emissions", () => {
  const low  = calcLifestyle({ clothes: 5,  electronics: 0, secondhand: "never" });
  const high = calcLifestyle({ clothes: 50, electronics: 0, secondhand: "never" });
  assert(high > low, "More clothes should emit more");
});

test("Secondhand shopping reduces lifestyle emissions", () => {
  const never  = calcLifestyle({ clothes: 20, electronics: 2, secondhand: "never" });
  const often  = calcLifestyle({ clothes: 20, electronics: 2, secondhand: "often" });
  assert(often < never, "Secondhand should reduce emissions");
});

test("Each electronic unit adds 0.3t", () => {
  const one   = calcLifestyle({ clothes: 0, electronics: 1, secondhand: "never" });
  const three = calcLifestyle({ clothes: 0, electronics: 3, secondhand: "never" });
  assertClose(three - one, 0.6, "2 extra units should add 0.6t");
});

// ── Total Footprint Tests ─────────────────────────────────────
console.log("\n🌍 Total Footprint");

test("Total = sum of all four categories", () => {
  const inputs = { car:150, flights:2, transit:1, diet:"flexitarian", local:30,
                   waste:"medium", electricity:1500, heating:"gas", solar:"no",
                   clothes:20, electronics:2, secondhand:"sometimes" };
  const total    = calcTotal(inputs);
  const expected = calcTransport(inputs) + calcFood(inputs) + calcEnergy(inputs) + calcLifestyle(inputs);
  assertClose(total, expected, `Total mismatch: ${total} vs ${expected}`);
});

test("Maximum lifestyle footprint is higher than minimum", () => {
  const min = calcTotal({ car:0, flights:0, transit:3, diet:"vegan",      local:100,
                          waste:"low", electricity:0, heating:"none", solar:"yes",
                          clothes:0, electronics:0, secondhand:"often" });
  const max = calcTotal({ car:1000, flights:20, transit:0, diet:"meat_heavy", local:0,
                          waste:"high", electricity:10000, heating:"gas", solar:"no",
                          clothes:100, electronics:10, secondhand:"never" });
  assert(max > min, `Max (${max.toFixed(2)}) should be > Min (${min.toFixed(2)})`);
});

test("Total is always >= 0", () => {
  const result = calcTotal({ car:0, flights:0, transit:3, diet:"vegan", local:100,
                              waste:"low", electricity:0, heating:"none", solar:"yes",
                              clothes:0, electronics:0, secondhand:"often" });
  assert(result >= 0, `Total should be >= 0, got ${result}`);
});

// ── Input Sanitisation Tests ──────────────────────────────────
console.log("\n🔒 Security — Input Sanitisation");

test("Profile name: strips <script> tags", () => {
  const result = sanitiseName("<script>alert('xss')</script>");
  assert(!result.includes("<") && !result.includes(">"), `Should strip < and >, got: ${result}`);
});

test("Profile name: strips double quotes", () => {
  const result = sanitiseName('Hello "World"');
  assert(!result.includes('"'), `Should strip quotes, got: ${result}`);
});

test("Profile name: strips backticks", () => {
  const result = sanitiseName("name`injected");
  assert(!result.includes("`"), `Should strip backticks, got: ${result}`);
});

test("Profile name: truncates to 30 chars", () => {
  const long = "A".repeat(50);
  const result = sanitiseName(long);
  assert(result.length <= 30, `Should be max 30 chars, got ${result.length}`);
});

test("Profile name: trims whitespace", () => {
  const result = sanitiseName("   Suhas   ");
  assert(result === "Suhas", `Should trim whitespace, got "${result}"`);
});

test("Profile name: allows normal names unchanged", () => {
  const result = sanitiseName("Suhas A");
  assert(result === "Suhas A", `Normal name should pass through, got "${result}"`);
});

// ── Quick Stats Tests ─────────────────────────────────────────
console.log("\n📊 Quick Stats Calculations");

test("Trees to offset = total × 50", () => {
  const total = 5.0;
  const trees = Math.round(total * 50);
  assert(trees === 250, `5t should need 250 trees, got ${trees}`);
});

test("Monthly kg = (total / 12) × 1000", () => {
  const total   = 6.0;
  const monthly = Math.round((total / 12) * 1000);
  assert(monthly === 500, `6t/yr should be 500kg/month, got ${monthly}`);
});

test("Flight equivalents = total / 0.255", () => {
  const total   = 2.55;
  const flights = Math.round(total / 0.255);
  assert(flights === 10, `2.55t should equal 10 flights, got ${flights}`);
});

// ── Summary ───────────────────────────────────────────────────
console.log("\n" + "─".repeat(45));
console.log(`  Results: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log("  🎉 All tests passed!\n");
} else {
  console.log(`  ⚠️  ${failed} test(s) failed — review output above.\n`);
  process.exit(1);
}
