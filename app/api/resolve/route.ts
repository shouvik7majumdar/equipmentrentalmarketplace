import { NextRequest, NextResponse } from "next/server";
import {
  rpc,
  nativeToScVal,
  TransactionBuilder,
  Keypair,
  Operation,
  Horizon
} from "@stellar/stellar-sdk";
import { CONTRACT_ID, RPC_URL, NETWORK_PASSPHRASE } from "@/lib/stellar";

const DEPLOYER_SECRET = "SCLJ5EIZMWUWOZM7PZIFDGNUG2TUMZQSP7ZURDH6IJ3K2LRZZRLMZEWN";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { equipmentId, refund, claim } = body;

    if (equipmentId === undefined || refund === undefined || claim === undefined) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const keypair = Keypair.fromSecret(DEPLOYER_SECRET);
    const deployerAddress = keypair.publicKey();

    const server = new rpc.Server(RPC_URL);
    const horizon = new Horizon.Server("https://horizon-testnet.stellar.org");
    const sourceAccount = await horizon.loadAccount(deployerAddress);

    // Convert XLM amounts to Stroops (1 XLM = 10,000,000 Stroops)
    const refundStroops = BigInt(Math.round(parseFloat(refund.toString()) * 10000000));
    const claimStroops = BigInt(Math.round(parseFloat(claim.toString()) * 10000000));

    // Prepare arguments: resolve_rental(owner, equipment_id, refund_deposit, claim_deposit)
    const args = [
      nativeToScVal(deployerAddress, { type: "address" }),
      nativeToScVal(parseInt(equipmentId.toString()), { type: "u32" }),
      nativeToScVal(refundStroops.toString(), { type: "i128" }),
      nativeToScVal(claimStroops.toString(), { type: "i128" }),
    ];

    let tx = new TransactionBuilder(sourceAccount, {
      fee: "1000",
      networkPassphrase: NETWORK_PASSPHRASE
    })
    .addOperation(
      Operation.invokeContractFunction({
        contract: CONTRACT_ID,
        function: "resolve_rental",
        args: args
      })
    )
    .setTimeout(30)
    .build();

    // Prepare (simulate resources)
    tx = await server.prepareTransaction(tx);

    // Sign with deployer secret key
    tx.sign(keypair);

    // Submit
    const response = await server.sendTransaction(tx);

    if (response.status === "PENDING") {
      const txHash = response.hash;
      let success = false;
      
      // Poll status (15 iterations = 30 seconds max)
      for (let i = 0; i < 15; i++) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const txResult = await server.getTransaction(txHash);
        if (txResult.status === "SUCCESS") {
          success = true;
          break;
        } else if (txResult.status === "FAILED") {
          throw new Error("Transaction execution failed on-ledger");
        }
      }

      if (success) {
        return NextResponse.json({ success: true, hash: txHash });
      } else {
        throw new Error("Transaction timed out polling for consensus");
      }
    } else {
      throw new Error(`Transaction failed: ${response.status}`);
    }
  } catch (error: any) {
    console.error("Resolve API error:", error);
    return NextResponse.json({ error: error.message || "Failed to resolve rental" }, { status: 500 });
  }
}
