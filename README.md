# 🛰️ AgentSpaceDebris (Autonomous Orbital Collision Avoidance & Active Space Debris Removal Escrow)

[![Live dApp](https://img.shields.io/badge/Live%20dApp-agentspacedebris.vercel.app-38BDF8?style=for-the-badge&logo=vercel)](https://agentspacedebris.vercel.app)
[![Network](https://img.shields.io/badge/Network-GenLayer%20StudioNet-38BDF8?style=for-the-badge)](https://studio.genlayer.com)
[![Chain ID](https://img.shields.io/badge/Chain%20ID-61999%20(0xF22F)-10B981?style=for-the-badge)](https://studio.genlayer.com/api)
[![Status](https://img.shields.io/badge/Status-Consensus%20Deployed-brightgreen?style=for-the-badge)]()
[![Standard](https://img.shields.io/badge/Domain-SpaceTech%20%2F%20Orbital%20Sustainability-F97316?style=for-the-badge)]()
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

<p align="center">
  <img src="logo.png" alt="AgentSpaceDebris Logo" width="380" />
</p>

> **AgentSpaceDebris** is an autonomous orbital sustainability and collision avoidance protocol deployed on **GenLayer StudioNet**. It bridges space situational awareness (SSA) radar networks, satellite telemetry, and Two-Line Element (TLE) ephemeris directly into smart contracts to enforce mathematically verified orbital debris de-orbiting into Earth's atmosphere.

---

## 🌌 The Problem Space: The Kessler Syndrome

Low Earth Orbit (LEO) is experiencing exponential congestion from over 36,000 tracked space debris fragments larger than 10 cm and millions of untracked hypervelocity projectiles. A runaway cascade of collisions—the **Kessler Syndrome**—threatens critical civilian telecommunications, navigation (GPS/Galileo), and Earth observation satellites.

### The Critical Market Deadlock
Commercial LEO constellation operators (e.g., Starlink, OneWeb) and space agencies want to hire Active Debris Removal (ADR) contractors (e.g., Astroscale, ClearSpace) to rendezvous with, grapple, and de-orbit defunct rocket bodies. However:
1. **Operator Escrow Risk:** Constellation operators fear fake de-orbit claims where ADR contractors collect multi-million dollar fees without actually altering the object's hazardous orbit.
2. **Contractor Non-Payment Fear:** ADR companies risk expending millions of dollars launching servicing chaser spacecraft, only for constellation operators to arbitrarily withhold final payment.
3. **EVM Incompetence:** Traditional Solidity smart contracts cannot read or parse Two-Line Element sets (TLEs) or execute orbital mechanics equations to verify whether an object has decayed below the 120 km atmospheric reentry threshold.

---

## 💡 The GenLayer Solution

**AgentSpaceDebris** deploys an **Intelligent Contract** on GenLayer StudioNet that automates escrow verification via on-chain AI consensus:

```
+-----------------------------------------------------------------------------------------------+
|                                    AGENTSPACEDEBRIS                                           |
+-----------------------------------------------------------------------------------------------+
| 1. Constellation Operator locks GEN bounty escrow (create_removal_escrow)                     |
| 2. ADR Contractor submits radar ephemeris tracking (submit_orbital_telemetry)                 |
| 3. On-chain AI Astrodynamics Jury fetches radar feeds via gl.nondet.web.render                 |
| 4. Semantic consensus validates perigee decay & reentry status via gl.vm.run_nondet           |
| 5. Automated Decision Matrix:                                                                 |
|    * DEORBIT_CONFIRMED_FULL: Perigee <= 120 km or Reentered -> 100% Bounty Disbursed          |
|    * PARTIAL_ORBIT_LOWERING: Altitude Decay >= 150 km -> 40% Fuel Milestone Disbursed         |
|    * REMOVAL_FAILED_REJECTED: Debris remains in orbit -> 100% Refunded to Operator            |
+-----------------------------------------------------------------------------------------------+
```

---

## 🚀 Deployed Contract Information (GenLayer StudioNet)

The intelligent contract is compiled, validated, and confirmed by validator consensus on GenLayer StudioNet:

| Parameter | Value |
|---|---|
| **Target Network** | **GenLayer StudioNet** |
| **Chain ID** | `61999` (Hex: `0xF22F`) |
| **RPC Endpoint** | `https://studio.genlayer.com/api` |
| **Contract Address** | `0xCC300573284e1d3EE5882426fC9033F255A3Aa45` |
| **Deployment Transaction** | `0x9439d1213ad421628d6d9b854e4dde13c7769b3017ae21cfe829fad1c8c870b3` |
| **Consensus Receipt Status** | `5` (ACCEPTED / FINALIZED) |
| **Live Production dApp** | [https://agentspacedebris.vercel.app](https://agentspacedebris.vercel.app) |
| **Studio Explorer** | [https://studio.genlayer.com](https://studio.genlayer.com) |

---

## 🏛️ Decision Matrix & Escrow Settlement

| Verdict | Astrodynamics Criteria | On-Chain Action |
|---|---|---|
| `DEORBIT_CONFIRMED_FULL` | Measured Perigee $\le 120\text{ km}$ **OR** Status confirmed `DECAYED`/`REENTERED` | **100% of escrowed bounty disbursed** to ADR contractor. |
| `PARTIAL_ORBIT_LOWERING` | Altitude decay $\ge 150\text{ km}$ **BUT** Perigee remains $> 120\text{ km}$ | **40% fuel milestone disbursed**; 60% preserved for final decay. |
| `REMOVAL_FAILED_REJECTED` | Altitude decay $< 150\text{ km}$ **AND** Perigee $> 120\text{ km}$ (failed rendezvous) | **Bounty revoked**; 100% refunded to constellation operator. |
| `STATUS_UNRESOLVED` | Radar feed unreachable, canary mismatch, or malformed JSON | **Non-settling safety lock**; escrow protected from erroneous payout. |

---

## 🛡️ Robust Security Engineering

1. **Accredited Space Tracker Whitelist (`ACCREDITED_SPACE_TRACKERS`):**
   Telemetry is accepted solely from authenticated space surveillance roots:
   - `space-track.org`, `celestrak.org`, `celestrak.com`, `discosweb.esoc.esa.int`, `esa.int`, `orbitaldebris.jsc.nasa.gov`, `nasa.gov`, `leolabs.space`.
2. **Anti-Hallucination Security Canary:**
   Strict verification of `CANARY_AGENT_SPACE_DEBRIS_V1` inside validator calldata prevents prompt injections.
3. **Cooling-Off Dispute Window & Bonded Appeals:**
   Stakeholders have a 24-block (~72 seconds) challenge window to file an appeal backed by a 10% staked bond and supplemental radar logs.
4. **Pull-Payment Safeguard (`_safe_transfer` & `claim_payout`):**
   Buffers downstream transfer failures into a claimable registry, eliminating lost funds.

---

## 📁 Repository Structure

```
AgentSpaceDebris/
├── contracts/
│   └── contract.py                 # Intelligent Contract (py-genlayer)
├── tests/
│   ├── conftest.py                 # Pytest simulator fixture & mock consensus
│   └── test_agentspacedebris.py    # 9 comprehensive tests
├── scripts/
│   ├── deploy_studionet.py         # Deployment script (genlayer-py)
│   └── generate_logo.py            # High-resolution branding logo generator
├── frontend/                       # React 18 + Vite + TailwindCSS dApp
│   ├── src/
│   │   ├── config/genlayer.ts      # GenVM calldata encoding & RPC interface
│   │   ├── components/
│   │   │   ├── Navbar.tsx          # Wallet connection & StudioNet switch
│   │   │   ├── StatsOverview.tsx   # Aggregated LEO metrics
│   │   │   ├── OrbitalRadarVisualizer.tsx # Live SVG SSA radar tracking
│   │   │   ├── CreatePolicyModal.tsx # Escrow initiation modal
│   │   │   ├── PolicyCard.tsx      # Interactive policy card with countdown
│   │   │   ├── SubmitTelemetryModal.tsx # Contractor TLE submission portal
│   │   │   ├── AstrodynamicsInspectorModal.tsx # AI consensus inspector
│   │   │   ├── AppealModal.tsx     # 24-block bonded dispute challenge
│   │   │   └── PullPayoutButton.tsx# Claim buffered funds
│   │   ├── utils/formatters.ts     # Units, perigee, and GEN formatters
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── ARCHITECTURE.md                 # Astrodynamics consensus & system design
├── CHANGELOG.md                    # Milestone release history
├── SECURITY.md                     # Security policies & threat model
├── LICENSE                         # MIT License
└── deployment.json                 # StudioNet consensus deployment receipt
```

---

## 🧪 Testing the Protocol

Execute the full test suite with `pytest`:

```bash
# Run all unit and integration tests
python -m pytest tests -v
```

Output:
```
tests/test_agentspacedebris.py::test_space_debris_deorbit_full_payout PASSED [ 11%]
tests/test_agentspacedebris.py::test_space_debris_unaccredited_source_rejected PASSED [ 22%]
tests/test_agentspacedebris.py::test_partial_orbit_lowering_milestone PASSED [ 33%]
tests/test_agentspacedebris.py::test_debris_removal_failed_rejected PASSED [ 44%]
tests/test_agentspacedebris.py::test_cooling_off_dispute_and_appeal PASSED [ 55%]
tests/test_agentspacedebris.py::test_operator_cannot_self_designate_contractor PASSED [ 66%]
tests/test_agentspacedebris.py::test_role_based_access_control PASSED    [ 77%]
tests/test_agentspacedebris.py::test_cooling_off_countdown_tracking PASSED [ 88%]
tests/test_agentspacedebris.py::test_deploy_with_integer_address_from_studio PASSED [100%]
============================== 9 passed in 0.04s ==============================
```

---

## 💻 Running the Frontend Locally

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000` to interact with the deployed Intelligent Contract on GenLayer StudioNet.

---

## 🛰️ Target Orbit Demonstrations

1. **NORAD #48274 (CZ-5B Core Stage):** Uncontrolled heavy rocket body de-orbiting into the Pacific Ocean.
2. **NORAD #22923 (SL-16 R/B Zenit):** Spent rocket body in high LEO orbit targeted for active tether de-orbit.
3. **NORAD #27386 (Envisat):** 8.2-ton defunct ESA observation satellite crossing crowded 765 km sun-synchronous orbit.
4. **NORAD #49863 (Cosmos 1408 Shrapnel):** High-risk kinetic anti-satellite trackable debris cloud fragment.
