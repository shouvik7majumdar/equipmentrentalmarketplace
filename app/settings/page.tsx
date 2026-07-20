"use client";

import { useWallet } from "@/hooks/useWallet";
import { useTransactions } from "@/hooks/useTransactions";
import { CONTRACT_ID, REVIEW_REGISTRY_ID, TOKEN_ADDRESS, NETWORK } from "@/lib/stellar";
import {
  Settings,
  Trash2,
  Globe,
  Wallet,
  Clock,
  ExternalLink,
  Shield,
  RefreshCw,
  Sliders,
  Check
} from "lucide-react";
import { useState, useEffect } from "react";

export default function SettingsPage() {
  const { address, isConnected, activeWalletId } = useWallet();
  const { transactions, clearHistory } = useTransactions();
  
  const [copiedContract, setCopiedContract] = useState<string | null>(null);
  const [pollInterval, setPollInterval] = useState<string>("5000");

  useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      const saved = localStorage.getItem("stellar_rental_poll_interval");
      if (saved) {
        setPollInterval(saved);
      }
    }
  }, []);

  const handlePollChange = (val: string) => {
    setPollInterval(val);
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem("stellar_rental_poll_interval", val);
      window.location.reload();
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedContract(id);
    setTimeout(() => setCopiedContract(null), 2000);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 flex-grow w-full flex flex-col justify-start">
      {/* Title */}
      <div className="border-b border-zinc-900 pb-6 mb-8">
        <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
          <Settings className="h-7 w-7 text-indigo-400" />
          Settings & Preferences
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Configure network configurations, wallet sync options, and monitor active smart contract addresses.
        </p>
      </div>

      <div className="space-y-8">
        {/* Section 1: Wallet Config */}
        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/5 p-6 backdrop-blur-sm space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-zinc-900 pb-3">
            <Wallet className="h-5 w-5 text-indigo-400" />
            Wallet Connection Details
          </h3>

          {isConnected ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-1">
                <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold block">Connected Wallet</span>
                <span className="text-white font-bold block capitalize">{activeWalletId || "Freighter"}</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold block">Public Key</span>
                <span className="text-zinc-400 font-mono text-xs block truncate select-all">{address}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500 italic">No wallet currently connected.</p>
          )}
        </div>

        {/* Section 2: Polling Preferences */}
        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/5 p-6 backdrop-blur-sm space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-zinc-900 pb-3">
            <Clock className="h-5 w-5 text-indigo-400" />
            Blockchain Sync Options
          </h3>

          <div className="max-w-md space-y-2">
            <label className="text-xs text-zinc-500 uppercase tracking-wider font-semibold block">
              Auto-Polling Interval (React Query)
            </label>
            <div className="flex gap-2">
              {[
                { label: "5 Seconds", value: "5000" },
                { label: "15 Seconds", value: "15000" },
                { label: "30 Seconds", value: "30000" },
                { label: "Disabled", value: "0" }
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handlePollChange(opt.value)}
                  className={`flex-1 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all duration-200 ${
                    pollInterval === opt.value
                      ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/10"
                      : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-900 hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-zinc-500 leading-relaxed pt-1.5">
              Determines how frequently the frontend requests the latest consensus state from the Stellar Testnet RPC.
            </p>
          </div>
        </div>

        {/* Section 3: Smart Contract Deployments */}
        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/5 p-6 backdrop-blur-sm space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-zinc-900 pb-3">
            <Shield className="h-5 w-5 text-indigo-400" />
            Contract Deployments
          </h3>

          <div className="space-y-4 text-sm">
            {/* Core Contract */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-zinc-950 p-4 rounded-xl border border-zinc-900">
              <div>
                <span className="text-xs text-zinc-500 font-bold block">Rental core Contract ID</span>
                <span className="text-zinc-300 font-mono text-xs break-all block mt-0.5">{CONTRACT_ID || "Not deployed"}</span>
              </div>
              {CONTRACT_ID && (
                <div className="flex gap-2 self-end sm:self-center">
                  <button
                    onClick={() => copyToClipboard(CONTRACT_ID, "core")}
                    className="px-3 py-1.5 rounded-lg border border-zinc-800 text-xs text-zinc-400 hover:text-white hover:bg-zinc-900 font-semibold"
                  >
                    {copiedContract === "core" ? "Copied!" : "Copy"}
                  </button>
                  <a
                    href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-zinc-900 font-semibold"
                  >
                    Explorer
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Reviews Registry */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-zinc-950 p-4 rounded-xl border border-zinc-900">
              <div>
                <span className="text-xs text-zinc-500 font-bold block">Review Registry Contract ID</span>
                <span className="text-zinc-300 font-mono text-xs break-all block mt-0.5">{REVIEW_REGISTRY_ID || "Not deployed"}</span>
              </div>
              {REVIEW_REGISTRY_ID && (
                <div className="flex gap-2 self-end sm:self-center">
                  <button
                    onClick={() => copyToClipboard(REVIEW_REGISTRY_ID, "review")}
                    className="px-3 py-1.5 rounded-lg border border-zinc-800 text-xs text-zinc-400 hover:text-white hover:bg-zinc-900 font-semibold"
                  >
                    {copiedContract === "review" ? "Copied!" : "Copy"}
                  </button>
                  <a
                    href={`https://stellar.expert/explorer/testnet/contract/${REVIEW_REGISTRY_ID}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-zinc-900 font-semibold"
                  >
                    Explorer
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Token */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-zinc-950 p-4 rounded-xl border border-zinc-900">
              <div>
                <span className="text-xs text-zinc-500 font-bold block">Payment Token Address (Native XLM SAC)</span>
                <span className="text-zinc-300 font-mono text-xs break-all block mt-0.5">{TOKEN_ADDRESS}</span>
              </div>
              <div className="flex gap-2 self-end sm:self-center">
                <button
                  onClick={() => copyToClipboard(TOKEN_ADDRESS, "token")}
                  className="px-3 py-1.5 rounded-lg border border-zinc-800 text-xs text-zinc-400 hover:text-white hover:bg-zinc-900 font-semibold"
                >
                  {copiedContract === "token" ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Data Management */}
        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/5 p-6 backdrop-blur-sm space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-zinc-900 pb-3">
            <Trash2 className="h-5 w-5 text-red-500" />
            Data Management
          </h3>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-zinc-300">Clear Transaction History logs</h4>
              <p className="text-xs text-zinc-500 mt-1 max-w-lg leading-relaxed">
                Clears all cached transaction records for this browser session. This will not affect actual blockchain logs or state.
              </p>
            </div>
            <button
              onClick={() => {
                if (confirm("Are you sure you want to clear your local transaction log history?")) {
                  clearHistory();
                  alert("Transaction history logs cleared successfully!");
                }
              }}
              disabled={transactions.length === 0}
              className="rounded-xl border border-red-500/20 bg-red-950/5 hover:bg-red-950/20 text-red-400 disabled:bg-zinc-950 disabled:text-zinc-600 disabled:border-zinc-900 px-5 py-3 text-xs font-bold transition-all duration-200"
            >
              Clear {transactions.length} Cached logs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
