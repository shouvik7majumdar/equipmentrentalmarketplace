"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import { Wallet, Activity, Compass, History, LogOut } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const { address, balance, isConnected, disconnect, setModalOpen } = useWallet();

  const navItems = [
    { name: "Marketplace", path: "/marketplace", icon: Compass },
    { name: "Dashboard", path: "/dashboard", icon: Wallet },
    { name: "Activity", path: "/activity", icon: Activity },
    { name: "History", path: "/transactions", icon: History },
  ];

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 4)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-extrabold text-white shadow-md shadow-indigo-500/35">
              ⚡
            </span>
            Stellar<span className="text-indigo-400">Rent</span>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex space-x-1">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Wallet Connect Section */}
        <div className="flex items-center gap-4">
          {isConnected && address ? (
            <div className="flex items-center gap-3">
              {/* Balance */}
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs text-zinc-500">Balance</span>
                <span className="text-sm font-semibold text-indigo-300">
                  {balance.toLocaleString(undefined, { maximumFractionDigits: 2 })} XLM
                </span>
              </div>

              {/* Address Badge */}
              <div className="flex items-center gap-2 rounded-full bg-zinc-900 border border-zinc-800 px-4 py-2 text-sm font-mono text-zinc-300">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                {formatAddress(address)}
              </div>

              {/* Disconnect Button */}
              <button
                onClick={disconnect}
                className="flex items-center justify-center h-9 w-9 rounded-lg border border-zinc-800 text-zinc-400 hover:text-red-400 hover:bg-zinc-900 transition-all duration-200"
                title="Disconnect Wallet"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-500 transition-all duration-200"
            >
              <Wallet className="h-4 w-4" />
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
