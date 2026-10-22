import React, { useState, useEffect } from 'react';
import {
  STUDIONET_CHAIN_ID,
  STUDIONET_CHAIN_ID_HEX,
  STUDIONET_RPC_URL,
  STUDIO_URL,
  DEFAULT_CONTRACT_ADDRESS,
  getSavedContractAddress,
  saveContractAddress,
  fetchStudionetBalance,
} from '../config/genlayer';
import { shortenAddress } from '../utils/formatters';
import {
  Satellite,
  Radio,
  Wallet,
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
  Shield,
  Layers,
  Settings,
} from 'lucide-react';

interface NavbarProps {
  account: string;
  onConnect: () => void;
  onDisconnect: () => void;
  onContractAddressChange?: (newAddr: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  account,
  onConnect,
  onDisconnect,
  onContractAddressChange,
}) => {
  const [balance, setBalance] = useState<string>('0.0000');
  const [copied, setCopied] = useState<boolean>(false);
  const [isWrongNetwork, setIsWrongNetwork] = useState<boolean>(false);
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [customContract, setCustomContract] = useState<string>(getSavedContractAddress());
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (account) {
      loadBalance();
      checkNetwork();
    }
  }, [account]);

  const loadBalance = async () => {
    if (!account) return;
    const bal = await fetchStudionetBalance(account);
    setBalance(bal);
  };

  const checkNetwork = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const currentChainId = await (window as any).ethereum.request({ method: 'eth_chainId' });
        setIsWrongNetwork(
          currentChainId.toLowerCase() !== STUDIONET_CHAIN_ID_HEX.toLowerCase()
        );
      } catch (err) {
        console.warn('Network check error:', err);
      }
    }
  };

  const switchNetwork = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) return;
    try {
      await (window as any).ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: STUDIONET_CHAIN_ID_HEX }],
      });
      setIsWrongNetwork(false);
      loadBalance();
    } catch (switchError: any) {
      if (switchError.code === 4902 || switchError.message?.includes('unrecognized')) {
        try {
          await (window as any).ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: STUDIONET_CHAIN_ID_HEX,
                chainName: 'GenLayer StudioNet',
                nativeCurrency: {
                  name: 'GEN',
                  symbol: 'GEN',
                  decimals: 18,
                },
                rpcUrls: [STUDIONET_RPC_URL],
                blockExplorerUrls: [STUDIO_URL],
              },
            ],
          });
          setIsWrongNetwork(false);
          loadBalance();
        } catch (addError) {
          console.error('Failed to add GenLayer network:', addError);
        }
      }
    }
  };

  const copyAddress = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveContract = () => {
    saveContractAddress(customContract);
    setSavedSuccess(true);
    if (onContractAddressChange) {
      onContractAddressChange(customContract);
    }
    setTimeout(() => {
      setSavedSuccess(false);
      setShowConfig(false);
    }, 1200);
  };

  const handleResetContract = () => {
    setCustomContract(DEFAULT_CONTRACT_ADDRESS);
    saveContractAddress(DEFAULT_CONTRACT_ADDRESS);
    setSavedSuccess(true);
    if (onContractAddressChange) {
      onContractAddressChange(DEFAULT_CONTRACT_ADDRESS);
    }
    setTimeout(() => {
      setSavedSuccess(false);
      setShowConfig(false);
    }, 1200);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-space-750 bg-space-950/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo Branding */}
          <div className="flex items-center space-x-3">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-space-800 border border-orbital-cyan/30 shadow-orbital-glow overflow-hidden">
              <Satellite className="w-6 h-6 text-orbital-cyan animate-pulse" />
              <div className="absolute inset-0 bg-gradient-to-tr from-orbital-cyan/10 to-transparent pointer-events-none" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-heading font-bold text-xl tracking-tight text-white">
                  AgentSpaceDebris
                </span>
                <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-orbital-cyan/15 text-orbital-cyan rounded border border-orbital-cyan/30">
                  LEO SURVEILLANCE
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-deorbit-green animate-pulse" />
                Autonomous Collision Avoidance & Active Removal Escrow
              </p>
            </div>
          </div>

          {/* Network and Actions */}
          <div className="flex items-center space-x-3">
            {/* Network Badge */}
            <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-space-850 border border-space-700 text-xs font-mono">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orbital-cyan opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orbital-cyan"></span>
              </span>
              <span className="text-slate-300">StudioNet</span>
              <span className="text-slate-500">·</span>
              <span className="text-orbital-cyan font-bold">61999</span>
            </div>

            {/* Wrong Network Warning */}
            {account && isWrongNetwork && (
              <button
                onClick={switchNetwork}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-threat-crimson/20 text-threat-crimson border border-threat-crimson/40 rounded-lg hover:bg-threat-crimson/30 transition-all shadow-threat-glow"
              >
                <span>Switch to StudioNet (0xF22F)</span>
              </button>
            )}

            {/* Contract Config Button */}
            <button
              onClick={() => setShowConfig(!showConfig)}
              title="Contract Deployment Configuration"
              className="p-2 rounded-lg bg-space-850 hover:bg-space-800 text-slate-400 hover:text-orbital-cyan border border-space-700 transition"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Wallet Button */}
            {account ? (
              <div className="flex items-center space-x-2">
                <div className="hidden sm:flex flex-col items-end px-3 py-1 rounded-lg bg-space-850 border border-space-700 font-mono text-xs">
                  <span className="text-slate-400 text-[10px]">BALANCE</span>
                  <span className="text-orbital-cyan font-semibold">{balance} GEN</span>
                </div>
                <div className="flex items-center space-x-1.5 px-3 py-2 bg-space-800 border border-orbital-cyan/30 rounded-lg text-xs font-mono">
                  <span className="w-2 h-2 rounded-full bg-deorbit-green" />
                  <span className="text-slate-200">{shortenAddress(account)}</span>
                  <button
                    onClick={() => copyAddress(account)}
                    className="p-1 hover:text-orbital-cyan transition"
                    title="Copy Address"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-deorbit-green" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>
                </div>
                <button
                  onClick={onDisconnect}
                  className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-threat-crimson bg-space-850 hover:bg-threat-crimson/10 border border-space-700 hover:border-threat-crimson/30 rounded-lg transition"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={onConnect}
                className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-orbital-cyan to-blue-600 text-space-950 font-bold text-xs rounded-lg hover:brightness-110 shadow-orbital-glow transition"
              >
                <Wallet className="w-4 h-4" />
                <span>Connect Satellite Operator</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contract Config Drawer / Modal */}
      {showConfig && (
        <div className="border-t border-space-750 bg-space-900/95 px-4 py-3 text-xs font-mono">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-2 w-full md:w-auto">
              <Shield className="w-4 h-4 text-orbital-cyan shrink-0" />
              <span className="text-slate-400">Deployed Contract:</span>
              <input
                type="text"
                value={customContract}
                onChange={(e) => setCustomContract(e.target.value)}
                className="w-full md:w-96 px-2.5 py-1 bg-space-950 border border-space-700 rounded text-slate-200 font-mono focus:border-orbital-cyan focus:outline-none"
                placeholder="0x..."
              />
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={handleSaveContract}
                className="px-3 py-1 bg-orbital-cyan text-space-950 font-bold rounded hover:brightness-110 transition"
              >
                {savedSuccess ? 'Saved!' : 'Apply'}
              </button>
              <button
                onClick={handleResetContract}
                className="px-3 py-1 bg-space-800 text-slate-300 hover:text-white rounded border border-space-700 transition"
              >
                Reset Default
              </button>
              <a
                href={`${STUDIO_URL}/address/${customContract}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1 px-3 py-1 bg-space-800 text-slate-300 hover:text-orbital-cyan rounded border border-space-700 transition"
              >
                <span>Explorer</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
