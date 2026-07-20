import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers";
import Navbar from "@/components/navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stellar Rent - Equipment Rental Marketplace DApp",
  description: "A decentralized equipment rental marketplace built on Stellar and Soroban smart contracts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-full flex flex-col bg-zinc-950 text-zinc-100`}>
        <Providers>
          <Navbar />
          <main className="flex-grow flex flex-col">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
