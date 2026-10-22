# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
from dataclasses import dataclass
import json
import hashlib

CANARY_TOKEN = "CANARY_AGENT_SPACE_DEBRIS_V1"
ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

# Time & Cooling-Off Parameters
SECONDS_PER_BLOCK = 3
COOLING_OFF_BLOCKS = 24
COOLING_OFF_SECONDS = bigint(COOLING_OFF_BLOCKS * SECONDS_PER_BLOCK)  # 72 seconds
DEFAULT_MISSION_EXPIRY_SECONDS = bigint(86400 * 90)                   # 90 days mission window

# Lifecycle Statuses
STATUS_POLICY_OPEN = u8(0)           # Constellation operator deposited escrow, awaiting mission execution
STATUS_TELEMETRY_SUBMITTED = u8(1)   # ADR contractor linked TLE orbital radar telemetry
STATUS_AWAITING_PAYOUT = u8(2)       # AI Orbital Mechanics Jury rendered verdict, cooling-off active
STATUS_SETTLED_DEORBIT_FULL = u8(3)  # Confirmed de-orbit / atmospheric reentry, 100% escrow released
STATUS_SETTLED_PARTIAL = u8(4)       # Partial orbit lowering verified, 40% milestone released, 60% preserved
STATUS_SETTLED_REJECTED = u8(5)      # Debris remains in orbit / mission failed, 100% refunded to operator
STATUS_DISPUTED = u8(6)              # Under appellate review with 10% staked bond
STATUS_EXPIRED_RECLAIMED = u8(7)     # Mission expired without telemetry, reclaimed by operator
STATUS_UNRESOLVED = u8(8)            # Telemetry fetch, parse, or canary failure (protected non-settling state)


class ContractError(Exception):
    """Domain-specific error for AgentSpaceDebris protocol."""
    pass


def _to_address(val) -> Address:
    """Converts any Address, int, or str into a valid GenLayer Address instance."""
    if isinstance(val, Address):
        return val
    if isinstance(val, int):
        hex_str = f"0x{val:040x}"
        return Address(hex_str)
    if isinstance(val, str):
        clean = val.strip()
        if clean.startswith("0x") or clean.startswith("0X"):
            return Address(clean.lower())
        try:
            int_val = int(clean)
            return Address(f"0x{int_val:040x}")
        except ValueError:
            return Address(clean.lower())
    if isinstance(val, (bytes, bytearray)):
        return Address("0x" + val.hex())
    return Address(str(val))


def _addr_str(addr) -> str:
    """Safely format an Address or address-like value into a lowercase hex string."""
    if addr is None:
        return ZERO_ADDRESS
    if isinstance(addr, int):
        return f"0x{addr:040x}".lower()
    try:
        return addr.as_hex.lower()
    except Exception:
        return str(addr).lower()


def _get_sender() -> Address:
    """Safely obtain transaction sender across GenVM runtime versions."""
    try:
        raw = gl.message.sender_address
        return _to_address(raw)
    except Exception:
        try:
            raw = gl.message.sender
            return _to_address(raw)
        except Exception:
            raise ContractError("Cannot resolve sender address.")


ACCREDITED_SPACE_TRACKERS = [
    "space-track.org",
    "celestrak.org",
    "celestrak.com",
    "discosweb.esoc.esa.int",
    "esa.int",
    "orbitaldebris.jsc.nasa.gov",
    "nasa.gov",
    "leolabs.space",
]


def _is_accredited_space_tracker(url: str) -> bool:
    """Verifies that orbital tracking telemetry originates strictly from recognized space surveillance networks."""
    clean = str(url).strip().lower()
    if not (clean.startswith("http://") or clean.startswith("https://")):
        return False
    try:
        no_proto = clean.split("://", 1)[1]
        host = no_proto.split("/", 1)[0].split(":", 1)[0]
        for domain in ACCREDITED_SPACE_TRACKERS:
            if host == domain or host.endswith("." + domain):
                return True
    except Exception:
        return False
    return False


@allow_storage
@dataclass
class DebrisRemovalPolicy:
    policy_id: str
    constellation_operator: Address # Satellite constellation sponsor
    adr_contractor: Address         # Active Debris Removal servicing company
    dispute_initiator: Address      # Appellant who staked bond
    escrow_amount: bigint           # Locked removal bounty
    dispute_bond: bigint            # 10% appeal stake
    norad_cat_id: str               # Target NORAD Catalog ID (e.g. "25544" or "48274")
    target_max_perigee_km: u32      # Required perigee altitude threshold in km (e.g., 120 km)
    tle_telemetry_url: str          # Accredited Two-Line Element (TLE) radar endpoint
    evidence_hash: str              # SHA-256 snapshot of ephemeris radar payload
    status: u8
    verdict: str                    # "PENDING", "DEORBIT_CONFIRMED_FULL", "PARTIAL_ORBIT_LOWERING", "REMOVAL_FAILED_REJECTED", "DISPUTED", "UNRESOLVED_*"
    original_verdict: str           # Preserved pre-appeal verdict
    reason: str
    confidence: u8
    measured_final_perigee_km: u32  # Measured final perigee altitude (km)
    altitude_decay_km: u32          # Measured altitude reduction achieved (km)
    created_at_time: bigint         # Trusted Unix timestamp when policy was created
    expires_at_time: bigint         # Trusted Unix timestamp when mission window concludes
    audit_completed_time: bigint    # Trusted Unix timestamp when AI jury rendered verdict
    supplemental_evidence_url: str  # Bound appellate evidence URL
    appeal_prior_verdict: str       # Verdict recorded before appeal was filed


class Contract(gl.Contract):
    """
    AgentSpaceDebris: Autonomous Orbital Collision Avoidance & Active Space Debris Removal Escrow
    Target Network: GenLayer StudioNet (Chain ID: 61999)
    """
    policies: TreeMap[str, DebrisRemovalPolicy]
    policy_ids: DynArray[str]
    total_space_locked: bigint
    total_missions_settled: u32
    policy_counter: u64
    owner: Address
    claimable_balances: TreeMap[str, bigint]

    def __init__(self, initial_owner: Address = Address(ZERO_ADDRESS)):
        deployer = Address(ZERO_ADDRESS)
        try:
            deployer = _get_sender()
        except Exception:
            pass

        target_owner = _to_address(initial_owner) if _addr_str(initial_owner) != ZERO_ADDRESS else deployer

        self.owner = target_owner
        self.total_space_locked = bigint(0)
        self.total_missions_settled = u32(0)
        self.policy_counter = u64(0)

    def _resolve_pid(self, policy_id) -> str:
        return str(policy_id).strip()

    def _ensure_owner(self) -> None:
        try:
            self.owner = _to_address(self.owner)
        except Exception:
            pass
        if _addr_str(self.owner) == ZERO_ADDRESS:
            self.owner = _get_sender()

    def _safe_transfer(self, recipient: Address, amount: bigint) -> None:
        """Transfers native GEN tokens with Pull-Payment fallback to eliminate lost funds."""
        if amount <= bigint(0):
            return
        r_addr = _to_address(recipient)
        rec_str = _addr_str(r_addr)
        try:
            gl.get_contract_at(r_addr).emit_transfer(value=u256(int(amount)))
        except Exception:
            curr = self.claimable_balances.get(rec_str, bigint(0))
            self.claimable_balances[rec_str] = curr + amount

    def _get_current_timestamp(self) -> bigint:
        """Derives trusted Unix timestamp strictly from consensus context (gl.message_raw['datetime'])."""
        import calendar
        from datetime import datetime, timezone
        try:
            if hasattr(gl, "message_raw") and isinstance(gl.message_raw, dict):
                raw_val = gl.message_raw.get("datetime", "")
                if raw_val:
                    dt_str = str(raw_val).strip().replace("Z", "+00:00")
                    dt = datetime.fromisoformat(dt_str)
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    ts = calendar.timegm(dt.utctimetuple())
                    if ts > 0:
                        return bigint(ts)
        except Exception:
            pass
        return bigint(1760000000)

    # ── Public Write Methods ──────────────────────────────────────────

    @gl.public.write.payable
    def create_removal_escrow(
        self,
        adr_contractor: Address,
        norad_cat_id: str,
        target_max_perigee_km: u32,
        duration_blocks: u32
    ) -> str:
        """Satellite operator locks bounty escrow for removing a hazardous orbital debris body."""
        self._ensure_owner()
        escrow = bigint(gl.message.value)
        if escrow <= bigint(0):
            raise ContractError("Space debris removal escrow deposit must be greater than 0 GEN.")

        clean_cat = str(norad_cat_id).strip()
        if len(clean_cat) < 3:
            raise ContractError("Valid NORAD Catalog ID required (>= 3 chars).")

        c_addr = _to_address(adr_contractor)
        if _addr_str(c_addr) == ZERO_ADDRESS:
            raise ContractError("Valid ADR contractor address required.")

        s_addr = _to_address(_get_sender())
        if _addr_str(s_addr) == _addr_str(c_addr):
            raise ContractError("Constellation operator cannot designate themselves as ADR contractor.")

        dur_secs = bigint(int(duration_blocks) * 3 if int(duration_blocks) > 0 else int(DEFAULT_MISSION_EXPIRY_SECONDS))

        self.policy_counter = self.policy_counter + u64(1)
        policy_id = str(self.policy_counter)
        current_time = self._get_current_timestamp()
        expires_at = current_time + dur_secs
        empty_addr = Address(ZERO_ADDRESS)

        new_policy = DebrisRemovalPolicy(
            policy_id=policy_id,
            constellation_operator=s_addr,
            adr_contractor=c_addr,
            dispute_initiator=empty_addr,
            escrow_amount=escrow,
            dispute_bond=bigint(0),
            norad_cat_id=clean_cat,
            target_max_perigee_km=u32(int(target_max_perigee_km)),
            tle_telemetry_url="",
            evidence_hash="",
            status=STATUS_POLICY_OPEN,
            verdict="PENDING",
            original_verdict="PENDING",
            reason="Debris removal escrow active. Monitored for orbital altitude decay and de-orbit reentry.",
            confidence=u8(0),
            measured_final_perigee_km=u32(0),
            altitude_decay_km=u32(0),
            created_at_time=current_time,
            expires_at_time=expires_at,
            audit_completed_time=bigint(0),
            supplemental_evidence_url="",
            appeal_prior_verdict="",
        )

        self.policies[policy_id] = new_policy
        self.policy_ids.append(policy_id)
        self.total_space_locked = self.total_space_locked + escrow
        return policy_id

    @gl.public.write
    def submit_orbital_telemetry(
        self,
        policy_id: str,
        tle_telemetry_url: str
    ) -> None:
        """ADR contractor submits radar tracking TLE telemetry showing debris altitude decay."""
        self._ensure_owner()
        pid = self._resolve_pid(policy_id)
        if pid not in self.policies:
            raise ContractError(f"Policy {pid} does not exist.")

        p = self.policies[pid]
        if p.status not in (STATUS_POLICY_OPEN, STATUS_UNRESOLVED):
            raise ContractError("Policy is not open for orbital telemetry submission.")

        sender = _get_sender()
        if _addr_str(sender) != _addr_str(p.adr_contractor):
            raise ContractError("Role Violation: Only registered ADR contractor can submit orbital telemetry.")

        clean_url = str(tle_telemetry_url).strip()
        if not _is_accredited_space_tracker(clean_url):
            raise ContractError("Telemetry unauthenticated: Must originate from an accredited space surveillance network (Space-Track, CelesTrak, ESA DISCOS, NASA ODPO).")

        current_time = self._get_current_timestamp()
        if current_time > p.expires_at_time:
            raise ContractError("Mission window for this debris removal policy has expired.")

        p.tle_telemetry_url = clean_url
        p.status = STATUS_TELEMETRY_SUBMITTED
        p.reason = "Orbital radar tracking telemetry submitted. Ready for on-chain AI Astrodynamics Tribunal verification."

    @gl.public.write
    def adjudicate_debris_deorbit(self, policy_id: str) -> None:
        """AI Astrodynamics Jury evaluates TLE ephemeris, perigee decay, and reentry burn status."""
        self._ensure_owner()
        pid = self._resolve_pid(policy_id)
        if pid not in self.policies:
            raise ContractError(f"Policy {pid} does not exist.")

        p = self.policies[pid]
        if p.status not in (STATUS_TELEMETRY_SUBMITTED, STATUS_UNRESOLVED):
            raise ContractError("Policy is not awaiting orbital adjudication.")

        sender_str = _addr_str(_get_sender())
        if (
            sender_str != _addr_str(p.constellation_operator)
            and sender_str != _addr_str(p.adr_contractor)
            and sender_str != _addr_str(self.owner)
        ):
            raise ContractError("Permission Denied: Only constellation operator, ADR contractor, or owner can trigger adjudication.")

        feed_url = p.tle_telemetry_url
        target_norad = p.norad_cat_id
        target_perigee = int(p.target_max_perigee_km)

        def leader_fn():
            raw_feed = ""
            try:
                raw_feed = gl.nondet.web.render(feed_url, mode="text")
            except Exception:
                pass

            if not raw_feed:
                return {
                    "canary": CANARY_TOKEN,
                    "verdict": "UNRESOLVED_FETCH_FAILED",
                    "confidence": 0,
                    "measured_final_perigee_km": 0,
                    "altitude_decay_km": 0,
                    "reason": "Orbital tracking TLE feed unreachable or empty.",
                    "evidence_hash": "0000000000000000000000000000000000000000000000000000000000000000",
                }

            ev_hash = hashlib.sha256(raw_feed.encode("utf-8")).hexdigest()

            prompt = f"""You are the Chief Orbital Mechanics and Space Situational Awareness Magistrate on GenLayer.
Evaluate the Two-Line Element (TLE) and radar ephemeris tracking data for space object NORAD Cat ID: {target_norad}.
TARGET PERIGEE REENTRY THRESHOLD: <= {target_perigee} km (or confirmed atmospheric disintegration)

ORBITAL TRACKING TELEMETRY:
<orbital_telemetry_payload>
{raw_feed[:4000]}
</orbital_telemetry_payload>

EVALUATION RUBRIC:
1. Extract measured final perigee altitude in kilometers (or 0 km if reentry decay completed).
2. Calculate total altitude decay achieved (initial orbit altitude minus final altitude in km).
3. Check for NORAD object status: On-orbit vs Decayed/Reentered.
4. Decision Matrix:
   - Full De-orbit: Measured perigee <= {target_perigee} km OR status is confirmed DECAYED/REENTERED:
     Output "DEORBIT_CONFIRMED_FULL" (100% bounty released to ADR contractor).
   - Partial Orbit Lowering: Altitude decay >= 150 km BUT perigee remains > {target_perigee} km:
     Output "PARTIAL_ORBIT_LOWERING" (40% milestone released, 60% preserved).
   - Inactive / Mission Failure: Altitude decay < 150 km AND perigee > {target_perigee} km:
     Output "REMOVAL_FAILED_REJECTED" (100% refund to operator, bounty revoked).

SECURITY CANARY: Echo "{CANARY_TOKEN}" in JSON.
Respond ONLY with valid JSON without markdown fences:
{{
  "canary": "{CANARY_TOKEN}",
  "verdict": "DEORBIT_CONFIRMED_FULL" | "PARTIAL_ORBIT_LOWERING" | "REMOVAL_FAILED_REJECTED",
  "confidence": <0-100>,
  "measured_final_perigee_km": <integer>,
  "altitude_decay_km": <integer>,
  "reason": "<rigorous astrodynamics justification under 200 chars>"
}}"""

            raw_res = gl.nondet.exec_prompt(prompt, response_format="json")
            parsed = None
            if isinstance(raw_res, dict):
                parsed = raw_res
            elif isinstance(raw_res, str):
                try:
                    parsed = json.loads(raw_res.replace("```json", "").replace("```", "").strip())
                except Exception:
                    pass

            if not parsed or not isinstance(parsed, dict):
                return {
                    "canary": CANARY_TOKEN,
                    "verdict": "UNRESOLVED_PARSE_FAILED",
                    "confidence": 0,
                    "measured_final_perigee_km": 0,
                    "altitude_decay_km": 0,
                    "reason": "AI validator parsing failed or malformed JSON returned.",
                    "evidence_hash": ev_hash,
                }

            if str(parsed.get("canary", "")) != CANARY_TOKEN:
                return {
                    "canary": CANARY_TOKEN,
                    "verdict": "UNRESOLVED_CANARY_FAILED",
                    "confidence": 0,
                    "measured_final_perigee_km": 0,
                    "altitude_decay_km": 0,
                    "reason": "Security canary mismatch detected in jury output.",
                    "evidence_hash": ev_hash,
                }

            v_raw = str(parsed.get("verdict", "")).upper().strip()
            if v_raw not in {"DEORBIT_CONFIRMED_FULL", "PARTIAL_ORBIT_LOWERING", "REMOVAL_FAILED_REJECTED"}:
                return {
                    "canary": CANARY_TOKEN,
                    "verdict": "UNRESOLVED_PARSE_FAILED",
                    "confidence": 0,
                    "measured_final_perigee_km": 0,
                    "altitude_decay_km": 0,
                    "reason": f"Unsupported verdict '{v_raw}' returned.",
                    "evidence_hash": ev_hash,
                }

            return {
                "canary": CANARY_TOKEN,
                "verdict": v_raw,
                "confidence": max(0, min(100, int(parsed.get("confidence", 85)))),
                "measured_final_perigee_km": max(0, min(50000, int(parsed.get("measured_final_perigee_km", 0)))),
                "altitude_decay_km": max(0, min(50000, int(parsed.get("altitude_decay_km", 0)))),
                "reason": str(parsed.get("reason", "Orbital decay evaluation concluded."))[:200],
                "evidence_hash": ev_hash,
            }

        def validator_fn(leader_res) -> bool:
            if not isinstance(leader_res, gl.vm.Return):
                return False
            leader = leader_res.calldata
            if not isinstance(leader, dict) or "verdict" not in leader:
                return False
            if leader.get("canary") != CANARY_TOKEN:
                return False
            mine = leader_fn()
            return mine["verdict"] == leader["verdict"]

        adjudication_res = gl.vm.run_nondet(leader_fn, validator_fn)
        v_res = str(adjudication_res["verdict"])
        p.verdict = v_res
        p.reason = str(adjudication_res["reason"])
        p.confidence = u8(int(adjudication_res["confidence"]))
        p.measured_final_perigee_km = u32(int(adjudication_res["measured_final_perigee_km"]))
        p.altitude_decay_km = u32(int(adjudication_res["altitude_decay_km"]))
        if "evidence_hash" in adjudication_res and adjudication_res["evidence_hash"]:
            p.evidence_hash = str(adjudication_res["evidence_hash"])

        if v_res.startswith("UNRESOLVED_"):
            p.status = STATUS_UNRESOLVED
            p.audit_completed_time = bigint(0)
        else:
            p.original_verdict = v_res
            current_time = self._get_current_timestamp()
            p.status = STATUS_AWAITING_PAYOUT
            p.audit_completed_time = current_time

    @gl.public.write.payable
    def appeal_verdict(
        self,
        policy_id: str,
        dispute_reason: str,
        supplemental_radar_url: str
    ) -> None:
        """Operator or Contractor can appeal within 24 blocks (~72s) with a 10% staked bond."""
        self._ensure_owner()
        pid = self._resolve_pid(policy_id)
        if pid not in self.policies:
            raise ContractError(f"Policy {pid} does not exist.")

        p = self.policies[pid]
        if p.status != STATUS_AWAITING_PAYOUT:
            raise ContractError("Can only appeal policies in AWAITING_PAYOUT status.")

        sender = _get_sender()
        if _addr_str(sender) != _addr_str(p.constellation_operator) and _addr_str(sender) != _addr_str(p.adr_contractor):
            raise ContractError("Role Violation: Only constellation operator or ADR contractor can file an appeal.")

        current_time = self._get_current_timestamp()
        if current_time > (p.audit_completed_time + COOLING_OFF_SECONDS):
            raise ContractError(f"Dispute cooling-off window ({int(COOLING_OFF_SECONDS)}s) has expired.")

        clean_url = str(supplemental_radar_url).strip()
        if not _is_accredited_space_tracker(clean_url):
            raise ContractError("Supplemental telemetry unauthenticated: Must originate from an accredited space surveillance network.")

        required_bond = (p.escrow_amount * bigint(10)) // bigint(100)
        if required_bond == bigint(0):
            required_bond = bigint(1)

        staked = bigint(gl.message.value)
        if staked < required_bond:
            raise ContractError(f"Must stake at least 10% dispute bond ({int(required_bond)} wei).")

        clean_reason = str(dispute_reason).strip()
        if len(clean_reason) < 10:
            raise ContractError("Detailed dispute justification (>= 10 chars) required.")

        p.appeal_prior_verdict = p.verdict
        p.status = STATUS_DISPUTED
        p.dispute_initiator = _to_address(sender)
        p.dispute_bond = staked
        p.supplemental_evidence_url = clean_url
        p.reason = f"[DISPUTE by {_addr_str(sender)[:8]}]: {clean_reason} | Prior: {p.reason}"
        self.total_space_locked = self.total_space_locked + staked

    @gl.public.write
    def adjudicate_appeal(self, policy_id: str) -> None:
        """Supreme Astrodynamics Appellate Court evaluates strictly against bound supplemental radar tracking data."""
        self._ensure_owner()
        pid = self._resolve_pid(policy_id)
        if pid not in self.policies:
            raise ContractError(f"Policy {pid} does not exist.")

        p = self.policies[pid]
        if p.status != STATUS_DISPUTED:
            raise ContractError("Policy is not in DISPUTED status.")

        sender_str = _addr_str(_get_sender())
        if (
            sender_str != _addr_str(p.constellation_operator)
            and sender_str != _addr_str(p.adr_contractor)
            and sender_str != _addr_str(self.owner)
        ):
            raise ContractError("Permission Denied: Only constellation operator, ADR contractor, or owner can adjudicate appeal.")

        bound_url = p.supplemental_evidence_url
        appellant = p.dispute_initiator
        prior_verdict = p.appeal_prior_verdict
        is_operator_appellant = (_addr_str(appellant) == _addr_str(p.constellation_operator))

        def leader_fn():
            raw_supp = ""
            try:
                raw_supp = gl.nondet.web.render(bound_url, mode="text")
            except Exception:
                pass

            if not raw_supp:
                return {
                    "canary": CANARY_TOKEN,
                    "verdict": "APPEAL_UNRESOLVED_FETCH_FAILED",
                    "reason": "Supplemental radar ephemeris feed unreachable.",
                }

            prompt = f"""You are the Supreme Space Surveillance and Satellite Reentry Magistrate on GenLayer.
Evaluate bound high-resolution orbital radar tracking data for NORAD Cat ID: {p.norad_cat_id}:
PRIOR VERDICT: {prior_verdict}
APPELLANT: {'CONSTELLATION_OPERATOR' if is_operator_appellant else 'ADR_CONTRACTOR'}

SUPPLEMENTAL AUDIT DATA:
{raw_supp[:4000]}

DECISION CRITERIA:
- If supplemental logs conclusively verify atmospheric reentry / perigee <= {p.target_max_perigee_km} km: Output "APPEAL_UPHELD_DEORBIT".
- If partial orbit lowering (decay >= 150 km) verified: Output "APPEAL_UPHELD_PARTIAL".
- If logs conclusively verify zero decay / orbital persistence: Output "APPEAL_UPHELD_REJECTED".
- Otherwise: Output "APPEAL_DISMISSED".

SECURITY CANARY: Echo "{CANARY_TOKEN}" in JSON.
Respond ONLY with valid JSON:
{{"canary": "{CANARY_TOKEN}", "verdict": "APPEAL_UPHELD_DEORBIT"|"APPEAL_UPHELD_PARTIAL"|"APPEAL_UPHELD_REJECTED"|"APPEAL_DISMISSED", "reason": "<rationale under 200 chars>"}}"""

            raw_res = gl.nondet.exec_prompt(prompt, response_format="json")
            parsed = None
            if isinstance(raw_res, dict):
                parsed = raw_res
            elif isinstance(raw_res, str):
                try:
                    parsed = json.loads(raw_res.replace("```json", "").replace("```", "").strip())
                except Exception:
                    pass

            if not parsed or not isinstance(parsed, dict) or str(parsed.get("canary", "")) != CANARY_TOKEN:
                return {"canary": CANARY_TOKEN, "verdict": "APPEAL_UNRESOLVED_PARSE_FAILED", "reason": "Appellate parsing failure."}

            v_str = str(parsed.get("verdict", "")).upper().strip()
            if v_str not in {"APPEAL_UPHELD_DEORBIT", "APPEAL_UPHELD_PARTIAL", "APPEAL_UPHELD_REJECTED", "APPEAL_DISMISSED"}:
                v_str = "APPEAL_UNRESOLVED_PARSE_FAILED"

            return {
                "canary": CANARY_TOKEN,
                "verdict": v_str,
                "reason": str(parsed.get("reason", "Appellate review completed."))[:200]
            }

        def validator_fn(leader_res) -> bool:
            if not isinstance(leader_res, gl.vm.Return):
                return False
            leader = leader_res.calldata
            if not isinstance(leader, dict) or "verdict" not in leader:
                return False
            if leader.get("canary") != CANARY_TOKEN:
                return False
            mine = leader_fn()
            return mine["verdict"] == leader["verdict"]

        appeal_res = gl.vm.run_nondet(leader_fn, validator_fn)
        app_verdict = appeal_res["verdict"]
        app_reason = appeal_res["reason"]

        if app_verdict.startswith("APPEAL_UNRESOLVED_"):
            p.status = STATUS_UNRESOLVED
            p.verdict = app_verdict
            p.reason = f"[APPEAL UNRESOLVED] {app_reason}"
            return

        escrow_val = p.escrow_amount
        bond_val = p.dispute_bond
        total_settling = escrow_val + bond_val
        p.dispute_bond = bigint(0)
        p.escrow_amount = bigint(0)  # Double-payout protection

        self.total_space_locked = self.total_space_locked - total_settling
        self.total_missions_settled = self.total_missions_settled + u32(1)

        counterparty = p.adr_contractor if is_operator_appellant else p.constellation_operator

        if app_verdict == "APPEAL_UPHELD_DEORBIT":
            p.status = STATUS_SETTLED_DEORBIT_FULL
            p.verdict = "DEORBIT_CONFIRMED_FULL"
            p.reason = f"[APPEAL UPHELD] {app_reason}"
            self._safe_transfer(p.adr_contractor, escrow_val)
            if not is_operator_appellant:
                self._safe_transfer(appellant, bond_val)
            else:
                self._safe_transfer(counterparty, bond_val)

        elif app_verdict == "APPEAL_UPHELD_PARTIAL":
            p.status = STATUS_SETTLED_PARTIAL
            p.verdict = "PARTIAL_ORBIT_LOWERING"
            payout = (escrow_val * bigint(40)) // bigint(100)
            refund = escrow_val - payout
            p.reason = f"[APPEAL RESOLUTION] {app_reason}"
            self._safe_transfer(p.adr_contractor, payout)
            self._safe_transfer(p.constellation_operator, refund)
            self._safe_transfer(appellant, bond_val)

        elif app_verdict == "APPEAL_UPHELD_REJECTED":
            p.status = STATUS_SETTLED_REJECTED
            p.verdict = "REMOVAL_FAILED_REJECTED"
            p.reason = f"[APPEAL RESOLUTION] {app_reason}"
            self._safe_transfer(p.constellation_operator, escrow_val)
            if is_operator_appellant:
                self._safe_transfer(appellant, bond_val)
            else:
                self._safe_transfer(counterparty, bond_val)

        else:
            # APPEAL_DISMISSED: Preserve original verdict and forfeit bond to counterparty
            p.reason = f"[APPEAL DISMISSED] {app_reason}"
            self._safe_transfer(counterparty, bond_val)

            if p.original_verdict == "DEORBIT_CONFIRMED_FULL":
                p.status = STATUS_SETTLED_DEORBIT_FULL
                p.verdict = "DEORBIT_CONFIRMED_FULL"
                self._safe_transfer(p.adr_contractor, escrow_val)
            elif p.original_verdict == "PARTIAL_ORBIT_LOWERING":
                p.status = STATUS_SETTLED_PARTIAL
                p.verdict = "PARTIAL_ORBIT_LOWERING"
                payout = (escrow_val * bigint(40)) // bigint(100)
                refund = escrow_val - payout
                self._safe_transfer(p.adr_contractor, payout)
                self._safe_transfer(p.constellation_operator, refund)
            else:
                p.status = STATUS_SETTLED_REJECTED
                p.verdict = "REMOVAL_FAILED_REJECTED"
                self._safe_transfer(p.constellation_operator, escrow_val)

    @gl.public.write
    def finalize_settlement(self, policy_id: str) -> None:
        """Executes uncontested settlement strictly after 24 blocks (~72s) cooling-off window."""
        self._ensure_owner()
        pid = self._resolve_pid(policy_id)
        if pid not in self.policies:
            raise ContractError(f"Policy {pid} does not exist.")

        p = self.policies[pid]
        if p.status == STATUS_UNRESOLVED or p.verdict.startswith("UNRESOLVED_") or p.verdict.startswith("APPEAL_UNRESOLVED_"):
            raise ContractError("Cannot settle policy in an unresolved error state. Escrow remains protected.")

        if p.status != STATUS_AWAITING_PAYOUT:
            raise ContractError("Policy is not awaiting settlement payout.")

        sender_str = _addr_str(_get_sender())
        if (
            sender_str != _addr_str(p.constellation_operator)
            and sender_str != _addr_str(p.adr_contractor)
            and sender_str != _addr_str(self.owner)
        ):
            raise ContractError("Permission Denied: Only stakeholders or owner can finalize payout.")

        current_time = self._get_current_timestamp()
        if current_time <= (p.audit_completed_time + COOLING_OFF_SECONDS):
            raise ContractError(f"Cooling-off challenge window ({int(COOLING_OFF_SECONDS)}s) is still active.")

        escrow_val = p.escrow_amount
        p.escrow_amount = bigint(0)  # Double-payout protection
        self.total_space_locked = self.total_space_locked - escrow_val
        self.total_missions_settled = self.total_missions_settled + u32(1)

        if p.verdict == "DEORBIT_CONFIRMED_FULL":
            p.status = STATUS_SETTLED_DEORBIT_FULL
            self._safe_transfer(p.adr_contractor, escrow_val)

        elif p.verdict == "PARTIAL_ORBIT_LOWERING":
            p.status = STATUS_SETTLED_PARTIAL
            payout = (escrow_val * bigint(40)) // bigint(100)
            refund = escrow_val - payout
            self._safe_transfer(p.adr_contractor, payout)
            self._safe_transfer(p.constellation_operator, refund)

        else:
            p.status = STATUS_SETTLED_REJECTED
            self._safe_transfer(p.constellation_operator, escrow_val)

    @gl.public.write
    def cancel_or_reclaim(self, policy_id: str) -> None:
        """Constellation operator reclaims escrow if mission expired without telemetry or stalled in unresolved state."""
        self._ensure_owner()
        pid = self._resolve_pid(policy_id)
        if pid not in self.policies:
            raise ContractError(f"Policy {pid} does not exist.")

        p = self.policies[pid]
        if _addr_str(_get_sender()) != _addr_str(p.constellation_operator):
            raise ContractError("Role Violation: Only constellation operator can reclaim expired removal escrow.")

        current_time = self._get_current_timestamp()
        if p.status in (STATUS_POLICY_OPEN, STATUS_UNRESOLVED):
            if current_time < p.expires_at_time:
                raise ContractError(f"Cannot reclaim: Policy is still active (expires at {int(p.expires_at_time)}).")
        else:
            raise ContractError("Cannot reclaim: Mission is actively undergoing orbital evaluation or already settled.")

        p.status = STATUS_EXPIRED_RECLAIMED
        p.verdict = "EXPIRED_CLEAN"
        p.reason = "Mission duration completed without orbital removal proof. Escrow reclaimed by operator."

        escrow_val = p.escrow_amount
        p.escrow_amount = bigint(0)
        self.total_space_locked = self.total_space_locked - escrow_val
        self._safe_transfer(p.constellation_operator, escrow_val)

    @gl.public.write
    def claim_payout(self) -> None:
        """Pull-payment safety withdrawal: Beneficiary claims safely buffered balances."""
        self._ensure_owner()
        sender = _get_sender()
        s_str = _addr_str(sender)
        bal = self.claimable_balances.get(s_str, bigint(0))
        if bal <= bigint(0):
            raise ContractError("No claimable balance available for withdrawal.")

        self.claimable_balances[s_str] = bigint(0)
        try:
            gl.get_contract_at(sender).emit_transfer(value=u256(int(bal)))
        except Exception:
            self.claimable_balances[s_str] = bal
            raise ContractError("Outbound transfer failed during claim. Balance safely preserved.")

    # ── Read-only Views ───────────────────────────────────────────────

    @gl.public.view
    def get_policy(self, policy_id: str) -> str:
        pid = self._resolve_pid(policy_id)
        if pid not in self.policies:
            raise ContractError(f"Policy {pid} does not exist.")

        p = self.policies[pid]
        data = {
            "policy_id": p.policy_id,
            "constellation_operator": _addr_str(p.constellation_operator),
            "adr_contractor": _addr_str(p.adr_contractor),
            "dispute_initiator": _addr_str(p.dispute_initiator),
            "escrow_amount": str(p.escrow_amount),
            "dispute_bond": str(p.dispute_bond),
            "norad_cat_id": p.norad_cat_id,
            "target_max_perigee_km": int(p.target_max_perigee_km),
            "tle_telemetry_url": p.tle_telemetry_url,
            "evidence_hash": p.evidence_hash,
            "status": int(p.status),
            "verdict": p.verdict,
            "original_verdict": p.original_verdict,
            "reason": p.reason,
            "confidence": int(p.confidence),
            "measured_final_perigee_km": int(p.measured_final_perigee_km),
            "altitude_decay_km": int(p.altitude_decay_km),
            "created_at_time": str(p.created_at_time),
            "expires_at_time": str(p.expires_at_time),
            "audit_completed_time": str(p.audit_completed_time),
            "supplemental_evidence_url": p.supplemental_evidence_url,
            "appeal_prior_verdict": p.appeal_prior_verdict,
            "created_at_block": str(p.created_at_time),
            "expires_at_block": str(p.expires_at_time),
            "audit_completed_block": str(p.audit_completed_time),
        }
        return json.dumps(data)

    @gl.public.view
    def get_user_role(self, policy_id: str, account: Address) -> str:
        """Determines caller's orbital role: OPERATOR, CONTRACTOR, APPELLANT, OWNER, or OBSERVER."""
        pid = self._resolve_pid(policy_id)
        acc_str = _addr_str(account)
        if pid not in self.policies:
            if acc_str == _addr_str(self.owner):
                return "OWNER"
            return "OBSERVER"

        p = self.policies[pid]
        if acc_str == _addr_str(p.constellation_operator):
            return "OPERATOR"
        if acc_str == _addr_str(p.adr_contractor):
            return "CONTRACTOR"
        if acc_str == _addr_str(p.dispute_initiator) and acc_str != ZERO_ADDRESS:
            return "APPELLANT"
        if acc_str == _addr_str(self.owner):
            return "OWNER"
        return "OBSERVER"

    @gl.public.view
    def get_remaining_cooling_off_seconds(self, policy_id: str) -> i64:
        """Returns remaining cooling off challenge window in seconds (0 if expired or not in cooling off)."""
        pid = self._resolve_pid(policy_id)
        if pid not in self.policies:
            return i64(0)
        p = self.policies[pid]
        if p.status != STATUS_AWAITING_PAYOUT or p.audit_completed_time <= bigint(0):
            return i64(0)
        current_time = self._get_current_timestamp()
        expiry = p.audit_completed_time + COOLING_OFF_SECONDS
        remaining = int(expiry - current_time)
        return i64(remaining if remaining > 0 else 0)

    @gl.public.view
    def get_policy_count(self) -> u64:
        return u64(len(self.policy_ids))

    @gl.public.view
    def get_all_policies(self) -> str:
        policies_list = []
        for pid in self.policy_ids:
            if pid in self.policies:
                p = self.policies[pid]
                policies_list.append({
                    "policy_id": p.policy_id,
                    "constellation_operator": _addr_str(p.constellation_operator),
                    "adr_contractor": _addr_str(p.adr_contractor),
                    "dispute_initiator": _addr_str(p.dispute_initiator),
                    "escrow_amount": str(p.escrow_amount),
                    "dispute_bond": str(p.dispute_bond),
                    "norad_cat_id": p.norad_cat_id,
                    "target_max_perigee_km": int(p.target_max_perigee_km),
                    "tle_telemetry_url": p.tle_telemetry_url,
                    "evidence_hash": p.evidence_hash,
                    "status": int(p.status),
                    "verdict": p.verdict,
                    "original_verdict": p.original_verdict,
                    "reason": p.reason,
                    "confidence": int(p.confidence),
                    "measured_final_perigee_km": int(p.measured_final_perigee_km),
                    "altitude_decay_km": int(p.altitude_decay_km),
                    "created_at_time": str(p.created_at_time),
                    "expires_at_time": str(p.expires_at_time),
                    "audit_completed_time": str(p.audit_completed_time),
                })
        return json.dumps(policies_list)

    @gl.public.view
    def get_claimable_balance(self, account: Address) -> str:
        return str(self.claimable_balances.get(_addr_str(account), bigint(0)))

    @gl.public.view
    def get_stats(self) -> str:
        data = {
            "total_policies": len(self.policy_ids),
            "total_space_locked": str(self.total_space_locked),
            "total_missions_settled": int(self.total_missions_settled),
            "owner": _addr_str(self.owner),
        }
        return json.dumps(data)
