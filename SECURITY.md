# 🛡️ Security Architecture & Policy: AgentSpaceDebris

AgentSpaceDebris secures multi-million dollar orbital debris removal agreements using GenLayer's Intelligent Contracts. Because astrodynamics telemetry and orbital mechanics involve real-world capital settlement, multiple layers of defense-in-depth are enforced.

---

## 🛰️ 1. Security Canary Token Defense

Prompt injection and adversary-manipulated radar web responses are mitigated using a cryptographic consensus canary:
```python
CANARY_TOKEN = "CANARY_AGENT_SPACE_DEBRIS_V1"
```
The leader validator and every non-deterministic validator evaluate whether the output JSON contains the exact canary string. If an injection attempt alters the structure or strips the canary, the consensus engine immediately routes the contract to `STATUS_UNRESOLVED` (`UNRESOLVED_CANARY_FAILED`).

---

## 📡 2. Accredited Surveillance Network Domain Whitelisting

ADR contractors cannot link unauthenticated web logs, self-hosted blogs, or falsified radar feeds. The smart contract validates that every ephemeris URL belongs strictly to accredited space surveillance systems:
- `space-track.org` (US Space Command / 18th Space Defense Squadron)
- `celestrak.org` / `celestrak.com` (Center for Space Standards & Innovation)
- `discosweb.esoc.esa.int` / `esa.int` (ESA Space Debris Office)
- `orbitaldebris.jsc.nasa.gov` / `nasa.gov` (NASA Orbital Debris Program Office)
- `leolabs.space` (Global Phased-Array Radar Network)

Any attempt to call `submit_orbital_telemetry` or `appeal_verdict` with an unauthorized host reverts on-chain with `ContractError("Telemetry unauthenticated")`.

---

## 🔒 3. Protected Non-Settling State (`STATUS_UNRESOLVED`)

Traditional smart contracts often fail or liquidate erroneously when an external oracle is unreachable. AgentSpaceDebris enforces that network timeouts, 404s, or malformed JSON responses transition the policy into `STATUS_UNRESOLVED`:
- Funds remain locked in escrow.
- No accidental payouts or unfair refunds are executed.
- The ADR contractor or operator can re-trigger adjudication once network stability is restored.

---

## ⏳ 4. 24-Block Dispute Challenge Window & Bonded Appeals

To prevent flash arbitrage or immediate execution of flawed telemetry:
1. Every adjudication enters a **24-block (~72 seconds)** cooling-off window (`STATUS_AWAITING_PAYOUT`).
2. Either stakeholder can file an appeal by staking a **10% dispute bond**.
3. If the appeal is upheld, the bond is returned to the appellant. If dismissed, the bond is forfeited directly to the counterparty.
4. Uncontested settlement can only be executed strictly after the challenge window elapses.

---

## 💳 5. Pull-Payment Safeguard (`_safe_transfer` & `claim_payout`)

To prevent Denial-of-Service (DoS) where a malicious contract or recipient reverts incoming transfers, AgentSpaceDebris implements a Pull-Payment fallback:
```python
def _safe_transfer(self, recipient: Address, amount: bigint) -> None:
    try:
        gl.get_contract_at(r_addr).emit_transfer(value=u256(int(amount)))
    except Exception:
        self.claimable_balances[rec_str] = curr + amount
```
If a downstream transfer fails, the funds are safely buffered into `claimable_balances` and can be withdrawn anytime via `claim_payout()`.

---

## 🕒 6. Trusted Consensus Timestamping

System time is strictly derived from GenLayer consensus context (`gl.message_raw["datetime"]`) and converted to UTC Unix seconds, preventing local validator clock desynchronization.
