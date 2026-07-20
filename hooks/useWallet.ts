import { create } from "zustand";
import { getXlmBalance, NETWORK, NETWORK_PASSPHRASE } from "@/lib/stellar";

// We import kit components dynamically or directly. Since it's client-side, we should safely import.
// To handle SSR, we will check typeof window !== 'undefined'
let StellarWalletsKit: any = null;
let WalletNetwork: any = null;
let FreighterModule: any = null;
let xBullModule: any = null;
let AlbedoModule: any = null;
let HanaModule: any = null;
let FREIGHTER_ID: any = null;
let XBULL_ID: any = null;
let ALBEDO_ID: any = null;
let HANA_ID: any = null;
let freighterApi: any = null;

if (typeof window !== "undefined") {
  const kitPkg = require("@creit.tech/stellar-wallets-kit");
  const freighterPkg = require("@creit.tech/stellar-wallets-kit/modules/freighter");
  const xbullPkg = require("@creit.tech/stellar-wallets-kit/modules/xbull");
  const albedoPkg = require("@creit.tech/stellar-wallets-kit/modules/albedo");
  const hanaPkg = require("@creit.tech/stellar-wallets-kit/modules/hana");

  StellarWalletsKit = kitPkg.StellarWalletsKit;
  WalletNetwork = kitPkg.Networks;
  FreighterModule = freighterPkg.FreighterModule;
  xBullModule = xbullPkg.xBullModule;
  AlbedoModule = albedoPkg.AlbedoModule;
  HanaModule = hanaPkg.HanaModule;
  FREIGHTER_ID = "freighter";
  XBULL_ID = "xbull";
  ALBEDO_ID = "albedo";
  HANA_ID = "hana";
  
  freighterApi = require("@stellar/freighter-api");
}

interface WalletState {
  address: string | null;
  balance: number;
  isConnected: boolean;
  activeWalletId: string | null;
  isModalOpen: boolean;
  isLoading: boolean;
  error: string | null;
  setModalOpen: (open: boolean) => void;
  connect: (walletId: string) => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  signTransaction: (txXdr: string) => Promise<string>;
}

let isKitInitialized = false;

function ensureKitInitialized() {
  if (typeof window === "undefined") return false;
  if (!isKitInitialized && StellarWalletsKit) {
    StellarWalletsKit.init({
      network: WalletNetwork.TESTNET,
      selectedWalletId: FREIGHTER_ID,
      modules: [
        new FreighterModule(),
        new xBullModule(),
        new AlbedoModule(),
        new HanaModule()
      ],
    });
    isKitInitialized = true;
  }
  return isKitInitialized;
}

export const useWallet = create<WalletState>((set, get) => ({
  address: null,
  balance: 0,
  isConnected: false,
  activeWalletId: null,
  isModalOpen: false,
  isLoading: false,
  error: null,

  setModalOpen: (open) => set({ isModalOpen: open, error: null }),

  connect: async (walletId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const initialized = ensureKitInitialized();
      if (!initialized) {
        throw new Error("Wallet kit not initialized");
      }

      let address = "";
      let activeId = "";

      if (walletId === "freighter") {
        if (!freighterApi) {
          throw new Error("Freighter wallet integration is not loaded");
        }
        const connectedStatus = await freighterApi.isConnected();
        if (!connectedStatus || !connectedStatus.isConnected) {
          throw new Error("Freighter wallet is not installed. Please download it from freighter.app");
        }

        try {
          const access = await freighterApi.requestAccess();
          if (access && access.error) {
            throw new Error(access.error);
          }
          address = access.address || access;
          activeId = "freighter";
        } catch (err: any) {
          console.error("Freighter access error:", err);
          if (err?.message?.includes("reject") || err?.message?.includes("decline") || err?.message?.includes("User")) {
            throw new Error("Connection request rejected by user");
          }
          throw new Error("Could not retrieve address from Freighter Wallet. Ensure it is unlocked.");
        }
      } else if (walletId && walletId !== "modal") {
        StellarWalletsKit.setWallet(walletId);
        activeId = walletId;
        try {
          const addressObj = await StellarWalletsKit.getAddress();
          address = addressObj.address || addressObj;
        } catch (err: any) {
          console.error("Wallet connection err:", err);
          if (err?.message?.includes("rejected") || err?.message?.includes("declined") || err?.message?.includes("User")) {
            throw new Error("Connection request rejected by user");
          }
          throw new Error(`Could not retrieve address from selected wallet. Ensure it is installed and unlocked.`);
        }
      } else {
        // Trigger StellarWalletsKit built-in modal
        const addressObj = await StellarWalletsKit.authModal();
        address = addressObj.address || addressObj;
        activeId = "connected";
      }

      if (!address || typeof address !== "string" || address.length < 10) {
        throw new Error("No address returned from wallet. Make sure it is installed and unlocked.");
      }

      const balance = await getXlmBalance(address);

      set({
        address,
        balance,
        isConnected: true,
        activeWalletId: activeId,
        isModalOpen: false,
        error: null
      });
    } catch (err: any) {
      console.error(err);
      set({ error: err.message || "Failed to connect wallet" });
    } finally {
      set({ isLoading: false });
    }
  },

  disconnect: () => {
    set({
      address: null,
      balance: 0,
      isConnected: false,
      activeWalletId: null,
      error: null
    });
  },

  refreshBalance: async () => {
    const { address } = get();
    if (address) {
      const balance = await getXlmBalance(address);
      set({ balance });
    }
  },

  signTransaction: async (txXdr: string): Promise<string> => {
    const { address, activeWalletId } = get();
    if (!address || !activeWalletId) {
      throw new Error("Wallet not connected");
    }

    if (activeWalletId === "freighter") {
      if (!freighterApi) {
        throw new Error("Freighter API not loaded");
      }
      try {
        const signRes = await freighterApi.signTransaction(txXdr, {
          networkPassphrase: NETWORK_PASSPHRASE,
          address: address,
        });
        if (signRes && signRes.error) {
          throw new Error(signRes.error);
        }
        return signRes.signedTxXdr || signRes;
      } catch (error: any) {
        console.error("Freighter signing failed:", error);
        if (error?.message?.includes("reject") || error?.message?.includes("cancel") || error?.message?.includes("decline")) {
          throw new Error("Transaction signature request rejected by the user");
        }
        throw new Error(error.message || "Freighter signing failed. Ensure it is unlocked.");
      }
    }

    const initialized = ensureKitInitialized();
    if (!initialized) {
      throw new Error("Wallet kit not initialized");
    }

    try {
      const { signedTxXdr } = await StellarWalletsKit.signTransaction(txXdr, {
        networkPassphrase: NETWORK_PASSPHRASE,
        address: address,
      });
      return signedTxXdr;
    } catch (error: any) {
      console.error("Signing failed:", error);
      // Handle user rejected transaction
      if (error?.message?.includes("reject") || error?.message?.includes("decline") || error?.message?.includes("cancel") || error?.message?.includes("User rejected")) {
        throw new Error("Transaction signature request rejected by the user");
      }
      throw new Error(error.message || "Wallet signing failed. Try again.");
    }
  }
}));

export const AVAILABLE_WALLETS = [
  { id: "freighter", name: "Freighter Wallet", icon: "🚀" },
  { id: "xbull", name: "xBull Wallet", icon: "🐂" },
  { id: "albedo", name: "Albedo Wallet", icon: "🌌" },
  { id: "hana", name: "Hana Wallet", icon: "🌸" }
];
