import React from 'react';
import { DebrisPolicyData } from '../config/genlayer';
import {
  getStatusMeta,
  formatPerigee,
  formatDecay,
  formatTimestamp,
} from '../utils/formatters';
import {
  X,
  Compass,
  Cpu,
  ShieldCheck,
  Hash,
  ExternalLink,
  Flame,
  Radio,
  Layers,
  Activity,
  Globe2,
} from 'lucide-react';

interface AstrodynamicsInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  policy: DebrisPolicyData | null;
}

export const AstrodynamicsInspectorModal: React.FC<AstrodynamicsInspectorModalProps> = ({
  isOpen,
  onClose,
  policy,
}) => {
  if (!isOpen || !policy) return null;

  const meta = getStatusMeta(policy.status, policy.verdict);

  // Parse tri-vector breakdown if available
  let triVector: any = null;
  try {
    if (policy.tri_vector_breakdown) {
      triVector = JSON.parse(policy.tri_vector_breakdown);
    }
  } catch {
    triVector = null;
  }

  const kesslerScore = triVector?.kessler_mitigation_score ?? (policy.status === 3 ? 98 : policy.status === 4 ? 65 : 20);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-space-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl bg-space-850 border border-orbital-cyan/40 p-6 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-space-750">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-orbital-cyan/15 text-orbital-cyan border border-orbital-cyan/30 shadow-orbital-glow">
              <Compass className="w-6 h-6 animate-spin-radar" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-heading font-extrabold text-white tracking-tight">
                  Astrodynamics AI Magistrate Inspector
                </h2>
                <span className={`px-2.5 py-0.5 text-xs font-mono font-bold rounded border ${meta.bg} ${meta.text} ${meta.border}`}>
                  {meta.label}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                On-Chain Semantic Consensus · Policy #{policy.policy_id} · NORAD Object Cat ID: {policy.norad_cat_id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-space-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-5 space-y-4 font-mono text-xs">
          {/* Main AI Verdict Banner */}
          <div className="p-4 rounded-xl bg-space-900 border border-space-750 space-y-3">
            <div className="flex items-center justify-between border-b border-space-800 pb-2">
              <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-orbital-cyan" />
                OFFICIAL CONSENSUS VERDICT & ASTRODYNAMICS RATIONALE
              </span>
              <span className="text-orbital-cyan font-bold text-sm tracking-wide">
                {policy.verdict}
              </span>
            </div>

            <p className="text-slate-200 text-sm leading-relaxed bg-space-950/70 p-3.5 rounded-lg border border-space-800 italic">
              "{policy.reason}"
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-space-950 p-2.5 rounded-lg border border-space-800">
                <div className="text-[10px] text-slate-400">MEASURED PERIGEE</div>
                <div className="text-sm font-bold text-white mt-1">
                  {formatPerigee(policy.measured_final_perigee_km)}
                </div>
              </div>
              <div className="bg-space-950 p-2.5 rounded-lg border border-space-800">
                <div className="text-[10px] text-slate-400">ALTITUDE DECAY</div>
                <div className="text-sm font-bold text-deorbit-green mt-1">
                  {formatDecay(policy.altitude_decay_km)}
                </div>
              </div>
              <div className="bg-space-950 p-2.5 rounded-lg border border-space-800">
                <div className="text-[10px] text-slate-400">JURY CONFIDENCE</div>
                <div className="text-sm font-bold text-orbital-cyan mt-1">
                  {policy.confidence}%
                </div>
              </div>
              <div className="bg-space-950 p-2.5 rounded-lg border border-space-800">
                <div className="text-[10px] text-slate-400">THRESHOLD TARGET</div>
                <div className="text-sm font-bold text-slate-300 mt-1">
                  &le;{policy.target_max_perigee_km} km
                </div>
              </div>
            </div>
          </div>

          {/* Tri-Vector Consensus Evaluation Panel */}
          <div className="p-4 rounded-xl bg-space-900 border border-space-750 space-y-3">
            <span className="text-slate-300 font-semibold flex items-center gap-2 border-b border-space-800 pb-2 text-xs">
              <Layers className="w-4 h-4 text-orbital-cyan" />
              TRI-VECTOR ASTRODYNAMICS CONSENSUS MATRIX
            </span>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Vector A */}
              <div className="p-3 bg-space-950 rounded-xl border border-space-800 space-y-1.5">
                <div className="flex items-center space-x-1.5 text-orbital-cyan font-bold text-[11px]">
                  <Activity className="w-3.5 h-3.5" />
                  <span>VECTOR A: ORBITAL DECAY</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {triVector?.decay_vector || (policy.altitude_decay_km >= 150 ? 'Altitude lowered by >=150 km' : 'Stationary trajectory')}
                </p>
                <div className="text-[10px] text-slate-500">
                  Calculated from TLE Mean Motion & Eccentricity
                </div>
              </div>

              {/* Vector B */}
              <div className="p-3 bg-space-950 rounded-xl border border-space-800 space-y-1.5">
                <div className="flex items-center space-x-1.5 text-plasma-orange font-bold text-[11px]">
                  <Flame className="w-3.5 h-3.5" />
                  <span>VECTOR B: REENTRY BOUNDARY</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {triVector?.atmospheric_interface || (policy.measured_final_perigee_km <= policy.target_max_perigee_km ? 'Atmospheric entry (<120km) verified' : 'Remains above dense atmospheric ceiling')}
                </p>
                <div className="text-[10px] text-slate-500">
                  Mesospheric Aerodynamic Plasma Interface
                </div>
              </div>

              {/* Vector C */}
              <div className="p-3 bg-space-950 rounded-xl border border-space-800 space-y-1.5">
                <div className="flex items-center space-x-1.5 text-deorbit-green font-bold text-[11px]">
                  <Globe2 className="w-3.5 h-3.5" />
                  <span>VECTOR C: KESSLER MITIGATION</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 text-[11px]">De-risk Score:</span>
                  <span className="font-bold text-deorbit-green text-xs">{kesslerScore} / 100</span>
                </div>
                <div className="w-full bg-space-900 h-1.5 rounded-full overflow-hidden border border-space-800 mt-1">
                  <div
                    className="h-full bg-deorbit-green transition-all"
                    style={{ width: `${kesslerScore}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-500">
                  Constellation Conjunction Avoidance Rate
                </div>
              </div>
            </div>
          </div>

          {/* Cryptographic Evidence Snapshot */}
          <div className="p-4 rounded-xl bg-space-900 border border-space-750 space-y-2.5">
            <span className="text-slate-400 font-semibold flex items-center gap-1.5 border-b border-space-800 pb-2">
              <ShieldCheck className="w-4 h-4 text-deorbit-green" />
              AUTHENTICATED SPACE SURVEILLANCE EVIDENCE
            </span>

            <div>
              <div className="text-[10px] text-slate-400 mb-1">ACCELERATED RADAR TLE ENDPOINT:</div>
              {policy.tle_telemetry_url ? (
                <a
                  href={policy.tle_telemetry_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-2.5 bg-space-950 rounded-lg border border-space-800 text-orbital-cyan hover:underline break-all"
                >
                  <span className="truncate mr-2">{policy.tle_telemetry_url}</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              ) : (
                <div className="p-2.5 bg-space-950 rounded-lg border border-space-800 text-slate-500">
                  Pending ADR contractor telemetry submission.
                </div>
              )}
            </div>

            <div>
              <div className="text-[10px] text-slate-400 mb-1">PAYLOAD SHA-256 DIGEST:</div>
              <div className="p-2.5 bg-space-950 rounded-lg border border-space-800 text-slate-300 flex items-center gap-2">
                <Hash className="w-3.5 h-3.5 text-orbital-cyan shrink-0" />
                <span className="truncate">{policy.evidence_hash || 'Pending consensus execution'}</span>
              </div>
            </div>

            {policy.supplemental_evidence_url && (
              <div>
                <div className="text-[10px] text-purple-400 mb-1">BOUND APPELLATE RADAR EVIDENCE:</div>
                <a
                  href={policy.supplemental_evidence_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-2.5 bg-space-950 rounded-lg border border-purple-500/30 text-purple-300 hover:underline break-all"
                >
                  <span className="truncate mr-2">{policy.supplemental_evidence_url}</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 mt-5 border-t border-space-750 font-mono text-xs text-slate-400">
          <span>Verdict Timestamp: {formatTimestamp(policy.audit_completed_time)}</span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-space-800 hover:bg-space-750 text-slate-200 hover:text-white rounded-lg border border-space-700 transition"
          >
            Dismiss Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
