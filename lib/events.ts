import { rpc, scValToNative } from "@stellar/stellar-sdk";
import { RPC_URL, CONTRACT_ID, fromStroops } from "./stellar";

export interface RentalEvent {
  id: string; // unique event ID from RPC
  type: "listed" | "rented" | "returned" | "resolved";
  timestamp: string;
  walletAddress: string;
  equipmentId: number;
  actionPerformed: string;
  txHash: string;
}

/**
 * Fetches recent events from our deployed contract.
 */
export async function fetchContractEvents(startLedgerOffset = 100): Promise<RentalEvent[]> {
  try {
    const server = new rpc.Server(RPC_URL);
    const latestLedgerResponse = await server.getLatestLedger();
    const latestLedger = latestLedgerResponse.sequence;

    // Scan the last few ledgers (Soroban nodes hold events for a limited range)
    const startLedger = Math.max(1, latestLedger - startLedgerOffset);

    const response = await server.getEvents({
      startLedger,
      filters: [
        {
          type: "contract",
          contractIds: [CONTRACT_ID]
        }
      ],
      limit: 50
    });

    if (!response.events || response.events.length === 0) {
      return [];
    }

    const parsedEvents: RentalEvent[] = response.events.map((eventInfo) => {
      // Decode topics
      const topics = eventInfo.topic.map((t) => scValToNative(t));
      const eventTypeSymbol = topics[0] as string; // 'listed', 'rented', 'returned', 'resolved'
      const equipmentId = topics[1] as number;
      const walletAddress = topics[2] as string; // Address of actor

      // Decode value
      const val = scValToNative(eventInfo.value);

      let actionPerformed = "";
      let type: RentalEvent["type"] = "listed";

      if (eventTypeSymbol === "listed") {
        type = "listed";
        const [title, price, deposit] = val;
        actionPerformed = `Listed equipment "${title}" (ID: ${equipmentId}) for ${fromStroops(price)} XLM/day, deposit: ${fromStroops(deposit)} XLM`;
      } else if (eventTypeSymbol === "rented") {
        type = "rented";
        const [days, rentPayment, deposit] = val;
        actionPerformed = `Rented equipment ID: ${equipmentId} for ${days} days. Total rent: ${fromStroops(rentPayment)} XLM, deposit held: ${fromStroops(deposit)} XLM`;
      } else if (eventTypeSymbol === "returned") {
        type = "returned";
        actionPerformed = `Returned equipment ID: ${equipmentId}, pending owner inspection.`;
      } else if (eventTypeSymbol === "resolved") {
        type = "resolved";
        const [renter, refund, claim] = val;
        actionPerformed = `Resolved rental for ID: ${equipmentId}. Owner claimed ${fromStroops(claim)} XLM (damage/late fees) + rent, renter refunded ${fromStroops(refund)} XLM deposit.`;
      }

      // Fallback timestamp if not provided
      const dateString = new Date().toISOString();

      return {
        id: eventInfo.id,
        type,
        timestamp: dateString, // In real case, fetch block time or approximate it
        walletAddress,
        equipmentId,
        actionPerformed,
        txHash: eventInfo.txHash
      };
    });

    // Sort by chronological order (RPC returns oldest first, we want newest first)
    return parsedEvents.reverse();
  } catch (error) {
    console.error("Error fetching contract events:", error);
    return [];
  }
}
