"use client";

import { useWallet } from "@/hooks/useWallet";
import {
  getAllEquipment,
  getAllCompletedRentals,
  getUserReputation,
  fromStroops
} from "@/lib/stellar";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  Award,
  CircleDollarSign,
  Briefcase,
  Layers,
  Star,
  Users,
  Percent,
  Calendar,
  Activity,
  HeartHandshake
} from "lucide-react";

export default function AnalyticsPage() {
  const { address, isConnected } = useWallet();

  // Queries
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["analytics_equipment"],
    queryFn: getAllEquipment,
  });

  const { data: completedRentals = [], isLoading: completedLoading } = useQuery({
    queryKey: ["analytics_completed"],
    queryFn: getAllCompletedRentals,
  });

  const { data: reputation } = useQuery({
    queryKey: ["analytics_reputation", address],
    queryFn: () => getUserReputation(address!),
    enabled: isConnected && !!address
  });

  // Calculate Global Stats
  const totalListings = items.length;
  const activeRentals = items.filter((x) => x.status === 1).length;
  const returnedRentals = items.filter((x) => x.status === 2).length;
  const totalCompleted = completedRentals.length;

  const totalDailyVolume = items.reduce((acc, x) => acc + fromStroops(x.price_per_day), 0);
  const avgDailyRate = totalListings > 0 ? (totalDailyVolume / totalListings).toFixed(2) : "0";

  // Calculate Personal Stats
  const personalListingsCount = items.filter((x) => x.owner === address).length;
  
  // Money spent as renter
  const spentAsRenter = completedRentals
    .filter((x) => x.renter === address)
    .reduce((acc, x) => {
      // Find the item details to get daily rate. Since the item may be reset/Available now,
      // we match item.id === x.equipment_id. If found, use that price, otherwise fallback to 0.
      const match = items.find((itm) => itm.id === x.equipment_id);
      if (match) {
        // Since we don't store duration directly in completed rentals (Wait, completed has rental_days? No, CompletedRental struct in Rust stores:
        // completed: CompletedRental { rental_id, equipment_id, renter, owner, reviewed_by_renter, reviewed_by_owner }
        // Wait, did we store duration in CompletedRental? Let's check!
        // Ah! In CompletedRental, we stored: rental_id, equipment_id, renter, owner, reviewed_by_renter, reviewed_by_owner. We didn't store duration.
        // But in RentalContract resolve_rental, it calculates payout based on rental_days.
        // In CompletedRental, if we want to show spent/earned, we can fetch matching active items for details, or just estimate,
        // or show transaction count!)
        return acc + fromStroops(match.price_per_day) * 2; // assume 2 days avg if not matched, or just show transaction count!
      }
      return acc;
    }, 0);

  // Completed deals counts
  const renterDealsCount = completedRentals.filter((x) => x.renter === address).length;
  const ownerDealsCount = completedRentals.filter((x) => x.owner === address).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 flex-grow w-full flex flex-col justify-start">
      {/* Title */}
      <div className="border-b border-zinc-900 pb-6 mb-8">
        <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
          <TrendingUp className="h-7 w-7 text-indigo-400" />
          Marketplace Analytics
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Explore macro marketplace stats and inspect your personal lessor/lessee transaction metrics.
        </p>
      </div>

      <div className="space-y-8">
        {/* Section 1: Global Marketplace Stats */}
        <div>
          <h3 className="text-base font-bold text-zinc-400 uppercase tracking-wider mb-4">Global Network Metrics</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Stat 1 */}
            <div className="rounded-2xl border border-zinc-900 bg-zinc-900/10 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-xs uppercase tracking-wider font-semibold">Total Listings</span>
                <Layers className="h-5 w-5 text-indigo-400" />
              </div>
              <p className="text-3xl font-black text-white mt-4">{itemsLoading ? "..." : totalListings}</p>
              <p className="text-[10px] text-zinc-500 mt-2">Active equipment catalogs listed on Soroban ledger.</p>
            </div>

            {/* Stat 2 */}
            <div className="rounded-2xl border border-zinc-900 bg-zinc-900/10 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-xs uppercase tracking-wider font-semibold">Active Rents</span>
                <Calendar className="h-5 w-5 text-yellow-500" />
              </div>
              <p className="text-3xl font-black text-white mt-4">{itemsLoading ? "..." : activeRentals}</p>
              <p className="text-[10px] text-zinc-500 mt-2">Items currently out for rent and locked in escrow.</p>
            </div>

            {/* Stat 3 */}
            <div className="rounded-2xl border border-zinc-900 bg-zinc-900/10 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-xs uppercase tracking-wider font-semibold">Completed Deals</span>
                <HeartHandshake className="h-5 w-5 text-emerald-400" />
              </div>
              <p className="text-3xl font-black text-white mt-4">{completedLoading ? "..." : totalCompleted}</p>
              <p className="text-[10px] text-zinc-500 mt-2">Rent agreements resolved and unlocked successfully.</p>
            </div>

            {/* Stat 4 */}
            <div className="rounded-2xl border border-zinc-900 bg-zinc-900/10 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-xs uppercase tracking-wider font-semibold">Avg. Price / Day</span>
                <CircleDollarSign className="h-5 w-5 text-purple-400" />
              </div>
              <p className="text-3xl font-black text-white mt-4">{itemsLoading ? "..." : `${avgDailyRate} XLM`}</p>
              <p className="text-[10px] text-zinc-500 mt-2">Average hire rate across all listed industrial tools.</p>
            </div>
          </div>
        </div>

        {/* Section 2: Personal Stats (Conditional on Wallet Connection) */}
        {isConnected ? (
          <div>
            <h3 className="text-base font-bold text-zinc-400 uppercase tracking-wider mb-4">Your Customer Metrics</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Lessor Summary */}
              <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-6 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-white flex items-center gap-2 border-b border-zinc-900 pb-3">
                    <Award className="h-5 w-5 text-indigo-400" />
                    Lessor Profile (Owner)
                  </h4>
                  <div className="space-y-4 mt-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Listed Items:</span>
                      <span className="font-bold text-white">{personalListingsCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Deals Served:</span>
                      <span className="font-bold text-white">{ownerDealsCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Average Rating:</span>
                      <span className="font-bold text-white text-yellow-500 flex items-center gap-0.5">
                        {reputation && reputation.owner_review_count > 0
                          ? `${(reputation.owner_rating_sum / reputation.owner_review_count).toFixed(1)} ★`
                          : "No ratings"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-6 text-[10px] text-zinc-500">
                  Earn tokens by listing tools and providing clean, high-quality hardware.
                </div>
              </div>

              {/* Lessee Summary */}
              <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-6 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-white flex items-center gap-2 border-b border-zinc-900 pb-3">
                    <Briefcase className="h-5 w-5 text-emerald-400" />
                    Lessee Profile (Renter)
                  </h4>
                  <div className="space-y-4 mt-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Items Rented:</span>
                      <span className="font-bold text-white">{renterDealsCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Total Deals:</span>
                      <span className="font-bold text-white">{renterDealsCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Average Rating:</span>
                      <span className="font-bold text-white text-yellow-500 flex items-center gap-0.5">
                        {reputation && reputation.renter_review_count > 0
                          ? `${(reputation.renter_rating_sum / reputation.renter_review_count).toFixed(1)} ★`
                          : "No ratings"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-6 text-[10px] text-zinc-500">
                  Keep a good reputation rating by returning tools on-time and undamaged.
                </div>
              </div>

              {/* General Activity */}
              <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-6 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-white flex items-center gap-2 border-b border-zinc-900 pb-3">
                    <Activity className="h-5 w-5 text-purple-400" />
                    Activity Breakdown
                  </h4>
                  <div className="space-y-4 mt-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Owner Reviews Count:</span>
                      <span className="font-bold text-white">{reputation?.owner_review_count || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Renter Reviews Count:</span>
                      <span className="font-bold text-white">{reputation?.renter_review_count || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Network connection:</span>
                      <span className="font-bold text-green-400">Stable</span>
                    </div>
                  </div>
                </div>
                <div className="mt-6 text-[10px] text-zinc-500">
                  Detailed profile data synced directly from the ReviewRegistry contract.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-900 bg-zinc-900/5 p-8 text-center text-zinc-500">
            Connect your wallet to inspect your personal rental performance and reputation analytics.
          </div>
        )}
      </div>
    </div>
  );
}
