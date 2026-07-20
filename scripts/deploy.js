const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const stellarCli = path.resolve(__dirname, '../stellar.exe');
const wasmPath = path.resolve(__dirname, '../contracts/rental/target/wasm32v1-none/release/rental.wasm');
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

  // 2. Deploy Contract
  console.log(`Deploying Wasm binary: ${wasmPath}`);
  const deployOutput = runCmd(`"${stellarCli}" contract deploy --wasm "${wasmPath}" --source deployer --network testnet`);
  console.log(`Contract deployed! Contract ID: ${deployOutput}`);
  const contractId = deployOutput;

  // 3. Initialize Contract
  // Native XLM token contract address on Stellar Testnet:
  const tokenAddress = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
  console.log("Initializing contract rental marketplace instance...");
  runCmd(`"${stellarCli}" contract invoke --id "${contractId}" --source deployer --network testnet -- init --admin "${deployerAddress}" --token_address "${tokenAddress}"`);
  console.log("Contract initialized successfully!");

  // 4. Generate TS bindings
  const bindingsDir = path.resolve(__dirname, '../packages/rental-client');
  console.log(`Generating TypeScript bindings at ${bindingsDir}...`);
  runCmd(`"${stellarCli}" contract bindings typescript --contract-id "${contractId}" --output-dir "${bindingsDir}" --network testnet --overwrite`);

  // Build binding package
  console.log("Building TS bindings npm package...");
  runCmd(`cd "${bindingsDir}" && npm install && npm run build`);

  // 5. Write configurations
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const configData = {
    CONTRACT_ID: contractId,
    NETWORK: 'testnet',
    RPC_URL: 'https://soroban-testnet.stellar.org',
    NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
    TOKEN_ADDRESS: tokenAddress,
    DEPLOYER_ADDRESS: deployerAddress
  };

  fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));
  console.log(`Config JSON written to: ${configPath}`);

  const envContent = `NEXT_PUBLIC_CONTRACT_ID=${contractId}
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
