import pytest
import json
from genlayer import *


def test_space_debris_deorbit_full_payout(client):
    """Proves that a verified atmospheric reentry releases 100% bounty to ADR contractor."""
    contract = client.deploy("contracts/contract.py")
    operator = client.accounts[0]
    contractor = client.accounts[1]

    # Step 1: Operator locks 2.5 GEN bounty for removing defunct rocket stage (NORAD 48274)
    tx_create = contract.connect(operator).create_removal_escrow(
        args=[str(contractor), "48274", 120, 6000],
        value=2500000000000000000  # 2.5 GEN
    )
    policy_id = str(tx_create.return_value)

    # Step 2: Contractor submits radar ephemeris tracking from Space-Track.org
    telemetry_url = "https://space-track.org/basicspacedata/query/class/tle/NORAD_CAT_ID/48274.json"
    contract.connect(contractor).submit_orbital_telemetry(
        args=[policy_id, telemetry_url]
    )

    # Step 3: Mock AI Astrodynamics Jury -> Object decayed into atmosphere, perigee 0 km
    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps({
                    "canary": "CANARY_AGENT_SPACE_DEBRIS_V1",
                    "verdict": "DEORBIT_CONFIRMED_FULL",
                    "confidence": 99,
                    "measured_final_perigee_km": 0,
                    "altitude_decay_km": 450,
                    "reason": "Orbital telemetry confirms object 48274 entered dense atmosphere and disintegrated over Pacific Ocean."
                })
            },
            "web_mocks": {
                telemetry_url: {"status": 200, "body": '{"NORAD_CAT_ID": 48274, "STATUS": "DECAYED", "PERIGEE_KM": 0, "DECAY_KM": 450}'}
            }
        }
    )

    contract.connect(contractor).adjudicate_debris_deorbit(args=[policy_id])

    p_data = json.loads(contract.get_policy(args=[policy_id]).call())
    assert p_data["status"] == 2  # STATUS_AWAITING_PAYOUT
    assert p_data["verdict"] == "DEORBIT_CONFIRMED_FULL"
    assert p_data["measured_final_perigee_km"] == 0

    # Finalize settlement after cooling off window
    contract.set_time(contract.simulated_time + 100)
    contract.connect(operator).finalize_settlement(args=[policy_id])

    p_data_after = json.loads(contract.get_policy(args=[policy_id]).call())
    assert p_data_after["status"] == 3  # STATUS_SETTLED_DEORBIT_FULL
    assert p_data_after["escrow_amount"] == "0"


def test_space_debris_unaccredited_source_rejected(client):
    """Proves that trigger telemetry from unaccredited sources is strictly rejected."""
    contract = client.deploy("contracts/contract.py")
    operator = client.accounts[0]
    contractor = client.accounts[1]

    tx_create = contract.connect(operator).create_removal_escrow(
        args=[str(contractor), "25544", 150, 6000],
        value=1000000000000000000
    )
    policy_id = str(tx_create.return_value)

    # Fake tracker blog link must revert
    with pytest.raises(Exception) as exc_info:
        contract.connect(contractor).submit_orbital_telemetry(
            args=[policy_id, "https://my-personal-amateur-radar-site.com/tle.json"]
        )
    assert "Telemetry unauthenticated" in str(exc_info.value)


def test_partial_orbit_lowering_milestone(client):
    """Proves that substantial altitude lowering (>= 150 km) triggers 40% milestone release."""
    contract = client.deploy("contracts/contract.py")
    operator = client.accounts[0]
    contractor = client.accounts[1]

    tx_create = contract.connect(operator).create_removal_escrow(
        args=[str(contractor), "22923", 120, 6000],
        value=2000000000000000000  # 2.0 GEN
    )
    policy_id = str(tx_create.return_value)

    celestrak_url = "https://celestrak.org/NORAD/elements/gp.php?CATNR=22923&FORMAT=JSON"
    contract.connect(contractor).submit_orbital_telemetry(args=[policy_id, celestrak_url])

    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps({
                    "canary": "CANARY_AGENT_SPACE_DEBRIS_V1",
                    "verdict": "PARTIAL_ORBIT_LOWERING",
                    "confidence": 94,
                    "measured_final_perigee_km": 310,
                    "altitude_decay_km": 280,
                    "reason": "ADR servicer executed multiple apogee burns lowering orbit by 280 km towards graveyard decay."
                })
            },
            "web_mocks": {
                celestrak_url: {"status": 200, "body": '{"NORAD_CAT_ID": 22923, "PERIGEE_KM": 310, "DECAY_KM": 280}'}
            }
        }
    )

    contract.connect(contractor).adjudicate_debris_deorbit(args=[policy_id])
    p_data = json.loads(contract.get_policy(args=[policy_id]).call())
    assert p_data["status"] == 2  # STATUS_AWAITING_PAYOUT
    assert p_data["verdict"] == "PARTIAL_ORBIT_LOWERING"

    # Settle after cooling off window
    contract.set_time(contract.simulated_time + 80)
    contract.connect(operator).finalize_settlement(args=[policy_id])

    p_settled = json.loads(contract.get_policy(args=[policy_id]).call())
    assert p_settled["status"] == 4  # STATUS_SETTLED_PARTIAL


def test_debris_removal_failed_rejected(client):
    """Proves that stationary orbit or zero decay results in full refund to operator."""
    contract = client.deploy("contracts/contract.py")
    operator = client.accounts[0]
    contractor = client.accounts[1]

    tx_create = contract.connect(operator).create_removal_escrow(
        args=[str(contractor), "27386", 120, 6000],
        value=3000000000000000000
    )
    policy_id = str(tx_create.return_value)

    esa_url = "https://discosweb.esoc.esa.int/api/objects/27386/ephemeris.json"
    contract.connect(contractor).submit_orbital_telemetry(args=[policy_id, esa_url])

    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps({
                    "canary": "CANARY_AGENT_SPACE_DEBRIS_V1",
                    "verdict": "REMOVAL_FAILED_REJECTED",
                    "confidence": 99,
                    "measured_final_perigee_km": 760,
                    "altitude_decay_km": 15,
                    "reason": "Debris target remains trapped at 760 km circular orbit. Rendezvous grappling failed."
                })
            },
            "web_mocks": {
                esa_url: {"status": 200, "body": '{"NORAD_CAT_ID": 27386, "PERIGEE_KM": 760, "DECAY_KM": 15}'}
            }
        }
    )

    contract.connect(contractor).adjudicate_debris_deorbit(args=[policy_id])
    p_data = json.loads(contract.get_policy(args=[policy_id]).call())
    assert p_data["verdict"] == "REMOVAL_FAILED_REJECTED"

    contract.set_time(contract.simulated_time + 100)
    contract.connect(operator).finalize_settlement(args=[policy_id])
    p_settled = json.loads(contract.get_policy(args=[policy_id]).call())
    assert p_settled["status"] == 5  # STATUS_SETTLED_REJECTED


def test_cooling_off_dispute_and_appeal(client):
    """Proves that an appeal with 10% staked bond can overturn or uphold orbital verdicts."""
    contract = client.deploy("contracts/contract.py")
    operator = client.accounts[0]
    contractor = client.accounts[1]

    tx_create = contract.connect(operator).create_removal_escrow(
        args=[str(contractor), "49863", 120, 6000],
        value=2000000000000000000  # 2 GEN
    )
    policy_id = str(tx_create.return_value)

    nasa_url = "https://orbitaldebris.jsc.nasa.gov/data/cat_49863.json"
    contract.connect(contractor).submit_orbital_telemetry(args=[policy_id, nasa_url])

    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps({
                    "canary": "CANARY_AGENT_SPACE_DEBRIS_V1",
                    "verdict": "PARTIAL_ORBIT_LOWERING",
                    "confidence": 85,
                    "measured_final_perigee_km": 240,
                    "altitude_decay_km": 180,
                    "reason": "Partial decay reported, object still orbiting at 240 km perigee."
                })
            },
            "web_mocks": {
                nasa_url: {"status": 200, "body": '{"NORAD_CAT_ID": 49863, "PERIGEE_KM": 240, "DECAY_KM": 180}'}
            }
        }
    )

    contract.connect(contractor).adjudicate_debris_deorbit(args=[policy_id])

    # Contractor appeals within cooling off window with 10% bond (0.2 GEN)
    supp_radar_url = "https://leolabs.space/radar/catalog/49863/reentry_confirmation.json"
    contract.connect(contractor).appeal_verdict(
        args=[policy_id, "High frequency LeoLabs radar tracking confirmed object disintegrated below 90 km altitude.", supp_radar_url],
        value=200000000000000000  # 0.2 GEN
    )

    p_disputed = json.loads(contract.get_policy(args=[policy_id]).call())
    assert p_disputed["status"] == 6  # STATUS_DISPUTED
    assert p_disputed["dispute_bond"] == "200000000000000000"

    # Supreme tribunal evaluates appeal
    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps({
                    "canary": "CANARY_AGENT_SPACE_DEBRIS_V1",
                    "verdict": "APPEAL_UPHELD_DEORBIT",
                    "reason": "Phased array LeoLabs radar logs confirm plasma signature and total atmospheric disintegration."
                })
            },
            "web_mocks": {
                supp_radar_url: {"status": 200, "body": '{"REENTRY_DETECTED": true, "FINAL_PERIGEE_KM": 0, "STATUS": "DISINTEGRATED"}'}
            }
        }
    )

    contract.connect(contractor).adjudicate_appeal(args=[policy_id])
    p_resolved = json.loads(contract.get_policy(args=[policy_id]).call())
    assert p_resolved["status"] == 3  # STATUS_SETTLED_DEORBIT_FULL
    assert p_resolved["verdict"] == "DEORBIT_CONFIRMED_FULL"
    assert p_resolved["dispute_bond"] == "0"


def test_operator_cannot_self_designate_contractor(client):
    """Proves that a constellation operator cannot designate their own address as the ADR contractor."""
    contract = client.deploy("contracts/contract.py")
    operator = client.accounts[0]

    with pytest.raises(Exception) as exc_info:
        contract.connect(operator).create_removal_escrow(
            args=[str(operator), "48274", 120, 6000],
            value=1000000000000000000
        )
    assert "cannot designate themselves as ADR contractor" in str(exc_info.value)


def test_role_based_access_control(client):
    """Proves that only designated roles can perform specific operations."""
    contract = client.deploy("contracts/contract.py")
    operator = client.accounts[0]
    contractor = client.accounts[1]
    stranger = client.accounts[2]

    tx_create = contract.connect(operator).create_removal_escrow(
        args=[str(contractor), "53267", 120, 6000],
        value=1000000000000000000
    )
    policy_id = str(tx_create.return_value)

    # 1. Stranger cannot submit telemetry
    with pytest.raises(Exception) as exc_info:
        contract.connect(stranger).submit_orbital_telemetry(
            args=[policy_id, "https://space-track.org/data.json"]
        )
    assert "Role Violation" in str(exc_info.value)

    # 2. Check get_user_role
    assert contract.get_user_role(args=[policy_id, str(operator)]).call() == "OPERATOR"
    assert contract.get_user_role(args=[policy_id, str(contractor)]).call() == "CONTRACTOR"
    assert contract.get_user_role(args=[policy_id, str(stranger)]).call() == "OBSERVER"


def test_cooling_off_countdown_tracking(client):
    """Proves that remaining cooling off window countdown is reported accurately."""
    contract = client.deploy("contracts/contract.py")
    operator = client.accounts[0]
    contractor = client.accounts[1]

    tx_create = contract.connect(operator).create_removal_escrow(
        args=[str(contractor), "48274", 120, 6000],
        value=1000000000000000000
    )
    policy_id = str(tx_create.return_value)

    # Initially cooling off is 0 because not yet in AWAITING_PAYOUT
    rem = contract.get_remaining_cooling_off_seconds(args=[policy_id]).call()
    assert rem == 0

    url = "https://space-track.org/tle.json"
    contract.connect(contractor).submit_orbital_telemetry(args=[policy_id, url])

    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps({
                    "canary": "CANARY_AGENT_SPACE_DEBRIS_V1",
                    "verdict": "DEORBIT_CONFIRMED_FULL",
                    "confidence": 95,
                    "measured_final_perigee_km": 0,
                    "altitude_decay_km": 500,
                    "reason": "Atmospheric burn confirmed."
                })
            },
            "web_mocks": {
                url: {"status": 200, "body": '{"STATUS": "DECAYED"}'}
            }
        }
    )

    contract.connect(operator).adjudicate_debris_deorbit(args=[policy_id])

    # Now cooling off should be active (72 seconds)
    rem_active = contract.get_remaining_cooling_off_seconds(args=[policy_id]).call()
    assert rem_active == 72

    # Attempt premature settlement before 72s should revert
    with pytest.raises(Exception) as exc_info:
        contract.connect(operator).finalize_settlement(args=[policy_id])
    assert "Cooling-off challenge window" in str(exc_info.value)

    # Fast forward past cooling off window (e.g. +75s)
    contract.set_time(contract.simulated_time + 75)
    rem_expired = contract.get_remaining_cooling_off_seconds(args=[policy_id]).call()
    assert rem_expired == 0


def test_deploy_with_integer_address_from_studio(client):
    """Proves that initializing contract with integer address representation does not crash."""
    contract = client.deploy("contracts/contract.py", args=[0])
    stats = json.loads(contract.get_stats().call())
    assert stats["owner"] == client.accounts[0]
