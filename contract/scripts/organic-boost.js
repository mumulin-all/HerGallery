/**
 * organic-boost.js
 * Distributes natural-looking recommends, witnesses, and tips across
 * all live exhibitions.  云吃吃 and 是妳呀 land at the top.
 */
const hre = require("hardhat");
const { ethers } = hre;

const PROXY = "0xb8e2a851B52Ab5887E4e9677C6fe2A3ACa2Dc0BF";

// ── target config ──────────────────────────────────────────────────────────
// Per-exhibition: tip (AVAX string), and per-submission targets.
// recTarget / witTarget are the FINAL counts we want on-chain.
// Submissions not listed here are left untouched.
const PLAN = {
  2: { // 云吃吃
    tip: "0.02",
    subs: {
      5:  { rec: 30, wit: 18 },
      16: { rec: 26, wit: 15 },
      17: { rec: 24, wit: 14 },
      18: { rec: 25, wit: 15 },
      19: { rec: 23, wit: 13 },
      20: { rec: 21, wit: 12 },
    },
  },
  3: { // 是妳呀
    tip: "0.018",
    subs: {
      1:  { rec: 28, wit: 16 },
      3:  { rec: 26, wit: 15 },
      4:  { rec: 25, wit: 14 },
      10: { rec: 24, wit: 13 },
      11: { rec: 22, wit: 12 },
      12: { rec: 21, wit: 11 },
      13: { rec: 23, wit: 12 },
      14: { rec: 20, wit: 11 },
      15: { rec: 19, wit: 10 },
    },
  },
  4: { // 禁烟斗争经验
    tip: "0.005",
    subs: {
      8: { rec: 12, wit: 7 },
      9: { rec: 10, wit: 6 },
    },
  },
  5: { // 消费场景维权经验 (no submissions)
    tip: "0.004",
    subs: {},
  },
  6: { // let's go hiking
    tip: "0.005",
    subs: {
      2: { rec: 12, wit: 7 },
    },
  },
  7: { // "1" – low tier test-ish exhibition
    tip: "0.002",
    subs: {
      6: { rec: 5, wit: 3 },
    },
  },
};

// Wallets get this much AVAX for gas.  Each may do up to ~20 txs.
// 0.006 AVAX covers 20 × 50k gas @ 25 gwei comfortably.
const GAS_BUDGET = ethers.parseEther("0.006");
const WALLET_COUNT = 35;

// ── helpers ────────────────────────────────────────────────────────────────
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

// ── main ───────────────────────────────────────────────────────────────────
async function main() {
  const [funder] = await ethers.getSigners();
  const contract  = await ethers.getContractAt("HerGallery", PROXY);

  console.log("Funder:", funder.address);
  console.log("Generating", WALLET_COUNT, "wallets...");
  const wallets = Array.from({ length: WALLET_COUNT }, () =>
    ethers.Wallet.createRandom().connect(ethers.provider)
  );

  // ── fund all wallets upfront ─────────────────────────────────────────────
  const total = GAS_BUDGET * BigInt(WALLET_COUNT);
  const bal   = await ethers.provider.getBalance(funder.address);
  console.log(`Funder balance: ${ethers.formatEther(bal)} AVAX`);
  console.log(`Funding ${WALLET_COUNT} wallets × ${ethers.formatEther(GAS_BUDGET)} = ${ethers.formatEther(total)} AVAX`);

  if (bal < total) throw new Error("Insufficient funder balance");

  process.stdout.write("Funding wallets");
  for (let i = 0; i < wallets.length; i++) {
    const tx = await funder.sendTransaction({ to: wallets[i].address, value: GAS_BUDGET });
    await tx.wait();
    process.stdout.write(".");
  }
  console.log(" done");

  // ── process each exhibition in plan ──────────────────────────────────────
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

    // Submissions
    for (const [subIdStr, target] of Object.entries(exhPlan.subs)) {
      const submissionId = Number(subIdStr);

      // Fetch current state
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

      console.log(`  SUB #${submissionId} "${sub.title.slice(0, 30)}"`);
      console.log(`    rec: ${currentRec} → ${target.rec} (need +${needRec})`);
      console.log(`    wit: ${currentWit} → ${target.wit} (need +${needWit})`);

      if (needRec === 0 && needWit === 0) {
        console.log("    already at target, skipping");
        continue;
      }

      // Filter wallets that haven't already recommended / witnessed
      const notRecYet = [];
      const notWitYet = [];
      for (const w of wallets) {
        const [alreadyRec, alreadyWit] = await Promise.all([
          contract.hasRecommended(submissionId, w.address),
          contract.hasWitnessed(submissionId, w.address),
        ]);
        if (!alreadyRec) notRecYet.push(w);
        if (!alreadyWit) notWitYet.push(w);
      }

      // Shuffle for organic appearance
      const recCandidates = shuffle(notRecYet).slice(0, needRec);
      const witCandidates = shuffle(notWitYet).slice(0, needWit);

      if (recCandidates.length < needRec) {
        console.log(`    ⚠ only ${recCandidates.length} wallets available for rec (needed ${needRec})`);
      }
      if (witCandidates.length < needWit) {
        console.log(`    ⚠ only ${witCandidates.length} wallets available for wit (needed ${needWit})`);
      }

      // Interleave rec and wit for organic tx ordering
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

  // ── summary ───────────────────────────────────────────────────────────────
  console.log("\n══════════════════════════════");
  console.log(`Total recommends added : ${totalRec}`);
  console.log(`Total witnesses added  : ${totalWit}`);
  console.log(`Total tips sent        : ${ethers.formatEther(totalTip)} AVAX`);

  // Final state snapshot
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
          console.log(`    SUB #${sid} "${s.title.slice(0,30)}" rec=${s.recommendCount} wit=${s.witnessCount}`);
        } catch {}
      }
    } catch {}
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
