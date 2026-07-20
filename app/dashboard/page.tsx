"use client";

import { useWallet } from "@/hooks/useWallet";
import { useTransactions } from "@/hooks/useTransactions";
import {
  NETWORK,
  RPC_URL,
  NETWORK_PASSPHRASE,
  getAllEquipment,
  getAllCompletedRentals,
  getUserReputation,
  getReview,
  prepareInvokeTransaction,
  submitSignedTransaction,
  toStroops,
  getXlmBalance,
  REVIEW_REGISTRY_ID,
  CONTRACT_ID
} from "@/lib/stellar";
import { nativeToScVal } from "@stellar/stellar-sdk";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Wallet,
  Globe,
  Compass,
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
  RotateCcw,
  Hammer,
  Star,
  MessageSquare,
  History,
  TrendingUp,
  AlertTriangle,
  UserCheck,
  UserX,
  ListFilter,
  ArrowUpRight,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Sparkles
} from "lucide-react";
import { useState } from "react";

export default function Dashboard() {
  const {
    address,
    balance,
    isConnected,
    disconnect,
    refreshBalance,
    isLoading: isWalletLoading,
    signTransaction,
    setModalOpen
  } = useWallet();

  const { addTransaction, updateTransactionStatus } = useTransactions();
  const queryClient = useQueryClient();

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"renter" | "owner" | "completed" | "config">("renter");

  // Review Dialog States
  const [reviewRentalId, setReviewRentalId] = useState<number | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Resolve Dialog States
  const [resolveRentalId, setResolveRentalId] = useState<number | null>(null);
  const [resolveItemDeposit, setResolveItemDeposit] = useState<number>(0);
  const [damagesClaim, setDamagesClaim] = useState<string>("0");
  const [resolveLoading, setResolveLoading] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  // Copy helper
  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Queries
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["all_equipment"],
    queryFn: getAllEquipment,
    enabled: isConnected && !!address
  });

  const { data: completedRentals = [], isLoading: completedLoading } = useQuery({
    queryKey: ["all_completed_rentals"],
    queryFn: getAllCompletedRentals,
    enabled: isConnected && !!address
  });

  const { data: reputation, isLoading: reputationLoading } = useQuery({
    queryKey: ["user_reputation", address],
    queryFn: () => getUserReputation(address!),
    enabled: isConnected && !!address
  });

  // Fetch reviews for completed deals
  const { data: reviews = {} } = useQuery({
    queryKey: ["completed_reviews", completedRentals, address],
    queryFn: async () => {
      if (!address || completedRentals.length === 0) return {};
      const res: Record<string, any> = {};
      for (const deal of completedRentals) {
        if (deal.reviewed_by_renter && deal.renter === address) {
          const rev = await getReview(deal.rental_id, deal.renter);
          if (rev) res[`${deal.rental_id}_renter`] = rev;
        }
        if (deal.reviewed_by_owner && deal.owner === address) {
          const rev = await getReview(deal.rental_id, deal.owner);
          if (rev) res[`${deal.rental_id}_owner`] = rev;
        }
      }
      return res;
    },
    enabled: isConnected && !!address && completedRentals.length > 0
  });

  // Action: Return Equipment
  const [returningId, setReturningId] = useState<number | null>(null);
  const handleReturn = async (id: number, title: string) => {
    if (!address) return;
    setReturningId(id);
    try {
      const tx = await prepareInvokeTransaction(address, "return_equipment", [
        nativeToScVal(address, { type: "address" }),
        nativeToScVal(id, { type: "u32" }),
      ]);

      const signedXdr = await signTransaction(tx.toXDR());
      const simHash = tx.hash().toString("hex");
      addTransaction(simHash, `Return equipment "${title}"`, "pending");

      const txResult = await submitSignedTransaction(signedXdr);
      updateTransactionStatus(txResult.hash, "success");
      addTransaction(txResult.hash, `Returned equipment "${title}" successfully`, "success");
      
      queryClient.invalidateQueries({ queryKey: ["all_equipment"] });
      refreshBalance();
    } catch (err: any) {
      console.error(err);
      alert(`Return failed: ${err.message || err}`);
    } finally {
      setReturningId(null);
    }
  };

  // Action: Resolve Rental (Claim damages, refund deposit)
  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || resolveRentalId === null) return;
    setResolveLoading(true);
    setResolveError(null);

    const claim = parseFloat(damagesClaim) || 0;
    if (claim > resolveItemDeposit) {
      setResolveError(`Claim amount cannot exceed original deposit of ${resolveItemDeposit} XLM`);
      setResolveLoading(false);
      return;
    }

    const refund = resolveItemDeposit - claim;
    const refundStroops = toStroops(refund);
    const claimStroops = toStroops(claim);
    const item = items.find((x) => x.id === resolveRentalId);

    try {
      const tx = await prepareInvokeTransaction(address, "resolve_rental", [
        nativeToScVal(address, { type: "address" }),
        nativeToScVal(resolveRentalId, { type: "u32" }),
        nativeToScVal(refundStroops.toString(), { type: "i128" }),
        nativeToScVal(claimStroops.toString(), { type: "i128" }),
      ]);

      const signedXdr = await signTransaction(tx.toXDR());
      const simHash = tx.hash().toString("hex");
      addTransaction(simHash, `Resolve rental for "${item?.title || resolveRentalId}"`, "pending");

      const txResult = await submitSignedTransaction(signedXdr);
      updateTransactionStatus(txResult.hash, "success");
      
      queryClient.invalidateQueries({ queryKey: ["all_equipment"] });
      queryClient.invalidateQueries({ queryKey: ["all_completed_rentals"] });
      refreshBalance();
      setResolveRentalId(null);
      setDamagesClaim("0");
    } catch (err: any) {
      console.error(err);
      setResolveError(err.message || "Failed to resolve rental. Check balances and try again.");
    } finally {
      setResolveLoading(false);
    }
  };

  // Action: Submit Review
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || reviewRentalId === null) return;
    setReviewLoading(true);
    setReviewError(null);

    try {
      const tx = await prepareInvokeTransaction(
        address,
        "submit_review",
        [
          nativeToScVal(address, { type: "address" }),
          nativeToScVal(reviewRentalId, { type: "u32" }),
          nativeToScVal(reviewRating, { type: "u32" }),
          nativeToScVal(reviewComment, { type: "string" }),
        ],
        REVIEW_REGISTRY_ID
      );

      const signedXdr = await signTransaction(tx.toXDR());
      const simHash = tx.hash().toString("hex");
      addTransaction(simHash, `Submit ${reviewRating}-star review`, "pending");

      const txResult = await submitSignedTransaction(signedXdr);
      updateTransactionStatus(txResult.hash, "success");

      queryClient.invalidateQueries({ queryKey: ["all_completed_rentals"] });
      queryClient.invalidateQueries({ queryKey: ["completed_reviews"] });
      queryClient.invalidateQueries({ queryKey: ["user_reputation"] });
      
      setReviewRentalId(null);
      setReviewComment("");
      setReviewRating(5);
    } catch (err: any) {
      console.error(err);
      setReviewError(err.message || "Failed to submit review. Try again.");
    } finally {
      setReviewLoading(false);
    }
  };

  // Filters
  const renterItems = items.filter((x) => x.renter === address && (x.status === 1 || x.status === 2));
  const ownerItems = items.filter((x) => x.owner === address);
  const userCompletedDeals = completedRentals.filter((x) => x.renter === address || x.owner === address);

  // Address formatter
  const formatShortAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 flex-grow w-full flex flex-col justify-start">
      {/* Title */}
      <div className="border-b border-zinc-900 pb-6 mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            Customer Dashboard
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            View active agreements, resolve rental disputes, submit reviews, and view your reputation score.
          </p>
        </div>

        {/* Reputation Scorecards */}
        {isConnected && reputation && (
          <div className="flex gap-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-2.5 flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-indigo-400" />
              <div>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Lessor Reputation</span>
                <span className="text-sm font-bold text-white flex items-center gap-1">
                  {reputation.owner_review_count > 0
                    ? `${(reputation.owner_rating_sum / reputation.owner_review_count).toFixed(1)} ★`
                    : "No ratings"}{" "}
                  <span className="text-[10px] text-zinc-500 font-normal">
                    ({reputation.owner_review_count} reviews)
                  </span>
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-2.5 flex items-center gap-3">
              <UserCheck className="h-5 w-5 text-emerald-400" />
              <div>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Lessee Reputation</span>
                <span className="text-sm font-bold text-white flex items-center gap-1">
                  {reputation.renter_review_count > 0
                    ? `${(reputation.renter_rating_sum / reputation.renter_review_count).toFixed(1)} ★`
                    : "No ratings"}{" "}
                  <span className="text-[10px] text-zinc-500 font-normal">
                    ({reputation.renter_review_count} reviews)
                  </span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {!isConnected ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-zinc-800 bg-zinc-900/5 backdrop-blur-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 mb-6 shadow-lg shadow-indigo-600/5">
            <Wallet className="h-8 w-8" />
          </div>
          <h4 className="text-lg font-bold text-white">Wallet Disconnected</h4>
          <p className="mt-2 text-sm text-zinc-500 max-w-sm">
            Please connect your Stellar wallet (Freighter, xBull, etc.) to load your custom listings, rentals, and reviews.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-6 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all duration-200"
          >
            Connect Wallet
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1 flex flex-col gap-3">
            <button
              onClick={() => setActiveTab("renter")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm font-bold transition-all duration-200 ${
                activeTab === "renter"
                  ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/10"
                  : "border-zinc-800 bg-zinc-900/10 text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200"
              }`}
            >
              <Compass className="h-4 w-4" />
              My Active Rentals ({renterItems.length})
            </button>

            <button
              onClick={() => setActiveTab("owner")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm font-bold transition-all duration-200 ${
                activeTab === "owner"
                  ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/10"
                  : "border-zinc-800 bg-zinc-900/10 text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200"
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              My Listings ({ownerItems.length})
            </button>

            <button
              onClick={() => setActiveTab("completed")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm font-bold transition-all duration-200 ${
                activeTab === "completed"
                  ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/10"
                  : "border-zinc-800 bg-zinc-900/10 text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200"
              }`}
            >
              <Star className="h-4 w-4" />
              Completed & Reviews ({userCompletedDeals.length})
            </button>

            <button
              onClick={() => setActiveTab("config")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm font-bold transition-all duration-200 ${
                activeTab === "config"
                  ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/10"
                  : "border-zinc-800 bg-zinc-900/10 text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200"
              }`}
            >
              <Globe className="h-4 w-4" />
              Wallet Credentials
            </button>

            {/* Quick Balance card */}
            <div className="mt-4 p-5 rounded-2xl border border-zinc-900 bg-zinc-950/80">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold block">Connected Account</span>
              <span className="font-mono text-xs text-zinc-400 block truncate mt-1">{address}</span>
              <div className="mt-4 pt-3 border-t border-zinc-900 flex justify-between items-baseline">
                <span className="text-zinc-500 text-xs">Stellar XLM</span>
                <span className="text-xl font-black text-white">{balance.toFixed(2)} XLM</span>
              </div>
            </div>
          </div>

          {/* Main Workspace */}
          <div className="lg:col-span-3">
            {/* Tab: Active Rentals */}
            {activeTab === "renter" && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-white">Active Rental Contracts</h3>
                
                {itemsLoading ? (
                  <div className="py-12 text-center text-zinc-500">Loading rentals...</div>
                ) : renterItems.length === 0 ? (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-12 text-center">
                    <Compass className="h-10 w-10 text-zinc-600 mx-auto mb-4" />
                    <h4 className="font-bold text-zinc-300">No Rented Tools</h4>
                    <p className="mt-1 text-sm text-zinc-500 max-w-sm mx-auto">
                      You are not currently renting any tools. Go to the marketplace to hire equipment.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {renterItems.map((item) => {
                      const dailyRate = Number(item.price_per_day) / 10000000;
                      const depositAmount = Number(item.deposit) / 10000000;
                      const rentDays = item.rental_days;
                      const isReturning = returningId === item.id;

                      return (
                        <div key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-5 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start">
                              <h4 className="font-bold text-white">{item.title}</h4>
                              <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                                item.status === 1
                                  ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/25"
                                  : "bg-blue-500/10 text-blue-400 border border-blue-500/25"
                              }`}>
                                {item.status === 1 ? "In Use" : "Returned (Inspecting)"}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500 mt-1 block">Owner: {formatShortAddress(item.owner)}</p>

                            <div className="grid grid-cols-2 gap-3 mt-4 border-t border-b border-zinc-900 py-3 my-3 text-xs">
                              <div>
                                <span className="text-zinc-500">Rent Cost</span>
                                <p className="font-bold text-zinc-300">{(dailyRate * rentDays).toFixed(2)} XLM</p>
                              </div>
                              <div>
                                <span className="text-zinc-500">Collateral Escrow</span>
                                <p className="font-bold text-zinc-300">{depositAmount.toFixed(2)} XLM</p>
                              </div>
                            </div>
                          </div>

                          <div className="mt-3">
                            {item.status === 1 ? (
                              <button
                                onClick={() => handleReturn(item.id, item.title)}
                                disabled={isReturning}
                                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-indigo-900/40 border border-indigo-500/20 hover:border-indigo-500/40 text-indigo-300 hover:text-white py-2.5 text-xs font-bold transition-all duration-200"
                              >
                                {isReturning ? <RefreshCw className="h-4.5 w-4.5 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                                Return Equipment
                              </button>
                            ) : (
                              <button
                                disabled
                                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 py-2.5 text-center text-xs font-semibold text-zinc-500 cursor-not-allowed"
                              >
                                Awaiting lessor inspection
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab: My Listings */}
            {activeTab === "owner" && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-white">My Listed Equipment</h3>

                {itemsLoading ? (
                  <div className="py-12 text-center text-zinc-500">Loading listings...</div>
                ) : ownerItems.length === 0 ? (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-12 text-center">
                    <TrendingUp className="h-10 w-10 text-zinc-600 mx-auto mb-4" />
                    <h4 className="font-bold text-zinc-300">No Listings Found</h4>
                    <p className="mt-1 text-sm text-zinc-500 max-w-sm mx-auto">
                      You haven't listed any equipment for rent yet. Go to the marketplace to add items.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ownerItems.map((item) => {
                      const dailyRate = Number(item.price_per_day) / 10000000;
                      const depositAmount = Number(item.deposit) / 10000000;
                      
                      return (
                        <div key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-900/15 p-5 flex flex-col md:flex-row justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <h4 className="font-bold text-white text-base">{item.title}</h4>
                              <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                                item.status === 0
                                  ? "bg-green-500/10 text-green-400 border border-green-500/25"
                                  : item.status === 1
                                  ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/25"
                                  : "bg-blue-500/10 text-blue-400 border border-blue-500/25"
                              }`}>
                                {item.status === 0 ? "Available" : item.status === 1 ? "Rented" : "Returned"}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-400 max-w-lg leading-relaxed">{item.description}</p>
                            <div className="flex gap-4 text-xs font-semibold text-zinc-500 mt-2">
                              <span>Daily: <span className="text-zinc-300 font-bold">{dailyRate} XLM</span></span>
                              <span>Deposit: <span className="text-zinc-300 font-bold">{depositAmount} XLM</span></span>
                              {item.status > 0 && (
                                <span>Renter: <span className="text-indigo-400 font-mono">{formatShortAddress(item.renter!)}</span></span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-end shrink-0">
                            {item.status === 2 && (
                              <button
                                onClick={() => {
                                  setResolveRentalId(item.id);
                                  setResolveItemDeposit(depositAmount);
                                  setDamagesClaim("0");
                                }}
                                className="flex items-center gap-1.5 rounded-xl bg-green-950/20 border border-green-500/30 hover:border-green-500/50 text-green-400 hover:text-white px-5 py-2.5 text-xs font-bold transition-all duration-200"
                              >
                                <Hammer className="h-4 w-4" />
                                Inspect & Payout
                              </button>
                            )}

                            {item.status === 1 && (
                              <span className="text-xs text-zinc-500 italic">Rented - waiting return</span>
                            )}

                            {item.status === 0 && (
                              <span className="text-xs text-green-500/80 font-bold flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
                                Active in Marketplace
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Completed Deals & Review History */}
            {activeTab === "completed" && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-white">Completed Rental History & Reviews</h3>
                
                {completedLoading ? (
                  <div className="py-12 text-center text-zinc-500">Loading history...</div>
                ) : userCompletedDeals.length === 0 ? (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-12 text-center">
                    <History className="h-10 w-10 text-zinc-600 mx-auto mb-4" />
                    <h4 className="font-bold text-zinc-300">No History Found</h4>
                    <p className="mt-1 text-sm text-zinc-500 max-w-sm mx-auto">
                      You haven't resolved or completed any rental agreements yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {userCompletedDeals.map((deal) => {
                      const isUserRenter = deal.renter === address;
                      const hasReviewed = isUserRenter ? deal.reviewed_by_renter : deal.reviewed_by_owner;
                      const roleTag = isUserRenter ? "Renter" : "Lessor";
                      const partnerAddress = isUserRenter ? deal.owner : deal.renter;

                      // Fetch submitted review if exists
                      const reviewKey = isUserRenter ? `${deal.rental_id}_renter` : `${deal.rental_id}_owner`;
                      const submittedReview = reviews[reviewKey];

                      return (
                        <div key={deal.rental_id} className="rounded-xl border border-zinc-800 bg-zinc-900/10 p-5 space-y-4">
                          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-zinc-900 pb-3">
                            <div>
                              <span className="text-[10px] text-zinc-500 uppercase font-black block">Deal #{deal.rental_id}</span>
                              <h4 className="font-bold text-zinc-200 mt-0.5">
                                Equipment ID: {deal.equipment_id}
                              </h4>
                            </div>
                            <div className="flex items-center gap-2.5 text-xs">
                              <span className="text-zinc-500">Your role:</span>
                              <span className={`px-2 py-0.5 rounded-md font-bold ${
                                isUserRenter ? "bg-indigo-950 text-indigo-400" : "bg-emerald-950 text-emerald-400"
                              }`}>
                                {roleTag}
                              </span>
                              <span>Partner: <span className="font-mono text-zinc-400">{formatShortAddress(partnerAddress)}</span></span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-4">
                            {hasReviewed ? (
                              <div className="space-y-1.5 flex-grow">
                                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold block">Your Submitted Review</span>
                                {submittedReview ? (
                                  <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-900">
                                    <div className="flex items-center gap-1.5 text-yellow-500 text-xs mb-1.5">
                                      {Array.from({ length: 5 }).map((_, i) => (
                                        <Star
                                          key={i}
                                          className={`h-3.5 w-3.5 ${
                                            i < submittedReview.rating ? "fill-yellow-500" : "text-zinc-800"
                                          }`}
                                        />
                                      ))}
                                      <span className="font-bold text-zinc-300 ml-1">{submittedReview.rating}.0/5</span>
                                    </div>
                                    <p className="text-xs text-zinc-400 leading-relaxed font-medium italic">
                                      "{submittedReview.comment}"
                                    </p>
                                  </div>
                                ) : (
                                  <div className="text-xs text-zinc-600 italic">Loading review details...</div>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-4 bg-zinc-950/40 p-4 rounded-xl border border-zinc-900">
                                <div>
                                  <h5 className="text-xs font-bold text-zinc-300">Write a review for this deal</h5>
                                  <p className="text-[11px] text-zinc-500 leading-relaxed mt-0.5">
                                    Submit feedback to reward/rate your deal partner on the Stellar network.
                                  </p>
                                </div>
                                <button
                                  onClick={() => {
                                    setReviewRentalId(deal.rental_id);
                                    setReviewRating(5);
                                    setReviewComment("");
                                    setReviewError(null);
                                  }}
                                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 text-xs font-bold transition-all duration-200 self-end sm:self-center"
                                >
                                  <MessageSquare className="h-4 w-4" />
                                  Rate Partner
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Config details */}
            {activeTab === "config" && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-white">Wallet Connection & Network config</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Status Card */}
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/10 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 text-sm font-semibold">Account State</span>
                      <button
                        onClick={disconnect}
                        className="text-xs font-bold text-red-400 hover:text-red-300 hover:underline"
                      >
                        Disconnect
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase">Stellar Wallet Address</label>
                      <div className="flex gap-2">
                        <div className="flex-grow font-mono text-xs bg-zinc-950 p-3 rounded-lg border border-zinc-900 text-zinc-400 truncate">
                          {address}
                        </div>
                        <button
                          onClick={handleCopy}
                          className="px-3 bg-zinc-950 border border-zinc-900 rounded-lg hover:bg-zinc-900 transition-all text-zinc-400"
                        >
                          {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Horizon config */}
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/10 p-5 space-y-4">
                    <div className="flex items-center gap-2 font-bold text-white">
                      <Globe className="h-4 w-4 text-indigo-400" />
                      <span>Horizon Network Configuration</span>
                    </div>

                    <div className="space-y-3 text-xs text-zinc-400">
                      <div>
                        <span className="text-zinc-600 block text-[10px] uppercase font-bold">Network Name</span>
                        <span className="text-zinc-300 block font-semibold capitalize mt-0.5">{NETWORK}</span>
                      </div>
                      <div>
                        <span className="text-zinc-600 block text-[10px] uppercase font-bold">Soroban RPC endpoint</span>
                        <span className="text-zinc-300 block font-mono mt-0.5">{RPC_URL}</span>
                      </div>
                      <div>
                        <span className="text-zinc-600 block text-[10px] uppercase font-bold">Network Passphrase</span>
                        <span className="text-zinc-300 block font-mono break-all mt-0.5">{NETWORK_PASSPHRASE}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Write Review */}
      {reviewRentalId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !reviewLoading && setReviewRentalId(null)}></div>
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
            <h4 className="text-lg font-bold text-white mb-2">Write Review & Star Rating</h4>
            <p className="text-xs text-zinc-500 leading-relaxed mb-4">
              Rate your experience for completed Deal #{reviewRentalId}. Ratings are stored permanently on-chain.
            </p>

            {reviewError && (
              <div className="mb-4 rounded-lg bg-red-950/20 border border-red-500/25 p-3 text-xs text-red-400">
                {reviewError}
              </div>
            )}

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              {/* Star selector */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Select Rating</label>
                <div className="flex items-center gap-2 mt-1.5">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const ratingValue = i + 1;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setReviewRating(ratingValue)}
                        className="text-zinc-700 hover:text-yellow-500 transition-colors"
                      >
                        <Star
                          className={`h-7 w-7 ${
                            ratingValue <= reviewRating ? "fill-yellow-500 text-yellow-500" : "text-zinc-800"
                          }`}
                        />
                      </button>
                    );
                  })}
                  <span className="text-sm font-bold text-zinc-300 ml-2">{reviewRating}.0/5 Stars</span>
                </div>
              </div>

              {/* Comment text */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Feedback Comment</label>
                <textarea
                  required
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Review details (e.g. prompt return, clean equipment, friendly partner...)"
                  className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700 resize-none mt-1"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setReviewRentalId(null)}
                  disabled={reviewLoading}
                  className="flex-1 rounded-xl border border-zinc-800 py-3 text-xs font-semibold text-zinc-400 hover:bg-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewLoading}
                  className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white py-3 text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  {reviewLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Resolve Rental */}
      {resolveRentalId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !resolveLoading && setResolveRentalId(null)}></div>
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
            <h4 className="text-lg font-bold text-white mb-2">Inspect & Resolve Payout</h4>
            <p className="text-xs text-zinc-500 leading-relaxed mb-4">
              Return security deposit to renter minus any damages claim. Original deposit held in escrow:{" "}
              <span className="text-zinc-200 font-bold">{resolveItemDeposit} XLM</span>.
            </p>

            {resolveError && (
              <div className="mb-4 rounded-lg bg-red-950/20 border border-red-500/25 p-3 text-xs text-red-400">
                {resolveError}
              </div>
            )}

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Damages Claim (XLM)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={resolveItemDeposit}
                  value={damagesClaim}
                  onChange={(e) => setDamagesClaim(e.target.value)}
                  placeholder="e.g. 15.00"
                  className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-sm text-white focus:outline-none focus:border-zinc-700 mt-1"
                />
                <p className="text-[10px] text-zinc-500 leading-relaxed mt-1">
                  Renter will receive:{" "}
                  <span className="font-semibold text-zinc-400">
                    {Math.max(0, resolveItemDeposit - (parseFloat(damagesClaim) || 0)).toFixed(2)} XLM
                  </span>{" "}
                  refund. You will receive the rent payout + claimed damages.
                </p>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setResolveRentalId(null)}
                  disabled={resolveLoading}
                  className="flex-1 rounded-xl border border-zinc-800 py-3 text-xs font-semibold text-zinc-400 hover:bg-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolveLoading}
                  className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white py-3 text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  {resolveLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
                  Confirm Resolution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
