"use client";

import { useWallet, AVAILABLE_WALLETS } from "@/hooks/useWallet";
import { X, Loader2, AlertCircle } from "lucide-react";

export default function WalletModal() {
  const { isModalOpen, setModalOpen, connect, isLoading, error } = useWallet();

  if (!isModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !isLoading && setModalOpen(false)}
      ></div>

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl transition-all duration-300">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-900">
          <h3 className="text-lg font-bold text-white">Select a Stellar Wallet</h3>
          <button
            onClick={() => setModalOpen(false)}
            disabled={isLoading}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-900 hover:text-white transition-all duration-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-red-500/25 bg-red-950/20 p-4 text-sm text-red-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div className="flex flex-col">
              <span className="font-semibold">Connection Error</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Wallet Selection List */}
        <div className="mt-6 flex flex-col gap-3">
          {AVAILABLE_WALLETS.map((wallet) => (
            <button
              key={wallet.id}
              onClick={() => connect(wallet.id)}
              disabled={isLoading}
              className="flex items-center justify-between rounded-xl border border-zinc-900 bg-zinc-900/40 p-4 text-left transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-900/80 disabled:opacity-50"
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl">{wallet.icon}</span>
                <span className="font-semibold text-zinc-200">{wallet.name}</span>
              </div>
              {isLoading && (
                <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
              )}
            </button>
          ))}
          
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-zinc-900"></div>
            <span className="flex-shrink mx-4 text-zinc-600 text-[10px] font-semibold uppercase">Or</span>
            <div className="flex-grow border-t border-zinc-900"></div>
          </div>

          <button
            onClick={() => connect("modal")}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-950/5 hover:bg-indigo-950/15 py-3.5 text-center text-sm font-bold text-indigo-300 hover:text-white transition-all duration-200"
          >
            Launch Built-in Wallet Chooser
          </button>
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center text-xs text-zinc-500">
          First time using Soroban? Make sure to switch your wallet to <span className="text-zinc-400 font-semibold">Testnet</span>.
        </div>
      </div>
    </div>
  );
}
