"use client";

import { useTransactions } from "@/hooks/useTransactions";
import { Clock, CheckCircle2, XCircle, Trash2, ExternalLink, History } from "lucide-react";

export default function TransactionHistory() {
  const { transactions, clearHistory } = useTransactions();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-500 animate-pulse" />;
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/10 text-yellow-400 border border-yellow-500/25";
      case "success":
        return "bg-green-500/10 text-green-400 border border-green-500/25";
      case "failed":
        return "bg-red-500/10 text-red-400 border border-red-500/25";
      default:
        return "bg-zinc-800 text-zinc-400 border border-zinc-700";
    }
  };

  const formatShortHash = (hash: string) => {
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 flex-grow w-full flex flex-col justify-start">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-zinc-900 pb-6 mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            Transaction History
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Monitor status logs for your recent Stellar smart contract transactions.
          </p>
        </div>

        {transactions.length > 0 && (
          <button
            onClick={clearHistory}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/10 px-4 py-2.5 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-zinc-900 hover:border-zinc-700 transition-all duration-200 shrink-0"
          >
            <Trash2 className="h-4 w-4" />
            Clear Log
          </button>
        )}
      </div>

      {/* Transaction List */}
      {transactions.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-16 text-center">
          <History className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white">No Transactions Tracked</h3>
          <p className="mt-2 text-sm text-zinc-500 max-w-sm mx-auto">
            You haven't initiated any contract operations yet in this session. Go to the Marketplace to make listings or rent items.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {transactions.map((tx) => (
            <div
              key={tx.hash}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/10 p-5 hover:border-zinc-700 transition-all duration-200"
            >
              {/* Left: Status Icon & Details */}
              <div className="flex items-start gap-4">
                <div className="mt-0.5 shrink-0">{getStatusIcon(tx.status)}</div>
                <div className="space-y-1">
                  <h4 className="font-semibold text-white text-sm leading-none">{tx.description}</h4>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                    <span className="font-mono text-[11px] text-zinc-400">
                      Hash: {formatShortHash(tx.hash)}
                    </span>
                    <span>•</span>
                    <span>{new Date(tx.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Right: Explorer Link & Status Badge */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 border-zinc-900 pt-3 sm:pt-0 shrink-0">
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeClass(tx.status)}`}>
                  {tx.status}
                </span>
                <a
                  href={tx.explorerLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-indigo-400 font-bold hover:text-indigo-300 hover:underline mt-1"
                >
                  View Details
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
