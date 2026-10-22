import React, { useState } from 'react';
import { DebrisPolicyData } from '../config/genlayer';
import { Radio, AlertTriangle, Flame, CheckCircle, Crosshair } from 'lucide-react';

interface OrbitalRadarVisualizerProps {
  policies: DebrisPolicyData[];
  onSelectPolicy?: (policy: DebrisPolicyData) => void;
}

export const OrbitalRadarVisualizer: React.FC<OrbitalRadarVisualizerProps> = ({
  policies,
  onSelectPolicy,
}) => {
  const [selectedNorad, setSelectedNorad] = useState<string | null>(null);

  // Generate deterministic coordinates for radar blips based on NORAD Cat ID
  const getCoordinates = (norad: string, altitudeKm: number, index: number) => {
    const num = parseInt(norad, 10) || 25544;
    const angle = (num * 37 + index * 95) % 360;
    const rad = (angle * Math.PI) / 180;
    // Map altitude (0 to 900 km) to radius (35px to 155px)
    const effectiveAlt = Math.max(0, Math.min(900, altitudeKm || 450));
    const r = 38 + (effectiveAlt / 900) * 115;
    const x = 180 + r * Math.cos(rad);
    const y = 180 + r * Math.sin(rad);
    return { x, y, angle };
  };

  return (
    <div className="relative rounded-2xl bg-space-850/90 border border-space-700/80 p-6 mb-8 overflow-hidden shadow-radar-console">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center space-x-2">
            <Radio className="w-5 h-5 text-orbital-cyan animate-pulse" />
            <h3 className="font-heading font-bold text-lg text-white">
              LEO Orbital Space Surveillance Radar (SSA)
            </h3>
          </div>
          <p className="text-xs font-mono text-slate-400 mt-0.5">
            Real-time radar ephemeris tracking & perigee atmospheric decay telemetry
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono bg-space-900/80 px-3.5 py-1.5 rounded-lg border border-space-750">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-deorbit-green animate-pulse" />
            <span className="text-slate-300">Reentered (&le;120km)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-decay-amber" />
            <span className="text-slate-300">Decaying (&ge;150km decay)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-threat-crimson" />
            <span className="text-slate-300">Hazardous / Inactive</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* SVG Radar Display */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="relative w-[360px] h-[360px] rounded-full bg-space-950 border border-orbital-cyan/30 flex items-center justify-center overflow-hidden shadow-orbital-glow">
            {/* Animated Rotating Radar Sweep Line */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background:
                  'conic-gradient(from 0deg, rgba(56, 189, 248, 0.22) 0deg, transparent 60deg, transparent 360deg)',
                animation: 'spin 10s linear infinite',
              }}
            />

            {/* Radar Range Rings */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 360 360"
            >
              {/* Range rings */}
              <circle cx="180" cy="180" r="150" fill="none" stroke="#1D2E68" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx="180" cy="180" r="115" fill="none" stroke="#1D2E68" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx="180" cy="180" r="75" fill="none" stroke="#1D2E68" strokeWidth="1" />
              <circle cx="180" cy="180" r="42" fill="rgba(249, 115, 22, 0.08)" stroke="#F97316" strokeWidth="1.5" strokeDasharray="2 2" />

              {/* Crosshair Axes */}
              <line x1="180" y1="10" x2="180" y2="350" stroke="#14214D" strokeWidth="1" />
              <line x1="10" y1="180" x2="350" y2="180" stroke="#14214D" strokeWidth="1" />

              {/* Range Labels */}
              <text x="184" y="40" fill="#64748B" fontSize="9" fontFamily="monospace">800 km</text>
              <text x="184" y="75" fill="#64748B" fontSize="9" fontFamily="monospace">500 km</text>
              <text x="184" y="115" fill="#64748B" fontSize="9" fontFamily="monospace">300 km</text>
              <text x="184" y="145" fill="#F97316" fontSize="8" fontFamily="monospace">120 km (Reentry)</text>

              {/* Earth at Center */}
              <circle cx="180" cy="180" r="30" fill="#0C2548" stroke="#38BDF8" strokeWidth="2" />
              <circle cx="180" cy="180" r="34" fill="none" stroke="#38BDF8" strokeWidth="1" opacity="0.4" />
              <text x="180" y="184" fill="#E2E8F0" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
                EARTH
              </text>
            </svg>

            {/* Target Blips */}
            {policies.map((p, idx) => {
              const alt = p.status === 3 ? 0 : p.measured_final_perigee_km || p.target_max_perigee_km * 2;
              const { x, y } = getCoordinates(p.norad_cat_id, alt, idx);
              const isSelected = selectedNorad === p.norad_cat_id;

              let blipColor = '#38BDF8';
              let ringColor = 'rgba(56, 189, 248, 0.4)';
              if (p.status === 3 || p.verdict === 'DEORBIT_CONFIRMED_FULL') {
                blipColor = '#10B981';
                ringColor = 'rgba(16, 185, 129, 0.5)';
              } else if (p.status === 4 || p.verdict === 'PARTIAL_ORBIT_LOWERING') {
                blipColor = '#F59E0B';
                ringColor = 'rgba(245, 158, 11, 0.5)';
              } else if (p.status === 5 || p.verdict === 'REMOVAL_FAILED_REJECTED') {
                blipColor = '#EF4444';
                ringColor = 'rgba(239, 68, 68, 0.5)';
              }

              return (
                <button
                  key={p.policy_id}
                  onClick={() => {
                    setSelectedNorad(p.norad_cat_id);
                    if (onSelectPolicy) onSelectPolicy(p);
                  }}
                  style={{ left: `${x}px`, top: `${y}px` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 group transition-transform ${
                    isSelected ? 'scale-150 z-20' : 'hover:scale-125 z-10'
                  }`}
                  title={`NORAD ${p.norad_cat_id} (${p.verdict})`}
                >
                  <span
                    className="absolute -inset-2 rounded-full animate-ping opacity-75"
                    style={{ backgroundColor: ringColor }}
                  />
                  <span
                    className="relative block w-3.5 h-3.5 rounded-full border border-space-950 shadow-md"
                    style={{ backgroundColor: blipColor }}
                  />
                  {/* Tooltip on Hover */}
                  <span className="absolute bottom-5 left-1/2 -translate-x-1/2 hidden group-hover:block whitespace-nowrap bg-space-950/95 text-slate-100 text-[10px] font-mono px-2 py-1 rounded border border-space-700 pointer-events-none z-30 shadow-xl">
                    CAT#{p.norad_cat_id} · {p.verdict}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Radar Telemetry Feed Side Panel */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          <div className="bg-space-900/90 rounded-xl border border-space-750 p-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-space-750 pb-2 mb-3">
              <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-orbital-cyan" />
                SURVEILLANCE RADAR LOGS
              </span>
              <span className="text-[11px] text-orbital-cyan">
                {policies.length} DETECTED BODIES
              </span>
            </div>

            {policies.length === 0 ? (
              <div className="py-6 text-center text-slate-500">
                No active debris removal policies on radar. Create an escrow to begin tracking.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {policies.map((p) => {
                  const isSelected = selectedNorad === p.norad_cat_id;
                  return (
                    <div
                      key={p.policy_id}
                      onClick={() => {
                        setSelectedNorad(p.norad_cat_id);
                        if (onSelectPolicy) onSelectPolicy(p);
                      }}
                      className={`flex items-center justify-between p-2 rounded-lg border transition cursor-pointer ${
                        isSelected
                          ? 'bg-space-800 border-orbital-cyan/60 shadow-orbital-glow'
                          : 'bg-space-950/70 border-space-800 hover:border-space-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <span className="text-orbital-cyan font-bold">#{p.policy_id}</span>
                        <span className="text-slate-300">NORAD {p.norad_cat_id}</span>
                        <span className="text-[10px] text-slate-500">
                          Target: &le;{p.target_max_perigee_km}km
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {p.status === 3 ? (
                          <span className="text-deorbit-green flex items-center gap-1 text-[11px]">
                            <Flame className="w-3 h-3" /> Reentered
                          </span>
                        ) : p.status === 4 ? (
                          <span className="text-decay-amber text-[11px]">Decayed {p.altitude_decay_km}km</span>
                        ) : p.status === 5 ? (
                          <span className="text-threat-crimson text-[11px]">Failed</span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">{p.verdict}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Notice */}
          <div className="p-3 bg-space-800/60 rounded-xl border border-space-700/60 text-xs text-slate-300 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-decay-amber shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px]">
              <strong className="text-white">LEO Collision Avoidance Protocol:</strong> Telemetry is authenticated strictly against accredited space surveillance networks (Space-Track, CelesTrak, ESA DISCOS, NASA ODPO). On-chain AI astrodynamics models verify perigee altitudes down to atmospheric reentry interface (&le; 120 km).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
