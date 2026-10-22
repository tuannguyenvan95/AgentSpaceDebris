import { formatGen } from '../utils/formatters';

export const STUDIONET_CHAIN_ID = 61999;
export const STUDIONET_CHAIN_ID_HEX = '0xF22F';
export const STUDIONET_RPC_URL = 'https://studio.genlayer.com/api';
export const STUDIO_URL = 'https://studio.genlayer.com';

// Authoritative Intelligent Contract deployed on GenLayer StudioNet
export const DEFAULT_CONTRACT_ADDRESS = "0xf7908283868BE5BE9ac235F74F900F906FA92F10";

export function getSavedContractAddress(): string {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('agentspacedebris_contract_address');
      if (
        stored &&
        stored.trim().startsWith('0x') &&
        stored.trim().length === 42
      ) {
        return stored.trim();
      }
    } catch {
      // ignore
    }
  }
  return DEFAULT_CONTRACT_ADDRESS;
}

export function saveContractAddress(address: string) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('agentspacedebris_contract_address', address.trim());
    } catch {
      // ignore
    }
  }
}

export async function fetchStudionetBalance(address: string): Promise<string> {
  if (!address) return '0.0000';

  try {
    const res = await fetch(STUDIONET_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [address, 'latest'],
        id: Date.now(),
      }),
    });
    const json = await res.json();
    if (json && json.result !== undefined && json.result !== null) {
      return formatGen(json.result);
    }
  } catch (err) {
    console.warn('Direct Studionet RPC eth_getBalance error:', err);
  }

  if (typeof window !== 'undefined' && (window as any).ethereum) {
    try {
      const balHex = await (window as any).ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      });
      if (balHex) {
        return formatGen(balHex);
      }
    } catch (e) {
      console.warn('MetaMask eth_getBalance fallback error:', e);
    }
  }

  return '0.0000';
}

export const STATUS_POLICY_OPEN = 0;
export const STATUS_TELEMETRY_SUBMITTED = 1;
export const STATUS_AWAITING_PAYOUT = 2;
export const STATUS_SETTLED_DEORBIT_FULL = 3;
export const STATUS_SETTLED_PARTIAL = 4;
export const STATUS_SETTLED_REJECTED = 5;
export const STATUS_DISPUTED = 6;
export const STATUS_EXPIRED_RECLAIMED = 7;
export const STATUS_UNRESOLVED = 8;

export interface DebrisPolicyData {
  policy_id: string;
  constellation_operator: string;
  adr_contractor: string;
  dispute_initiator: string;
  escrow_amount: string;
  dispute_bond: string;
  norad_cat_id: string;
  target_max_perigee_km: number;
  tle_telemetry_url: string;
  evidence_hash: string;
  status: number;
  verdict: string;
  original_verdict: string;
  reason: string;
  confidence: number;
  measured_final_perigee_km: number;
  altitude_decay_km: number;
  tri_vector_breakdown?: string;
  created_at_time: string;
  expires_at_time: string;
  audit_completed_time: string;
  supplemental_evidence_url?: string;
  appeal_prior_verdict?: string;
  created_at_block?: string;
  expires_at_block?: string;
  audit_completed_block?: string;
}

export interface DebrisStats {
  total_policies: number;
  total_space_locked: string;
  total_missions_settled: number;
  owner: string;
}

export interface TargetDebrisPreset {
  norad_cat_id: string;
  name: string;
  initial_altitude_km: number;
  description: string;
  sample_tle_url: string;
}

export const DEBRIS_PRESETS: TargetDebrisPreset[] = [
  {
    norad_cat_id: '48274',
    name: 'CZ-5B Rocket Body (Core Stage)',
    initial_altitude_km: 375,
    description: '21-ton core rocket stage on uncontrolled decay trajectory.',
    sample_tle_url: 'https://space-track.org/basicspacedata/query/class/tle/NORAD_CAT_ID/48274.json',
  },
  {
    norad_cat_id: '22923',
    name: 'SL-16 R/B (Zenit-2 Rocket Stage)',
    initial_altitude_km: 840,
    description: '9-ton spent rocket body at high LEO inclination with high collision probability.',
    sample_tle_url: 'https://celestrak.org/NORAD/elements/gp.php?CATNR=22923&FORMAT=JSON',
  },
  {
    norad_cat_id: '27386',
    name: 'Envisat Derelict Satellite',
    initial_altitude_km: 765,
    description: '8.2-ton defunct ESA environmental observation spacecraft orbiting in crowded 800km shell.',
    sample_tle_url: 'https://discosweb.esoc.esa.int/api/objects/27386/ephemeris.json',
  },
  {
    norad_cat_id: '49863',
    name: 'Cosmos 1408 ASAT Trackable Fragment',
    initial_altitude_km: 460,
    description: 'High-velocity shrapnel fragment crossing orbital planes of commercial LEO constellations.',
    sample_tle_url: 'https://orbitaldebris.jsc.nasa.gov/data/cat_49863.json',
  },
];

/* -------------------------------------------------------------------------- */
/*                           GenVM Calldata Encoding                          */
/* -------------------------------------------------------------------------- */

const BITS_IN_TYPE = 3;
const TYPE_SPECIAL = 0;
const TYPE_PINT = 1;
const TYPE_NINT = 2;
const TYPE_STR = 4;
const TYPE_ARR = 5;
const TYPE_MAP = 6;
const SPECIAL_NULL = (0 << BITS_IN_TYPE) | TYPE_SPECIAL;
const SPECIAL_FALSE = (1 << BITS_IN_TYPE) | TYPE_SPECIAL;
const SPECIAL_TRUE = (2 << BITS_IN_TYPE) | TYPE_SPECIAL;

function writeNum(to: number[], data: bigint) {
  if (data === 0n) {
    to.push(0);
    return;
  }
  let curData = data;
  while (curData > 0n) {
    let cur = Number(curData & 0x7fn);
    curData >>= 7n;
    if (curData > 0n) {
      cur |= 128;
    }
    to.push(cur);
  }
}

function encodeNumWithType(to: number[], data: bigint, type: number) {
  const res = (data << BigInt(BITS_IN_TYPE)) | BigInt(type);
  writeNum(to, res);
}

function encodeNum(to: number[], data: bigint) {
  if (data >= 0n) {
    encodeNumWithType(to, data, TYPE_PINT);
  } else {
    encodeNumWithType(to, -data - 1n, TYPE_NINT);
  }
}

function encodeMap(to: number[], arr: [string, any][]) {
  const newEntries = arr.map(([k, v]) => [
    Array.from(k, (x) => x.codePointAt(0)!),
    new TextEncoder().encode(k),
    v,
  ] as const);

  newEntries.sort((v1, v2) => {
    const l = v1[0];
    const r = v2[0];
    for (let index = 0; index < l.length && index < r.length; index++) {
      const cur = l[index] - r[index];
      if (cur !== 0) return cur;
    }
    return l.length - r.length;
  });

  encodeNumWithType(to, BigInt(newEntries.length), TYPE_MAP);
  for (const [, k, v] of newEntries) {
    writeNum(to, BigInt(k.length));
    for (const c of k) {
      to.push(c);
    }
    encodeVal(to, v);
  }
}

function encodeVal(to: number[], val: any) {
  if (val === null || val === undefined) {
    to.push(SPECIAL_NULL);
  } else if (typeof val === 'boolean') {
    to.push(val ? SPECIAL_TRUE : SPECIAL_FALSE);
  } else if (typeof val === 'number') {
    encodeNum(to, BigInt(val));
  } else if (typeof val === 'bigint') {
    encodeNum(to, val);
  } else if (typeof val === 'string') {
    const encoded = new TextEncoder().encode(val);
    encodeNumWithType(to, BigInt(encoded.length), TYPE_STR);
    for (const b of encoded) {
      to.push(b);
    }
  } else if (Array.isArray(val)) {
    encodeNumWithType(to, BigInt(val.length), TYPE_ARR);
    for (const elem of val) {
      encodeVal(to, elem);
    }
  } else if (typeof val === 'object') {
    encodeMap(to, Object.entries(val));
  } else {
    throw new Error(`Unsupported type: ${typeof val}`);
  }
}

export function encodeCalldata(method: string, args: any[]): `0x${string}` {
  const res: number[] = [];
  encodeVal(res, method);
  encodeVal(res, args);
  encodeVal(res, {});
  return `0x${res.map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

export async function fetchUserRole(policyId: string, account: string): Promise<string> {
  try {
    const role = await readContract('get_user_role', [policyId, account]);
    return String(role || 'OBSERVER');
  } catch {
    return 'OBSERVER';
  }
}

export async function fetchRemainingCoolingOff(policyId: string): Promise<number> {
  try {
    const rem = await readContract('get_remaining_cooling_off_seconds', [policyId]);
    return Number(rem || 0);
  } catch {
    return 0;
  }
}

export async function readContract(
  method: string,
  args: any[] = [],
  contractAddress: string = getSavedContractAddress()
): Promise<any> {
  const calldata = encodeCalldata(method, args);
  const res = await fetch(STUDIONET_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [
        {
          to: contractAddress,
          data: calldata,
        },
        'latest',
      ],
      id: Date.now(),
    }),
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(data.error.message || 'GenLayer eth_call failed');
  }

  const result = data.result;
  if (!result || result === '0x') return null;

  try {
    if (typeof result === 'string' && result.startsWith('0x')) {
      const hex = result.slice(2);
      let str = '';
      for (let i = 0; i < hex.length; i += 2) {
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
      }
      const jsonStart = str.indexOf('{');
      const jsonArrStart = str.indexOf('[');
      const start =
        jsonStart !== -1 && (jsonArrStart === -1 || jsonStart < jsonArrStart)
          ? jsonStart
          : jsonArrStart;
      if (start !== -1) {
        return JSON.parse(str.slice(start));
      }
      const cleanStr = str.replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim();
      return cleanStr;
    }
    return JSON.parse(result);
  } catch {
    return result;
  }
}

export async function waitForTransactionReceipt(txHash: string, timeoutMs = 90000): Promise<any> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(STUDIONET_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getTransactionByHash',
          params: [txHash],
          id: Date.now(),
        }),
      });
      const data = await res.json();
      const txData = data?.result;

      if (txData) {
        const execResultName = String(txData.tx_execution_result_name || '').toUpperCase();
        const execResultCode = String(txData.tx_execution_result || '');
        const statusName = String(txData.status_name || '').toUpperCase();
        const statusCode = String(txData.status || '');

        if (statusName === 'CANCELED' || statusCode === '8') {
          throw new Error('Transaction canceled by consensus.');
        }
        if (statusName === 'UNDETERMINED' || statusCode === '6') {
          throw new Error('Transaction outcome undetermined by validators.');
        }

        if (execResultName === 'FINISHED_WITH_ERROR' || execResultCode === '2') {
          const rawError =
            txData.genvm_result?.error_description ||
            txData.genvm_result?.stderr ||
            'GenVM contract execution failed.';
          throw new Error(rawError);
        }

        if (
          statusName === 'ACCEPTED' ||
          statusName === 'FINALIZED' ||
          statusCode === '5' ||
          execResultName === 'SUCCESS' ||
          execResultCode === '1'
        ) {
          return txData;
        }
      }
    } catch (err: any) {
      if (err.message && (err.message.includes('failed') || err.message.includes('canceled'))) {
        throw err;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  throw new Error('Transaction receipt confirmation timeout.');
}
