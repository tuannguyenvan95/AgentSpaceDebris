import sys
import types
from pathlib import Path
import json
import hashlib
import re

# Mock genlayer module if not loaded natively
if 'genlayer' not in sys.modules:
    gl_mod = types.ModuleType('genlayer')

    class _Address:
        def __init__(self, val=""):
            if isinstance(val, int):
                self.as_hex = f"0x{val:040x}".lower()
            else:
                self.as_hex = str(val).lower()
            try:
                clean_hex = self.as_hex.replace("0x", "")
                self.as_bytes = bytes.fromhex(clean_hex)
            except Exception:
                self.as_bytes = b"\x00" * 20

        def __str__(self):
            return self.as_hex

        def __repr__(self):
            return self.as_hex

        def __eq__(self, other):
            return str(self).lower() == str(other).lower()

    gl_mod.Address = _Address
    gl_mod.u8 = int
    gl_mod.u32 = int
    gl_mod.u64 = int
    gl_mod.i64 = int
    gl_mod.u256 = int
    gl_mod.bigint = int
    gl_mod.TreeMap = dict
    gl_mod.DynArray = list
    gl_mod.allow_storage = lambda cls: cls

    class _GL:
        pass

    gl_mod.gl = _GL()

    class _Contract:
        pass

    gl_mod.Contract = _Contract
    sys.modules['genlayer'] = gl_mod

import pytest

CANARY_TOKEN = "CANARY_AGENT_SPACE_DEBRIS_V1"
ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
SECONDS_PER_BLOCK = 3
COOLING_OFF_BLOCKS = 24
COOLING_OFF_SECONDS = COOLING_OFF_BLOCKS * SECONDS_PER_BLOCK  # 72 seconds
DEFAULT_MISSION_EXPIRY_SECONDS = 86400 * 90                   # 90 days

STATUS_POLICY_OPEN = 0
STATUS_TELEMETRY_SUBMITTED = 1
STATUS_AWAITING_PAYOUT = 2
STATUS_SETTLED_DEORBIT_FULL = 3
STATUS_SETTLED_PARTIAL = 4
STATUS_SETTLED_REJECTED = 5
STATUS_DISPUTED = 6
STATUS_EXPIRED_RECLAIMED = 7
STATUS_UNRESOLVED = 8

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


class _MockTxResult:
    def __init__(self, return_value):
        self.return_value = return_value

    def __str__(self):
        return str(self.return_value)

    def __int__(self):
        return int(self.return_value)

    def __eq__(self, other):
        if isinstance(other, _MockTxResult):
            return self.return_value == other.return_value
        return self.return_value == other


class _MockCallResult:
    def __init__(self, val):
        self._val = val

    def call(self):
        return self._val


class _MockContractInstance:
    def __init__(self, client, contract_path, *deploy_args, **deploy_kwargs):
        self.client = client
        self.contract_path = contract_path
        self.caller = client.accounts[0]
        self.owner = client.accounts[0]
        args_list = deploy_kwargs.get("args") or (deploy_args[0] if deploy_args else None)
        if args_list and len(args_list) > 0 and args_list[0] is not None:
            raw_own = args_list[0]
            addr = f"0x{raw_own:040x}".lower() if isinstance(raw_own, int) else str(raw_own).lower()
            if addr != ZERO_ADDRESS:
                self.owner = addr
        self.policies = {}
        self.policy_ids = []
        self.policy_counter = 0
        self.total_space_locked = 0
        self.total_missions_settled = 0
        self.claimable_balances = {}
        self.simulated_time = 1760000000

    def connect(self, account):
        self.caller = str(account).lower()
        return self

    def set_time(self, t):
        self.simulated_time = t

    def create_removal_escrow(self, args, value=0):
        contractor = str(args[0]).lower().strip()
        cat_id = str(args[1]).strip()
        target_perigee = int(args[2])
        dur_blocks = int(args[3]) if len(args) > 3 else 6000

        if int(value) <= 0:
            raise Exception("Space debris removal escrow deposit must be greater than 0 GEN.")
        if len(cat_id) < 3:
            raise Exception("Valid NORAD Catalog ID required (>= 3 chars).")
        if contractor == ZERO_ADDRESS:
            raise Exception("Valid ADR contractor address required.")
        if self.caller == contractor:
            raise Exception("Constellation operator cannot designate themselves as ADR contractor.")

        self.policy_counter += 1
        pid = str(self.policy_counter)
        dur_secs = dur_blocks * 3 if dur_blocks > 0 else DEFAULT_MISSION_EXPIRY_SECONDS
        expires_at = self.simulated_time + dur_secs

        self.policies[pid] = {
            "policy_id": pid,
            "constellation_operator": self.caller,
            "adr_contractor": contractor,
            "dispute_initiator": ZERO_ADDRESS,
            "escrow_amount": int(value),
            "dispute_bond": 0,
            "norad_cat_id": cat_id,
            "target_max_perigee_km": target_perigee,
            "tle_telemetry_url": "",
            "evidence_hash": "",
            "status": STATUS_POLICY_OPEN,
            "verdict": "PENDING",
            "original_verdict": "PENDING",
            "reason": "Debris removal escrow active. Monitored for orbital altitude decay and de-orbit reentry.",
            "confidence": 0,
            "measured_final_perigee_km": 0,
            "altitude_decay_km": 0,
            "created_at_time": self.simulated_time,
            "expires_at_time": expires_at,
            "audit_completed_time": 0,
            "supplemental_evidence_url": "",
            "appeal_prior_verdict": "",
        }
        self.policy_ids.append(pid)
        self.total_space_locked += int(value)
        return _MockTxResult(pid)

    def submit_orbital_telemetry(self, args):
        pid = str(args[0]).strip()
        feed_url = str(args[1]).strip()

        if pid not in self.policies:
            raise Exception(f"Policy {pid} does not exist.")
        p = self.policies[pid]
        if p["status"] not in (STATUS_POLICY_OPEN, STATUS_UNRESOLVED):
            raise Exception("Policy is not open for orbital telemetry submission.")
        if self.caller != p["adr_contractor"]:
            raise Exception("Role Violation: Only registered ADR contractor can submit orbital telemetry.")
        if not _is_accredited_space_tracker(feed_url):
            raise Exception("Telemetry unauthenticated: Must originate from an accredited space surveillance network (Space-Track, CelesTrak, ESA DISCOS, NASA ODPO).")
        if self.simulated_time > p["expires_at_time"]:
            raise Exception("Mission window for this debris removal policy has expired.")

        p["tle_telemetry_url"] = feed_url
        p["status"] = STATUS_TELEMETRY_SUBMITTED
        p["reason"] = "Orbital radar tracking telemetry submitted. Ready for on-chain AI Astrodynamics Tribunal verification."
        return _MockTxResult(True)

    def adjudicate_debris_deorbit(self, args):
        pid = str(args[0]).strip()
        if pid not in self.policies:
            raise Exception(f"Policy {pid} does not exist.")
        p = self.policies[pid]
        if p["status"] not in (STATUS_TELEMETRY_SUBMITTED, STATUS_UNRESOLVED):
            raise Exception("Policy is not awaiting orbital adjudication.")
        if self.caller not in (p["constellation_operator"], p["adr_contractor"], self.owner):
            raise Exception("Permission Denied: Only constellation operator, ADR contractor, or owner can trigger adjudication.")

        feed_url = p["tle_telemetry_url"]
        web_mocks = self.client.provider.web_mocks
        llm_mocks = self.client.provider.llm_mocks

        body_raw = None
        for k, v in web_mocks.items():
            if k in feed_url or feed_url in k:
                body_raw = v.get("body", "")
                break

        if body_raw is None:
            p["status"] = STATUS_UNRESOLVED
            p["verdict"] = "UNRESOLVED_FETCH_FAILED"
            p["reason"] = "Orbital tracking TLE feed unreachable or empty."
            p["evidence_hash"] = "0" * 64
            return _MockTxResult(True)

        ev_hash = hashlib.sha256(body_raw.encode("utf-8")).hexdigest()

        llm_resp_str = None
        for pat, resp in llm_mocks.items():
            llm_resp_str = resp
            break

        if not llm_resp_str:
            p["status"] = STATUS_UNRESOLVED
            p["verdict"] = "UNRESOLVED_PARSE_FAILED"
            p["reason"] = "AI validator parsing failed."
            p["evidence_hash"] = ev_hash
            return _MockTxResult(True)

        try:
            parsed = json.loads(llm_resp_str)
        except Exception:
            p["status"] = STATUS_UNRESOLVED
            p["verdict"] = "UNRESOLVED_PARSE_FAILED"
            p["reason"] = "AI validator parsing failed or malformed JSON."
            p["evidence_hash"] = ev_hash
            return _MockTxResult(True)

        if parsed.get("canary") != CANARY_TOKEN:
            p["status"] = STATUS_UNRESOLVED
            p["verdict"] = "UNRESOLVED_CANARY_FAILED"
            p["reason"] = "Security canary mismatch detected in jury output."
            p["evidence_hash"] = ev_hash
            return _MockTxResult(True)

        v_raw = str(parsed.get("verdict", "")).upper().strip()
        if v_raw not in {"DEORBIT_CONFIRMED_FULL", "PARTIAL_ORBIT_LOWERING", "REMOVAL_FAILED_REJECTED"}:
            p["status"] = STATUS_UNRESOLVED
            p["verdict"] = "UNRESOLVED_PARSE_FAILED"
            p["reason"] = f"Unsupported verdict '{v_raw}' returned."
            p["evidence_hash"] = ev_hash
            return _MockTxResult(True)

        p["verdict"] = v_raw
        p["original_verdict"] = v_raw
        p["reason"] = str(parsed.get("reason", "Orbital decay evaluation concluded."))[:200]
        p["confidence"] = int(parsed.get("confidence", 85))
        p["measured_final_perigee_km"] = int(parsed.get("measured_final_perigee_km", 0))
        p["altitude_decay_km"] = int(parsed.get("altitude_decay_km", 0))
        p["evidence_hash"] = ev_hash
        p["status"] = STATUS_AWAITING_PAYOUT
        p["audit_completed_time"] = self.simulated_time
        return _MockTxResult(True)

    def appeal_verdict(self, args, value=0):
        pid = str(args[0]).strip()
        reason = str(args[1]).strip()
        supp_url = str(args[2]).strip()

        if pid not in self.policies:
            raise Exception(f"Policy {pid} does not exist.")
        p = self.policies[pid]
        if p["status"] != STATUS_AWAITING_PAYOUT:
            raise Exception("Can only appeal policies in AWAITING_PAYOUT status.")
        if self.caller not in (p["constellation_operator"], p["adr_contractor"]):
            raise Exception("Role Violation: Only constellation operator or ADR contractor can file an appeal.")
        if self.simulated_time > (p["audit_completed_time"] + COOLING_OFF_SECONDS):
            raise Exception(f"Dispute cooling-off window ({COOLING_OFF_SECONDS}s) has expired.")
        if not _is_accredited_space_tracker(supp_url):
            raise Exception("Supplemental telemetry unauthenticated: Must originate from an accredited space surveillance network.")

        required_bond = (p["escrow_amount"] * 10) // 100
        if required_bond == 0:
            required_bond = 1
        if int(value) < required_bond:
            raise Exception(f"Must stake at least 10% dispute bond ({required_bond} wei).")
        if len(reason) < 10:
            raise Exception("Detailed dispute justification (>= 10 chars) required.")

        p["appeal_prior_verdict"] = p["verdict"]
        p["status"] = STATUS_DISPUTED
        p["dispute_initiator"] = self.caller
        p["dispute_bond"] = int(value)
        p["supplemental_evidence_url"] = supp_url
        p["reason"] = f"[DISPUTE by {self.caller[:8]}]: {reason} | Prior: {p['reason']}"
        self.total_space_locked += int(value)
        return _MockTxResult(True)

    def adjudicate_appeal(self, args):
        pid = str(args[0]).strip()
        if pid not in self.policies:
            raise Exception(f"Policy {pid} does not exist.")
        p = self.policies[pid]
        if p["status"] != STATUS_DISPUTED:
            raise Exception("Policy is not in DISPUTED status.")
        if self.caller not in (p["constellation_operator"], p["adr_contractor"], self.owner):
            raise Exception("Permission Denied: Only constellation operator, ADR contractor, or owner can adjudicate appeal.")

        web_mocks = self.client.provider.web_mocks
        llm_mocks = self.client.provider.llm_mocks

        body_raw = None
        for k, v in web_mocks.items():
            if k in p["supplemental_evidence_url"] or p["supplemental_evidence_url"] in k:
                body_raw = v.get("body", "")
                break

        if body_raw is None:
            p["status"] = STATUS_UNRESOLVED
            p["verdict"] = "APPEAL_UNRESOLVED_FETCH_FAILED"
            p["reason"] = "Supplemental radar ephemeris feed unreachable."
            return _MockTxResult(True)

        llm_resp_str = None
        for pat, resp in llm_mocks.items():
            llm_resp_str = resp
            break

        try:
            parsed = json.loads(llm_resp_str)
        except Exception:
            p["status"] = STATUS_UNRESOLVED
            p["verdict"] = "APPEAL_UNRESOLVED_PARSE_FAILED"
            return _MockTxResult(True)

        if parsed.get("canary") != CANARY_TOKEN:
            p["status"] = STATUS_UNRESOLVED
            p["verdict"] = "APPEAL_UNRESOLVED_PARSE_FAILED"
            return _MockTxResult(True)

        app_verdict = str(parsed.get("verdict", "")).upper().strip()
        app_reason = str(parsed.get("reason", "Appellate review completed."))[:200]

        escrow_val = p["escrow_amount"]
        bond_val = p["dispute_bond"]
        p["dispute_bond"] = 0
        p["escrow_amount"] = 0
        self.total_space_locked -= (escrow_val + bond_val)
        self.total_missions_settled += 1

        is_operator_appellant = (p["dispute_initiator"] == p["constellation_operator"])
        counterparty = p["adr_contractor"] if is_operator_appellant else p["constellation_operator"]

        if app_verdict == "APPEAL_UPHELD_DEORBIT":
            p["status"] = STATUS_SETTLED_DEORBIT_FULL
            p["verdict"] = "DEORBIT_CONFIRMED_FULL"
            p["reason"] = f"[APPEAL UPHELD] {app_reason}"
        elif app_verdict == "APPEAL_UPHELD_PARTIAL":
            p["status"] = STATUS_SETTLED_PARTIAL
            p["verdict"] = "PARTIAL_ORBIT_LOWERING"
            p["reason"] = f"[APPEAL RESOLUTION] {app_reason}"
        elif app_verdict == "APPEAL_UPHELD_REJECTED":
            p["status"] = STATUS_SETTLED_REJECTED
            p["verdict"] = "REMOVAL_FAILED_REJECTED"
            p["reason"] = f"[APPEAL RESOLUTION] {app_reason}"
        else:
            p["reason"] = f"[APPEAL DISMISSED] {app_reason}"
            if p["original_verdict"] == "DEORBIT_CONFIRMED_FULL":
                p["status"] = STATUS_SETTLED_DEORBIT_FULL
                p["verdict"] = "DEORBIT_CONFIRMED_FULL"
            elif p["original_verdict"] == "PARTIAL_ORBIT_LOWERING":
                p["status"] = STATUS_SETTLED_PARTIAL
                p["verdict"] = "PARTIAL_ORBIT_LOWERING"
            else:
                p["status"] = STATUS_SETTLED_REJECTED
                p["verdict"] = "REMOVAL_FAILED_REJECTED"

        return _MockTxResult(True)

    def finalize_settlement(self, args):
        pid = str(args[0]).strip()
        if pid not in self.policies:
            raise Exception(f"Policy {pid} does not exist.")
        p = self.policies[pid]
        if p["status"] == STATUS_UNRESOLVED or p["verdict"].startswith("UNRESOLVED_") or p["verdict"].startswith("APPEAL_UNRESOLVED_"):
            raise Exception("Cannot settle policy in an unresolved error state. Escrow remains protected.")
        if p["status"] != STATUS_AWAITING_PAYOUT:
            raise Exception("Policy is not awaiting settlement payout.")
        if self.caller not in (p["constellation_operator"], p["adr_contractor"], self.owner):
            raise Exception("Permission Denied: Only stakeholders or owner can finalize payout.")
        if self.simulated_time <= (p["audit_completed_time"] + COOLING_OFF_SECONDS):
            raise Exception(f"Cooling-off challenge window ({COOLING_OFF_SECONDS}s) is still active.")

        escrow_val = p["escrow_amount"]
        p["escrow_amount"] = 0
        self.total_space_locked -= escrow_val
        self.total_missions_settled += 1

        if p["verdict"] == "DEORBIT_CONFIRMED_FULL":
            p["status"] = STATUS_SETTLED_DEORBIT_FULL
        elif p["verdict"] == "PARTIAL_ORBIT_LOWERING":
            p["status"] = STATUS_SETTLED_PARTIAL
        else:
            p["status"] = STATUS_SETTLED_REJECTED

        return _MockTxResult(True)

    def cancel_or_reclaim(self, args):
        pid = str(args[0]).strip()
        if pid not in self.policies:
            raise Exception(f"Policy {pid} does not exist.")
        p = self.policies[pid]
        if self.caller != p["constellation_operator"]:
            raise Exception("Role Violation: Only constellation operator can reclaim expired removal escrow.")
        if p["status"] in (STATUS_POLICY_OPEN, STATUS_UNRESOLVED):
            if self.simulated_time < p["expires_at_time"]:
                raise Exception(f"Cannot reclaim: Policy is still active (expires at {p['expires_at_time']}).")
        else:
            raise Exception("Cannot reclaim: Mission is actively undergoing orbital evaluation or already settled.")

        escrow_val = p["escrow_amount"]
        p["escrow_amount"] = 0
        self.total_space_locked -= escrow_val
        p["status"] = STATUS_EXPIRED_RECLAIMED
        p["verdict"] = "EXPIRED_CLEAN"
        p["reason"] = "Mission duration completed without orbital removal proof. Escrow reclaimed by operator."
        return _MockTxResult(True)

    def claim_payout(self):
        bal = self.claimable_balances.get(self.caller, 0)
        if bal <= 0:
            raise Exception("No claimable balance available for withdrawal.")
        self.claimable_balances[self.caller] = 0
        return _MockTxResult(True)

    def get_policy(self, args):
        pid = str(args[0]).strip()
        if pid not in self.policies:
            raise Exception(f"Policy {pid} does not exist.")
        p = dict(self.policies[pid])
        p["escrow_amount"] = str(p["escrow_amount"])
        p["dispute_bond"] = str(p["dispute_bond"])
        p["created_at_time"] = str(p["created_at_time"])
        p["expires_at_time"] = str(p["expires_at_time"])
        p["audit_completed_time"] = str(p["audit_completed_time"])
        return _MockCallResult(json.dumps(p))

    def get_user_role(self, args):
        pid = str(args[0]).strip()
        account = str(args[1]).lower().strip()
        if pid not in self.policies:
            if account == self.owner:
                return _MockCallResult("OWNER")
            return _MockCallResult("OBSERVER")
        p = self.policies[pid]
        if account == p["constellation_operator"]:
            return _MockCallResult("OPERATOR")
        if account == p["adr_contractor"]:
            return _MockCallResult("CONTRACTOR")
        if account == p["dispute_initiator"] and account != ZERO_ADDRESS:
            return _MockCallResult("APPELLANT")
        if account == self.owner:
            return _MockCallResult("OWNER")
        return _MockCallResult("OBSERVER")

    def get_remaining_cooling_off_seconds(self, args):
        pid = str(args[0]).strip()
        if pid not in self.policies:
            return _MockCallResult(0)
        p = self.policies[pid]
        if p["status"] != STATUS_AWAITING_PAYOUT or p["audit_completed_time"] <= 0:
            return _MockCallResult(0)
        expiry = p["audit_completed_time"] + COOLING_OFF_SECONDS
        remaining = expiry - self.simulated_time
        return _MockCallResult(remaining if remaining > 0 else 0)

    def get_all_policies(self):
        res = []
        for pid in self.policy_ids:
            if pid in self.policies:
                item = dict(self.policies[pid])
                item["escrow_amount"] = str(item["escrow_amount"])
                item["dispute_bond"] = str(item["dispute_bond"])
                res.append(item)
        return _MockCallResult(json.dumps(res))

    def get_policy_count(self):
        return _MockCallResult(len(self.policy_ids))

    def get_claimable_balance(self, args):
        account = str(args[0]).lower().strip()
        return _MockCallResult(str(self.claimable_balances.get(account, 0)))

    def get_stats(self):
        data = {
            "total_policies": len(self.policy_ids),
            "total_space_locked": str(self.total_space_locked),
            "total_missions_settled": int(self.total_missions_settled),
            "owner": self.owner,
        }
        return _MockCallResult(json.dumps(data))


class _MockProvider:
    def __init__(self):
        self.llm_mocks = {}
        self.web_mocks = {}

    def make_request(self, method, params):
        if method == "sim_installMocks":
            self.llm_mocks.update(params.get("llm_mocks", {}))
            self.web_mocks.update(params.get("web_mocks", {}))
        return True


class _MockClient:
    def __init__(self):
        self.accounts = [
            "0x1111111111111111111111111111111111111111",
            "0x2222222222222222222222222222222222222222",
            "0x3333333333333333333333333333333333333333",
            "0x4444444444444444444444444444444444444444",
        ]
        self.provider = _MockProvider()

    def deploy(self, contract_path, *args, **kwargs):
        return _MockContractInstance(self, contract_path, *args, **kwargs)


@pytest.fixture
def client():
    return _MockClient()
