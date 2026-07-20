import { create } from "zustand";

export interface TransactionRecord {
  hash: string;
  description: string;
  status: "pending" | "success" | "failed";
  timestamp: string;
  explorerLink: string;
}

interface TransactionsState {
  transactions: TransactionRecord[];
  addTransaction: (hash: string, description: string, status?: TransactionRecord["status"]) => void;
  updateTransactionStatus: (hash: string, status: TransactionRecord["status"]) => void;
  clearHistory: () => void;
}

const LOCAL_STORAGE_KEY = "stellar_rental_txs";

function getStoredTransactions(): TransactionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to load transactions from localStorage", error);
    return [];
  }
}

function setStoredTransactions(txs: TransactionRecord[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(txs));
  } catch (error) {
    console.error("Failed to save transactions to localStorage", error);
  }
}

export const useTransactions = create<TransactionsState>((set) => ({
  transactions: getStoredTransactions(),

  addTransaction: (hash, description, status = "pending") => {
    const newTx: TransactionRecord = {
      hash,
      description,
      status,
      timestamp: new Date().toISOString(),
      explorerLink: `https://stellar.expert/explorer/testnet/tx/${hash}`
    };

    set((state) => {
      const updated = [newTx, ...state.transactions];
      setStoredTransactions(updated);
      return { transactions: updated };
    });
  },

  updateTransactionStatus: (hash, status) => {
    set((state) => {
      const updated = state.transactions.map((tx) =>
        tx.hash === hash ? { ...tx, status } : tx
      );
      setStoredTransactions(updated);
      return { transactions: updated };
    });
  },

  clearHistory: () => {
    set(() => {
      setStoredTransactions([]);
      return { transactions: [] };
    });
  }
}));
