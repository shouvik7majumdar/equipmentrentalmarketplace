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
    contractId: "CCWU6TT5NKH43SW72I6XISHBBGL4H7UX74QCMJIACE6SVJW6K27NGNNY",
  }
} as const

export type DataKey = {tag: "Admin", values: void} | {tag: "Token", values: void} | {tag: "TotalEquipment", values: void} | {tag: "Equipment", values: readonly [u32]};


export interface Equipment {
  deposit: i128;
  description: string;
  id: u32;
  owner: string;
  price_per_day: i128;
  rent_start_time: u64;
  rental_days: u32;
  renter: Option<string>;
  status: RentalStatus;
  title: string;
}

export enum RentalStatus {
  Available = 0,
  Rented = 1,
  Returned = 2,
}

export interface Client {
  /**
   * Construct and simulate a init transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Initialize the contract with an admin and the payment token address (e.g. native SAC or custom token)
   */
  init: ({admin, token_address}: {admin: string, token_address: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_equipment transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Read equipment state
   */
  get_equipment: ({id}: {id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Option<Equipment>>>

  /**
   * Construct and simulate a list_equipment transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * List a new piece of equipment for rent
   */
  list_equipment: ({owner, title, description, price_per_day, deposit}: {owner: string, title: string, description: string, price_per_day: i128, deposit: i128}, options?: MethodOptions) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a rent_equipment transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Rent a piece of equipment for a specified number of days
   */
  rent_equipment: ({renter, id, days}: {renter: string, id: u32, days: u32}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a resolve_rental transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Owner inspects equipment, refunds the security deposit (minus damages), and collects rental payout
   */
  resolve_rental: ({owner, id, refund_deposit, claim_deposit}: {owner: string, id: u32, refund_deposit: i128, claim_deposit: i128}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a return_equipment transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Renter signals return of the equipment, pending owner inspection and resolution
   */
  return_equipment: ({renter, id}: {renter: string, id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_total_equipment transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Read total equipment listed
   */
  get_total_equipment: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>

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
      new ContractSpec([ "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABAAAAAAAAAAAAAAABUFkbWluAAAAAAAAAAAAAAAAAAAFVG9rZW4AAAAAAAAAAAAAAAAAAA5Ub3RhbEVxdWlwbWVudAAAAAAAAQAAAAAAAAAJRXF1aXBtZW50AAAAAAAAAQAAAAQ=",
        "AAAAAQAAAAAAAAAAAAAACUVxdWlwbWVudAAAAAAAAAoAAAAAAAAAB2RlcG9zaXQAAAAACwAAAAAAAAALZGVzY3JpcHRpb24AAAAAEAAAAAAAAAACaWQAAAAAAAQAAAAAAAAABW93bmVyAAAAAAAAEwAAAAAAAAANcHJpY2VfcGVyX2RheQAAAAAAAAsAAAAAAAAAD3JlbnRfc3RhcnRfdGltZQAAAAAGAAAAAAAAAAtyZW50YWxfZGF5cwAAAAAEAAAAAAAAAAZyZW50ZXIAAAAAA+gAAAATAAAAAAAAAAZzdGF0dXMAAAAAB9AAAAAMUmVudGFsU3RhdHVzAAAAAAAAAAV0aXRsZQAAAAAAABA=",
        "AAAAAAAAAGVJbml0aWFsaXplIHRoZSBjb250cmFjdCB3aXRoIGFuIGFkbWluIGFuZCB0aGUgcGF5bWVudCB0b2tlbiBhZGRyZXNzIChlLmcuIG5hdGl2ZSBTQUMgb3IgY3VzdG9tIHRva2VuKQAAAAAAAARpbml0AAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAA10b2tlbl9hZGRyZXNzAAAAAAAAEwAAAAA=",
        "AAAAAwAAAAAAAAAAAAAADFJlbnRhbFN0YXR1cwAAAAMAAAAAAAAACUF2YWlsYWJsZQAAAAAAAAAAAAAAAAAABlJlbnRlZAAAAAAAAQAAAAAAAAAIUmV0dXJuZWQAAAAC",
        "AAAAAAAAABRSZWFkIGVxdWlwbWVudCBzdGF0ZQAAAA1nZXRfZXF1aXBtZW50AAAAAAAAAQAAAAAAAAACaWQAAAAAAAQAAAABAAAD6AAAB9AAAAAJRXF1aXBtZW50AAAA",
        "AAAAAAAAACZMaXN0IGEgbmV3IHBpZWNlIG9mIGVxdWlwbWVudCBmb3IgcmVudAAAAAAADmxpc3RfZXF1aXBtZW50AAAAAAAFAAAAAAAAAAVvd25lcgAAAAAAABMAAAAAAAAABXRpdGxlAAAAAAAAEAAAAAAAAAALZGVzY3JpcHRpb24AAAAAEAAAAAAAAAANcHJpY2VfcGVyX2RheQAAAAAAAAsAAAAAAAAAB2RlcG9zaXQAAAAACwAAAAEAAAAE",
        "AAAAAAAAADhSZW50IGEgcGllY2Ugb2YgZXF1aXBtZW50IGZvciBhIHNwZWNpZmllZCBudW1iZXIgb2YgZGF5cwAAAA5yZW50X2VxdWlwbWVudAAAAAAAAwAAAAAAAAAGcmVudGVyAAAAAAATAAAAAAAAAAJpZAAAAAAABAAAAAAAAAAEZGF5cwAAAAQAAAAA",
        "AAAAAAAAAGJPd25lciBpbnNwZWN0cyBlcXVpcG1lbnQsIHJlZnVuZHMgdGhlIHNlY3VyaXR5IGRlcG9zaXQgKG1pbnVzIGRhbWFnZXMpLCBhbmQgY29sbGVjdHMgcmVudGFsIHBheW91dAAAAAAADnJlc29sdmVfcmVudGFsAAAAAAAEAAAAAAAAAAVvd25lcgAAAAAAABMAAAAAAAAAAmlkAAAAAAAEAAAAAAAAAA5yZWZ1bmRfZGVwb3NpdAAAAAAACwAAAAAAAAANY2xhaW1fZGVwb3NpdAAAAAAAAAsAAAAA",
        "AAAAAAAAAE9SZW50ZXIgc2lnbmFscyByZXR1cm4gb2YgdGhlIGVxdWlwbWVudCwgcGVuZGluZyBvd25lciBpbnNwZWN0aW9uIGFuZCByZXNvbHV0aW9uAAAAABByZXR1cm5fZXF1aXBtZW50AAAAAgAAAAAAAAAGcmVudGVyAAAAAAATAAAAAAAAAAJpZAAAAAAABAAAAAA=",
        "AAAAAAAAABtSZWFkIHRvdGFsIGVxdWlwbWVudCBsaXN0ZWQAAAAAE2dldF90b3RhbF9lcXVpcG1lbnQAAAAAAAAAAAEAAAAE" ]),
      options
    )
  }
  public readonly fromJSON = {
    init: this.txFromJSON<null>,
        get_equipment: this.txFromJSON<Option<Equipment>>,
        list_equipment: this.txFromJSON<u32>,
        rent_equipment: this.txFromJSON<null>,
        resolve_rental: this.txFromJSON<null>,
        return_equipment: this.txFromJSON<null>,
        get_total_equipment: this.txFromJSON<u32>
  }
}