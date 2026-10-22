import React from 'react';
import { DebrisStats } from '../config/genlayer';
import { formatGen } from '../utils/formatters';
import {
  ShieldAlert,
  Flame,
  Globe2,
  Lock,
  Compass,
  CheckCircle2,
} from 'lucide-react';

interface StatsOverviewProps {
  stats: DebrisStats | null;
  totalPoliciesCount: number;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ stats, totalPoliciesCount }) => {
  const escrowLocked = stats ? formatGen(stats.total_space_locked) : '0.0000';
  const settledCount = stats ? stats.total_missions_settled : 0;
  const activeCount = Math.max(0, (totalPoliciesCount || 0) - settledCount);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Stat 1: Total Escrow Locked */}
      <div className="relative overflow-hidden rounded-xl bg-space-800/90 border border-space-700/80 p-5 shadow-radar-console">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Orbital Escrow Locked
            </p>
            <h3 className="mt-2 text-2xl font-heading font-bold text-white tracking-tight flex items-baseline gap-1.5">
              <span>{escrowLocked}</span>
              <span className="text-sm font-mono text-orbital-cyan">GEN</span>
            </h3>
          </div>
          <div className="p-3 rounded-xl bg-orbital-cyan/10 border border-orbital-cyan/20 text-orbital-cyan">
            <Lock className="w-6 h-6" />
          </div>
        </div>
        <div className="mt-3 flex items-center text-xs font-mono text-slate-400">
          <span className="text-orbital-cyan mr-1.5">●</span> Parametric removal bounties
        </div>
        <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-orbital-cyan/5 rounded-full blur-xl pointer-events-none" />
      </div>

      {/* Stat 2: Verified De-orbit Reentries */}
      <div className="relative overflow-hidden rounded-xl bg-space-800/90 border border-space-700/80 p-5 shadow-radar-console">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-slate-400">
              De-orbits Verified
            </p>
            <h3 className="mt-2 text-2xl font-heading font-bold text-white tracking-tight flex items-baseline gap-1.5">
              <span>{settledCount}</span>
              <span className="text-sm font-mono text-deorbit-green">OBJECTS</span>
            </h3>
          </div>
          <div className="p-3 rounded-xl bg-deorbit-green/10 border border-deorbit-green/20 text-deorbit-green">
            <Flame className="w-6 h-6" />
          </div>
        </div>
        <div className="mt-3 flex items-center text-xs font-mono text-deorbit-green">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Atmospheric reentry certified
        </div>
        <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-deorbit-green/5 rounded-full blur-xl pointer-events-none" />
      </div>

      {/* Stat 3: Active ADR Surveillance */}
      <div className="relative overflow-hidden rounded-xl bg-space-800/90 border border-space-700/80 p-5 shadow-radar-console">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Active Missions
            </p>
            <h3 className="mt-2 text-2xl font-heading font-bold text-white tracking-tight flex items-baseline gap-1.5">
              <span>{activeCount}</span>
              <span className="text-sm font-mono text-decay-amber">RADAR TRACKS</span>
            </h3>
          </div>
          <div className="p-3 rounded-xl bg-decay-amber/10 border border-decay-amber/20 text-decay-amber">
            <Compass className="w-6 h-6" />
          </div>
        </div>
        <div className="mt-3 flex items-center text-xs font-mono text-slate-400">
          <span className="text-decay-amber mr-1.5">●</span> Space surveillance telemetry
        </div>
        <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-decay-amber/5 rounded-full blur-xl pointer-events-none" />
      </div>

      {/* Stat 4: Kessler Index Mitigation */}
      <div className="relative overflow-hidden rounded-xl bg-space-800/90 border border-space-700/80 p-5 shadow-radar-console">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Kessler Avoidance
            </p>
            <h3 className="mt-2 text-2xl font-heading font-bold text-white tracking-tight flex items-baseline gap-1.5">
              <span>99.8%</span>
              <span className="text-sm font-mono text-plasma-orange">DE-RISKED</span>
            </h3>
          </div>
          <div className="p-3 rounded-xl bg-plasma-orange/10 border border-plasma-orange/20 text-plasma-orange">
            <Globe2 className="w-6 h-6" />
          </div>
        </div>
        <div className="mt-3 flex items-center text-xs font-mono text-slate-400">
          <ShieldAlert className="w-3.5 h-3.5 text-plasma-orange mr-1" />
          LEO Constellation Sustainability
        </div>
        <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-plasma-orange/5 rounded-full blur-xl pointer-events-none" />
      </div>
    </div>
  );
};
