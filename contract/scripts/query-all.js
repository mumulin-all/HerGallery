const hre = require("hardhat");
const { ethers } = hre;
const PROXY = "0xb8e2a851B52Ab5887E4e9677C6fe2A3ACa2Dc0BF";

async function main() {
  const c = await ethers.getContractAt("HerGallery", PROXY);
  const exhs = await c.getAllExhibitions();
  for (const e of exhs) {
    console.log(`EXH #${e.id} "${e.title}" tipPool=${ethers.formatEther(e.tipPool)} submissionCount=${e.submissionCount} flagged=${e.flagged}`);
    const subs = await c.getSubmissions(Number(e.id));
    for (const s of subs) {
      console.log(`  SUB #${s.id} "${s.title}" status=${s.status} rec=${s.recommendCount} wit=${s.witnessCount} flagged=${s.flagged}`);
    }
  }
}
main().catch(console.error);
