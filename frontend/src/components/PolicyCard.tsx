import React, { useState, useEffect } from 'react';
import {
  DebrisPolicyData,
  getSavedContractAddress,
  encodeCalldata,
  waitForTransactionReceipt,
  fetchUserRole,
  fetchRemainingCoolingOff,
} from '../config/genlayer';
import {
  getStatusMeta,
  formatGen,
  formatPerigee,
  formatDecay,
  shortenAddress,
} from '../utils/formatters';
import {
  Satellite,
  Compass,
  Flame,
  Clock,
  Shield,
  Loader2,
  ExternalLink,
  ChevronRight,
  Scale,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Radio,
  Lock,
} from 'lucide-react';

interface PolicyCardProps {
  policy: DebrisPolicyData;
  account: string;
  onOpenSubmitTelemetry: (policy: DebrisPolicyData) => void;
  onOpenInspector: (policy: DebrisPolicyData) => void;
  onOpenAppeal: (policy: DebrisPolicyData) => void;
  onRefresh: () => void;
}

export const PolicyCard: React.FC<PolicyCardProps> = ({
  policy,
  account,
  onOpenSubmitTelemetry,
  onOpenInspector,
  onOpenAppeal,
  onRefresh,
}) => {
  const [userRole, setUserRole] = useState<string>('OBSERVER');
  const [coolingOffRemaining, setCoolingOffRemaining] = useState<number>(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const meta = getStatusMeta(policy.status, policy.verdict);
  const isAwaitingPayout = policy.status === 2;
  const isDisputed = policy.status === 6;

  // Poll role & cooling off countdown
  useEffect(() => {
    let timer: any = null;
    const fetchMeta = async () => {
      if (account) {
        const role = await fetchUserRole(policy.policy_id, account);
        setUserRole(role);
      } else {
        setUserRole('OBSERVER');
      }
      if (isAwaitingPayout) {
        const remaining = await fetchRemainingCoolingOff(policy.policy_id);
        setCoolingOffRemaining(remaining);
      }
    };

    fetchMeta();

    if (isAwaitingPayout) {
      timer = setInterval(async () => {
        const remaining = await fetchRemainingCoolingOff(policy.policy_id);
        setCoolingOffRemaining(remaining);
        if (remaining <= 0) {
          clearInterval(timer);
        }
      }, 3000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [policy.policy_id, account, isAwaitingPayout]);

  // Execute Adjudication
  const handleAdjudicate = async () => {
    if (!account) return;
    setActionLoading('adjudicate');
    try {
      const contractAddress = getSavedContractAddress();
      const calldata = encodeCalldata('adjudicate_debris_deorbit', [policy.policy_id]);

      const txHash = await (window as any).ethereum.request({
        method: 'eth_sendTransaction',
        params: [{ from: account, to: contractAddress, data: calldata }],
      });

      console.log('Submitted adjudicate_debris_deorbit tx:', txHash);
      await waitForTransactionReceipt(txHash);
      onRefresh();
    } catch (err: any) {
      console.error('Adjudicate error:', err);
      alert(err?.message || 'Adjudication failed.');
    } finally {
      setActionLoading(null);
    }
  };

  // Finalize Settlement
  const handleFinalize = async () => {
    if (!account) return;
    setActionLoading('finalize');
    try {
      const contractAddress = getSavedContractAddress();
      const calldata = encodeCalldata('finalize_settlement', [policy.policy_id]);

      const txHash = await (window as any).ethereum.request({
        method: 'eth_sendTransaction',
        params: [{ from: account, to: contractAddress, data: calldata }],
      });

      console.log('Submitted finalize_settlement tx:', txHash);
      await waitForTransactionReceipt(txHash);
      onRefresh();
    } catch (err: any) {
      console.error('Finalize error:', err);
      alert(err?.message || 'Settlement finalization failed.');
    } finally {
      setActionLoading(null);
    }
  };

  // Adjudicate Appeal
  const handleAdjudicateAppeal = async () => {
    if (!account) return;
    setActionLoading('appeal_adj');
    try {
      const contractAddress = getSavedContractAddress();
      const calldata = encodeCalldata('adjudicate_appeal', [policy.policy_id]);

      const txHash = await (window as any).ethereum.request({
        method: 'eth_sendTransaction',
        params: [{ from: account, to: contractAddress, data: calldata }],
      });

      console.log('Submitted adjudicate_appeal tx:', txHash);
      await waitForTransactionReceipt(txHash);
      onRefresh();
    } catch (err: any) {
      console.error('Appeal adjudication error:', err);
      alert(err?.message || 'Appeal adjudication failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const isOperator = userRole === 'OPERATOR';
  const isContractor = userRole === 'CONTRACTOR';
  const isOwner = userRole === 'OWNER';
  const canAdjudicate = isOperator || isContractor || isOwner;
  const canAppeal = isOperator || isContractor;
  const canFinalize = isOperator || isContractor || isOwner;

  return (
    <div className="relative rounded-2xl bg-space-850/95 border border-space-700/80 p-5 shadow-radar-console hover:border-orbital-cyan/50 transition-all flex flex-col justify-between overflow-hidden group">
      {/* Top Banner */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-space-900 border border-space-700 text-orbital-cyan shadow-sm">
              <Satellite className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-heading font-bold text-white text-base">
                  NORAD #{policy.norad_cat_id}
                </span>
                <span className="text-[11px] font-mono text-orbital-cyan bg-orbital-cyan/10 px-2 py-0.5 rounded border border-orbital-cyan/25 font-bold">
                  POLICY #{policy.policy_id}
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Target Reentry Ceiling: &le; {policy.target_max_perigee_km || 120} km
              </span>
            </div>
          </div>

          {/* Status Badge & Dynamic Role */}
          <div className="flex flex-col items-end">
            <span
              className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg border ${meta.bg} ${meta.text} ${meta.border}`}
            >
              {meta.label}
            </span>
            <div className="flex items-center space-x-1 mt-1 text-[10px] font-mono">
              <span className="text-slate-400">Role:</span>
              <span
                className={`font-bold ${
                  isOperator
                    ? 'text-sky-400'
                    : isContractor
                    ? 'text-deorbit-green'
                    : isOwner
                    ? 'text-purple-400'
                    : 'text-slate-400'
                }`}
              >
                {userRole}
              </span>
            </div>
          </div>
        </div>

        {/* Bounty Escrow & Stake Cards */}
        <div className="grid grid-cols-2 gap-2 mb-4 font-mono text-xs">
          <div className="bg-space-900/95 p-3 rounded-xl border border-space-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Escrow Bounty</span>
            <span className="text-sm font-bold text-white mt-1 block">
              {formatGen(policy.escrow_amount)} <span className="text-orbital-cyan text-xs">GEN</span>
            </span>
          </div>

          <div className="bg-space-900/95 p-3 rounded-xl border border-space-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Dispute Stake</span>
            <span className="text-sm font-bold text-purple-300 mt-1 block">
              {policy.dispute_bond !== '0' ? `${formatGen(policy.dispute_bond)} GEN` : '0.00 GEN'}
            </span>
          </div>
        </div>

        {/* Perigee & Altitude Decay Gauge */}
        <div className="bg-space-950/80 p-3 rounded-xl border border-space-800 mb-4 font-mono text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[11px]">Measured Perigee:</span>
            <span className="font-bold text-white">
              {policy.status >= 2 ? formatPerigee(policy.measured_final_perigee_km) : 'Awaiting ADR Burn'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[11px]">Altitude Decay Achieved:</span>
            <span className="font-bold text-deorbit-green">
              {policy.status >= 2 ? formatDecay(policy.altitude_decay_km) : '0 km'}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-space-900 h-2 rounded-full overflow-hidden border border-space-800 mt-2">
            <div
              className={`h-full transition-all duration-500 ${
                policy.status === 3
                  ? 'bg-deorbit-green w-full'
                  : policy.status === 4
                  ? 'bg-decay-amber w-3/5'
                  : policy.status === 5
                  ? 'bg-threat-crimson w-1/5'
                  : 'bg-orbital-cyan w-1/4'
              }`}
            />
          </div>
        </div>

        {/* Stakeholder Addresses */}
        <div className="space-y-1 mb-4 font-mono text-[11px] text-slate-400 bg-space-900/50 p-2.5 rounded-lg border border-space-800">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Operator:</span>
            <span className="text-slate-200">{shortenAddress(policy.constellation_operator)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Contractor:</span>
            <span className="text-slate-200">{shortenAddress(policy.adr_contractor)}</span>
          </div>
        </div>

        {/* Live Cooling-Off Countdown */}
        {isAwaitingPayout && (
          <div className="mb-4 p-2.5 rounded-xl bg-indigo-950/50 border border-indigo-500/30 text-xs font-mono flex items-center justify-between">
            <span className="text-indigo-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
              Dispute Cooling Window:
            </span>
            <span className={`font-bold ${coolingOffRemaining > 0 ? 'text-amber-400' : 'text-deorbit-green'}`}>
              {coolingOffRemaining > 0 ? `${coolingOffRemaining}s Challengeable` : 'Ready to Settle'}
            </span>
          </div>
        )}

        {/* Disputed Notice */}
        {isDisputed && (
          <div className="mb-4 p-2.5 rounded-xl bg-purple-950/50 border border-purple-500/30 text-xs font-mono text-purple-300 flex items-center gap-2">
            <Scale className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Appellate Review active with 10% staked dispute bond.</span>
          </div>
        )}
      </div>

      {/* Action Buttons tailored by Role */}
      <div className="pt-3 border-t border-space-800 space-y-2">
        {/* Contractor: Submit Telemetry */}
        {(policy.status === 0 || policy.status === 8) && (
          <button
            onClick={() => onOpenSubmitTelemetry(policy)}
            disabled={!isContractor && account !== ''}
            title={!isContractor && account !== '' ? 'Only designated ADR Contractor can submit telemetry' : ''}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-gradient-to-r from-orbital-cyan to-blue-600 text-space-950 font-bold text-xs rounded-lg hover:brightness-110 shadow-orbital-glow transition disabled:opacity-40"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Submit Radar Telemetry {(!isContractor && account !== '') && '(Contractor Only)'}</span>
          </button>
        )}

        {/* Stakeholder / Owner: Adjudicate Telemetry */}
        {(policy.status === 1 || policy.status === 8) && policy.tle_telemetry_url && (
          <button
            onClick={handleAdjudicate}
            disabled={actionLoading === 'adjudicate' || (!canAdjudicate && account !== '')}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-space-950 font-bold text-xs rounded-lg shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
          >
            {actionLoading === 'adjudicate' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>AI Astrodynamics Magistrate Evaluating...</span>
              </>
            ) : (
              <>
                <Compass className="w-3.5 h-3.5" />
                <span>Trigger AI Astrodynamics Jury</span>
              </>
            )}
          </button>
        )}

        {/* Cooling-Off Challenge: Appeal Button */}
        {isAwaitingPayout && coolingOffRemaining > 0 && (
          <button
            onClick={() => onOpenAppeal(policy)}
            disabled={!canAppeal && account !== ''}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg shadow-lg shadow-purple-600/20 transition disabled:opacity-40"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Appeal Verdict (10% Staked Bond)</span>
          </button>
        )}

        {/* Finalize Settlement (After cooling off ends) */}
        {isAwaitingPayout && coolingOffRemaining <= 0 && (
          <button
            onClick={handleFinalize}
            disabled={actionLoading === 'finalize' || (!canFinalize && account !== '')}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-gradient-to-r from-deorbit-green to-emerald-600 text-space-950 font-bold text-xs rounded-lg shadow-deorbit-glow transition disabled:opacity-50"
          >
            {actionLoading === 'finalize' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Finalizing Settlement on StudioNet...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Finalize & Disburse Escrow</span>
              </>
            )}
          </button>
        )}

        {/* Supreme Appellate Adjudication */}
        {isDisputed && (
          <button
            onClick={handleAdjudicateAppeal}
            disabled={actionLoading === 'appeal_adj' || (!canAdjudicate && account !== '')}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs rounded-lg shadow-lg shadow-purple-500/20 transition disabled:opacity-50"
          >
            {actionLoading === 'appeal_adj' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Supreme Court Deliberating...</span>
              </>
            ) : (
              <>
                <Scale className="w-3.5 h-3.5" />
                <span>Adjudicate Appellate Telemetry</span>
              </>
            )}
          </button>
        )}

        {/* Astrodynamics Inspector Modal */}
        <button
          onClick={() => onOpenInspector(policy)}
          className="w-full flex items-center justify-center space-x-1.5 px-3 py-2 bg-space-900 hover:bg-space-800 text-slate-300 hover:text-white border border-space-750 rounded-lg text-xs font-mono transition"
        >
          <span>Tri-Vector AI Inspector</span>
          <ChevronRight className="w-3 h-3 text-orbital-cyan" />
        </button>
      </div>
    </div>
  );
};
