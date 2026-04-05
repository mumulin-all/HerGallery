const hre = require("hardhat");
const { ethers } = hre;

const PROXY_ADDRESS = "0xb8e2a851B52Ab5887E4e9677C6fe2A3ACa2Dc0BF";
const EXHIBITION_ID = 2;
const SUBMISSION_ID = 5;
const WALLET_COUNT = 15;
// Gas money per wallet: 0.002 AVAX should cover recommend tx (~21000 gas * high gas price)
const GAS_BUDGET = ethers.parseEther("0.002");

async function main() {
  const [funder] = await ethers.getSigners();
  console.log("Funder:", funder.address);

  const balance = await ethers.provider.getBalance(funder.address);
  const required = GAS_BUDGET * BigInt(WALLET_COUNT);
  console.log(`Funder balance:  ${ethers.formatEther(balance)} AVAX`);
  console.log(`Required for gas: ${ethers.formatEther(required)} AVAX (${WALLET_COUNT} wallets × ${ethers.formatEther(GAS_BUDGET)} each)`);

  if (balance < required) {
    throw new Error("Funder does not have enough AVAX to cover gas for all wallets");
  }

  const contract = await ethers.getContractAt("HerGallery", PROXY_ADDRESS);

  // Check submission status
  const submission = await contract.getSubmission(SUBMISSION_ID);
  if (submission.status !== 1n) {
    throw new Error(`Submission #${SUBMISSION_ID} is not approved (status=${submission.status}). Cannot recommend.`);
  }
  console.log(`\nSubmission #${SUBMISSION_ID} "${submission.title}"`);
  console.log(`  recommendCount before: ${submission.recommendCount}`);

  // Generate wallets
  const wallets = Array.from({ length: WALLET_COUNT }, () => ethers.Wallet.createRandom().connect(ethers.provider));
  console.log(`\nGenerated ${WALLET_COUNT} random wallets.`);

  let successCount = 0;

  for (let i = 0; i < wallets.length; i++) {
    const wallet = wallets[i];
    console.log(`\n[${i + 1}/${WALLET_COUNT}] ${wallet.address}`);

    // Fund the wallet
    process.stdout.write("  Funding... ");
    const fundTx = await funder.sendTransaction({
      to: wallet.address,
      value: GAS_BUDGET,
    });
    await fundTx.wait();
    process.stdout.write("done\n");

    // Check if already recommended (shouldn't be, but safety check)
    const already = await contract.hasRecommended(SUBMISSION_ID, wallet.address);
    if (already) {
      console.log("  Already recommended, skipping.");
      continue;
    }

    // Recommend
    process.stdout.write("  Recommending... ");
    try {
      const walletContract = contract.connect(wallet);
      const tx = await walletContract.recommend(EXHIBITION_ID, SUBMISSION_ID);
      const receipt = await tx.wait();
      console.log(`done (tx: ${receipt.hash})`);
      successCount++;
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
    }
  }

  // Final state
  const updated = await contract.getSubmission(SUBMISSION_ID);
  console.log(`\n===== Done =====`);
  console.log(`Successful recommends: ${successCount}/${WALLET_COUNT}`);
  console.log(`recommendCount after:  ${updated.recommendCount}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
