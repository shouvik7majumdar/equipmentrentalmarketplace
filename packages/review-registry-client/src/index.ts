import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CC25LHQER6EJDLCV747HWI3I3V3JUPCK4MIZFTH6NC55LTHC335Y47FC",
  }
} as const


export interface Review {
  comment: string;
  rating: u32;
  rental_id: u32;
  reviewee: string;
  reviewer: string;
  timestamp: u64;
}

export type DataKey = {tag: "Admin", values: void} | {tag: "RentalContract", values: void} | {tag: "CompletedRental", values: readonly [u32]} | {tag: "Review", values: readonly [u32, string]} | {tag: "Reputation", values: readonly [string]} | {tag: "TotalReviews", values: void} | {tag: "TotalCompletedRentals", values: void};


export interface UserReputation {
  owner_rating_sum: u32;
  owner_review_count: u32;
  renter_rating_sum: u32;
  renter_review_count: u32;
}


export interface CompletedRental {
  equipment_id: u32;
  owner: string;
  rental_id: u32;
  renter: string;
  reviewed_by_owner: boolean;
  reviewed_by_renter: boolean;
}

export interface Client {
  /**
   * Construct and simulate a init transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Initialize the contract with an admin and the main rental contract address
   */
  init: ({admin, rental_contract}: {admin: string, rental_contract: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a upgrade transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Upgrade contract WASM source code (Admin only)
   */
  upgrade: ({new_wasm_hash}: {new_wasm_hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_review transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Retrieve a specific review details by completed rental ID and reviewer address
   */
  get_review: ({completed_rental_id, reviewer}: {completed_rental_id: u32, reviewer: string}, options?: MethodOptions) => Promise<AssembledTransaction<Option<Review>>>

  /**
   * Construct and simulate a submit_review transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Submit rating and review comment for a completed rental. Renter reviews owner, or owner reviews renter.
   */
  submit_review: ({reviewer, completed_rental_id, rating, comment}: {reviewer: string, completed_rental_id: u32, rating: u32, comment: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_reputation transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Read reputation metrics for a specific user address
   */
  get_reputation: ({user}: {user: string}, options?: MethodOptions) => Promise<AssembledTransaction<Option<UserReputation>>>

  /**
   * Construct and simulate a get_completed_rental transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Read completed rental transaction details
   */
  get_completed_rental: ({completed_rental_id}: {completed_rental_id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Option<CompletedRental>>>

  /**
   * Construct and simulate a register_completed_rental transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Register a completed rental sequence. Can only be invoked by the rental contract address.
   */
  register_completed_rental: ({rental_id, equipment_id, renter, owner}: {rental_id: u32, equipment_id: u32, renter: string, owner: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_total_completed_rentals transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Read total completed rentals counter
   */
  get_total_completed_rentals: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAQAAAAAAAAAAAAAABlJldmlldwAAAAAABgAAAAAAAAAHY29tbWVudAAAAAAQAAAAAAAAAAZyYXRpbmcAAAAAAAQAAAAAAAAACXJlbnRhbF9pZAAAAAAAAAQAAAAAAAAACHJldmlld2VlAAAAEwAAAAAAAAAIcmV2aWV3ZXIAAAATAAAAAAAAAAl0aW1lc3RhbXAAAAAAAAAG",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABwAAAAAAAAAAAAAABUFkbWluAAAAAAAAAAAAAAAAAAAOUmVudGFsQ29udHJhY3QAAAAAAAEAAAAAAAAAD0NvbXBsZXRlZFJlbnRhbAAAAAABAAAABAAAAAEAAAAAAAAABlJldmlldwAAAAAAAgAAAAQAAAATAAAAAQAAAAAAAAAKUmVwdXRhdGlvbgAAAAAAAQAAABMAAAAAAAAAAAAAAAxUb3RhbFJldmlld3MAAAAAAAAAAAAAABVUb3RhbENvbXBsZXRlZFJlbnRhbHMAAAA=",
        "AAAAAQAAAAAAAAAAAAAADlVzZXJSZXB1dGF0aW9uAAAAAAAEAAAAAAAAABBvd25lcl9yYXRpbmdfc3VtAAAABAAAAAAAAAASb3duZXJfcmV2aWV3X2NvdW50AAAAAAAEAAAAAAAAABFyZW50ZXJfcmF0aW5nX3N1bQAAAAAAAAQAAAAAAAAAE3JlbnRlcl9yZXZpZXdfY291bnQAAAAABA==",
        "AAAAAQAAAAAAAAAAAAAAD0NvbXBsZXRlZFJlbnRhbAAAAAAGAAAAAAAAAAxlcXVpcG1lbnRfaWQAAAAEAAAAAAAAAAVvd25lcgAAAAAAABMAAAAAAAAACXJlbnRhbF9pZAAAAAAAAAQAAAAAAAAABnJlbnRlcgAAAAAAEwAAAAAAAAARcmV2aWV3ZWRfYnlfb3duZXIAAAAAAAABAAAAAAAAABJyZXZpZXdlZF9ieV9yZW50ZXIAAAAAAAE=",
        "AAAAAAAAAEpJbml0aWFsaXplIHRoZSBjb250cmFjdCB3aXRoIGFuIGFkbWluIGFuZCB0aGUgbWFpbiByZW50YWwgY29udHJhY3QgYWRkcmVzcwAAAAAABGluaXQAAAACAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAAD3JlbnRhbF9jb250cmFjdAAAAAATAAAAAA==",
        "AAAAAAAAAC5VcGdyYWRlIGNvbnRyYWN0IFdBU00gc291cmNlIGNvZGUgKEFkbWluIG9ubHkpAAAAAAAHdXBncmFkZQAAAAABAAAAAAAAAA1uZXdfd2FzbV9oYXNoAAAAAAAD7gAAACAAAAAA",
        "AAAAAAAAAE5SZXRyaWV2ZSBhIHNwZWNpZmljIHJldmlldyBkZXRhaWxzIGJ5IGNvbXBsZXRlZCByZW50YWwgSUQgYW5kIHJldmlld2VyIGFkZHJlc3MAAAAAAApnZXRfcmV2aWV3AAAAAAACAAAAAAAAABNjb21wbGV0ZWRfcmVudGFsX2lkAAAAAAQAAAAAAAAACHJldmlld2VyAAAAEwAAAAEAAAPoAAAH0AAAAAZSZXZpZXcAAA==",
        "AAAAAAAAAGdTdWJtaXQgcmF0aW5nIGFuZCByZXZpZXcgY29tbWVudCBmb3IgYSBjb21wbGV0ZWQgcmVudGFsLiBSZW50ZXIgcmV2aWV3cyBvd25lciwgb3Igb3duZXIgcmV2aWV3cyByZW50ZXIuAAAAAA1zdWJtaXRfcmV2aWV3AAAAAAAABAAAAAAAAAAIcmV2aWV3ZXIAAAATAAAAAAAAABNjb21wbGV0ZWRfcmVudGFsX2lkAAAAAAQAAAAAAAAABnJhdGluZwAAAAAABAAAAAAAAAAHY29tbWVudAAAAAAQAAAAAA==",
        "AAAAAAAAADNSZWFkIHJlcHV0YXRpb24gbWV0cmljcyBmb3IgYSBzcGVjaWZpYyB1c2VyIGFkZHJlc3MAAAAADmdldF9yZXB1dGF0aW9uAAAAAAABAAAAAAAAAAR1c2VyAAAAEwAAAAEAAAPoAAAH0AAAAA5Vc2VyUmVwdXRhdGlvbgAA",
        "AAAAAAAAAClSZWFkIGNvbXBsZXRlZCByZW50YWwgdHJhbnNhY3Rpb24gZGV0YWlscwAAAAAAABRnZXRfY29tcGxldGVkX3JlbnRhbAAAAAEAAAAAAAAAE2NvbXBsZXRlZF9yZW50YWxfaWQAAAAABAAAAAEAAAPoAAAH0AAAAA9Db21wbGV0ZWRSZW50YWwA",
        "AAAAAAAAAFlSZWdpc3RlciBhIGNvbXBsZXRlZCByZW50YWwgc2VxdWVuY2UuIENhbiBvbmx5IGJlIGludm9rZWQgYnkgdGhlIHJlbnRhbCBjb250cmFjdCBhZGRyZXNzLgAAAAAAABlyZWdpc3Rlcl9jb21wbGV0ZWRfcmVudGFsAAAAAAAABAAAAAAAAAAJcmVudGFsX2lkAAAAAAAABAAAAAAAAAAMZXF1aXBtZW50X2lkAAAABAAAAAAAAAAGcmVudGVyAAAAAAATAAAAAAAAAAVvd25lcgAAAAAAABMAAAAA",
        "AAAAAAAAACRSZWFkIHRvdGFsIGNvbXBsZXRlZCByZW50YWxzIGNvdW50ZXIAAAAbZ2V0X3RvdGFsX2NvbXBsZXRlZF9yZW50YWxzAAAAAAAAAAABAAAABA==" ]),
      options
    )
  }
  public readonly fromJSON = {
    init: this.txFromJSON<null>,
        upgrade: this.txFromJSON<null>,
        get_review: this.txFromJSON<Option<Review>>,
        submit_review: this.txFromJSON<null>,
        get_reputation: this.txFromJSON<Option<UserReputation>>,
        get_completed_rental: this.txFromJSON<Option<CompletedRental>>,
        register_completed_rental: this.txFromJSON<null>,
        get_total_completed_rentals: this.txFromJSON<u32>
  }
}