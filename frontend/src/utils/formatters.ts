export function formatGen(val: string | number | bigint): string {
  try {
    let bigVal: bigint;
    if (typeof val === 'string') {
      if (val.startsWith('0x') || val.startsWith('0X')) {
        bigVal = BigInt(val);
      } else {
        bigVal = BigInt(val);
      }
    } else {
      bigVal = BigInt(val);
    }
    const divisor = 1000000000000000000n; // 10^18
    const integerPart = bigVal / divisor;
    const remainder = bigVal % divisor;
    const remainderStr = remainder.toString().padStart(18, '0').slice(0, 4);
    return `${integerPart.toString()}.${remainderStr}`;
  } catch {
    return '0.0000';
  }
}

export function parseGenToWei(gen: string): bigint {
  const clean = gen.trim();
  if (!clean || isNaN(Number(clean))) return 0n;
  const parts = clean.split('.');
  const intPart = BigInt(parts[0] || '0') * 1000000000000000000n;
  let decPart = 0n;
  if (parts[1]) {
    const padded = parts[1].slice(0, 18).padEnd(18, '0');
    decPart = BigInt(padded);
  }
  return intPart + decPart;
}

export function shortenAddress(addr: string): string {
  if (!addr) return '0x00...0000';
  const clean = addr.toLowerCase().trim();
  if (clean.length < 10) return clean;
  return `${clean.slice(0, 6)}...${clean.slice(-4)}`;
}

export function formatPerigee(km: number | string): string {
  const num = Number(km) || 0;
  if (num === 0) return '0 km (Reentered)';
  return `${num.toLocaleString()} km`;
}

export function formatDecay(km: number | string): string {
  const num = Number(km) || 0;
  return `-${num.toLocaleString()} km`;
}

export function formatTimestamp(ts: string | number | bigint): string {
  const num = Number(ts);
  if (!num || num <= 0) return 'Pending / Active';
  const date = new Date(num * 1000);
  return date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}

export function getStatusMeta(status: number, verdict?: string) {
  switch (status) {
    case 0:
      return {
        label: 'MISSION OPEN',
        bg: 'bg-orbital-cyan/10',
        text: 'text-orbital-cyan',
        border: 'border-orbital-cyan/30',
        description: 'Constellation operator escrow locked. Awaiting ADR servicer rendezvous & telemetry.',
      };
    case 1:
      return {
        label: 'TELEMETRY SUBMITTED',
        bg: 'bg-amber-500/10',
        text: 'text-amber-400',
        border: 'border-amber-500/30',
        description: 'Orbital radar TLE telemetry linked. Ready for on-chain AI Astrodynamics Tribunal.',
      };
    case 2:
      return {
        label: 'AWAITING PAYOUT',
        bg: 'bg-indigo-500/10',
        text: 'text-indigo-400',
        border: 'border-indigo-500/30',
        description: 'Orbital mechanics verdict rendered. 24-block (~72s) dispute cooling window active.',
      };
    case 3:
      return {
        label: 'DEORBIT CONFIRMED',
        bg: 'bg-deorbit-green/10',
        text: 'text-deorbit-green',
        border: 'border-deorbit-green/30',
        description: 'Atmospheric reentry burn verified. 100% removal bounty disbursed to ADR contractor.',
      };
    case 4:
      return {
        label: 'PARTIAL ORBIT LOWERING',
        bg: 'bg-decay-amber/10',
        text: 'text-decay-amber',
        border: 'border-decay-amber/30',
        description: 'Significant orbital decay achieved (>=150km). 40% fuel milestone released.',
      };
    case 5:
      return {
        label: 'REMOVAL FAILED',
        bg: 'bg-threat-crimson/10',
        text: 'text-threat-crimson',
        border: 'border-threat-crimson/30',
        description: 'Debris persists on hazardous trajectory. Escrow 100% refunded to constellation operator.',
      };
    case 6:
      return {
        label: 'DISPUTED (APPEAL ACTIVE)',
        bg: 'bg-purple-500/10',
        text: 'text-purple-400',
        border: 'border-purple-500/30',
        description: 'Appellate court reviewing supplemental high-res radar surveillance logs with 10% staked bond.',
      };
    case 7:
      return {
        label: 'EXPIRED & RECLAIMED',
        bg: 'bg-slate-700/20',
        text: 'text-slate-400',
        border: 'border-slate-700/40',
        description: 'Mission window elapsed without radar proof. Escrow reclaimed by operator.',
      };
    case 8:
      return {
        label: 'UNRESOLVED (ERROR LOCK)',
        bg: 'bg-red-900/20',
        text: 'text-red-400',
        border: 'border-red-700/50',
        description: 'Telemetry fetch or canary failure. Escrow safely preserved from premature liquidation.',
      };
    default:
      return {
        label: 'UNKNOWN',
        bg: 'bg-slate-800',
        text: 'text-slate-300',
        border: 'border-slate-700',
        description: 'Status unavailable.',
      };
  }
}
