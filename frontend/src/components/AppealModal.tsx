import React, { useState } from 'react';
import {
  DebrisPolicyData,
  getSavedContractAddress,
  encodeCalldata,
  waitForTransactionReceipt,
} from '../config/genlayer';
import { formatGen } from '../utils/formatters';
import { X, Scale, AlertCircle, Loader2, ShieldAlert } from 'lucide-react';

interface AppealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  policy: DebrisPolicyData | null;
  account: string;
}

export const AppealModal: React.FC<AppealModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  policy,
  account,
}) => {
  const [disputeReason, setDisputeReason] = useState<string>('');
  const [supplementalUrl, setSupplementalUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !policy) return null;

  // Calculate 10% dispute bond
  const escrowWei = BigInt(policy.escrow_amount || '0');
  const requiredBondWei = (escrowWei * 10n) / 100n || 1n;
  const bondGenDisplay = formatGen(requiredBondWei);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!account) {
      setError('Please connect your operator or contractor wallet to appeal.');
      return;
    }
    if (!disputeReason.trim() || disputeReason.trim().length < 10) {
      setError('Detailed dispute justification (>= 10 characters) is required.');
      return;
    }
    if (!supplementalUrl.trim() || !supplementalUrl.startsWith('https://')) {
      setError('Valid accredited supplemental radar tracking URL (https://) is required.');
      return;
    }

    setLoading(true);
    try {
      const contractAddress = getSavedContractAddress();
      const calldata = encodeCalldata('appeal_verdict', [
        policy.policy_id,
        disputeReason.trim(),
        supplementalUrl.trim(),
      ]);

      const valueHex = `0x${requiredBondWei.toString(16)}`;

      const txHash = await (window as any).ethereum.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: account,
            to: contractAddress,
            data: calldata,
            value: valueHex,
          },
        ],
      });

      console.log('Submitted appeal_verdict tx:', txHash);
      await waitForTransactionReceipt(txHash);

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Appeal error:', err);
      setError(err?.message || 'Failed to submit orbital dispute appeal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-space-950/85 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl bg-space-850 border border-purple-500/40 p-6 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-space-750">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-bold text-white">
                File Astrodynamics Dispute Appeal
              </h2>
              <p className="text-xs font-mono text-slate-400">
                Policy #{policy.policy_id} · Current Verdict: {policy.verdict}
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

        {/* Bond Requirement Warning */}
        <div className="mt-4 p-3 bg-purple-950/40 rounded-xl border border-purple-500/30 text-xs font-mono text-purple-200 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-white">Required Appellate Stake:</strong> Filing an appeal requires staking a 10% dispute bond ({bondGenDisplay} GEN). If the appeal is dismissed, the bond is forfeited to the counterparty.
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1">
              Dispute Justification & Radar Discrepancy Evidence
            </label>
            <textarea
              rows={3}
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Explain why the AI jury verdict is inaccurate based on phased-array radar or optical tracking..."
              className="w-full px-3 py-2 bg-space-900 border border-space-750 rounded-lg text-xs text-white font-mono focus:border-purple-400 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1">
              Supplemental Accredited Space Surveillance URL
            </label>
            <input
              type="url"
              value={supplementalUrl}
              onChange={(e) => setSupplementalUrl(e.target.value)}
              placeholder="https://leolabs.space/... or https://space-track.org/..."
              className="w-full px-3 py-2 bg-space-900 border border-space-750 rounded-lg text-xs text-white font-mono focus:border-purple-400 focus:outline-none"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1 font-mono">
              Must originate from an accredited space tracker (Space-Track, CelesTrak, ESA, NASA, LeoLabs).
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-threat-crimson/15 border border-threat-crimson/30 text-threat-crimson text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-space-750">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold text-xs rounded-lg hover:brightness-110 shadow-lg shadow-purple-500/20 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Appeal...</span>
                </>
              ) : (
                <>
                  <Scale className="w-4 h-4" />
                  <span>Stake {bondGenDisplay} GEN & File Appeal</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
