import React, { useState } from 'react';
import {
  DEBRIS_PRESETS,
  TargetDebrisPreset,
  getSavedContractAddress,
  encodeCalldata,
  waitForTransactionReceipt,
} from '../config/genlayer';
import { parseGenToWei } from '../utils/formatters';
import { X, Satellite, Shield, AlertCircle, Loader2, Sparkles, Rocket } from 'lucide-react';

interface CreatePolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  account: string;
}

export const CreatePolicyModal: React.FC<CreatePolicyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  account,
}) => {
  const [adrContractor, setAdrContractor] = useState<string>('');
  const [noradCatId, setNoradCatId] = useState<string>('48274');
  const [targetMaxPerigee, setTargetMaxPerigee] = useState<number>(120);
  const [escrowAmount, setEscrowAmount] = useState<string>('2.5');
  const [durationBlocks, setDurationBlocks] = useState<number>(6000);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: TargetDebrisPreset) => {
    setNoradCatId(preset.norad_cat_id);
    setTargetMaxPerigee(120);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!account) {
      setError('Please connect your satellite constellation operator wallet.');
      return;
    }
    if (!adrContractor || !adrContractor.startsWith('0x') || adrContractor.length !== 42) {
      setError('Please enter a valid 42-character ADR Contractor address.');
      return;
    }
    if (adrContractor.toLowerCase() === account.toLowerCase()) {
      setError('Role violation: Constellation operator cannot designate themselves as ADR contractor.');
      return;
    }
    if (!noradCatId || noradCatId.trim().length < 3) {
      setError('Please specify a valid NORAD Catalog ID (>= 3 chars).');
      return;
    }
    const weiValue = parseGenToWei(escrowAmount);
    if (weiValue <= 0n) {
      setError('Escrow bounty deposit must be greater than 0 GEN.');
      return;
    }

    setLoading(true);
    try {
      const contractAddress = getSavedContractAddress();
      const calldata = encodeCalldata('create_removal_escrow', [
        adrContractor.toLowerCase().trim(),
        noradCatId.trim(),
        Number(targetMaxPerigee),
        Number(durationBlocks),
      ]);

      const valueHex = `0x${weiValue.toString(16)}`;

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

      console.log('Submitted create_removal_escrow tx:', txHash);
      await waitForTransactionReceipt(txHash);

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Create escrow error:', err);
      setError(err?.message || 'Failed to deposit debris removal escrow.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-space-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl bg-space-850 border border-orbital-cyan/30 p-6 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-space-750">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-orbital-cyan/15 text-orbital-cyan border border-orbital-cyan/30">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-bold text-white">
                Initiate Debris Removal Escrow
              </h2>
              <p className="text-xs font-mono text-slate-400">
                Lock GEN bounty for verified atmospheric de-orbiting
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

        {/* Quick Presets */}
        <div className="mt-4">
          <label className="block text-xs font-mono text-slate-300 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-orbital-cyan" />
            TARGET ORBITAL DEBRIS PRESETS (KESSLER HAZARDS)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {DEBRIS_PRESETS.map((p) => (
              <button
                key={p.norad_cat_id}
                type="button"
                onClick={() => handleSelectPreset(p)}
                className={`p-2 rounded-lg border text-left text-xs font-mono transition ${
                  noradCatId === p.norad_cat_id
                    ? 'bg-orbital-cyan/15 border-orbital-cyan text-white shadow-orbital-glow'
                    : 'bg-space-900 border-space-750 text-slate-300 hover:border-space-700'
                }`}
              >
                <div className="font-bold text-orbital-cyan">NORAD #{p.norad_cat_id}</div>
                <div className="truncate text-slate-200 text-[11px]">{p.name}</div>
                <div className="text-[10px] text-slate-500">Initial Perigee: ~{p.initial_altitude_km} km</div>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* NORAD Cat ID */}
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1">
              Target NORAD Catalog ID
            </label>
            <input
              type="text"
              value={noradCatId}
              onChange={(e) => setNoradCatId(e.target.value)}
              placeholder="e.g. 48274 or 22923"
              className="w-full px-3 py-2 bg-space-900 border border-space-750 rounded-lg text-sm text-white font-mono focus:border-orbital-cyan focus:outline-none"
              required
            />
          </div>

          {/* ADR Contractor Address */}
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1">
              ADR Contractor Address (Servicing Chaser Satellite)
            </label>
            <input
              type="text"
              value={adrContractor}
              onChange={(e) => setAdrContractor(e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2 bg-space-900 border border-space-750 rounded-lg text-sm text-white font-mono focus:border-orbital-cyan focus:outline-none"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1 font-mono">
              The Active Debris Removal company authorized to submit radar ephemeris tracking.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Target Max Perigee */}
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">
                Target Perigee Ceiling (km)
              </label>
              <input
                type="number"
                min="0"
                max="500"
                value={targetMaxPerigee}
                onChange={(e) => setTargetMaxPerigee(Number(e.target.value))}
                className="w-full px-3 py-2 bg-space-900 border border-space-750 rounded-lg text-sm text-white font-mono focus:border-orbital-cyan focus:outline-none"
                required
              />
              <span className="text-[10px] text-slate-500 font-mono">
                Standard atmospheric reentry boundary &le; 120 km
              </span>
            </div>

            {/* Escrow Bounty in GEN */}
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">
                Debris Removal Bounty (GEN)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={escrowAmount}
                onChange={(e) => setEscrowAmount(e.target.value)}
                className="w-full px-3 py-2 bg-space-900 border border-space-750 rounded-lg text-sm text-white font-mono focus:border-orbital-cyan focus:outline-none"
                required
              />
              <span className="text-[10px] text-slate-500 font-mono">
                Locked in smart contract until deorbit is verified
              </span>
            </div>
          </div>

          {/* Duration in Blocks */}
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1">
              Mission Window (Blocks @ ~3s/block)
            </label>
            <input
              type="number"
              min="100"
              value={durationBlocks}
              onChange={(e) => setDurationBlocks(Number(e.target.value))}
              className="w-full px-3 py-2 bg-space-900 border border-space-750 rounded-lg text-sm text-white font-mono focus:border-orbital-cyan focus:outline-none"
              required
            />
            <span className="text-[10px] text-slate-500 font-mono">
              6000 blocks ≈ 5 hours (for fast testing) | Production default is 90 days
            </span>
          </div>

          {/* Error display */}
          {error && (
            <div className="p-3 rounded-lg bg-threat-crimson/15 border border-threat-crimson/30 text-threat-crimson text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action buttons */}
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
              className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-orbital-cyan to-blue-600 text-space-950 font-bold text-xs rounded-lg hover:brightness-110 shadow-orbital-glow transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Locking Escrow on StudioNet...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Lock {escrowAmount} GEN Bounty</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
