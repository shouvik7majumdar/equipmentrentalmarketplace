"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchContractEvents } from "@/lib/events";
import { Calendar, User, ExternalLink, Activity, ArrowRightLeft } from "lucide-react";

export default function ActivityFeed() {
  const { data: events = [], isLoading, error } = useQuery({
    queryKey: ["contract_events"],
    queryFn: () => fetchContractEvents(150), // fetch events from the last 150 ledgers
    refetchInterval: 5000, // automatic polling every 5s
  });

  const getEventBadgeClass = (type: string) => {
    switch (type) {
      case "listed":
        return "bg-green-500/10 text-green-400 border border-green-500/20";
      case "rented":
        return "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20";
      case "returned":
        return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
      case "resolved":
        return "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20";
      default:
        return "bg-zinc-800 text-zinc-400 border border-zinc-700";
    }
  };

  const formatShortAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 flex-grow w-full flex flex-col justify-start">
      {/* Header */}
      <div className="border-b border-zinc-900 pb-6 mb-8">
        <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
          Activity Feed
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Real-time updates of marketplace contract interactions and state transitions.
        </p>
      </div>

      {/* Timeline Section */}
      {isLoading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="animate-pulse flex items-start gap-4 rounded-xl border border-zinc-800 bg-zinc-900/10 p-5">
              <div className="h-8 w-8 rounded-full bg-zinc-800 shrink-0"></div>
              <div className="flex-grow space-y-2">
                <div className="flex justify-between items-center">
                  <div className="h-4 w-24 bg-zinc-800 rounded-md"></div>
                  <div className="h-4 w-16 bg-zinc-800 rounded-md"></div>
                </div>
                <div className="h-4 w-full bg-zinc-800 rounded-md"></div>
                <div className="h-4 w-1/3 bg-zinc-800 rounded-md"></div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/10 p-12 text-center text-zinc-500">
          Failed to fetch real-time contract events.
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-16 text-center">
          <Activity className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white">No Recent Activity</h3>
          <p className="mt-2 text-sm text-zinc-500 max-w-sm mx-auto">
            Transactions will appear here in real time as they are processed by the Stellar network.
          </p>
        </div>
      ) : (
        <div className="relative border-l border-zinc-800 ml-4 pl-8 space-y-8">
          {events.map((event) => (
            <div key={event.id} className="relative">
              {/* Event Dot Icon */}
              <span className="absolute -left-12 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-950 border border-zinc-800 text-zinc-400 shadow-md">
                <ArrowRightLeft className="h-4 w-4" />
              </span>

              {/* Event Container */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/10 p-5 backdrop-blur-sm hover:border-zinc-700 transition-all duration-200">
                {/* Badge, wallet, timestamp */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${getEventBadgeClass(event.type)}`}>
                      {event.type}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-zinc-500">
                      <User className="h-3.5 w-3.5" />
                      {formatShortAddress(event.walletAddress)}
                    </span>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-zinc-500">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                {/* Event Description */}
                <p className="text-sm font-medium text-zinc-200 leading-relaxed mb-4">
                  {event.actionPerformed}
                </p>

                {/* Tx Hash Links */}
                <div className="flex items-center justify-between text-xs border-t border-zinc-900 pt-3">
                  <span className="font-mono text-zinc-600">
                    ID: {event.id.substring(0, 16)}...
                  </span>
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${event.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-indigo-400 font-bold hover:text-indigo-300 hover:underline"
                  >
                    View on Explorer
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
