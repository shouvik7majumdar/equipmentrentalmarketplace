const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const stellarCli = path.resolve(__dirname, '../stellar.exe');
const configPath = path.resolve(__dirname, '../lib/config.json');

function runCmd(cmd) {
  console.log(`Running: ${cmd}`);
  try {
    return execSync(cmd, { stdio: 'pipe' }).toString().trim();
  } catch (error) {
    if (error.stderr) console.error(error.stderr.toString());
    if (error.stdout) console.error(error.stdout.toString());
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const target = args[0] || 'rental'; // 'rental' or 'review_registry'
  
  if (target !== 'rental' && target !== 'review') {
    console.error("Please specify upgrade target: 'rental' or 'review'");
    process.exit(1);
  }

  if (!fs.existsSync(configPath)) {
    console.error("config.json not found. Run deploy.js first.");
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath));
  const contractId = target === 'rental' ? config.CONTRACT_ID : config.REVIEW_REGISTRY_ID;
  const wasmFile = target === 'rental' ? 'rental.wasm' : 'review_registry.wasm';
  const wasmPath = path.resolve(__dirname, `../contracts/rental/target/wasm32v1-none/release/${wasmFile}`);

  console.log(`Upgrading ${target} contract (${contractId}) using WASM: ${wasmPath}`);

  // 1. Install the WASM to get the hash
  console.log("Installing updated WASM binary to Stellar Testnet...");
  const wasmHash = runCmd(`"${stellarCli}" contract install --wasm "${wasmPath}" --source deployer --network testnet`);
  console.log(`WASM installed! Hash: ${wasmHash}`);

  // 2. Call the upgrade function of the contract
  console.log(`Invoking upgrade function on contract ${contractId}...`);
  const output = runCmd(
    `"${stellarCli}" contract invoke --id "${contractId}" --source deployer --network testnet -- upgrade --new_wasm_hash "${wasmHash}"`
  );

  console.log("Contract successfully upgraded on ledger!");
  console.log("Output details:", output);
}

main().catch(err => {
  console.error("Upgrade failed:", err);
  process.exit(1);
});
