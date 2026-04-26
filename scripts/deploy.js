const hre = require("hardhat");
const fs  = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying ScholarshipDistribution contract...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log(
    "Account balance:",
    (await hre.ethers.provider.getBalance(deployer.address)).toString()
  );

  const ScholarshipDistribution = await hre.ethers.getContractFactory("ScholarshipDistribution");
  const scholarship = await ScholarshipDistribution.deploy();
  await scholarship.waitForDeployment();

  const address = await scholarship.getAddress();
  console.log("ScholarshipDistribution deployed to:", address);

  // -------------------------------------------------------
  // Save ABI + address to frontend/src/contracts/
  // -------------------------------------------------------
  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/ScholarshipDistribution.sol/ScholarshipDistribution.json"
  );

  const frontendContractsDir = path.join(__dirname, "../frontend/src/contracts");
  if (!fs.existsSync(frontendContractsDir)) {
    fs.mkdirSync(frontendContractsDir, { recursive: true });
  }

  // Copy ABI
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const frontendABI = {
    contractName: artifact.contractName,
    abi: artifact.abi,
  };
  fs.writeFileSync(
    path.join(frontendContractsDir, "ScholarshipDistribution.json"),
    JSON.stringify(frontendABI, null, 2)
  );

  // Save address
  const addressConfig = {
    ScholarshipDistribution: address,
    network: hre.network.name,
    deployedAt: new Date().toISOString(),
  };
  fs.writeFileSync(
    path.join(frontendContractsDir, "contract-address.json"),
    JSON.stringify(addressConfig, null, 2)
  );

  console.log("\n✅ ABI and address written to frontend/src/contracts/");
  console.log("   ScholarshipDistribution.json");
  console.log("   contract-address.json");
  console.log("\nDeployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
