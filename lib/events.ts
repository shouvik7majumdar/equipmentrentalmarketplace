import { rpc, scValToNative } from "@stellar/stellar-sdk";
import { RPC_URL, CONTRACT_ID, REVIEW_REGISTRY_ID, fromStroops } from "./stellar";

export interface RentalEvent {
  id: string; // unique event ID from RPC
  type: "listed" | "rented" | "returned" | "resolved" | "reviewed";
  timestamp: string;
  walletAddress: string;
  equipmentId: number;
  actionPerformed: string;
  txHash: string;
}

/**
 * Fetches recent events from our deployed contracts.
 */
export async function fetchContractEvents(startLedgerOffset = 150): Promise<RentalEvent[]> {
  try {
    const server = new rpc.Server(RPC_URL);
    const latestLedgerResponse = await server.getLatestLedger();
    const latestLedger = latestLedgerResponse.sequence;

    // Scan the last few ledgers
    const startLedger = Math.max(1, latestLedger - startLedgerOffset);
    const contractIds = [CONTRACT_ID, REVIEW_REGISTRY_ID].filter(Boolean);

    if (contractIds.length === 0) return [];

    const response = await server.getEvents({
      startLedger,
      filters: [
        {
          type: "contract",
          contractIds
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
      const eventTypeSymbol = topics[0] as string; // 'listed', 'rented', 'returned', 'resolved', 'registered', 'reviewed'
      
      // Decode value
      const val = scValToNative(eventInfo.value);

      let actionPerformed = "";
      let type: RentalEvent["type"] = "listed";
      let walletAddress = "";
      let equipmentId = 0;

      if (eventTypeSymbol === "listed") {
        type = "listed";
        equipmentId = topics[1] as number;
        walletAddress = topics[2] as string;
        const [title, price, deposit] = val;
        actionPerformed = `Listed equipment "${title}" (ID: ${equipmentId}) for ${fromStroops(price)} XLM/day, deposit: ${fromStroops(deposit)} XLM`;
      } else if (eventTypeSymbol === "rented") {
        type = "rented";
        equipmentId = topics[1] as number;
        walletAddress = topics[2] as string;
        const [days, rentPayment, deposit] = val;
        actionPerformed = `Rented equipment ID: ${equipmentId} for ${days} days. Total rent: ${fromStroops(rentPayment)} XLM, deposit held: ${fromStroops(deposit)} XLM`;
      } else if (eventTypeSymbol === "returned") {
        type = "returned";
        equipmentId = topics[1] as number;
        walletAddress = topics[2] as string;
        actionPerformed = `Returned equipment ID: ${equipmentId}, pending owner inspection.`;
      } else if (eventTypeSymbol === "resolved") {
        type = "resolved";
        equipmentId = topics[1] as number;
        walletAddress = topics[2] as string;
        const [renter, refund, claim] = val;
        actionPerformed = `Resolved rental for ID: ${equipmentId}. Owner claimed ${fromStroops(claim)} XLM (damage/late fees) + rent, renter refunded ${fromStroops(refund)} XLM deposit.`;
      } else if (eventTypeSymbol === "registered") {
        type = "resolved";
        const completedSeqId = topics[1] as number;
        const [rental_id, eq_id, renter, owner] = val;
        equipmentId = eq_id;
        walletAddress = renter;
        actionPerformed = `Deal #${completedSeqId} registered: Rental of Equipment ID: ${eq_id} by renter ${formatShortAddress(renter)} from owner ${formatShortAddress(owner)} is now reviewable.`;
      } else if (eventTypeSymbol === "reviewed") {
        type = "reviewed";
        const completedSeqId = topics[1] as number;
        walletAddress = topics[2] as string;
        const [reviewee, rating, comment] = val;
        actionPerformed = `User ${formatShortAddress(walletAddress)} left a ${rating}-star review for ${formatShortAddress(reviewee)}: "${comment}"`;
      }

      // Fallback timestamp if not provided
      const dateString = new Date().toISOString();

      return {
        id: eventInfo.id,
        type,
        timestamp: dateString,
        walletAddress,
        equipmentId,
        actionPerformed,
        txHash: eventInfo.txHash
      };
    });

    return parsedEvents.reverse();
  } catch (error) {
    console.error("Error fetching contract events:", error);
    return [];
  }
}

function formatShortAddress(addr: string) {
  if (!addr) return "";
  return `${addr.substring(0, 5)}...${addr.substring(addr.length - 4)}`;
}
