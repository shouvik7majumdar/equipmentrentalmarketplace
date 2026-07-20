import {
  rpc,
  Contract,
  Address,
  scValToNative,
  nativeToScVal,
  TransactionBuilder,
  Account,
  Operation,
  Horizon,
  Networks
} from "@stellar/stellar-sdk";

export const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID || "";
export const REVIEW_REGISTRY_ID = process.env.NEXT_PUBLIC_REVIEW_REGISTRY_ID || "";
export const TOKEN_ADDRESS = process.env.NEXT_PUBLIC_TOKEN_ADDRESS || "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
export const NETWORK = process.env.NEXT_PUBLIC_NETWORK || "testnet";
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://soroban-testnet.stellar.org";
export const NETWORK_PASSPHRASE = process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE || "Test SDF Network ; September 2015";

// Native XLM has 7 decimals
export const DECIMALS = 7;

export function toStroops(amount: number | string): bigint {
  const num = parseFloat(amount.toString());
  return BigInt(Math.round(num * 10000000));
}

export function fromStroops(stroops: bigint | string | number): number {
  return parseFloat(stroops.toString()) / 10000000;
}

/**
 * Call a read-only contract function.
 */
export async function callReadOnly(functionName: string, args: any[] = [], contractId: string = CONTRACT_ID) {
  try {
    const server = new rpc.Server(RPC_URL);
    // Use a dummy account for simulation
    const dummyAccount = new Account("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF", "0");
    let tx = new TransactionBuilder(dummyAccount, {
      fee: "100",
      networkPassphrase: NETWORK_PASSPHRASE
    })
    .addOperation(
      Operation.invokeContractFunction({
        contract: contractId,
        function: functionName,
        args: args
      })
    )
    .setTimeout(0)
    .build();

    const response = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationSuccess(response)) {
      if (response.result && response.result.retval) {
        return scValToNative(response.result.retval);
      }
    } else {
      console.error("Simulation failed response:", response);
    }
    return null;
  } catch (error) {
    console.error(`Error in callReadOnly for ${functionName}:`, error);
    return null;
  }
}

/**
 * Prepare an invocation transaction for a write operation, simulating resource limits.
 */
export async function prepareInvokeTransaction(
  sourceAddress: string,
  functionName: string,
  args: any[] = [],
  contractId: string = CONTRACT_ID
) {
  const server = new rpc.Server(RPC_URL);
  const horizon = new Horizon.Server("https://horizon-testnet.stellar.org");
  const sourceAccount = await horizon.loadAccount(sourceAddress);

  let tx = new TransactionBuilder(sourceAccount, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE
  })
  .addOperation(
    Operation.invokeContractFunction({
      contract: contractId,
      function: functionName,
      args: args
    })
  )
  .setTimeout(30)
  .build();

  tx = await server.prepareTransaction(tx);
  return tx;
}

/**
 * Submit signed transaction XDR and poll for consensus.
 */
export async function submitSignedTransaction(signedTxXdr: string) {
  const server = new rpc.Server(RPC_URL);
  const tx = TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);
  const response = await server.sendTransaction(tx);

  if (response.status === "PENDING") {
    const txHash = response.hash;
    // Poll for status
    for (let i = 0; i < 20; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const txResult = await server.getTransaction(txHash);
      if (txResult.status === "SUCCESS") {
        return {
          hash: txHash,
          success: true,
          resultValue: txResult.returnValue ? scValToNative(txResult.returnValue) : null,
          events: txResult.events
        };
      } else if (txResult.status === "FAILED") {
        console.error("Transaction result failed XDR:", txResult.resultXdr);
        throw new Error("Transaction execution failed in the ledger");
      }
    }
    throw new Error("Transaction polling timed out");
  } else {
    console.error("Transaction submission failed response:", response);
    throw new Error(
      response.errorResult
        ? `Submission failed: ${response.errorResult}`
        : "Failed to submit transaction to RPC node"
    );
  }
}

/**
 * Fetch native XLM balance using Horizon.
 */
export async function getXlmBalance(address: string): Promise<number> {
  try {
    const horizon = new Horizon.Server("https://horizon-testnet.stellar.org");
    const account = await horizon.loadAccount(address);
    const nativeBal = account.balances.find((b) => b.asset_type === "native");
    return nativeBal ? parseFloat(nativeBal.balance) : 0;
  } catch (error) {
    console.error("Error fetching XLM balance:", error);
    return 0;
  }
}

/**
 * Retrieve listed equipment details.
 */
export async function getEquipmentDetails(id: number) {
  const argVal = nativeToScVal(id, { type: "u32" });
  return await callReadOnly("get_equipment", [argVal]);
}

/**
 * Fetch all equipment listed on the contract.
 */
export async function getAllEquipment() {
  const total = (await callReadOnly("get_total_equipment")) as number;
  if (!total) return [];

  const equipmentList = [];
  for (let i = 1; i <= total; i++) {
    const eq = await getEquipmentDetails(i);
    if (eq) {
      equipmentList.push(eq);
    }
  }
  return equipmentList;
}

/**
 * Get total completed rentals sequence counter.
 */
export async function getTotalCompletedRentals(): Promise<number> {
  if (!REVIEW_REGISTRY_ID) return 0;
  const res = await callReadOnly("get_total_completed_rentals", [], REVIEW_REGISTRY_ID);
  return typeof res === "number" ? res : 0;
}

/**
 * Get completed rental details.
 */
export async function getCompletedRental(id: number) {
  if (!REVIEW_REGISTRY_ID) return null;
  const argVal = nativeToScVal(id, { type: "u32" });
  return await callReadOnly("get_completed_rental", [argVal], REVIEW_REGISTRY_ID);
}

/**
 * Fetch all completed rentals registered in the review contract.
 */
export async function getAllCompletedRentals() {
  const total = await getTotalCompletedRentals();
  if (!total) return [];

  const list = [];
  for (let i = 1; i <= total; i++) {
    const item = await getCompletedRental(i);
    if (item) {
      list.push(item);
    }
  }
  return list;
}

/**
 * Fetch user reputation from review registry.
 */
export async function getUserReputation(address: string) {
  if (!REVIEW_REGISTRY_ID) return null;
  const argVal = nativeToScVal(address, { type: "address" });
  return await callReadOnly("get_reputation", [argVal], REVIEW_REGISTRY_ID);
}

/**
 * Retrieve review content.
 */
export async function getReview(completedRentalId: number, reviewer: string) {
  if (!REVIEW_REGISTRY_ID) return null;
  const arg1 = nativeToScVal(completedRentalId, { type: "u32" });
  const arg2 = nativeToScVal(reviewer, { type: "address" });
  return await callReadOnly("get_review", [arg1, arg2], REVIEW_REGISTRY_ID);
}
