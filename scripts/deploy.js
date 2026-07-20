const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const stellarCli = path.resolve(__dirname, '../stellar.exe');
const rentalWasmPath = path.resolve(__dirname, '../contracts/rental/target/wasm32v1-none/release/rental.wasm');
const reviewWasmPath = path.resolve(__dirname, '../contracts/rental/target/wasm32v1-none/release/review_registry.wasm');
const configDir = path.resolve(__dirname, '../lib');
const envPath = path.resolve(__dirname, '../.env.local');
const configPath = path.resolve(configDir, 'config.json');

// Helper to run commands
function runCmd(cmd) {
  console.log(`Running: ${cmd}`);
  try {
    const stdout = execSync(cmd, { stdio: 'pipe' }).toString();
    return stdout.trim();
  } catch (error) {
    console.error(`Command failed: ${cmd}`);
    if (error.stderr) console.error(error.stderr.toString());
    if (error.stdout) console.error(error.stdout.toString());
    throw error;
  }
}

async function main() {
  console.log("Starting Stellar Testnet Smart Contract Deployment...");

  // 1. Generate/fund deployer account if not already configured
  let deployerAddress = '';
  try {
    deployerAddress = runCmd(`"${stellarCli}" keys address deployer`);
    console.log(`Using existing deployer keys: ${deployerAddress}`);
  } catch (e) {
    console.log("Generating and funding new deployer account on Stellar Testnet...");
    runCmd(`"${stellarCli}" keys generate --fund deployer --network testnet`);
    deployerAddress = runCmd(`"${stellarCli}" keys address deployer`);
    console.log(`Generated deployer account: ${deployerAddress}`);
  }

  // 2. Deploy Rental Contract
  console.log(`Deploying Rental Wasm binary: ${rentalWasmPath}`);
  const rentalDeployOutput = runCmd(`"${stellarCli}" contract deploy --wasm "${rentalWasmPath}" --source deployer --network testnet`);
  console.log(`Rental Contract deployed! Contract ID: ${rentalDeployOutput}`);
  const rentalContractId = rentalDeployOutput;

  // 3. Deploy Review Registry Contract
  console.log(`Deploying Review Registry Wasm binary: ${reviewWasmPath}`);
  const reviewDeployOutput = runCmd(`"${stellarCli}" contract deploy --wasm "${reviewWasmPath}" --source deployer --network testnet`);
  console.log(`Review Registry Contract deployed! Contract ID: ${reviewDeployOutput}`);
  const reviewRegistryContractId = reviewDeployOutput;

  // 4. Initialize Rental Contract
  const tokenAddress = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
  console.log("Initializing rental marketplace contract...");
  runCmd(`"${stellarCli}" contract invoke --id "${rentalContractId}" --source deployer --network testnet -- init --admin "${deployerAddress}" --token_address "${tokenAddress}"`);

  // 5. Initialize Review Registry Contract
  console.log("Initializing review registry contract...");
  runCmd(`"${stellarCli}" contract invoke --id "${reviewRegistryContractId}" --source deployer --network testnet -- init --admin "${deployerAddress}" --rental_contract "${rentalContractId}"`);

  // 6. Link Rental contract to Review Registry contract
  console.log("Linking rental contract to review registry...");
  runCmd(`"${stellarCli}" contract invoke --id "${rentalContractId}" --source deployer --network testnet -- set_review_registry --review_registry "${reviewRegistryContractId}"`);

  console.log("Contracts initialized and linked successfully!");

  // 7. Generate TS bindings for Rental contract
  const rentalBindingsDir = path.resolve(__dirname, '../packages/rental-client');
  console.log(`Generating Rental TypeScript bindings at ${rentalBindingsDir}...`);
  runCmd(`"${stellarCli}" contract bindings typescript --contract-id "${rentalContractId}" --output-dir "${rentalBindingsDir}" --network testnet --overwrite`);
  
  console.log("Building Rental TS bindings npm package...");
  runCmd(`cd "${rentalBindingsDir}" && npm install && npm run build`);

  // 8. Generate TS bindings for Review Registry contract
  const reviewBindingsDir = path.resolve(__dirname, '../packages/review-registry-client');
  console.log(`Generating Review Registry TypeScript bindings at ${reviewBindingsDir}...`);
  runCmd(`"${stellarCli}" contract bindings typescript --contract-id "${reviewRegistryContractId}" --output-dir "${reviewBindingsDir}" --network testnet --overwrite`);

  console.log("Building Review Registry TS bindings npm package...");
  runCmd(`cd "${reviewBindingsDir}" && npm install && npm run build`);

  // 9. Write configurations
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const configData = {
    CONTRACT_ID: rentalContractId,
    REVIEW_REGISTRY_ID: reviewRegistryContractId,
    NETWORK: 'testnet',
    RPC_URL: 'https://soroban-testnet.stellar.org',
    NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
    TOKEN_ADDRESS: tokenAddress,
    DEPLOYER_ADDRESS: deployerAddress
  };

  fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));
  console.log(`Config JSON written to: ${configPath}`);

  const envContent = `NEXT_PUBLIC_CONTRACT_ID=${rentalContractId}
NEXT_PUBLIC_REVIEW_REGISTRY_ID=${reviewRegistryContractId}
NEXT_PUBLIC_TOKEN_ADDRESS=${tokenAddress}
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
`;

  fs.writeFileSync(envPath, envContent);
  console.log(`Env variables written to: ${envPath}`);

  console.log("\nDeployment & configuration complete!");
}

main().catch(err => {
  console.error("Deployment failed:", err);
  process.exit(1);
});
