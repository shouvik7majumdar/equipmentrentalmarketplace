import { render, screen, fireEvent } from "@testing-library/react";
import { expect, test, describe, vi } from "vitest";
import React from "react";

// Mock hooks
vi.mock("@/hooks/useWallet", () => ({
  useWallet: () => ({
    address: "GBDFEVTCEYZ6XFTU3I63RENM3FZIZT6ZAMXLNRA6TJRWXJIGJDIRMYLZ4",
    balance: 100,
    isConnected: true,
    isLoading: false,
    activeWalletId: "freighter",
    isModalOpen: false,
    error: null,
    setModalOpen: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    refreshBalance: vi.fn(),
    signTransaction: vi.fn(),
  }),
}));

vi.mock("@/hooks/useTransactions", () => ({
  useTransactions: () => ({
    transactions: [
      {
        hash: "a1b2c3d4e5f6",
        description: "Test transaction",
        status: "success",
        timestamp: new Date().toISOString(),
        explorerLink: "https://stellar.expert/explorer/testnet/tx/a1b2c3d4e5f6",
      },
    ],
    addTransaction: vi.fn(),
    updateTransactionStatus: vi.fn(),
    clearHistory: vi.fn(),
  }),
}));

// Mock Next/Link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock Tanstack React Query
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: [],
    isLoading: false,
    error: null,
  }),
  useMutation: () => ({
    mutate: vi.fn(),
    isLoading: false,
  }),
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

import Home from "@/app/page.tsx";
import TransactionHistory from "@/app/transactions/page.tsx";
import SettingsPage from "@/app/settings/page.tsx";

describe("Frontend Page Component Rendering", () => {
  test("Landing Page renders welcome texts and exploration link", () => {
    render(<Home />);
    
    // Check main title
    const heading = screen.getByRole("heading", { name: /Equipment Rental Marketplace/i });
    expect(heading).toBeInTheDocument();

    // Check banner badge
    const badge = screen.getByText(/Soroban Smart Contracts on Stellar Testnet/i);
    expect(badge).toBeInTheDocument();

    // Check link navigation
    const exploreBtn = screen.getByText(/Explore Marketplace/i);
    expect(exploreBtn).toBeInTheDocument();
  });

  test("Transaction Center renders transaction records correctly", () => {
    render(<TransactionHistory />);

    // Check header
    const title = screen.getByText(/Transaction History/i);
    expect(title).toBeInTheDocument();

    // Check transaction mock data rendering
    const txDesc = screen.getByText("Test transaction");
    expect(txDesc).toBeInTheDocument();

    // Check transaction hash rendering
    const hashText = screen.getByText(/Hash: a1b2c3d4/i);
    expect(hashText).toBeInTheDocument();
  });

  test("Settings Page renders wallet, polling options and contract addresses", () => {
    render(<SettingsPage />);

    // Check config section
    const title = screen.getByText(/Settings & Preferences/i);
    expect(title).toBeInTheDocument();

    // Check auto refresh radio values
    const opt5 = screen.getByText("5 Seconds");
    const opt15 = screen.getByText("15 Seconds");
    expect(opt5).toBeInTheDocument();
    expect(opt15).toBeInTheDocument();

    // Check clear log button exists
    const clearBtn = screen.getByText(/Clear 1 Cached logs/i);
    expect(clearBtn).toBeInTheDocument();
  });
});
