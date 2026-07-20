"use client";

import { useWallet, AVAILABLE_WALLETS } from "@/hooks/useWallet";
import { NETWORK, RPC_URL, NETWORK_PASSPHRASE } from "@/lib/stellar";
import { Wallet, Globe, Compass, ExternalLink, RefreshCw, Copy, Check } from "lucide-react";
import { useState } from "react";

export default function Dashboard() {
  const {
    address,
    balance,
    isConnected,
    connect,
    disconnect,
    refreshBalance,
    isLoading,
    setModalOpen
  } = useWallet();

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 flex-grow w-full flex flex-col justify-start">
      {/* Title */}
      <div className="border-b border-zinc-900 pb-6 mb-8">
        <h2 className="text-3xl font-extrabold tracking-tight text-white">Wallet Dashboard</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Manage your Stellar account connection, network configuration, and balances.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {/* Left: Account Status Card */}
        <div className="md:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/10 p-6 backdrop-blur-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white mb-4">Account Connection</h3>

            {isConnected && address ? (
              <div className="space-y-6">
                {/* Active Wallet */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-950 border border-zinc-900">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="font-semibold text-sm text-zinc-300">Wallet Connected</span>
                  </div>
                  <button
                    onClick={disconnect}
                    className="text-xs text-red-400 hover:text-red-300 bg-red-950/20 border border-red-500/20 hover:border-red-500/40 px-3 py-1.5 rounded-lg font-bold transition-all duration-200"
                  >
                    Disconnect
                  </button>
                </div>

                {/* Address Box */}
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Stellar Public Address</label>
                  <div className="flex gap-2">
                    <div className="flex-grow font-mono text-xs rounded-xl bg-zinc-950 border border-zinc-900 p-4 text-zinc-300 select-all overflow-x-auto whitespace-nowrap">
                      {address}
                    </div>
                    <button
                      onClick={handleCopy}
                      className="rounded-xl border border-zinc-900 bg-zinc-950 p-4 hover:bg-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-white transition-all duration-200 shrink-0"
                    >
                      {copied ? <Check className="h-4.5 w-4.5 text-green-400" /> : <Copy className="h-4.5 w-4.5" />}
                    </button>
                  </div>
                </div>

                {/* Balances Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl bg-indigo-950/10 border border-indigo-500/10 p-5">
                    <span className="text-zinc-500 text-xs uppercase tracking-wider">XLM Balance</span>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-white">
                        {balance.toLocaleString(undefined, { maximumFractionDigits: 5 })}
                      </span>
                      <span className="text-sm font-semibold text-indigo-400">XLM</span>
                    </div>
                    <p className="mt-2 text-[10px] text-zinc-500 leading-relaxed">
                      Native asset used for paying transaction fees and rental security deposits.
                    </p>
                  </div>
                  
                  {/* Friendbot Faucet Box */}
                  <div className="rounded-xl bg-zinc-950 border border-zinc-900 p-5 flex flex-col justify-between">
                    <div>
                      <span className="text-zinc-500 text-xs uppercase tracking-wider">Testnet Faucet</span>
                      <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                        Need testnet Lumens? Visit the Friendbot tool to request 10,000 XLM for your account.
                      </p>
                    </div>
                    <a
                      href={`https://friendbot.stellar.org/?addr=${address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 flex items-center justify-center gap-1.5 text-xs text-indigo-400 font-bold hover:text-indigo-300 hover:underline"
                    >
                      Request Friendbot XLM
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>

                {/* Refresh Trigger */}
                <button
                  onClick={refreshBalance}
                  className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition-all duration-200"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh Balances
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 mb-6">
                  <Wallet className="h-8 w-8" />
                </div>
                <h4 className="text-base font-bold text-white">Wallet Disconnected</h4>
                <p className="mt-2 text-sm text-zinc-500 max-w-sm">
                  Please connect your Stellar wallet to view balances, list items, and execute smart contract rentals.
                </p>
                <button
                  onClick={() => setModalOpen(true)}
                  className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-all duration-200"
                >
                  Connect Wallet Now
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Network Config Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-6 backdrop-blur-sm">
          <div className="flex items-center gap-2 font-bold text-white mb-6">
            <Globe className="h-5 w-5 text-indigo-400" />
            <h3>Stellar Network Config</h3>
          </div>

          <div className="space-y-6 text-sm">
            <div>
              <span className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Active Network</span>
              <p className="mt-1 font-bold text-white capitalize">{NETWORK}</p>
            </div>

            <div>
              <span className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Horizon URL</span>
              <p className="mt-1 font-mono text-xs text-zinc-300 break-all">https://horizon-testnet.stellar.org</p>
            </div>

            <div>
              <span className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Soroban RPC URL</span>
              <p className="mt-1 font-mono text-xs text-zinc-300 break-all">{RPC_URL}</p>
            </div>

            <div>
              <span className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Network Passphrase</span>
              <p className="mt-1 font-mono text-xs text-zinc-300 break-words">{NETWORK_PASSPHRASE}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
