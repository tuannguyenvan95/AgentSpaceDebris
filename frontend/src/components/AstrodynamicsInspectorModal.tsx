import React from 'react';
import { DebrisPolicyData } from '../config/genlayer';
import {
  getStatusMeta,
  formatPerigee,
  formatDecay,
  formatGen,
  formatTimestamp,
  shortenAddress,
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
  FileText,
  AlertOctagon,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-space-950/85 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-space-850 border border-orbital-cyan/40 p-6 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-space-750">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-orbital-cyan/15 text-orbital-cyan border border-orbital-cyan/30">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-heading font-bold text-white">
                  Astrodynamics Tribunal Inspector
                </h2>
                <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded border ${meta.bg} ${meta.text} ${meta.border}`}>
                  {meta.label}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400">
                Policy #{policy.policy_id} · Space Object NORAD Cat ID: {policy.norad_cat_id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-space-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-4 space-y-4">
          {/* AI Consensus Verdict Card */}
          <div className="p-4 rounded-xl bg-space-900 border border-space-750 font-mono text-xs">
            <div className="flex items-center justify-between mb-3 border-b border-space-800 pb-2">
              <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-orbital-cyan" />
                ON-CHAIN AI ASTRODYNAMICS VERDICT
              </span>
              <span className="text-orbital-cyan font-bold">{policy.verdict}</span>
            </div>

            <p className="text-slate-200 text-sm leading-relaxed mb-4 bg-space-950/60 p-3 rounded-lg border border-space-800 italic">
              "{policy.reason}"
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-space-950 p-2.5 rounded-lg border border-space-800">
                <div className="text-[10px] text-slate-400">FINAL PERIGEE</div>
                <div className="text-sm font-bold text-white mt-0.5">
                  {formatPerigee(policy.measured_final_perigee_km)}
                </div>
              </div>
              <div className="bg-space-950 p-2.5 rounded-lg border border-space-800">
                <div className="text-[10px] text-slate-400">ALTITUDE DECAY</div>
                <div className="text-sm font-bold text-deorbit-green mt-0.5">
                  {formatDecay(policy.altitude_decay_km)}
                </div>
              </div>
              <div className="bg-space-950 p-2.5 rounded-lg border border-space-800">
                <div className="text-[10px] text-slate-400">AI CONFIDENCE</div>
                <div className="text-sm font-bold text-orbital-cyan mt-0.5">
                  {policy.confidence}%
                </div>
              </div>
              <div className="bg-space-950 p-2.5 rounded-lg border border-space-800">
                <div className="text-[10px] text-slate-400">REENTRY THRESHOLD</div>
                <div className="text-sm font-bold text-slate-300 mt-0.5">
                  &le;{policy.target_max_perigee_km} km
                </div>
              </div>
            </div>
          </div>

          {/* Cryptographic Evidence & Telemetry Source */}
          <div className="p-4 rounded-xl bg-space-900 border border-space-750 font-mono text-xs space-y-3">
            <span className="text-slate-400 font-semibold flex items-center gap-1.5 border-b border-space-800 pb-2">
              <ShieldCheck className="w-4 h-4 text-deorbit-green" />
              AUTHENTICATED SURVEILLANCE TELEMETRY
            </span>

            <div>
              <div className="text-[10px] text-slate-400 mb-1">RADAR EPHEMERIS / TLE ENDPOINT:</div>
              {policy.tle_telemetry_url ? (
                <a
                  href={policy.tle_telemetry_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-2.5 bg-space-950 rounded border border-space-800 text-orbital-cyan hover:underline break-all"
                >
                  <span className="truncate mr-2">{policy.tle_telemetry_url}</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              ) : (
                <div className="p-2.5 bg-space-950 rounded border border-space-800 text-slate-500">
                  Telemetry not yet submitted by ADR contractor.
                </div>
              )}
            </div>

            <div>
              <div className="text-[10px] text-slate-400 mb-1">SHA-256 TELEMETRY PAYLOAD DIGEST:</div>
              <div className="p-2.5 bg-space-950 rounded border border-space-800 text-slate-300 flex items-center gap-2">
                <Hash className="w-3.5 h-3.5 text-orbital-cyan shrink-0" />
                <span className="truncate">
                  {policy.evidence_hash || 'Pending cryptographic verification snapshot'}
                </span>
              </div>
            </div>

            {policy.supplemental_evidence_url && (
              <div>
                <div className="text-[10px] text-purple-400 mb-1">BOUND APPELLATE RADAR EVIDENCE:</div>
                <a
                  href={policy.supplemental_evidence_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-2.5 bg-space-950 rounded border border-purple-500/30 text-purple-300 hover:underline break-all"
                >
                  <span className="truncate mr-2">{policy.supplemental_evidence_url}</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              </div>
            )}
          </div>

          {/* Stakeholder Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
            <div className="p-3 bg-space-900 rounded-xl border border-space-750">
              <span className="text-[10px] text-slate-400 block mb-1">CONSTELLATION OPERATOR</span>
              <span className="text-slate-200">{policy.constellation_operator}</span>
            </div>
            <div className="p-3 bg-space-900 rounded-xl border border-space-750">
              <span className="text-[10px] text-slate-400 block mb-1">ADR SERVICER CONTRACTOR</span>
              <span className="text-slate-200">{policy.adr_contractor}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-space-750 font-mono text-xs text-slate-400">
          <span>Audit Completed: {formatTimestamp(policy.audit_completed_time)}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-space-800 text-slate-300 hover:text-white rounded-lg border border-space-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
