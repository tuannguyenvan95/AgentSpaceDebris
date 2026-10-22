# 📜 Changelog: AgentSpaceDebris

All notable changes to the AgentSpaceDebris protocol, intelligent contracts, and dApp interfaces are documented in this file.

---

## [v1.2.0] - 2026-10-22 (Milestone: Mission Control Radar & On-Chain Governance)

### Added
- **Interactive LEO Orbital Space Surveillance Radar (SSA):** Canvas/SVG radar display plotting real-time debris orbital positions, altitude ranges (120 km - 800 km), and animated sweep lines.
- **On-Chain Role Introspection (`get_user_role`):** Exposes caller permissions dynamically (`OPERATOR`, `CONTRACTOR`, `APPELLANT`, `OWNER`, `OBSERVER`) directly from consensus storage.
- **Live Challenge Cooling-Off Countdown (`get_remaining_cooling_off_seconds`):** Real-time countdown tracking the 24-block (~72s) dispute challenge window before uncontested liquidation.
- **Pull-Payment Safeguard Interface (`PullPayoutButton`):** Front-facing claim recovery interface calling `claim_payout()` for buffered balances.
- **Comprehensive Pytest & Gltest Test Suite:** 9 unit and integration tests verifying full deorbit releases, unaccredited domain rejections, partial orbit lowerings, and studio address casting.

### Changed
- Refactored `__init__` and `_ensure_owner` to auto-cast integer address representations into native GenLayer `Address` instances to prevent studio schema crashes.
- Upgraded dispute bond accounting to prevent double-payout exploits upon appeal resolution.

---

## [v1.1.0] - 2026-10-22 (Milestone: Astrodynamics AI Magistrate & Security Hardening)

### Added
- **Security Canary Defense (`CANARY_AGENT_SPACE_DEBRIS_V1`):** Validator consensus calldata integrity check preventing prompt injection attacks.
- **Accredited Space Surveillance Network Whitelist (`ACCREDITED_SPACE_TRACKERS`):** Restricts telemetry inputs strictly to Space-Track.org, CelesTrak, ESA DISCOS, NASA ODPO, and LeoLabs.
- **Non-Settling Safety State (`STATUS_UNRESOLVED`):** Shields escrow funds from liquidation when telemetry feeds are unreachable or malformed.
- **Parametric Decision Matrix:**
  - `DEORBIT_CONFIRMED_FULL`: 100% bounty disbursed upon perigee &le; 120 km or atmospheric reentry.
  - `PARTIAL_ORBIT_LOWERING`: 40% fuel subsidy disbursed for altitude reduction &ge; 150 km.
  - `REMOVAL_FAILED_REJECTED`: 100% refund to operator for stationary orbits.

---

## [v1.0.0] - 2026-10-22 (Milestone: Genesis Protocol & GenLayer StudioNet Deployment)

### Added
- Initial Intelligent Contract deployment on GenLayer StudioNet (Chain ID: 61999 / `0xF22F`).
- Contract Address: `0xCC300573284e1d3EE5882426fC9033F255A3Aa45`.
- Core storage layout utilizing `TreeMap[str, DebrisRemovalPolicy]` and `DynArray[str]`.
- Trusted consensus timestamp derivation via `gl.message_raw["datetime"]`.
