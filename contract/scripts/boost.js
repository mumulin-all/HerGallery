const hre = require("hardhat");

const PROXY_ADDRESS = "0xb8e2a851B52Ab5887E4e9677C6fe2A3ACa2Dc0BF";
const TARGET_EXHIBITION_TITLE = "云吃吃";
const TARGET_SUBMISSION_TITLE = "云吃吃原帖文字内容";

// Amount to tip (in AVAX)
const TIP_AMOUNT = hre.ethers.parseEther("0.005");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log("Signer:", signer.address);

  const contract = await hre.ethers.getContractAt("HerGallery", PROXY_ADDRESS, signer);

  // --- Find target exhibition ---
  const exhibitions = await contract.getAllExhibitions();
  const exhibition = exhibitions.find((e) =>
    e.title.includes(TARGET_EXHIBITION_TITLE)
  );

  if (!exhibition) {
    const titles = exhibitions.map((e) => `#${e.id}: ${e.title}`).join("\n");
    throw new Error(
      `Exhibition containing "${TARGET_EXHIBITION_TITLE}" not found.\nAvailable:\n${titles}`
    );
  }

  const exhibitionId = Number(exhibition.id);
  console.log(`\nFound exhibition #${exhibitionId}: "${exhibition.title}"`);
  console.log(`  Current tipPool: ${hre.ethers.formatEther(exhibition.tipPool)} AVAX`);
  console.log(`  submissionCount: ${exhibition.submissionCount}`);

  // --- Find target submission ---
  const submissions = await contract.getSubmissions(exhibitionId);
  const submission = submissions.find((s) =>
    s.title.includes(TARGET_SUBMISSION_TITLE)
  );

  if (!submission) {
    const titles = submissions.map((s) => `#${s.id}: "${s.title}" [status=${s.status}]`).join("\n");
    throw new Error(
      `Submission containing "${TARGET_SUBMISSION_TITLE}" not found in exhibition #${exhibitionId}.\nAvailable:\n${titles}`
    );
  }

  const submissionId = Number(submission.id);
  console.log(`\nFound submission #${submissionId}: "${submission.title}"`);
  console.log(`  status:         ${submission.status} (0=pending,1=approved,2=rejected)`);
  console.log(`  recommendCount: ${submission.recommendCount}`);
  console.log(`  witnessCount:   ${submission.witnessCount}`);

  // --- Tip the exhibition ---
  console.log(`\n[1/2] Tipping exhibition #${exhibitionId} with ${hre.ethers.formatEther(TIP_AMOUNT)} AVAX...`);
  const tipTx = await contract.tipExhibition(exhibitionId, { value: TIP_AMOUNT });
  const tipReceipt = await tipTx.wait();
  console.log(`  ✓ tipExhibition tx: ${tipReceipt.hash}`);

  // Verify updated tipPool
  const updatedExhibition = await contract.getExhibition(exhibitionId);
  console.log(`  tipPool now: ${hre.ethers.formatEther(updatedExhibition.tipPool)} AVAX`);

  // --- Recommend the submission ---
  // Check if already recommended
  const alreadyRecommended = await contract.hasRecommended(submissionId, signer.address);
  if (alreadyRecommended) {
    console.log(`\n[2/2] Already recommended submission #${submissionId} from this address, skipping.`);
  } else {
    console.log(`\n[2/2] Recommending submission #${submissionId}...`);
    const recTx = await contract.recommend(exhibitionId, submissionId);
    const recReceipt = await recTx.wait();
    console.log(`  ✓ recommend tx: ${recReceipt.hash}`);

    const updatedSubmission = await contract.getSubmission(submissionId);
    console.log(`  recommendCount now: ${updatedSubmission.recommendCount}`);
  }

  console.log("\nDone!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
