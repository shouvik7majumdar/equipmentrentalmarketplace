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
    throw error;
  }
}

async function main() {
  if (!fs.existsSync(configPath)) {
    console.error("Configuration file config.json not found! Run deploy.js first.");
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath));
  const { CONTRACT_ID, DEPLOYER_ADDRESS } = config;

  console.log(`Seeding marketplace for contract: ${CONTRACT_ID}`);

  // Items to seed (XLM has 7 decimals)
  const items = [
    {
      title: "Caterpillar 320 Excavator",
      description: "20-ton tracked hydraulic excavator, perfect for heavy earthmoving and trenching.",
      price: 25 * 10000000, // 25 XLM
      deposit: 150 * 10000000 // 150 XLM
    },
    {
      title: "Kushlan Portable Concrete Mixer",
      description: "Direct drive concrete mixer with 6 cu ft capacity. Easily transported.",
      price: 8 * 10000000, // 8 XLM
      deposit: 40 * 10000000 // 40 XLM
    },
    {
      title: "Steel Scaffolding Tower Set",
      description: "Double section rolling tower scaffold, reaches up to 12 feet. Safe lock wheels.",
      price: 3 * 10000000, // 3 XLM
      deposit: 20 * 10000000 // 20 XLM
    }
  ];

  for (const item of items) {
    console.log(`Listing: ${item.title}...`);
    // Escape double quotes inside strings for powershell/shell execution
    const titleEscaped = item.title.replace(/"/g, '\\"');
    const descEscaped = item.description.replace(/"/g, '\\"');

    try {
      const output = runCmd(
        `"${stellarCli}" contract invoke --id "${CONTRACT_ID}" --source deployer --network testnet -- list_equipment --owner "${DEPLOYER_ADDRESS}" --title "${titleEscaped}" --description "${descEscaped}" --price_per_day ${item.price} --deposit ${item.deposit}`
      );
      console.log(`Listed successfully! Contract output: ${output}`);
    } catch (e) {
      console.error(`Failed to list item: ${item.title}`);
    }
  }

  console.log("Seeding complete!");
}

main().catch(err => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
