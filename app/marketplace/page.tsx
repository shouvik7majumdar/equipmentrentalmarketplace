"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/hooks/useWallet";
import { useTransactions } from "@/hooks/useTransactions";
import {
  getAllEquipment,
  prepareInvokeTransaction,
  submitSignedTransaction,
  toStroops,
  getXlmBalance
} from "@/lib/stellar";
import { nativeToScVal } from "@stellar/stellar-sdk";
import EquipmentCard, { Equipment } from "@/components/equipment-card";
import { PlusCircle, Loader2, AlertTriangle, Compass, Hammer } from "lucide-react";

export default function Marketplace() {
  const { address, isConnected, signTransaction, refreshBalance, setModalOpen } = useWallet();
  const { addTransaction, updateTransactionStatus } = useTransactions();

  // Loading state for writes
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // List Form state
  const [showListForm, setShowListForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pricePerDay, setPricePerDay] = useState("");
  const [deposit, setDeposit] = useState("");
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // React Query fetch for marketplace items
  const { data: items = [], isLoading, error: fetchError } = useQuery({
    queryKey: ["marketplace_equipment"],
    queryFn: getAllEquipment,
    refetchInterval: 5000, // Refreshes every 5s automatically!
  });

  const handleListSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    setListLoading(true);
    setListError(null);

    const priceStroops = toStroops(parseFloat(pricePerDay) || 0);
    const depositStroops = toStroops(parseFloat(deposit) || 0);

    try {
      // 1. Build & prepare transaction
      const tx = await prepareInvokeTransaction(address, "list_equipment", [
        nativeToScVal(address, { type: "address" }),
        nativeToScVal(title, { type: "string" }),
        nativeToScVal(description, { type: "string" }),
        nativeToScVal(priceStroops.toString(), { type: "i128" }),
        nativeToScVal(depositStroops.toString(), { type: "i128" }),
      ]);

      // 2. Sign transaction XDR
      const txXdr = tx.toXDR();
      const signedXdr = await signTransaction(txXdr);

      // 3. Submit and wait for consensus
      const txObj = await submitSignedTransaction(signedXdr);

      // Log success in tx history
      addTransaction(txObj.hash, `Listed new equipment "${title}"`, "success");

      // Reset state
      setTitle("");
      setDescription("");
      setPricePerDay("");
      setDeposit("");
      setShowListForm(false);
      refreshBalance();
    } catch (err: any) {
      console.error(err);
      setListError(err.message || "Listing failed. Please check inputs and balance.");
    } finally {
      setListLoading(false);
    }
  };

  // Rent Equipment action
  const handleRent = async (id: number, days: number) => {
    if (!address) {
      setModalOpen(true);
      return;
    }
    setActionLoadingId(id);
    const item = items.find((x) => x.id === id);
    const totalCost = (parseFloat(item.price_per_day.toString()) / 10000000) * days + (parseFloat(item.deposit.toString()) / 10000000);

    // Check balance first
    const balance = await getXlmBalance(address);
    if (balance < totalCost) {
      alert(`Insufficient balance! Total required: ${totalCost} XLM (Rent + Deposit), but you only have ${balance.toFixed(2)} XLM.`);
      setActionLoadingId(null);
      return;
    }

    try {
      const tx = await prepareInvokeTransaction(address, "rent_equipment", [
        nativeToScVal(address, { type: "address" }),
        nativeToScVal(id, { type: "u32" }),
        nativeToScVal(days, { type: "u32" }),
      ]);

      const signedXdr = await signTransaction(tx.toXDR());
      // Log pending state
      const simulatedHash = tx.hash().toString("hex");
      addTransaction(simulatedHash, `Rent equipment "${item.title}" for ${days} days`, "pending");

      const txResult = await submitSignedTransaction(signedXdr);
      updateTransactionStatus(txResult.hash, "success");
      refreshBalance();
    } catch (err: any) {
      console.error(err);
      alert(`Rent Transaction Failed: ${err.message || err}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Return Equipment action
  const handleReturn = async (id: number) => {
    if (!address) return;
    setActionLoadingId(id);
    const item = items.find((x) => x.id === id);

    try {
      const tx = await prepareInvokeTransaction(address, "return_equipment", [
        nativeToScVal(address, { type: "address" }),
        nativeToScVal(id, { type: "u32" }),
      ]);

      const signedXdr = await signTransaction(tx.toXDR());
      const simulatedHash = tx.hash().toString("hex");
      addTransaction(simulatedHash, `Return equipment "${item.title}"`, "pending");

      const txResult = await submitSignedTransaction(signedXdr);
      updateTransactionStatus(txResult.hash, "success");
      refreshBalance();
    } catch (err: any) {
      console.error(err);
      alert(`Return Transaction Failed: ${err.message || err}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Resolve Rental action
  const handleResolve = async (id: number, refundAmount: number, claimAmount: number) => {
    if (!address) return;
    setActionLoadingId(id);
    const item = items.find((x) => x.id === id);

    const refundStroops = toStroops(refundAmount);
    const claimStroops = toStroops(claimAmount);

    try {
      const tx = await prepareInvokeTransaction(address, "resolve_rental", [
        nativeToScVal(address, { type: "address" }),
        nativeToScVal(id, { type: "u32" }),
        nativeToScVal(refundStroops.toString(), { type: "i128" }),
        nativeToScVal(claimStroops.toString(), { type: "i128" }),
      ]);

      const signedXdr = await signTransaction(tx.toXDR());
      const simulatedHash = tx.hash().toString("hex");
      addTransaction(simulatedHash, `Resolve rental for "${item.title}" (Claim: ${claimAmount} XLM)`, "pending");

      const txResult = await submitSignedTransaction(signedXdr);
      updateTransactionStatus(txResult.hash, "success");
      refreshBalance();
    } catch (err: any) {
      console.error(err);
      alert(`Resolve Transaction Failed: ${err.message || err}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 flex-grow w-full flex flex-col justify-start">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-zinc-900 pb-6 mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            Rental Marketplace
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Browse listed tools, create new listings, and manage active rental agreements.
          </p>
        </div>

        {isConnected ? (
          <button
            onClick={() => setShowListForm(!showListForm)}
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-600/10 hover:bg-indigo-500 transition-all duration-200 shrink-0"
          >
            <PlusCircle className="h-4.5 w-4.5" />
            {showListForm ? "Close Listing Form" : "List New Equipment"}
          </button>
        ) : (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-zinc-800 border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-700 hover:text-white transition-all duration-200 shrink-0"
          >
            Connect Wallet to List Items
          </button>
        )}
      </div>

      {/* List Equipment Form overlay/drawer */}
      {showListForm && (
        <div className="mb-10 rounded-2xl border border-zinc-800 bg-zinc-900/10 p-6 backdrop-blur-sm">
          <h3 className="text-lg font-bold text-white mb-4">List New Equipment</h3>
          {listError && (
            <div className="mb-4 rounded-lg bg-red-950/20 border border-red-500/25 p-4 text-sm text-red-400">
              {listError}
            </div>
          )}
          <form onSubmit={handleListSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Title</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Heavy Duty Concrete Saw"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="rounded-xl bg-zinc-950 border border-zinc-900 px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Daily Rate (XLM)</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 10.50"
                  value={pricePerDay}
                  onChange={(e) => setPricePerDay(e.target.value)}
                  className="rounded-xl bg-zinc-950 border border-zinc-900 px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Description</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe the condition, specifications, and pickup details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="rounded-xl bg-zinc-950 border border-zinc-900 px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700 resize-none"
                />
              </div>

              <div className="flex flex-col gap-1.5 justify-between">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Security Deposit (XLM)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 50"
                    value={deposit}
                    onChange={(e) => setDeposit(e.target.value)}
                    className="rounded-xl bg-zinc-950 border border-zinc-900 px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700"
                  />
                </div>
                <button
                  type="submit"
                  disabled={listLoading}
                  className="w-full mt-4 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 transition-all duration-200"
                >
                  {listLoading && <Loader2 className="h-4.5 w-4.5 animate-spin" />}
                  Submit Listing
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Grid of Equipment */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((n) => (
            <div key={n} className="animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/10 p-6 h-[320px]">
              <div className="flex justify-between items-center mb-6">
                <div className="h-6 w-32 bg-zinc-800 rounded-md"></div>
                <div className="h-5 w-16 bg-zinc-800 rounded-full"></div>
              </div>
              <div className="h-4 w-full bg-zinc-800 rounded-md mb-3"></div>
              <div className="h-4 w-3/4 bg-zinc-800 rounded-md mb-8"></div>
              <div className="grid grid-cols-2 gap-4 border-t border-b border-zinc-800 py-4 mb-6">
                <div className="h-10 bg-zinc-800 rounded-md"></div>
                <div className="h-10 bg-zinc-800 rounded-md"></div>
              </div>
              <div className="h-10 bg-zinc-800 rounded-xl"></div>
            </div>
          ))}
        </div>
      ) : fetchError ? (
        <div className="rounded-2xl border border-red-500/25 bg-red-950/20 p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white">Connection Error</h3>
          <p className="mt-2 text-sm text-zinc-400 max-w-md mx-auto">
            Failed to connect to the Stellar Soroban RPC node. Check your internet connection or verify the testnet contract configuration.
          </p>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-16 text-center">
          <Compass className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white">No Equipment Listed</h3>
          <p className="mt-2 text-sm text-zinc-500 max-w-sm mx-auto">
            There are currently no assets listed for rent. Click "List New Equipment" above to add the first item.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((item: any) => (
            <EquipmentCard
              key={item.id}
              item={{
                id: item.id,
                owner: item.owner,
                title: item.title,
                description: item.description,
                price_per_day: item.price_per_day,
                deposit: item.deposit,
                status: item.status,
                renter: item.renter,
                rental_days: item.rental_days,
                rent_start_time: item.rent_start_time
              }}
              currentUser={address}
              onRent={handleRent}
              onReturn={handleReturn}
              onResolve={handleResolve}
              actionLoadingId={actionLoadingId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
