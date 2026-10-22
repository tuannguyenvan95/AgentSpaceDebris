import React, { useState, useEffect, useCallback } from 'react';
import {
  DebrisPolicyData,
  DebrisStats,
  readContract,
  getSavedContractAddress,
  DEBRIS_PRESETS,
} from './config/genlayer';
import { Navbar } from './components/Navbar';
import { StatsOverview } from './components/StatsOverview';
import { OrbitalRadarVisualizer } from './components/OrbitalRadarVisualizer';
import { PolicyCard } from './components/PolicyCard';
import { CreatePolicyModal } from './components/CreatePolicyModal';
import { SubmitTelemetryModal } from './components/SubmitTelemetryModal';
import { AstrodynamicsInspectorModal } from './components/AstrodynamicsInspectorModal';
import { AppealModal } from './components/AppealModal';
import { PullPayoutButton } from './components/PullPayoutButton';
import { ErrorBoundary } from './components/ErrorBoundary';
import { formatGen, shortenAddress } from './utils/formatters';
import {
  Satellite,
  PlusCircle,
  RefreshCw,
  Search,
  Filter,
  Flame,
  Radio,
  ExternalLink,
  ShieldCheck,
  Globe2,
  Compass,
  Cpu,
  Layers,
  Lock,
  UserCheck,
  Zap,
} from 'lucide-react';

export const App: React.FC = () => {
  const [account, setAccount] = useState<string>('');
  const [policies, setPolicies] = useState<DebrisPolicyData[]>([]);
  const [stats, setStats] = useState<DebrisStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isSubmitOpen, setIsSubmitOpen] = useState<boolean>(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const [isAppealOpen, setIsAppealOpen] = useState<boolean>(false);
  const [activePolicy, setActivePolicy] = useState<DebrisPolicyData | null>(null);

  // Auto connect wallet if previously authorized
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      (window as any).ethereum
        .request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            setAccount(accounts[0].toLowerCase());
          }
        })
        .catch(console.error);

      // Listen for account change
      (window as any).ethereum.on('accountsChanged', (accs: string[]) => {
        if (accs.length > 0) {
          setAccount(accs[0].toLowerCase());
        } else {
          setAccount('');
        }
      });
    }
  }, []);

  const handleConnect = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      alert('MetaMask or a Web3 wallet is required to connect to GenLayer StudioNet.');
      return;
    }
    try {
      const accounts = await (window as any).ethereum.request({
        method: 'eth_requestAccounts',
      });
      if (accounts.length > 0) {
        setAccount(accounts[0].toLowerCase());
      }
    } catch (err: any) {
      console.error('Wallet connect error:', err);
    }
  };

  const handleDisconnect = () => {
    setAccount('');
  };

  // Load Policies and Stats directly from Intelligent Contract (100% On-Chain)
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Stats from contract
      const rawStats = await readContract('get_stats', []);
      if (rawStats && typeof rawStats === 'object') {
        setStats(rawStats as DebrisStats);
      }

      // 2. Fetch Policies from contract storage
      const rawPolicies = await readContract('get_all_policies', []);
      if (Array.isArray(rawPolicies)) {
        setPolicies(rawPolicies as DebrisPolicyData[]);
      } else {
        setPolicies([]);
      }
    } catch (err) {
      console.warn('Error reading on-chain contract data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Filtered Policies
  const filteredPolicies = policies.filter((p) => {
    const matchesSearch =
      p.norad_cat_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.policy_id.includes(searchQuery) ||
      p.constellation_operator.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.adr_contractor.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterStatus === 'OPEN') return p.status === 0 || p.status === 1;
    if (filterStatus === 'COOLING') return p.status === 2;
    if (filterStatus === 'SETTLED_FULL') return p.status === 3;
    if (filterStatus === 'PARTIAL') return p.status === 4;
    if (filterStatus === 'REJECTED') return p.status === 5;
    if (filterStatus === 'DISPUTED') return p.status === 6;
    return true;
  });

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-space-950 text-slate-100 flex flex-col justify-between selection:bg-orbital-cyan/30">
        <div>
          {/* Web3 Pro Navbar */}
          <Navbar
            account={account}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onContractAddressChange={loadData}
          />

          {/* Tactical Command Matrix Body */}
          <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Top Mission Control Header */}
            <div className="relative mb-8 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-space-900 via-space-850 to-space-900 border border-space-750 shadow-2xl overflow-hidden">
              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="max-w-3xl">
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-orbital-cyan/10 border border-orbital-cyan/30 text-xs font-mono text-orbital-cyan mb-3 shadow-orbital-glow">
                    <Radio className="w-3.5 h-3.5 animate-pulse" />
                    <span>AUTONOMOUS ASTRODYNAMICS ORACLE · GENLAYER STUDIONET (CHAIN 61999)</span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-heading font-extrabold text-white tracking-tight leading-tight">
                    AgentSpaceDebris Tactical Command Matrix
                  </h1>
                  <p className="mt-3 text-sm text-slate-300 leading-relaxed font-sans">
                    Parametric collision insurance & active debris removal escrow protocol. Evaluates Two-Line Element (TLE) radar ephemeris via on-chain AI Astrodynamics Magistrate to eliminate Kessler cascade hazards.
                  </p>
                </div>

                {/* Primary CTAs & Pull-Payment Safety Vault */}
                <div className="flex flex-col sm:flex-row lg:flex-col items-stretch lg:items-end gap-3 shrink-0">
                  <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex items-center justify-center space-x-2.5 px-6 py-3.5 bg-gradient-to-r from-orbital-cyan via-sky-400 to-blue-600 text-space-950 font-heading font-extrabold text-sm rounded-xl hover:brightness-110 shadow-orbital-glow transition"
                  >
                    <PlusCircle className="w-5 h-5" />
                    <span>Initiate Removal Escrow</span>
                  </button>

                  <div className="flex items-center">
                    <PullPayoutButton account={account} onSuccess={loadData} />
                  </div>
                </div>
              </div>

              {/* Ambient Radial Lights */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-orbital-cyan/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-deorbit-green/5 rounded-full blur-3xl pointer-events-none" />
            </div>

            {/* Aggregated Protocol Telemetry Stats */}
            <StatsOverview stats={stats} totalPoliciesCount={policies.length} />

            {/* 3-Column Tactical Command Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Mission Control & Role Station (3 Cols) */}
              <div className="lg:col-span-3 space-y-6">
                {/* Station Card: User Role & Permissions */}
                <div className="p-5 rounded-2xl bg-space-850/95 border border-space-700/80 shadow-radar-console font-mono text-xs">
                  <div className="flex items-center space-x-2 pb-3 mb-4 border-b border-space-750">
                    <UserCheck className="w-4 h-4 text-orbital-cyan" />
                    <h3 className="font-heading font-bold text-white text-sm">
                      STAKEHOLDER IDENTITY
                    </h3>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase block mb-1">CONNECTED ADDRESS</span>
                      <div className="p-2.5 rounded-lg bg-space-900 border border-space-800 text-white font-bold break-all">
                        {account ? shortenAddress(account) : 'Not Connected'}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[10px] uppercase block mb-1">ON-CHAIN NETWORK</span>
                      <div className="p-2.5 rounded-lg bg-space-900 border border-space-800 text-orbital-cyan flex items-center justify-between">
                        <span>StudioNet (Chain 61999)</span>
                        <span className="w-2 h-2 rounded-full bg-deorbit-green" />
                      </div>
                    </div>

                    <div className="p-3 bg-space-900/90 rounded-xl border border-space-750 text-[11px] text-slate-300 space-y-1.5">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-deorbit-green" />
                        Role-Based Access Control:
                      </div>
                      <p className="text-slate-400 leading-relaxed text-[10px]">
                        • <strong>Operator:</strong> Lock bounty, appeal, finalize payout, reclaim expired.<br/>
                        • <strong>ADR Contractor:</strong> Submit TLE radar telemetry, appeal, finalize payout.<br/>
                        • <strong>Observer:</strong> Inspect on-chain astrodynamics consensus & radar blips.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Target Pre-Flight Presets */}
                <div className="p-5 rounded-2xl bg-space-850/95 border border-space-700/80 shadow-radar-console font-mono text-xs">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-space-750">
                    <span className="text-slate-300 font-bold flex items-center gap-1.5">
                      <Satellite className="w-4 h-4 text-orbital-cyan" />
                      PRIORITY TARGETS
                    </span>
                    <span className="text-[10px] text-slate-500">LEO HAZARDS</span>
                  </div>

                  <div className="space-y-2">
                    {DEBRIS_PRESETS.map((dp) => (
                      <div
                        key={dp.norad_cat_id}
                        className="p-2.5 rounded-lg bg-space-900 border border-space-800 hover:border-space-700 transition"
                      >
                        <div className="flex items-center justify-between font-bold text-orbital-cyan text-[11px]">
                          <span>NORAD #{dp.norad_cat_id}</span>
                          <span className="text-slate-400 font-normal">~{dp.initial_altitude_km} km</span>
                        </div>
                        <div className="text-[11px] text-slate-200 truncate mt-0.5">{dp.name}</div>
                        <div className="text-[10px] text-slate-500 mt-1 line-clamp-1">{dp.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Center Column: Live SSA Radar Console (5 Cols) */}
              <div className="lg:col-span-5 space-y-6">
                <OrbitalRadarVisualizer
                  policies={policies}
                  onSelectPolicy={(policy) => {
                    setActivePolicy(policy);
                    setIsInspectorOpen(true);
                  }}
                />

                {/* Astrodynamics Specification Box */}
                <div className="p-5 rounded-2xl bg-space-850/95 border border-space-700/80 shadow-radar-console font-mono text-xs space-y-3">
                  <div className="flex items-center space-x-2 pb-2 border-b border-space-750">
                    <Compass className="w-4 h-4 text-orbital-cyan" />
                    <h3 className="font-heading font-bold text-white text-sm">
                      TRI-VECTOR CONSENSUS MAGISTRATE
                    </h3>
                  </div>

                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Unlike traditional EVM contracts, GenLayer validators compute transcendental Keplerian orbital equations directly on-chain from Two-Line Element (TLE) ephemeris:
                  </p>

                  <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                    <div className="p-2 rounded bg-space-900 border border-space-800">
                      <div className="text-orbital-cyan font-bold">Vector A</div>
                      <div className="text-slate-400 mt-0.5">Orbital Decay &Delta;h</div>
                    </div>
                    <div className="p-2 rounded bg-space-900 border border-space-800">
                      <div className="text-plasma-orange font-bold">Vector B</div>
                      <div className="text-slate-400 mt-0.5">&le;120 km Reentry</div>
                    </div>
                    <div className="p-2 rounded bg-space-900 border border-space-800">
                      <div className="text-deorbit-green font-bold">Vector C</div>
                      <div className="text-slate-400 mt-0.5">Kessler Reduction</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Live On-Chain Policies Ledger (4 Cols) */}
              <div className="lg:col-span-4 space-y-4">
                {/* Ledger Header & Search */}
                <div className="p-4 rounded-2xl bg-space-850/95 border border-space-700/80 shadow-radar-console font-mono text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-heading font-bold text-white text-sm flex items-center gap-2">
                      <span>ON-CHAIN ESCROW POLICIES</span>
                      <span className="px-2 py-0.5 rounded-full bg-space-900 text-orbital-cyan border border-space-750 font-mono text-xs">
                        {filteredPolicies.length}
                      </span>
                    </span>
                    <button
                      onClick={loadData}
                      title="Sync On-Chain State"
                      className="p-1.5 rounded-lg bg-space-900 border border-space-750 text-slate-400 hover:text-orbital-cyan transition"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orbital-cyan' : ''}`} />
                    </button>
                  </div>

                  {/* Search and Filters */}
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search NORAD, ID, Address..."
                        className="w-full pl-8 pr-3 py-1.5 bg-space-900 border border-space-750 rounded-lg text-xs text-white font-mono placeholder:text-slate-500 focus:border-orbital-cyan focus:outline-none"
                      />
                    </div>

                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-space-900 border border-space-750 rounded-lg text-xs text-slate-200 font-mono focus:border-orbital-cyan focus:outline-none"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="OPEN">Open & Telemetry Linked</option>
                      <option value="COOLING">Awaiting Settlement (Cooling-off)</option>
                      <option value="SETTLED_FULL">De-orbit Verified (100% Payout)</option>
                      <option value="PARTIAL">Partial Decay (40% Milestone)</option>
                      <option value="REJECTED">Removal Failed / Refunded</option>
                      <option value="DISPUTED">Under Dispute Appeal</option>
                    </select>
                  </div>
                </div>

                {/* Policies Feed */}
                {filteredPolicies.length === 0 ? (
                  <div className="rounded-2xl bg-space-850/60 border border-space-750 p-8 text-center font-mono text-xs">
                    <Satellite className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                    <div className="font-bold text-white mb-1">No Debris Policies Match</div>
                    <p className="text-slate-400 text-[11px] mb-4">
                      Initiate a removal bounty on StudioNet to start orbital decay tracking.
                    </p>
                    <button
                      onClick={() => setIsCreateOpen(true)}
                      className="px-4 py-2 bg-gradient-to-r from-orbital-cyan to-blue-600 text-space-950 font-bold text-xs rounded-lg hover:brightness-110 shadow-orbital-glow transition"
                    >
                      Initiate First Escrow
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[920px] overflow-y-auto pr-1">
                    {filteredPolicies.map((policy) => (
                      <PolicyCard
                        key={policy.policy_id}
                        policy={policy}
                        account={account}
                        onOpenSubmitTelemetry={(p) => {
                          setActivePolicy(p);
                          setIsSubmitOpen(true);
                        }}
                        onOpenInspector={(p) => {
                          setActivePolicy(p);
                          setIsInspectorOpen(true);
                        }}
                        onOpenAppeal={(p) => {
                          setActivePolicy(p);
                          setIsAppealOpen(true);
                        }}
                        onRefresh={loadData}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>

        {/* Space Situational Footer */}
        <footer className="border-t border-space-800 bg-space-950 py-8 px-4 sm:px-6 lg:px-8 mt-16 font-mono text-xs text-slate-400">
          <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <Satellite className="w-5 h-5 text-orbital-cyan" />
              <div>
                <span className="text-white font-bold">AgentSpaceDebris Protocol</span>
                <span className="text-slate-500 ml-2">· GenLayer StudioNet (Chain 61999) · 100% On-Chain</span>
              </div>
            </div>

            <div className="flex items-center space-x-6 text-slate-400 text-xs">
              <a
                href={`https://studio.genlayer.com/address/${getSavedContractAddress()}`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-orbital-cyan flex items-center gap-1 transition"
              >
                <span>Contract Explorer</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://space-track.org"
                target="_blank"
                rel="noreferrer"
                className="hover:text-orbital-cyan flex items-center gap-1 transition"
              >
                <span>Space-Track.org</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://celestrak.org"
                target="_blank"
                rel="noreferrer"
                className="hover:text-orbital-cyan flex items-center gap-1 transition"
              >
                <span>CelesTrak</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </footer>

        {/* Interactive Modals */}
        <CreatePolicyModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={loadData}
          account={account}
        />

        <SubmitTelemetryModal
          isOpen={isSubmitOpen}
          onClose={() => setIsSubmitOpen(false)}
          onSuccess={loadData}
          policy={activePolicy}
          account={account}
        />

        <AstrodynamicsInspectorModal
          isOpen={isInspectorOpen}
          onClose={() => setIsInspectorOpen(false)}
          policy={activePolicy}
        />

        <AppealModal
          isOpen={isAppealOpen}
          onClose={() => setIsAppealOpen(false)}
          onSuccess={loadData}
          policy={activePolicy}
          account={account}
        />
      </div>
    </ErrorBoundary>
  );
};
