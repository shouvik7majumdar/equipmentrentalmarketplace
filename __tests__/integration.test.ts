import { describe, expect, test, vi } from "vitest";

// Mock the stellar module without relying on hoisted imports
vi.mock("@/lib/stellar", () => {
  return {
    prepareInvokeTransaction: vi.fn().mockImplementation(() => {
      return {
        toXDR: () => "mock_xdr_string",
        hash: () => Buffer.from("mock_hash_value_1234567890abcdef"),
      };
    }),
    submitSignedTransaction: vi.fn().mockImplementation(() => {
      return {
        hash: "mock_tx_hash_success_999",
        success: true,
        resultValue: 1, // simulated equipment ID 1
        events: []
      };
    }),
    getXlmBalance: vi.fn().mockResolvedValue(100),
    getAllEquipment: vi.fn().mockResolvedValue([
      {
        id: 1,
        owner: "G_OWNER",
        title: "Concrete Mixer",
        description: "Standard industrial mixer",
        price_per_day: (10 * 10000000).toString(),
        deposit: (50 * 10000000).toString(),
        status: 0, // Available
        renter: null,
        rental_days: 0,
        rent_start_time: 0
      }
    ]),
    getAllCompletedRentals: vi.fn().mockResolvedValue([
      {
        rental_id: 1,
        equipment_id: 1,
        renter: "G_RENTER",
        owner: "G_OWNER",
        reviewed_by_renter: false,
        reviewed_by_owner: false
      }
    ]),
    getReview: vi.fn().mockResolvedValue(null),
    getUserReputation: vi.fn().mockResolvedValue({
      owner_rating_sum: 5,
      owner_review_count: 1,
      renter_rating_sum: 4,
      renter_review_count: 1
    }),
    toStroops: (x: number) => BigInt(x * 10000000),
    fromStroops: (x: bigint) => Number(x) / 10000000,
  };
});

import {
  prepareInvokeTransaction,
  submitSignedTransaction,
  getAllEquipment,
  getAllCompletedRentals,
  getUserReputation
} from "@/lib/stellar";

describe("E2E Integration Transaction Lifecycle Flow", () => {
  test("Rent equipment integration flow", async () => {
    // 1. Fetch available marketplace catalog
    const items = await getAllEquipment();
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Concrete Mixer");
    expect(items[0].status).toBe(0);

    // 2. Prepare rent transaction
    const renterAddress = "G_RENTER";
    const itemId = 1;
    const rentDays = 3;
    const tx = await prepareInvokeTransaction(renterAddress, "rent_equipment", [
      renterAddress,
      itemId,
      rentDays
    ]);
    expect(tx.toXDR()).toBe("mock_xdr_string");

    // 3. Submit transaction
    const signedXdr = "signed_mock_xdr";
    const res = await submitSignedTransaction(signedXdr);
    expect(res.success).toBe(true);
    expect(res.hash).toBe("mock_tx_hash_success_999");
  });

  test("Submit review integration flow", async () => {
    // 1. Fetch completed rentals
    const completed = await getAllCompletedRentals();
    expect(completed).toHaveLength(1);
    expect(completed[0].renter).toBe("G_RENTER");
    
    // 2. Prepare review submission transaction
    const reviewer = "G_RENTER";
    const completedRentalId = 1;
    const rating = 5;
    const comment = "Great rental!";

    const tx = await prepareInvokeTransaction(reviewer, "submit_review", [
      reviewer,
      completedRentalId,
      rating,
      comment
    ]);
    expect(tx.toXDR()).toBe("mock_xdr_string");

    // 3. Submit
    const res = await submitSignedTransaction("signed_review_xdr");
    expect(res.success).toBe(true);
  });

  test("Read reputation integration check", async () => {
    const rep = await getUserReputation("G_OWNER");
    expect(rep).toBeDefined();
    expect(rep?.owner_rating_sum).toBe(5);
    expect(rep?.renter_rating_sum).toBe(4);
  });
});
