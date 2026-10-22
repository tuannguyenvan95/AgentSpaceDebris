import React, { useState, useEffect, useCallback } from 'react';
import {
  DebrisPolicyData,
  DebrisStats,
  readContract,
  getSavedContractAddress,
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

  // Auto connect wallet if previously approved
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

  // Load Policies and Stats from Intelligent Contract
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Stats
      const rawStats = await readContract('get_stats', []);
      if (rawStats && typeof rawStats === 'object') {
        setStats(rawStats as DebrisStats);
      }

      // 2. Fetch Policies
      const rawPolicies = await readContract('get_all_policies', []);
      if (Array.isArray(rawPolicies)) {
        setPolicies(rawPolicies as DebrisPolicyData[]);
      } else {
        setPolicies([]);
      }
    } catch (err) {
      console.warn('Error loading contract data from StudioNet:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 12000);
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
          {/* Navbar */}
          <Navbar
            account={account}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onContractAddressChange={loadData}
          />

          {/* Main Hero Container */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Hero Top Title & CTAs */}
            <div className="relative mb-8 p-8 rounded-3xl bg-gradient-to-r from-space-900 via-space-850 to-space-900 border border-space-750 shadow-2xl overflow-hidden">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-orbital-cyan/10 border border-orbital-cyan/30 text-xs font-mono text-orbital-cyan mb-3">
                    <Radio className="w-3.5 h-3.5 animate-pulse" />
                    <span>AUTONOMOUS ASTRODYNAMICS ORACLE ON GENLAYER</span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-heading font-extrabold text-white tracking-tight leading-tight">
                    Orbital Collision Avoidance & Active Space Debris Escrow
                  </h1>
                  <p className="mt-3 text-sm text-slate-300 leading-relaxed font-sans">
                    Guaranteed parametric escrow for LEO satellite constellations and Active Debris Removal (ADR) contractors. On-chain AI astrodynamics tribunals verify Two-Line Element (TLE) radar ephemeris to release bounties only upon verified atmospheric reentry burn (&le; 120 km).
                  </p>
                </div>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row md:flex-col items-stretch gap-3 shrink-0">
                  <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex items-center justify-center space-x-2 px-6 py-3.5 bg-gradient-to-r from-orbital-cyan via-sky-400 to-blue-600 text-space-950 font-heading font-bold text-sm rounded-xl hover:brightness-110 shadow-orbital-glow transition"
                  >
                    <PlusCircle className="w-5 h-5" />
                    <span>Lock Debris Bounty Escrow</span>
                  </button>

                  <div className="flex items-center justify-end">
                    <PullPayoutButton account={account} onSuccess={loadData} />
                  </div>
                </div>
              </div>

              {/* Background Glow Accents */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-orbital-cyan/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-deorbit-green/5 rounded-full blur-3xl pointer-events-none" />
            </div>

            {/* Aggregated Protocol Statistics */}
            <StatsOverview stats={stats} totalPoliciesCount={policies.length} />

            {/* Interactive Orbital Radar Visualizer */}
            <OrbitalRadarVisualizer
              policies={policies}
              onSelectPolicy={(policy) => {
                setActivePolicy(policy);
                setIsInspectorOpen(true);
              }}
            />

            {/* Policies Surveillance Hub */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-heading font-bold text-white flex items-center gap-2">
                  <span>Debris Removal Escrow Policies</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-space-800 text-orbital-cyan border border-space-700">
                    {filteredPolicies.length}
                  </span>
                </h2>
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  Live parametric smart contract agreements deployed on GenLayer StudioNet
                </p>
              </div>

              {/* Search and Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search NORAD, ID, Address..."
                    className="pl-9 pr-3 py-1.5 bg-space-850 border border-space-700 rounded-lg text-xs text-white font-mono placeholder:text-slate-500 focus:border-orbital-cyan focus:outline-none w-52 sm:w-64"
                  />
                </div>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-1.5 bg-space-850 border border-space-700 rounded-lg text-xs text-slate-200 font-mono focus:border-orbital-cyan focus:outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="OPEN">Open & Telemetry Linked</option>
                  <option value="COOLING">Awaiting Settlement (Cooling-off)</option>
                  <option value="SETTLED_FULL">De-orbit Verified (100% Payout)</option>
                  <option value="PARTIAL">Partial Decay (40% Milestone)</option>
                  <option value="REJECTED">Removal Failed / Refunded</option>
                  <option value="DISPUTED">Under Dispute Appeal</option>
                </select>

                <button
                  onClick={loadData}
                  title="Refresh State from StudioNet"
                  className="p-2 rounded-lg bg-space-850 border border-space-700 text-slate-400 hover:text-orbital-cyan transition"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orbital-cyan' : ''}`} />
                </button>
              </div>
            </div>

            {/* Grid of Policy Cards */}
            {filteredPolicies.length === 0 ? (
              <div className="rounded-2xl bg-space-850/60 border border-space-750 p-12 text-center my-6">
                <Satellite className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-heading font-bold text-white mb-1">
                  No Active Debris Policies Found
                </h3>
                <p className="text-xs font-mono text-slate-400 max-w-md mx-auto mb-5">
                  Deposit GEN bounty to sponsor the rendezvous and atmospheric de-orbiting of defunct space debris bodies.
                </p>
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-orbital-cyan to-blue-600 text-space-950 font-bold text-xs rounded-xl hover:brightness-110 shadow-orbital-glow transition"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Lock First Debris Escrow</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
          </main>
        </div>

        {/* High-Tech Astrodynamics Footer */}
        <footer className="border-t border-space-800 bg-space-950 py-8 px-4 sm:px-6 lg:px-8 mt-16 font-mono text-xs text-slate-400">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <Satellite className="w-5 h-5 text-orbital-cyan" />
              <div>
                <span className="text-white font-bold">AgentSpaceDebris Protocol</span>
                <span className="text-slate-500 ml-2">· GenLayer StudioNet (Chain 61999)</span>
              </div>
            </div>

            <div className="flex items-center space-x-6 text-slate-400 text-xs">
              <a
                href="https://studio.genlayer.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-orbital-cyan flex items-center gap-1 transition"
              >
                <span>StudioNet Explorer</span>
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

        {/* Modals */}
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
