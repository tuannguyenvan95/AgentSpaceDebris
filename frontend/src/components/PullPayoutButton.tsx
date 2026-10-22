import React, { useState, useEffect } from 'react';
import {
  getSavedContractAddress,
  readContract,
  encodeCalldata,
  waitForTransactionReceipt,
} from '../config/genlayer';
import { formatGen } from '../utils/formatters';
import { DownloadCloud, Loader2, CheckCircle2 } from 'lucide-react';

interface PullPayoutButtonProps {
  account: string;
  onSuccess?: () => void;
}

export const PullPayoutButton: React.FC<PullPayoutButtonProps> = ({ account, onSuccess }) => {
  const [claimableWei, setClaimableWei] = useState<string>('0');
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (account) {
      loadClaimable();
    } else {
      setClaimableWei('0');
    }
  }, [account]);

  const loadClaimable = async () => {
    if (!account) return;
    try {
      const res = await readContract('get_claimable_balance', [account]);
      setClaimableWei(String(res || '0'));
    } catch (err) {
      console.warn('Error reading claimable balance:', err);
    }
  };

  const handleClaim = async () => {
    if (!account || BigInt(claimableWei) <= 0n) return;
    setLoading(true);
    setSuccess(false);
    try {
      const contractAddress = getSavedContractAddress();
      const calldata = encodeCalldata('claim_payout', []);

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

      console.log('Submitted claim_payout tx:', txHash);
      await waitForTransactionReceipt(txHash);

      setSuccess(true);
      await loadClaimable();
      if (onSuccess) onSuccess();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Claim payout error:', err);
    } finally {
      setLoading(false);
    }
  };

  const hasClaimable = BigInt(claimableWei) > 0n;

  if (!hasClaimable && !success) return null;

  return (
    <button
      onClick={handleClaim}
      disabled={loading || !hasClaimable}
      className="flex items-center space-x-2 px-3.5 py-1.5 bg-deorbit-green/20 hover:bg-deorbit-green/30 text-deorbit-green border border-deorbit-green/40 rounded-lg font-mono text-xs font-semibold shadow-deorbit-glow transition disabled:opacity-50"
    >
      {loading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Withdrawing...</span>
        </>
      ) : success ? (
        <>
          <CheckCircle2 className="w-3.5 h-3.5 text-deorbit-green" />
          <span>Claimed!</span>
        </>
      ) : (
        <>
          <DownloadCloud className="w-3.5 h-3.5" />
          <span>Claim Buffered Payout ({formatGen(claimableWei)} GEN)</span>
        </>
      )}
    </button>
  );
};
