# CarbonTrace — Carbon Footprint Awareness Platform

> **PromptWars Virtual · Main Challenge 3**
> Built by Suhas A

A smart, personalised carbon footprint tracker that helps individuals understand, measure, and reduce their environmental impact through data-driven insights and actionable recommendations.

---

## 🌱 Live Demo

**[→ View Live on Netifly](#)** *(https://carbontrace-platform.netlify.app/)*

---

## 🎯 Challenge Vertical

**Environmental Awareness Assistant** — Helping individuals make informed, planet-friendly decisions through a smart, interactive platform.

---

## ✨ Features

| Feature | Description |
|---|---|
| **4-Category Calculator** | Transport, Food, Energy, and Lifestyle inputs with real-time updates |
| **Animated Carbon Ring** | Visual meter showing your footprint relative to a 20t max scale, colour-coded by severity |
| **Personalised Dashboard** | Category bar chart, global comparison, 12-month trend simulation, and quick stats |
| **AI-style Tip Engine** | Dynamic action plan ranked by CO₂ saving potential, filtered to your actual inputs |
| **Pledge Tracker** | Tick off actions to see your committed annual savings build up in real-time |
| **Fully Responsive** | Works on mobile, tablet, and desktop |
| **Accessible** | Keyboard navigable, respects `prefers-reduced-motion`, semantic HTML |

---

## 🔬 Approach & Logic

### Emission Factor Sources
- **Transport**: IPCC AR6 — 192g CO₂/km for average petrol car; 255 kg per short-haul return flight
- **Food**: Oxford University food emissions research (Poore & Nemecek 2018) — ranges from 1.5t/yr vegan to 4.5t/yr meat-heavy diet
- **Energy**: India grid emission factor ~0.82 kg CO₂/kWh (CEA 2023), estimated at ~₹8/kWh to convert electricity bills
- **Lifestyle**: Carbon Trust garment lifecycle (~25 kg CO₂/item); electronics manufacturing averages

### Calculation Flow
```
User inputs → calcFootprint() → per-category CO₂ tonnes → total footprint
→ ring animation + dashboard charts + sorted tip cards
```

### Tips Engine
Tips are dynamically filtered based on which inputs are most impactful for the specific user (e.g., a non-driver won't see "switch to EV"). They're sorted by estimated annual CO₂ saving in kg.

---

## 🗂️ Project Structure

```
carbon-footprint-platform/
├── index.html          # Main app (single-page)
├── 
│  └── style.css       # Full design system — dark theme, lime accent
├── 
│  └── app.js          # Calculation logic, dashboard rendering, tips engine
└── README.md
```

---

## 🚀 Running Locally

No build step required — it's plain HTML/CSS/JS.

```bash
git clone https://github.com/YOUR_USERNAME/carbon-footprint-platform.git
cd carbon-footprint-platform
# Open index.html in your browser, or use live-server:
npx live-server
```

---

## 🌍 Deploying to Vercel (Recommended)

1. Push code to a public GitHub repository
2. Go to [netlify.com](https://www.netlify.com/) → New Project
3. Import your GitHub repo
4. Click **Deploy** — no config needed for static sites
5. Copy your `.netifly.app` URL for submission

---

## 📐 Assumptions Made

1. India-specific electricity pricing (₹8/kWh average) used for energy calculations
2. Flight emission factor assumes short-to-medium-haul return flights (~255 kg CO₂ each)
3. Monthly trend chart uses simulated seasonal variation around the calculated annual total
4. "Paris target" benchmark set at 2.0t CO₂/person/year (IPCC SR1.5)
5. Tree offset factor: 1 tree absorbs approximately 20 kg CO₂/year (20-year average)

---

## 🧪 Code Quality

- **Zero dependencies** — pure HTML, CSS, JavaScript
- **Separation of concerns**: HTML structure, CSS design system, JS logic are cleanly separated
- **Accessible**: `<label>` elements linked to inputs, keyboard navigable, ARIA-friendly
- **Performant**: No frameworks, no bundler — loads in under 1 second
- **Maintainable**: Emission factors are isolated in a single `EF` constant object for easy updates

---

## 📄 License

MIT — free to use and build upon.
