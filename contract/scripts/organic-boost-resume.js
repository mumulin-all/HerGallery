/**
 * organic-boost-resume.js
 * Resumes where organic-boost.js left off:
 *  - SUB #20 in EXH #2
 *  - All of EXH #3, #4, #5, #6, #7
 * Uses fresh wallets (no collision with previous run).
 */
const hre = require("hardhat");
const { ethers } = hre;

const PROXY = "0xb8e2a851B52Ab5887E4e9677C6fe2A3ACa2Dc0BF";

// Targets reflect REMAINING work (current state verified before this run)
const PLAN = {
  2: {
    tip: "0",   // already tipped
    subs: {
      20: { rec: 21, wit: 12 },  // currently 0/0
      // 21 is pending, skip
    },
  },
  3: { // 是妳呀
    tip: "0.018",
    subs: {
      1:  { rec: 28, wit: 16 },  // currently 1/1
      3:  { rec: 26, wit: 15 },  // currently 1/0
      4:  { rec: 25, wit: 14 },  // currently 1/0
      10: { rec: 24, wit: 13 },  // currently 1/0
      11: { rec: 22, wit: 12 },  // currently 0/0
      12: { rec: 21, wit: 11 },  // currently 0/0
      13: { rec: 23, wit: 12 },  // currently 0/0
      14: { rec: 20, wit: 11 },  // currently 0/0
      15: { rec: 19, wit: 10 },  // currently 0/0
    },
  },
  4: {
    tip: "0.005",
    subs: {
      8: { rec: 12, wit: 7 },
      9: { rec: 10, wit: 6 },
    },
  },
  5: {
    tip: "0.004",
    subs: {},
  },
  6: {
    tip: "0.005",
    subs: {
      2: { rec: 12, wit: 7 },  // currently 2/1
    },
  },
  7: {
    tip: "0.002",
    subs: {
      6: { rec: 5, wit: 3 },
    },
  },
};

const GAS_BUDGET = ethers.parseEther("0.006");
const WALLET_COUNT = 32;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function sendTx(label, txPromise) {
  process.stdout.write(`  ${label}... `);
  try {
    const tx = await txPromise;
    const receipt = await tx.wait();
    console.log(`✓ ${receipt.hash.slice(0, 14)}…`);
    return true;
  } catch (err) {
    console.log(`✗ ${err.reason || err.shortMessage || err.message}`);
    return false;
  }
}

async function main() {
  const [funder] = await ethers.getSigners();
  const contract  = await ethers.getContractAt("HerGallery", PROXY);

  console.log("Funder:", funder.address);
  console.log("Generating", WALLET_COUNT, "fresh wallets...");
  const wallets = Array.from({ length: WALLET_COUNT }, () =>
    ethers.Wallet.createRandom().connect(ethers.provider)
  );

  const total = GAS_BUDGET * BigInt(WALLET_COUNT);
  const bal   = await ethers.provider.getBalance(funder.address);
  console.log(`Funder balance: ${ethers.formatEther(bal)} AVAX`);
  console.log(`Funding ${WALLET_COUNT} wallets = ${ethers.formatEther(total)} AVAX`);
  if (bal < total) throw new Error("Insufficient funder balance");

  // Fund all wallets in parallel batches of 8 to avoid nonce issues
  process.stdout.write("Funding wallets");
  const BATCH = 8;
  let nonce = await ethers.provider.getTransactionCount(funder.address);
  const receipts = [];
  for (let i = 0; i < wallets.length; i += BATCH) {
    const batch = wallets.slice(i, i + BATCH);
    const txs = await Promise.all(batch.map((w, j) =>
      funder.sendTransaction({ to: w.address, value: GAS_BUDGET, nonce: nonce + i + j })
    ));
    const rs = await Promise.all(txs.map(tx => tx.wait()));
    receipts.push(...rs);
    process.stdout.write(".");
  }
  console.log(" done");

  let totalRec = 0, totalWit = 0, totalTip = 0n;

  for (const [exhIdStr, exhPlan] of Object.entries(PLAN)) {
    const exhibitionId = Number(exhIdStr);
    console.log(`\n══ Exhibition #${exhibitionId} ══`);

    // Tip
    if (exhPlan.tip !== "0") {
      const tipAmount = ethers.parseEther(exhPlan.tip);
      await sendTx(
        `tipExhibition ${exhPlan.tip} AVAX`,
        contract.connect(funder).tipExhibition(exhibitionId, { value: tipAmount })
      );
      totalTip += tipAmount;
    }

    for (const [subIdStr, target] of Object.entries(exhPlan.subs)) {
      const submissionId = Number(subIdStr);

      let sub;
      try {
        sub = await contract.getSubmission(submissionId);
      } catch {
        console.log(`  SUB #${submissionId} not found, skipping`);
        continue;
      }

      if (sub.status !== 1n) {
        console.log(`  SUB #${submissionId} "${sub.title}" not approved (status=${sub.status}), skipping`);
        continue;
      }

      const currentRec = Number(sub.recommendCount);
      const currentWit = Number(sub.witnessCount);
      const needRec    = Math.max(0, target.rec - currentRec);
      const needWit    = Math.max(0, target.wit - currentWit);

      console.log(`  SUB #${submissionId} "${sub.title.slice(0, 40)}"`);
      console.log(`    rec: ${currentRec} → ${target.rec} (need +${needRec})`);
      console.log(`    wit: ${currentWit} → ${target.wit} (need +${needWit})`);

      if (needRec === 0 && needWit === 0) {
        console.log("    already at target");
        continue;
      }

      // Fresh wallets have never interacted with contract, no need to check hasRecommended
      const shuffled = shuffle(wallets);
      const recCandidates = shuffled.slice(0, needRec);
      const witCandidates = shuffled.slice(0, needWit);

      if (recCandidates.length < needRec)
        console.log(`    ⚠ only ${recCandidates.length} wallets for rec`);
      if (witCandidates.length < needWit)
        console.log(`    ⚠ only ${witCandidates.length} wallets for wit`);

      const maxOps = Math.max(recCandidates.length, witCandidates.length);
      for (let i = 0; i < maxOps; i++) {
        if (i < recCandidates.length) {
          const ok = await sendTx(
            `rec #${submissionId} [${i + 1}/${recCandidates.length}]`,
            contract.connect(recCandidates[i]).recommend(exhibitionId, submissionId)
          );
          if (ok) totalRec++;
        }
        if (i < witCandidates.length) {
          const ok = await sendTx(
            `wit #${submissionId} [${i + 1}/${witCandidates.length}]`,
            contract.connect(witCandidates[i]).witness(submissionId)
          );
          if (ok) totalWit++;
        }
      }
    }
  }

  console.log("\n══════════════════════════════");
  console.log(`Total recommends added : ${totalRec}`);
  console.log(`Total witnesses added  : ${totalWit}`);
  console.log(`Total tips sent        : ${ethers.formatEther(totalTip)} AVAX`);

  // Final snapshot
  console.log("\nFinal state:");
  for (const exhIdStr of Object.keys(PLAN)) {
    const eid = Number(exhIdStr);
    try {
      const e = await contract.getExhibition(eid);
      console.log(`  EXH #${eid} "${e.title}" tipPool=${ethers.formatEther(e.tipPool)} AVAX`);
      for (const subIdStr of Object.keys(PLAN[exhIdStr].subs)) {
        const sid = Number(subIdStr);
        try {
          const s = await contract.getSubmission(sid);
          console.log(`    SUB #${sid} "${s.title.slice(0,40)}" rec=${s.recommendCount} wit=${s.witnessCount}`);
        } catch {}
      }
    } catch {}
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
