import React, { useState } from 'react';
import {
  DebrisPolicyData,
  getSavedContractAddress,
  encodeCalldata,
  waitForTransactionReceipt,
} from '../config/genlayer';
import { X, Radio, AlertCircle, Loader2, ExternalLink, CheckCircle } from 'lucide-react';

interface SubmitTelemetryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  policy: DebrisPolicyData | null;
  account: string;
}

const ACCREDITED_ENDPOINTS = [
  {
    name: 'Space-Track.org (US Space Command)',
    url: (cat: string) => `https://space-track.org/basicspacedata/query/class/tle/NORAD_CAT_ID/${cat}.json`,
  },
  {
    name: 'CelesTrak GP Elements (Dr. T.S. Kelso)',
    url: (cat: string) => `https://celestrak.org/NORAD/elements/gp.php?CATNR=${cat}&FORMAT=JSON`,
  },
  {
    name: 'ESA DISCOS Database (European Space Agency)',
    url: (cat: string) => `https://discosweb.esoc.esa.int/api/objects/${cat}/ephemeris.json`,
  },
  {
    name: 'NASA Orbital Debris Program Office (ODPO)',
    url: (cat: string) => `https://orbitaldebris.jsc.nasa.gov/data/cat_${cat}.json`,
  },
  {
    name: 'LeoLabs Global Radar Network',
    url: (cat: string) => `https://leolabs.space/radar/catalog/${cat}/ephemeris.json`,
  },
];

export const SubmitTelemetryModal: React.FC<SubmitTelemetryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  policy,
  account,
}) => {
  const [telemetryUrl, setTelemetryUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !policy) return null;

  const handleSelectPreset = (urlFn: (cat: string) => string) => {
    setTelemetryUrl(urlFn(policy.norad_cat_id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!account) {
      setError('Please connect your ADR contractor wallet.');
      return;
    }
    if (!telemetryUrl || !telemetryUrl.startsWith('https://')) {
      setError('Please provide a valid https:// space surveillance tracking URL.');
      return;
    }

    setLoading(true);
    try {
      const contractAddress = getSavedContractAddress();
      const calldata = encodeCalldata('submit_orbital_telemetry', [
        policy.policy_id,
        telemetryUrl.trim(),
      ]);

      const txHash = await (window as any).ethereum.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: account,
            to: contractAddress,
            data: calldata,
          },
        ],
      });

      console.log('Submitted submit_orbital_telemetry tx:', txHash);
      await waitForTransactionReceipt(txHash);

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Submit telemetry error:', err);
      setError(err?.message || 'Failed to submit orbital telemetry.');
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
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-bold text-white">
                Submit Orbital Tracking Telemetry
              </h2>
              <p className="text-xs font-mono text-slate-400">
                Policy #{policy.policy_id} · Target NORAD Cat ID: {policy.norad_cat_id}
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

        {/* Accredited Trackers Preset */}
        <div className="mt-4">
          <label className="block text-xs font-mono text-slate-300 mb-2">
            SELECT ACCREDITED SPACE SURVEILLANCE RADAR NETWORK:
          </label>
          <div className="space-y-1.5">
            {ACCREDITED_ENDPOINTS.map((endpoint, i) => {
              const url = endpoint.url(policy.norad_cat_id);
              const isSelected = telemetryUrl === url;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectPreset(endpoint.url)}
                  className={`w-full p-2.5 rounded-lg border text-left text-xs font-mono transition flex items-center justify-between ${
                    isSelected
                      ? 'bg-orbital-cyan/15 border-orbital-cyan text-white shadow-orbital-glow'
                      : 'bg-space-900 border-space-750 text-slate-300 hover:border-space-700'
                  }`}
                >
                  <div className="truncate pr-2">
                    <span className="font-semibold text-orbital-cyan">{endpoint.name}</span>
                    <span className="block text-[11px] text-slate-400 truncate mt-0.5">{url}</span>
                  </div>
                  {isSelected && <CheckCircle className="w-4 h-4 text-deorbit-green shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1">
              Custom Orbital Ephemeris / TLE JSON Feed URL
            </label>
            <input
              type="url"
              value={telemetryUrl}
              onChange={(e) => setTelemetryUrl(e.target.value)}
              placeholder="https://space-track.org/..."
              className="w-full px-3 py-2 bg-space-900 border border-space-750 rounded-lg text-xs text-white font-mono focus:border-orbital-cyan focus:outline-none"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1 font-mono">
              Must originate strictly from accredited surveillance root domains: space-track.org, celestrak.org, esa.int, nasa.gov, or leolabs.space.
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
              className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-orbital-cyan to-blue-600 text-space-950 font-bold text-xs rounded-lg hover:brightness-110 shadow-orbital-glow transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Telemetry...</span>
                </>
              ) : (
                <>
                  <Radio className="w-4 h-4" />
                  <span>Link Radar Telemetry</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
