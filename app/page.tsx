"use client";

import Link from "next/link";
import { ArrowRight, Compass, Shield, Zap, Cpu } from "lucide-react";

export default function Home() {
  return (
    <div className="relative flex-grow flex flex-col justify-center bg-zinc-950 px-6 py-20 lg:px-8">
      {/* Background Gradients */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[40%] left-[20%] h-[600px] w-[600px] rounded-full bg-indigo-500/10 blur-[120px]"></div>
        <div className="absolute -bottom-[20%] right-[10%] h-[400px] w-[400px] rounded-full bg-purple-500/5 blur-[80px]"></div>
      </div>

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        {/* Banner Badge */}
        <span className="inline-flex items-center rounded-full bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold text-indigo-400 border border-indigo-500/20 mb-6">
          Soroban Smart Contracts on Stellar Testnet
        </span>

        {/* Hero Headline */}
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl bg-gradient-to-r from-white via-zinc-200 to-indigo-200 bg-clip-text text-transparent leading-none">
          Equipment Rental Marketplace
        </h1>
        <p className="mt-6 text-lg leading-8 text-zinc-400 max-w-2xl mx-auto">
          A secure, trustless protocol for renting tools and industrial assets. Secure your rentals using automated smart contract escrows and instant collateralized security deposits.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link
            href="/marketplace"
            className="group flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 transition-all duration-200"
          >
            Explore Marketplace
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-6 py-3.5 text-sm font-semibold text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900/80 transition-all duration-200"
          >
            Connect Wallet
          </Link>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="relative z-10 mx-auto mt-24 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="rounded-2xl border border-zinc-900 bg-zinc-900/10 p-6 hover:border-zinc-800 transition-all duration-300 backdrop-blur-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-white tracking-tight">{feature.title}</h3>
                <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const features = [
  {
    title: "Escrowed Collateral",
    description:
      "Renter deposits and daily rent payments are locked in the smart contract escrow until the rental is resolved.",
    icon: Shield,
  },
  {
    title: "Real-Time Polling",
    description:
      "State sync and transaction event logs refresh automatically without needing page reloads.",
    icon: Zap,
  },
  {
    title: "Soroban Smart Contracts",
    description:
      "Written in Rust and compiled to WebAssembly, optimizing gas fees and providing native security checks.",
    icon: Cpu,
  },
  {
    title: "Multi-Wallet Support",
    description:
      "Integrates with Freighter, xBull, and Albedo wallets using the unified StellarWalletsKit SDK.",
    icon: Compass,
  },
];
