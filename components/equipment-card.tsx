"use client";

import { useState } from "react";
import { fromStroops } from "@/lib/stellar";
import { User, ShieldCheck, Clock, CalendarRange, RotateCcw, Hammer } from "lucide-react";

export interface Equipment {
  id: number;
  owner: string;
  title: string;
  description: string;
  price_per_day: bigint | string;
  deposit: bigint | string;
  status: number; // 0: Available, 1: Rented, 2: Returned
  renter: string | null;
  rental_days: number;
  rent_start_time: bigint | number;
}

interface EquipmentCardProps {
  item: Equipment;
  currentUser: string | null;
  onRent: (id: number, days: number) => Promise<void>;
  onReturn: (id: number) => Promise<void>;
  onResolve: (id: number, refund: number, claim: number) => Promise<void>;
  actionLoadingId: number | null;
}

export default function EquipmentCard({
  item,
  currentUser,
  onRent,
  onReturn,
  onResolve,
  actionLoadingId
}: EquipmentCardProps) {
  const [days, setDays] = useState(1);
  const [refundClaimMode, setRefundClaimMode] = useState(false);
  const [claimAmount, setClaimAmount] = useState(0);

  const priceXlm = fromStroops(item.price_per_day);
  const depositXlm = fromStroops(item.deposit);
  const isOwner = currentUser === item.owner;
  const isRenter = currentUser === item.renter;
  const isActionLoading = actionLoadingId === item.id;

  const handleRent = () => {
    onRent(item.id, days);
  };

  const handleReturn = () => {
    onReturn(item.id);
  };

  const handleResolveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (claimAmount > depositXlm) {
      alert("Claim amount cannot exceed original security deposit!");
      return;
    }
    const refundAmount = depositXlm - claimAmount;
    onResolve(item.id, refundAmount, claimAmount);
    setRefundClaimMode(false);
  };

  // Status badges
  const renderStatusBadge = () => {
    switch (item.status) {
      case 0:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-semibold text-green-400 border border-green-500/20">
            Available
          </span>
        );
      case 1:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-semibold text-yellow-400 border border-yellow-500/20">
            Rented
          </span>
        );
      case 2:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
            Returned (Inspecting)
          </span>
        );
      default:
        return null;
    }
  };

  const formatShortAddress = (addr: string | null) => {
    if (!addr) return "";
    return `${addr.substring(0, 5)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <div className="flex flex-col h-full rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 hover:border-zinc-700 transition-all duration-300 shadow-md">
      {/* Title & Status */}
      <div className="flex items-start justify-between gap-4">
        <h4 className="text-lg font-bold text-white tracking-tight">{item.title}</h4>
        {renderStatusBadge()}
      </div>

      {/* Description */}
      <p className="mt-3 text-sm text-zinc-400 flex-grow leading-relaxed">
        {item.description}
      </p>

      {/* Stats Grid */}
      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-b border-zinc-800 py-4 text-sm">
        <div>
          <span className="text-zinc-500 text-xs uppercase tracking-wider">Rate</span>
          <p className="mt-1 font-bold text-white text-base">
            {priceXlm} <span className="text-zinc-400 font-normal text-xs">XLM/day</span>
          </p>
        </div>
        <div>
          <span className="text-zinc-500 text-xs uppercase tracking-wider">Security Deposit</span>
          <p className="mt-1 font-bold text-white text-base">
            {depositXlm} <span className="text-zinc-400 font-normal text-xs">XLM</span>
          </p>
        </div>
      </div>

      {/* Rental Info if Rented */}
      {(item.status === 1 || item.status === 2) && (
        <div className="mt-4 rounded-lg bg-zinc-900/50 border border-zinc-800/80 p-3 text-xs flex flex-col gap-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3 text-zinc-500" />
              Renter:
            </span>
            <span className="font-mono text-zinc-200">{formatShortAddress(item.renter)}</span>
          </div>
          <div className="flex items-center justify-between text-zinc-400">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-zinc-500" />
              Duration:
            </span>
            <span className="text-zinc-200 font-semibold">{item.rental_days} days</span>
          </div>
        </div>
      )}

      {/* Owner tag */}
      <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
        <span className="flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-zinc-600" />
          Owner: {formatShortAddress(item.owner)} {isOwner && <span className="text-indigo-400">(You)</span>}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="mt-6">
        {/* Available State */}
        {item.status === 0 && (
          <div className="flex flex-col gap-3">
            {isOwner ? (
              <button
                disabled
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 py-3 text-center text-sm font-semibold text-zinc-500 cursor-not-allowed"
              >
                Your listed equipment
              </button>
            ) : (
              <div className="flex gap-2">
                <div className="flex items-center rounded-xl bg-zinc-900 border border-zinc-800 px-3">
                  <input
                    type="number"
                    min="1"
                    value={days}
                    onChange={(e) => setDays(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-12 bg-transparent text-center text-sm font-bold text-white focus:outline-none"
                  />
                  <span className="text-zinc-500 text-xs pr-1 font-semibold">days</span>
                </div>
                <button
                  onClick={handleRent}
                  disabled={!currentUser || isActionLoading}
                  className="flex-1 rounded-xl bg-indigo-600 py-3 text-center text-sm font-bold text-white hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 transition-all duration-200 shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2"
                >
                  {isActionLoading && <LoaderSpinner />}
                  Rent Now
                </button>
              </div>
            )}
            {!currentUser && (
              <p className="text-center text-[11px] text-zinc-500">Connect wallet to rent equipment</p>
            )}
          </div>
        )}

        {/* Rented State */}
        {item.status === 1 && (
          <div>
            {isRenter ? (
              <button
                onClick={handleReturn}
                disabled={isActionLoading}
                className="w-full rounded-xl bg-indigo-900/50 border border-indigo-500/30 hover:border-indigo-500/60 py-3 text-center text-sm font-bold text-indigo-300 hover:text-white transition-all duration-200 flex items-center justify-center gap-2"
              >
                {isActionLoading && <LoaderSpinner />}
                <RotateCcw className="h-4 w-4" />
                Return Equipment
              </button>
            ) : (
              <button
                disabled
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 py-3 text-center text-sm font-semibold text-zinc-500 cursor-not-allowed"
              >
                Currently rented
              </button>
            )}
          </div>
        )}

        {/* Returned State */}
        {item.status === 2 && (
          <div>
            {isOwner ? (
              refundClaimMode ? (
                <form onSubmit={handleResolveSubmit} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] text-zinc-500 font-semibold uppercase">Damages Claim (XLM)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max={depositXlm}
                      value={claimAmount}
                      onChange={(e) => setClaimAmount(Math.min(depositXlm, Math.max(0, parseFloat(e.target.value) || 0)))}
                      className="rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-700"
                    />
                    <p className="text-[10px] text-zinc-500">
                      Renter will receive: {(depositXlm - claimAmount).toFixed(2)} XLM refund
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setRefundClaimMode(false)}
                      className="flex-1 rounded-lg border border-zinc-800 py-2 text-xs font-semibold text-zinc-400 hover:bg-zinc-900"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isActionLoading}
                      className="flex-1 rounded-lg bg-indigo-600 py-2 text-xs font-bold text-white hover:bg-indigo-500 flex items-center justify-center gap-1"
                    >
                      {isActionLoading && <LoaderSpinner />}
                      Confirm Payout
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setRefundClaimMode(true)}
                  disabled={isActionLoading}
                  className="w-full rounded-xl bg-green-950/30 border border-green-500/30 hover:border-green-500/60 py-3 text-center text-sm font-bold text-green-400 hover:text-white transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {isActionLoading && <LoaderSpinner />}
                  <Hammer className="h-4 w-4" />
                  Inspect & Resolve
                </button>
              )
            ) : (
              <button
                disabled
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 py-3 text-center text-sm font-semibold text-zinc-500 cursor-not-allowed"
              >
                Awaiting owner inspection
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LoaderSpinner() {
  return (
    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
