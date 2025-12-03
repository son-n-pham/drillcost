# DrillCost Pro

> **Professional drilling cost optimization and scenario analysis tool for drilling engineers**

[![React](https://img.shields.io/badge/React-19.0.0-61dafb?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2.0-646cff?logo=vite)](https://vitejs.dev/)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

DrillCost Pro is a sophisticated web application designed for drilling engineers to compare different drill bit strategies and determine the most cost-effective approach for drilling well intervals. The tool performs comprehensive simulations that account for bit costs, drilling rates, trip times, and operational expenses to identify optimal drilling scenarios.

## 🎯 Purpose

When drilling oil and gas wells, engineers face a critical decision: **Should I use cheaper bits that wear out faster, or expensive bits that last longer?** The answer depends on multiple factors:

- Rig daily operating costs
- Trip-in/trip-out times (non-productive time)
- Rate of penetration (ROP) for different bit types
- Bit purchase costs
- Interval length to be drilled

DrillCost Pro automates this complex analysis, enabling data-driven decisions that can save significant costs on drilling operations.

## ✨ Key Features

- **🔧 Flexible Bit Configuration** — Define unlimited bit types with custom costs, ROPs, and maximum drilling distances
- **📊 Scenario Comparison** — Create and compare multiple drilling strategies side-by-side
- **📈 Interactive Visualizations** — Real-time charts showing depth vs. time and depth vs. cost
- **💰 Cost Optimization** — Automatically identifies the most cost-effective scenario
- **⏱️ Comprehensive Simulation** — Accounts for drilling time, trip times, circulating hours, and rig costs
- **💾 Data Persistence** — Save and load scenarios as JSON files
- **🌓 Dark/Light Mode** — Professional UI with theme support
- **📱 Responsive Design** — Works seamlessly on desktop, tablet, and mobile

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/son-n-pham/cost-per-meter.git
cd cost-per-meter

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will open at `http://localhost:5173`

### 3-Step Quick Start

1. **Configure Global Parameters** — Set rig rate, trip speed, depths, and circulating hours in the Settings panel
2. **Define Bit Types** — Create bit configurations with costs, ROPs, and maximum distances (use sample data or import JSON)
3. **Build Scenarios** — Create drilling scenarios by selecting bit sequences and compare results

## 📖 Usage Guide

### 1. Settings Panel

Configure global drilling parameters that apply to all scenarios:

| Parameter | Description | Units | Typical Range |
|-----------|-------------|-------|---------------|
| **Rig Rate** | Daily operating cost of the rig | $/day | 50,000 - 500,000 |
| **Trip Speed** | Rate of pipe movement in/out of hole | stands/hr | 40 - 100 |
| **Stand Length** | Length of each pipe stand | meters | 27 - 30 |
| **Depth In** | Starting depth for the interval | meters | 0 - 10,000+ |
| **Interval to Drill** | Length of section to drill | meters | 100 - 3,000+ |
| **Circulating Hours** | Time required for bit/BHA changes | hours | 0.5 - 2.0 |


### 2. Scenario Manager

Build and compare drilling strategies:

1. **Create Scenario** — Click "Add Scenario" and provide a descriptive name
2. **Build Bit Sequence** — Select bits in the order they'll be used
   - The sequence builder shows cumulative distance
   - Visual progress bar indicates if sequence reaches target depth
3. **Review Metrics** — Each scenario displays:
   - **Total Time** — Days and hours to complete drilling
   - **Total Cost** — Cumulative cost including bits, rig time, and trips
   - **Avg Gross ROP** — Overall rate including non-productive time
   - **Bits Consumed** — Quantity of each bit type used
   - **Cost Per Meter** — ⭐ **KEY METRIC** for optimization
   - **Status** — Complete (reaches target) or Incomplete


### 3. Simulation Charts

Interactive visualizations powered by Recharts:

- **Depth vs. Time** — Shows drilling progress timeline for all scenarios
- **Depth vs. Cost** — Shows cumulative cost accumulation with depth

Charts include:
- Color-coded lines per scenario
- Hover tooltips with exact values
- Step-wise visualization showing bit changes
- Dark mode support

## 🧮 How It Works

### Simulation Algorithm

For each scenario, the simulation engine processes the bit sequence step-by-step:

1. **Drilling Phase**
   - Calculate drilling time: `Time = Distance / ROP`
   - Add bit purchase cost
   - Add operational cost: `Rig Rate × (Drilling Time / 24)`
   - Track depth progress

2. **Trip Operations** (when bit is exhausted and more drilling needed)
   - Calculate current depth in stands: `Depth / Stand Length`
   - Trip out time: `Stands / Trip Speed`
   - Trip in time: `Stands / Trip Speed`
   - Add circulating hours for bit/BHA change
   - Apply rig costs during non-productive time

3. **Completion Check**
   - Scenario is "Complete" if total drilled ≥ interval length
   - Scenario is "Incomplete" if bits are exhausted before reaching target

4. **Calculate Metrics**
   - Total time (hours)
   - Total cost (USD)
   - **Cost per meter** = `Total Cost / Interval Drilled`
   - Average gross ROP (accounts for trip time)

### Cost Calculation Formula

```
Total Cost = Σ(Bit Costs) + (Rig Rate × Total Time / 24)

Where Total Time includes:
  - Drilling time for each bit
  - Trip out + Trip in times for bit changes
  - Circulating hours for each bit change
```

## 📚 Drilling Terminology

| Term | Definition | Impact on Costs |
|------|------------|-----------------|
| **ROP** | Rate of Penetration — speed of drilling in m/hr | Higher ROP = less rig time = lower cost |
| **Trip Speed** | Rate of moving drill string in/out (stands/hr) | Faster trips = less non-productive time |
| **Circulating Hours** | Time to circulate drilling fluid for bit changes | Directly adds to rig time costs |
| **Stand** | Section of drill pipe (typically 27-30m) | Determines trip time calculation |
| **Bit Life** | Maximum distance a bit can drill | Longer life = fewer trips = lower cost |
| **Gross ROP** | Average rate including trips and bit changes | True indicator of efficiency |
| **Cost Per Meter** | Total cost divided by meters drilled | **Primary optimization metric** |

## 🔬 Technical Overview

### Architecture

```
src/
├── App.tsx                    # Main application component
├── components/
│   ├── ScenarioManager.tsx   # Scenario creation and comparison
│   ├── SettingsPanel.tsx     # Global parameter settings
│   └── SimulationCharts.tsx  # Data visualization
├── utils/
│   └── simulation.ts         # Core simulation engine
├── types.ts                  # TypeScript type definitions
├── constants.ts              # Default values and sample data
└── sampleData.ts            # Pre-loaded example scenarios
```

### Technology Stack

- **React 19.0.0** — UI framework with modern hooks
- **TypeScript 5.8.2** — Type-safe development
- **Vite 6.2.0** — Fast build tool and dev server
- **Recharts 3.5.1** — Interactive charting library
- **Lucide React 0.555.0** — Icon library
- **Tailwind CSS** — Utility-first styling

### Data Models

```typescript
interface Bit {
  id: string
  name: string
  cost: number          // USD
  rop: number          // meters/hour
  maxDistance: number  // meters
  color: string        // hex color
}

interface GlobalParams {
  operationCostPerDay: number  // $/day
  tripSpeed: number            // stands/hr
  standLength: number          // meters
  depthIn: number             // meters
  intervalToDrill: number     // meters
  circulatingHours: number    // hours
}

interface ScenarioConfig {
  id: string
  name: string
  bitSequence: string[]  // Array of Bit IDs
}

interface ScenarioResult {
  id: string
  name: string
  steps: SimulationStep[]
  totalTime: number           // hours
  totalCost: number          // USD
  costPerMeter: number       // USD/m
  bitsUsed: BitUsage[]
  status: 'complete' | 'incomplete'
}
```

## 💡 Example Use Cases

### 1. Pre-Drill Planning

**Scenario**: Planning to drill 2,000m interval with $200,000/day rig

**Analysis**:
- Compare 3 scenarios: all-budget bits, all-premium bits, hybrid approach
- Identify that hybrid (start with premium, finish with budget) saves $50,000
- Present data-driven recommendation to management

### 2. Bit Performance Comparison

**Scenario**: Evaluating new bit supplier claims

**Analysis**:
- Model vendor's claimed ROP and bit life
- Compare against current bit strategy
- Determine break-even price point for new bits

### 3. Post-Job Analysis

**Scenario**: Actual drilling took longer than planned

**Analysis**:
- Model actual vs. planned bit performance
- Identify ROP variances and additional trip costs
- Generate lessons learned for future wells

## 🎓 Best Practices

### Scenario Design Tips

1. **Start Simple** — Begin with single-bit scenarios to establish baselines
2. **Test Extremes** — Compare all-budget vs. all-premium to bound the solution space
3. **Hybrid Strategies** — Often optimal to use premium bits early, budget bits at end
4. **Consider Geology** — Match bit ROP assumptions to formation characteristics
5. **Account for Uncertainty** — Run sensitivity analysis with ±20% ROP variations

### Interpreting Results

- **Cost per meter is king** — The definitive optimization metric
- **Gross ROP matters** — Low drilling ROP + frequent trips = poor efficiency
- **Complete scenarios only** — Incomplete scenarios waste bits and rig time
- **Bit changes are expensive** — Trip time and circulating hours add significant cost
- **Longer intervals favor premium bits** — Fixed trip costs amortized over more meters

## 🛠️ Development

### Build Commands

```bash
# Development with hot reload
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

### File Operations

**Export Scenarios**: Click "Save Scenarios" to download JSON file with all configurations

**Import Scenarios**: Click "Load Scenarios" to restore previously saved state

**JSON Format**:
```json
{
  "bits": [...],
  "scenarios": [...],
  "globalParams": {...}
}
```

## ⚠️ Limitations & Assumptions

- **Simplified Trip Model** — Assumes constant trip speed (doesn't account for acceleration/deceleration)
- **No Formation Changes** — ROP assumed constant for each bit (actual drilling has variability)
- **No BHA Costs** — Only models bit costs (bottom hole assembly costs not included)
- **No Directional Drilling** — Trip times based on vertical depth only
- **Perfect Bit Life** — Assumes bits drill exactly max distance (actual wear is gradual)
- **No Mud Costs** — Drilling fluid expenses not modeled

These simplifications are acceptable for comparative scenario analysis where all scenarios use the same assumptions.

## 📄 License

This project is available under the MIT License. See the `LICENSE` file for details.

## Disclaimer

The calculations and simulations provided by DrillCost Pro are for general informational and planning purposes only and may not account for all site-specific factors. The authors and contributors make no representations or warranties about the accuracy, completeness, or suitability of the results, and accept no professional liability for decisions made using this tool. Users should independently verify key assumptions and consult qualified professionals before relying on outputs for operational or financial decisions.

## 👤 Author

**Son Pham**  
GitHub: [@son-n-pham](https://github.com/son-n-pham)

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/son-n-pham/cost-per-meter/issues).

## 📧 Support

For questions or support, please open an issue on GitHub.

---

**Built with ❤️ for the drilling engineering community**